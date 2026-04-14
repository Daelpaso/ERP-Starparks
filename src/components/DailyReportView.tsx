import React, { useState, useMemo } from 'react';
import { Calendar, Download, TrendingUp, DollarSign, ShoppingCart, Car, Clock, History, LayoutGrid, List, Search, Filter } from 'lucide-react';
import { exportToExcel } from '../lib/utils';
import { ShiftHistoryView } from './ShiftManagement';

export const DailyReportView = ({ jobs, transactions, shifts, onShowZReport, initialSubTab, currentUser, showToast }: any) => {
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [activeSubTab, setActiveSubTab] = useState<'ventas' | 'turnos'>(initialSubTab || 'ventas');

  // Update activeSubTab when initialSubTab changes
  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const reportData = useMemo(() => {
    const start = new Date(dateRange.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999);

    const filteredJobs = jobs.filter((j: any) => j.entryDate >= start.getTime() && j.entryDate <= end.getTime());
    const deliveredJobs = filteredJobs.filter((j: any) => j.status === 'Entregado');
    
    const revenue = deliveredJobs.reduce((acc: any, j: any) => {
      acc.total += j.total || 0;
      acc.lavado += j.serviceTotal || 0;
      acc.tienda += j.storeTotal || 0;
      acc.parking += j.parkingFee || 0;
      acc.credito += j.paymentMethod === 'Crédito' ? (j.total || 0) : 0;
      
      if (j.paymentMethod === 'Efectivo') acc.efectivo += j.total || 0;
      else if (j.paymentMethod === 'Tarjeta') acc.tarjeta += j.total || 0;
      else if (j.paymentMethod === 'Transferencia') acc.transferencia += j.total || 0;
      
      return acc;
    }, { total: 0, lavado: 0, tienda: 0, parking: 0, efectivo: 0, tarjeta: 0, transferencia: 0, credito: 0 });

    const dayTxs = transactions.filter((t: any) => t.timestamp >= start.getTime() && t.timestamp <= end.getTime());
    const cashFlow = dayTxs.reduce((acc: any, t: any) => {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });

    return {
      range: dateRange,
      jobsCount: filteredJobs.length,
      deliveredCount: deliveredJobs.length,
      revenue,
      cashFlow,
      jobs: filteredJobs
    };
  }, [dateRange, jobs, transactions]);

  const handleExport = () => {
    const data = reportData.jobs.map((j: any) => ({
      ID: j.id,
      Patente: j.plate,
      Estado: j.status,
      Servicio: j.serviceName || 'Venta Tienda',
      Total: j.total,
      MetodoPago: j.paymentMethod,
      Fecha: new Date(j.entryDate).toLocaleString('es-CL')
    }));
    
    const summary = [
      { Concepto: 'Rango de Reporte', Valor: `${dateRange.start} a ${dateRange.end}` },
      { Concepto: 'Total Vehículos Ingresados', Valor: reportData.jobsCount },
      { Concepto: 'Total Vehículos Entregados', Valor: reportData.deliveredCount },
      { Concepto: 'Recaudación Total', Valor: reportData.revenue.total },
      { Concepto: 'Ingresos Lavado', Valor: reportData.revenue.lavado },
      { Concepto: 'Ingresos Tienda', Valor: reportData.revenue.tienda },
      { Concepto: 'Ingresos Estacionamiento', Valor: reportData.revenue.parking },
      { Concepto: 'Pago Efectivo', Valor: reportData.revenue.efectivo },
      { Concepto: 'Pago Tarjeta', Valor: reportData.revenue.tarjeta },
      { Concepto: 'Pago Transferencia', Valor: reportData.revenue.transferencia },
      { Concepto: 'Ventas a Crédito', Valor: reportData.revenue.credito },
      { Concepto: 'Movimientos Caja (Ingresos)', Valor: reportData.cashFlow.income },
      { Concepto: 'Movimientos Caja (Egresos)', Valor: reportData.cashFlow.expense }
    ];

    exportToExcel(`reporte_${dateRange.start}_${dateRange.end}.xlsx`, [...summary, { Concepto: '', Valor: '' }, ...data]);
  };

  return (
    <div className="space-y-6">
      {!initialSubTab && (
        <div className="flex border-b border-gray-800">
          <button 
            onClick={() => setActiveSubTab('ventas')}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all ${activeSubTab === 'ventas' ? 'text-sw-blue border-b-2 border-sw-blue bg-sw-blue/5' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Ventas y Finanzas
          </button>
          <button 
            onClick={() => setActiveSubTab('turnos')}
            className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all ${activeSubTab === 'turnos' ? 'text-sw-yellow border-b-2 border-sw-yellow bg-sw-yellow/5' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Historial de Turnos
          </button>
        </div>
      )}

      {activeSubTab === 'ventas' ? (
        <>
          <div className="panel-glass p-6 rounded-2xl border-t-4 border-sw-blue flex flex-col lg:flex-row justify-between items-center gap-6">
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                <TrendingUp className="text-sw-blue" /> Análisis de Operaciones
              </h2>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Filtro por rango de fechas.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
              <div className="flex gap-2 mr-2">
                <button 
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setDateRange({ start: today, end: today });
                  }}
                  className="px-3 py-1 rounded-lg bg-black/40 border border-gray-800 text-[10px] font-bold uppercase text-gray-400 hover:text-sw-blue hover:border-sw-blue transition-all"
                >
                  Hoy
                </button>
                <button 
                  onClick={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yStr = yesterday.toISOString().split('T')[0];
                    setDateRange({ start: yStr, end: yStr });
                  }}
                  className="px-3 py-1 rounded-lg bg-black/40 border border-gray-800 text-[10px] font-bold uppercase text-gray-400 hover:text-sw-blue hover:border-sw-blue transition-all"
                >
                  Ayer
                </button>
              </div>
              <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-gray-800">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="bg-transparent pl-9 pr-3 py-2 text-white font-mono text-xs outline-none focus:text-sw-blue transition-all w-36"
                  />
                </div>
                <span className="text-gray-600 font-bold">→</span>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="bg-transparent pl-9 pr-3 py-2 text-white font-mono text-xs outline-none focus:text-sw-blue transition-all w-36"
                  />
                </div>
              </div>
              <button 
                onClick={handleExport}
                className="flex-1 lg:flex-none px-6 py-2.5 rounded-xl bg-sw-blue/10 border border-sw-blue text-sw-blue hover:bg-sw-blue hover:text-black transition-all font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                <Download size={18} /> Exportar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="panel-glass p-6 rounded-2xl border border-gray-800 flex flex-col gap-2">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><Car size={12} /> Vehículos</div>
              <div className="text-3xl font-mono font-black text-white">{reportData.jobsCount}</div>
              <div className="text-[10px] text-gray-400">{reportData.deliveredCount} Entregados</div>
            </div>
            <div className="panel-glass p-6 rounded-2xl border border-gray-800 flex flex-col gap-2">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><DollarSign size={12} /> Recaudación</div>
              <div className="text-3xl font-mono font-black text-sw-green">${reportData.revenue.total.toLocaleString('es-CL')}</div>
              <div className="text-[10px] text-gray-400">Ventas del periodo</div>
            </div>
            <div className="panel-glass p-6 rounded-2xl border border-gray-800 flex flex-col gap-2">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><ShoppingCart size={12} /> Tienda</div>
              <div className="text-3xl font-mono font-black text-sw-yellow">${reportData.revenue.tienda.toLocaleString('es-CL')}</div>
              <div className="text-[10px] text-gray-400">Ventas exprés</div>
            </div>
            <div className="panel-glass p-6 rounded-2xl border border-gray-800 flex flex-col gap-2">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><Clock size={12} /> Parking</div>
              <div className="text-3xl font-mono font-black text-sw-blue">${reportData.revenue.parking.toLocaleString('es-CL')}</div>
              <div className="text-[10px] text-gray-400">Cargos por tiempo</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="panel-glass p-6 rounded-2xl border border-gray-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 border-b border-gray-800 pb-2">Métodos de Pago</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Efectivo</span>
                  <span className="font-mono font-bold text-white">${reportData.revenue.efectivo.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Tarjeta</span>
                  <span className="font-mono font-bold text-white">${reportData.revenue.tarjeta.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Transferencia</span>
                  <span className="font-mono font-bold text-white">${reportData.revenue.transferencia.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-800/50">
                  <span className="text-sm text-sw-red font-bold">Ventas a Crédito</span>
                  <span className="font-mono font-bold text-sw-red">${reportData.revenue.credito.toLocaleString('es-CL')}</span>
                </div>
              </div>
            </div>

            <div className="panel-glass p-6 rounded-2xl border border-gray-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 border-b border-gray-800 pb-2">Flujo de Caja (Movimientos)</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Ingresos Extra</span>
                  <span className="font-mono font-bold text-sw-green">+${reportData.cashFlow.income.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Egresos / Retiros</span>
                  <span className="font-mono font-bold text-sw-red">-${reportData.cashFlow.expense.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                  <span className="text-sm font-bold text-white">Balance Neto</span>
                  <span className={`font-mono font-bold ${reportData.cashFlow.income - reportData.cashFlow.expense >= 0 ? 'text-sw-green' : 'text-sw-red'}`}>
                    ${(reportData.cashFlow.income - reportData.cashFlow.expense).toLocaleString('es-CL')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <ShiftHistoryView 
          shifts={shifts} 
          jobs={jobs} 
          transactions={transactions} 
          onShowZReport={onShowZReport} 
          currentUser={currentUser}
          showToast={showToast}
        />
      )}
    </div>
  );
};
