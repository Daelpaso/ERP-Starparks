import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  X, FileDown, FileSpreadsheet, Clock, ShieldAlert, 
  UserSquare2, Activity
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Estándar implementado basándonos en las normas contables para Z-Reports POS.
// SheetJS Ref: https://docs.sheetjs.com/
// jsPDF Ref: https://raw.githack.com/MrRio/jsPDF/master/docs/jsPDF.html

export const HistoricalZReportModal = ({ shift, onClose, showToast }: any) => {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchHistoricalData = async () => {
      try {
        const qJobs = query(collection(db, 'jobs'), where('shiftId', '==', shift.id));
        const qTxs = query(collection(db, 'transactions'), where('shiftId', '==', shift.id));
        
        const [snapJobs, snapTxs] = await Promise.all([
          getDocs(qJobs),
          getDocs(qTxs)
        ]);
        
        if (mounted) {
          setJobs(snapJobs.docs.map(d => ({ id: d.id, ...d.data() })));
          setTransactions(snapTxs.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        }
      } catch (error) {
        try { handleFirestoreError(error, OperationType.LIST, 'historical_shift_data'); } catch (e) {}
        showToast('Error de seguridad al acceder a historial.', 'error');
        if (mounted) setLoading(false);
      }
    };
    fetchHistoricalData();
    return () => { mounted = false; };
  }, [shift.id, showToast]);

  const metrics = useMemo(() => {
    const validJobs = jobs.filter(j => j.status !== 'Anulado');
    const voidJobs = jobs.filter(j => j.status === 'Anulado');

    const breakdown = validJobs.reduce((acc, j) => {
      acc.totalSales += j.total || 0;
      if (j.paymentMethod === 'Efectivo') acc.cash += j.total;
      if (j.paymentMethod === 'Tarjeta') acc.cards += j.total;
      if (j.paymentMethod === 'Transferencia') acc.transfers += j.total;
      if (j.paymentMethod === 'Crédito') acc.credits += j.total;
      return acc;
    }, { totalSales: 0, cash: 0, cards: 0, transfers: 0, credits: 0 });

    const txIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const txExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const systemCash = (shift.initialCash || 0) + breakdown.cash + txIncome - txExpense;
    const cashVariance = (shift.declaredCash || 0) - systemCash;

    const avgTicket = validJobs.length > 0 ? breakdown.totalSales / validJobs.length : 0;

    // Calcular Rush Hour
    const hourCounts: Record<number, number> = {};
    validJobs.forEach(j => {
      const h = new Date(j.createdAt).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
    let rushHour = '-';
    let maxJobs = 0;
    Object.entries(hourCounts).forEach(([h, count]) => {
      if (count > maxJobs) {
        maxJobs = count;
        rushHour = `${h.toString().padStart(2, '0')}:00`;
      }
    });

    return { ...breakdown, systemCash, cashVariance, txIncome, txExpense, avgTicket, rushHour, validJobs, voidJobs };
  }, [jobs, transactions, shift]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('STARPARKS ERP - REPORTE Z', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`ID de Turno: ${shift.id}`, 14, 30);
    doc.text(`Operador Auditable: ${shift.openedBy}`, 14, 35);
    doc.text(`Apertura Exacta: ${new Date(shift.openedAt).toLocaleString('es-CL')}`, 14, 40);
    doc.text(`Cierre Ciego: ${shift.closedAt ? new Date(shift.closedAt).toLocaleString('es-CL') : 'N/A'}`, 14, 45);

    autoTable(doc, {
      startY: 55,
      head: [['KPI Operativo', 'Valor']],
      body: [
        ['Ticket Promedio', `$${metrics.avgTicket.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`],
        ['Hora Punta (Rush Hour)', metrics.rushHour],
        ['Total Operaciones', metrics.validJobs.length.toString()],
        ['N° Anulaciones SOS', metrics.voidJobs.length.toString()],
      ],
      theme: 'grid',
      headStyles: { fillColor: [0, 168, 255] }
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Medio de Pago', 'Monto Sistema', 'Arqueo Manual', 'Diferencia']],
      body: [
        ['Efectivo', `$${metrics.systemCash.toLocaleString('es-CL')}`, `$${(shift.declaredCash || 0).toLocaleString('es-CL')}`, `$${metrics.cashVariance.toLocaleString('es-CL')}`],
        ['Tarjetas', `$${metrics.cards.toLocaleString('es-CL')}`, `$${(shift.declaredCards || 0).toLocaleString('es-CL')}`, `$${((shift.declaredCards || 0) - metrics.cards).toLocaleString('es-CL')}`],
        ['Transferencias', `$${metrics.transfers.toLocaleString('es-CL')}`, `$${(shift.declaredTransfers || 0).toLocaleString('es-CL')}`, `$${((shift.declaredTransfers || 0) - metrics.transfers).toLocaleString('es-CL')}`],
        ['Créditos', `$${metrics.credits.toLocaleString('es-CL')}`, `$${(shift.declaredCredit || 0).toLocaleString('es-CL')}`, `$${((shift.declaredCredit || 0) - metrics.credits).toLocaleString('es-CL')}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [52, 152, 219] }
    });

    const summaryY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE CUADRATURA Y AUDITORÍA:', 14, summaryY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    let currentY = summaryY + 7;
    const lines = [
      `(+) Fondo Inicial: $${(shift.initialCash || 0).toLocaleString('es-CL')} (Efectivo base para cambio)`,
      `(+) Ventas Totales: $${metrics.totalSales.toLocaleString('es-CL')} (Suma de todas las operaciones entregadas)`,
      `(+) Inyecciones de Caja: $${metrics.txIncome.toLocaleString('es-CL')} (Ingresos manuales registrados durante el turno)`,
      `(-) Egresos / Retiros: $${metrics.txExpense.toLocaleString('es-CL')} (Gastos o retiros de dinero realizados)`,
      `(=) Resultado Final Esperado: $${metrics.systemCash.toLocaleString('es-CL')} (Monto que el sistema indica debe estar en caja física)`
    ];
    
    lines.forEach(line => {
      doc.text(line, 14, currentY);
      currentY += 5;
    });

    doc.setFont('helvetica', 'bold');
    doc.text(`DESVIO DE CAJA: $${metrics.cashVariance.toLocaleString('es-CL')}`, 14, currentY + 5);
    doc.setFont('helvetica', 'italic');
    doc.text(metrics.cashVariance === 0 
      ? 'Explicación: La caja cuadra perfectamente con los registros del sistema.' 
      : metrics.cashVariance > 0 
        ? 'Explicación: Existe un SOBRANTE. Hay más dinero en físico que lo registrado en el sistema.' 
        : 'Explicación: Existe un FALTANTE. Falta dinero físico respecto a lo registrado por el sistema.', 14, currentY + 10);

    doc.save(`Auditoria_Reporte_Z_${shift.id}.pdf`);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const metricsData = [
      { Parametro: 'ID Turno', Valor: shift.id },
      { Parametro: 'Operador Responsable', Valor: shift.openedBy },
      { Parametro: 'Ticket Promedio ($)', Valor: metrics.avgTicket },
      { Parametro: 'Franja Hora Flujo', Valor: metrics.rushHour },
      { Parametro: 'Varianza de Caja Ef ($)', Valor: metrics.cashVariance },
      { Parametro: 'Tot. Anulaciones SOS', Valor: metrics.voidJobs.length }
    ];
    const wsMetrics = XLSX.utils.json_to_sheet(metricsData);
    XLSX.utils.book_append_sheet(wb, wsMetrics, "Métricas_Generales");

    const vehiclesData = metrics.validJobs.map(j => ({
      AtencionID: j.id,
      Patente: j.clientPlate,
      Categoria: j.vehicleCategory,
      Servicio: j.serviceName,
      TotalFacturado: j.total,
      MetodoPago: j.paymentMethod,
      FechaSello: new Date(j.createdAt).toLocaleString('es-CL')
    }));
    
    if (vehiclesData.length > 0) {
      const wsVehicles = XLSX.utils.json_to_sheet(vehiclesData);
      XLSX.utils.book_append_sheet(wb, wsVehicles, "Bitacora_Vehiculos");
    }

    XLSX.writeFile(wb, `Reporte_Z_${shift.id}.xlsx`);
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 backdrop-blur-xl overflow-y-auto" onClick={onClose}>
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="panel-glass rounded-3xl w-full max-w-5xl border border-sw-blue/30 shadow-[0_0_80px_rgba(0,168,255,0.15)] flex flex-col my-8"
      >
        <div className="p-8 border-b border-gray-800 bg-sw-blue/5 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md rounded-t-3xl text-sw-blue">
          <div className="flex items-center gap-4">
            <Activity size={32} />
            <div>
              <h2 className="text-2xl font-black sw-title-font tracking-widest uppercase">Historial Z-Report</h2>
              <p className="text-[14px] font-mono font-bold uppercase tracking-[0.2em] text-white">ID Auditable: {shift.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportExcel} className="p-2 text-sw-yellow hover:bg-sw-yellow/20 rounded-lg transition-colors bg-white/5 border border-transparent hover:border-sw-yellow/50" title="Exportar Plantilla Pila - Excel"><FileSpreadsheet size={24} /></button>
            <button onClick={exportPDF} className="p-2 text-sw-blue hover:bg-sw-blue/20 rounded-lg transition-colors bg-white/5 border border-transparent hover:border-sw-blue/50" title="Descarga Documento Transparencia - PDF"><FileDown size={24} /></button>
            <button onClose={onClose} className="p-2 text-gray-400 hover:text-sw-red transition-colors" onClick={onClose}><X size={28} /></button>
          </div>
        </div>

        {loading ? (
          <div className="p-16 flex justify-center items-center flex-col gap-4 text-sw-blue animate-pulse">
            <Activity size={48} />
            <span className="font-mono text-sm uppercase tracking-widest">Recolectando datos históricos precisos...</span>
          </div>
        ) : (
          <div className="p-8 space-y-8 bg-black/40">
            {/* Header Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-gray-800 bg-white/5 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-gray-400"><UserSquare2 size={16}/> <span className="text-[14px] uppercase font-bold tracking-widest">Operador</span></div>
                <div className="font-mono text-sm text-white truncate">{shift.operatorName || shift.openedBy}</div>
              </div>
              <div className="p-4 rounded-xl border border-gray-800 bg-white/5 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-gray-400"><UserSquare2 size={16} className="text-sw-yellow"/> <span className="text-[14px] uppercase font-bold tracking-widest text-sw-yellow">Supervisor Cierre</span></div>
                <div className="font-mono text-sm text-white truncate">{shift.closedBy || 'Admin System'}</div>
              </div>
              <div className="p-4 rounded-xl border border-gray-800 bg-white/5 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sw-green"><Clock size={16}/> <span className="text-[14px] uppercase font-bold tracking-widest">Apertura Exacta</span></div>
                <div className="font-mono text-sm text-white">{new Date(shift.openedAt).toLocaleString('es-CL')}</div>
              </div>
              <div className="p-4 rounded-xl border border-gray-800 bg-white/5 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sw-red"><Clock size={16}/> <span className="text-[14px] uppercase font-bold tracking-widest">Cierre Exacto</span></div>
                <div className="font-mono text-sm text-white">{shift.closedAt ? new Date(shift.closedAt).toLocaleString('es-CL') : 'N/A'}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* KPIs y Auditoría lateral */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sw-blue font-bold tracking-widest uppercase text-[14px] mb-4 border-b border-gray-800 pb-2">KPIs Operativos y Rendimiento</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="panel-glass p-4 rounded-xl text-center border-t border-sw-yellow shadow-[0_-5px_20px_rgba(255,232,31,0.05)]">
                    <div className="text-[14px] text-gray-400 uppercase font-bold mb-2">Ticket Promedio</div>
                    <div className="text-2xl font-mono font-black text-sw-yellow">${metrics.avgTicket.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</div>
                  </div>
                  <div className="panel-glass p-4 rounded-xl text-center border-t border-sw-blue shadow-[0_-5px_20px_rgba(0,168,255,0.05)]">
                    <div className="text-[14px] text-gray-400 uppercase font-bold mb-2">Rush Hour</div>
                    <div className="text-2xl font-mono font-black text-sw-blue">{metrics.rushHour}</div>
                  </div>
                </div>

                <h3 className="text-sw-red font-bold tracking-widest uppercase text-[14px] mt-8 mb-4 border-b border-gray-800 pb-2 flex items-center gap-2">
                  <ShieldAlert size={14}/> Inspección Ciega (Descuadre)
                </h3>
                <div className={`p-6 rounded-2xl border ${metrics.cashVariance === 0 ? 'border-sw-green/50 bg-sw-green/5 text-sw-green' : 'border-sw-red bg-sw-red/10 text-sw-red'}`}>
                  <div className="text-[14px] uppercase font-bold mb-2">Varianza Global Efectivo</div>
                  <div className="text-4xl font-mono font-black">${metrics.cashVariance.toLocaleString('es-CL')}</div>
                </div>
              </div>

              {/* Área Financiera Central */}
              <div className="lg:col-span-3 space-y-4">
                <h3 className="text-sw-blue font-bold tracking-widest uppercase text-[14px] mb-4 border-b border-gray-800 pb-2">Distribución Exacta de Cuadre Tributario</h3>
                <div className="overflow-x-auto text-sm font-mono text-left w-full rounded-xl border border-gray-800 bg-black/50 shadow-inner">
                  <table className="w-full">
                    <thead className="bg-black text-[14px] uppercase tracking-widest text-gray-500">
                      <tr>
                        <th className="p-4">Medio Tributario</th>
                        <th className="p-4 text-right">Acumulado Sist.</th>
                        <th className="p-4 text-right">Arqueo Manual</th>
                        <th className="p-4 text-right text-sw-red">Descuadre</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-4 border-l-2 border-sw-green">Efectivo Físico</td>
                        <td className="p-4 text-right">${metrics.systemCash.toLocaleString('es-CL')}</td>
                        <td className="p-4 text-right">${(shift.declaredCash || 0).toLocaleString('es-CL')}</td>
                        <td className={`p-4 text-right font-bold ${metrics.cashVariance !== 0 ? 'text-sw-red' : 'text-sw-green'}`}>{metrics.cashVariance.toLocaleString('es-CL')}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-4 border-l-2 border-sw-blue">Tarjetas (Vouchers)</td>
                        <td className="p-4 text-right">${metrics.cards.toLocaleString('es-CL')}</td>
                        <td className="p-4 text-right">${(shift.declaredCards || 0).toLocaleString('es-CL')}</td>
                        <td className="p-4 text-right font-bold text-gray-500">${((shift.declaredCards || 0) - metrics.cards).toLocaleString('es-CL')}</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="p-4 border-l-2 border-sw-yellow">Transferencias</td>
                        <td className="p-4 text-right">${metrics.transfers.toLocaleString('es-CL')}</td>
                        <td className="p-4 text-right">${(shift.declaredTransfers || 0).toLocaleString('es-CL')}</td>
                        <td className="p-4 text-right font-bold text-gray-500">${((shift.declaredTransfers || 0) - metrics.transfers).toLocaleString('es-CL')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-4 space-y-4">
                  <h3 className="text-gray-400 font-bold tracking-widest uppercase text-[14px] mb-4 border-b border-gray-800 pb-2">Log Sistémico de Anulaciones Críticas</h3>
                  {metrics.voidJobs.length === 0 ? (
                    <div className="text-center p-4 bg-black/30 border border-gray-800/80 rounded-xl text-gray-600 text-[14px] uppercase font-bold tracking-widest border-dashed">
                      Integridad del Turno Intacta (0 Anulaciones)
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                       {metrics.voidJobs.map(v => (
                         <div key={v.id} className="p-3 bg-sw-red/5 border border-sw-red/20 rounded-xl flex flex-col gap-2 transition-transform hover:scale-[1.01]">
                           <div className="flex justify-between items-center text-[14px] font-mono">
                             <span className="text-sw-red font-bold">Anulación: {v.plate || v.clientPlate}</span>
                             <span className="text-gray-500">{new Date(v.deletedAt || v.createdAt).toLocaleString('es-CL')}</span>
                           </div>
                           <div className="text-[14px] text-gray-400 bg-black/30 p-4 rounded border border-sw-red/10 italic">
                             Motivo: {v.deletionReason || 'No especificado'}
                           </div>
                           <div className="text-[14px] text-gray-500 uppercase tracking-widest font-bold ml-1">
                             Autorizado por: {v.deletedBy || 'Admin'}
                           </div>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
