import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Calendar, Download, TrendingUp, DollarSign, ShoppingCart, Car, Clock, History, LayoutGrid, List, Search, Filter } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../lib/utils';
import { ShiftHistoryView } from './ShiftManagement';
import { PricingView } from './AdminViews';
import { ExportDataModal } from './ExportDataModal';

export const DailyReportView = ({ jobs, clients, transactions, shifts, onShowZReport, initialSubTab, currentUser, showToast, services, storeProducts, categories, setServices, setStoreProducts, hasPermission, setServiceModalId, logSystemAction }: any) => {
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const tabs = [
    { id: 'ventas', label: 'Ventas y Finanzas', permission: 'view_reports', color: 'sw-blue' },
    { id: 'operativo', label: 'Historial Operativo', permission: 'view_reports', color: 'sw-yellow' },
    { id: 'turnos', label: 'Historial de Turnos', permission: 'view_reports', color: 'sw-yellow' },
    { id: 'tienda', label: 'Reporte de Tienda express', permission: 'view_reports', color: 'sw-green' },
    { id: 'comisiones', label: 'Reporte de Comisiones', permission: 'view_reports', color: 'sw-blue' }
  ].filter(t => !t.permission || hasPermission(t.permission));

  const [activeSubTab, setActiveSubTab] = useState<'ventas' | 'operativo' | 'turnos' | 'tienda' | 'comisiones' | string>(initialSubTab || (tabs.length > 0 ? tabs[0].id : 'ventas'));
  const [selectedWorkerForCommission, setSelectedWorkerForCommission] = useState<string>('all');
  const [tiendaFilters, setTiendaFilters] = useState({ product: '', startTime: '', endTime: '', operator: 'all' });
  const [operativoFilters, setOperativoFilters] = useState({ plate: '', status: 'all', worker: 'all' });

  // Update activeSubTab when initialSubTab changes or permissions load
  React.useEffect(() => {
    if (initialSubTab && initialSubTab !== 'productividad') {
      const tabExists = tabs.some(t => t.id === initialSubTab);
      if (tabExists) {
        setActiveSubTab(initialSubTab);
      }
    } else if (tabs.length > 0 && !tabs.some(t => t.id === activeSubTab)) {
      setActiveSubTab(tabs[0].id);
    }
  }, [initialSubTab, tabs.length]);

  const reportData = useMemo(() => {
    const [sy, sm, sd] = dateRange.start.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    
    const [ey, em, ed] = dateRange.end.split('-').map(Number);
    const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);

    const filteredJobs = jobs.filter((j: any) => j.entryDate >= start.getTime() && j.entryDate <= end.getTime());
    const deliveredJobs = filteredJobs.filter((j: any) => j.status === 'Entregado');
    const voidJobs = filteredJobs.filter((j: any) => j.status === 'Anulado');
    
    const revenue = deliveredJobs.reduce((acc: any, j: any) => {
      acc.total += j.total || 0;
      acc.lavado += j.serviceTotal || 0;
      acc.tienda += j.storeTotal || 0;
      acc.parking += j.parkingFee || 0;
      acc.descuento += j.discountAmount || 0;
      acc.credito += j.paymentMethod === 'Crédito' ? (j.total || 0) : 0;
      
      if (j.paymentMethod === 'Efectivo') acc.efectivo += j.total || 0;
      else if (j.paymentMethod === 'Tarjeta') acc.tarjeta += j.total || 0;
      else if (j.paymentMethod === 'Transferencia') acc.transferencia += j.total || 0;
      
      return acc;
    }, { total: 0, lavado: 0, tienda: 0, parking: 0, efectivo: 0, tarjeta: 0, transferencia: 0, credito: 0, descuento: 0 });

    const workerStats = deliveredJobs.reduce((acc: any, j: any) => {
      const workerId = j.timeline?.find((t: any) => t.status === 'Listo')?.workerId || 'Sin Asignar';
      if (!acc[workerId]) acc[workerId] = { count: 0, total: 0 };
      acc[workerId].count += 1;
      acc[workerId].total += j.serviceTotal || 0;
      return acc;
    }, {});

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
      anuladoCount: voidJobs.length,
      revenue,
      cashFlow,
      workerStats,
      jobs: filteredJobs
    };
  }, [dateRange, jobs, transactions]);

  const getOperativoExportData = () => {
    const [sy, sm, sd] = dateRange.start.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0).getTime();
    const [ey, em, ed] = dateRange.end.split('-').map(Number);
    const end = new Date(ey, em - 1, ed, 23, 59, 59, 999).getTime();

    return jobs.filter((j: any) => j.entryDate >= start && j.entryDate <= end)
      .map((job: any) => {
        const entry = job.timeline?.find((t: any) => t.status === 'Cola')?.timestamp || job.entryDate;
        const lavando = job.timeline?.find((t: any) => t.status === 'Lavando');
        const listo = job.timeline?.find((t: any) => t.status === 'Listo');
        const entregado = job.timeline?.find((t: any) => t.status === 'Entregado') || (job.status === 'Entregado' ? { timestamp: job.exitDate } : null);

        const formatTime = (ts: any) => ts ? format(new Date(ts), 'HH:mm') : '--';

        return {
          ID: job.id,
          Patente: job.plate,
          Servicio: job.serviceName,
          Hora_Ingreso: formatTime(entry),
          Inicia_Lavado: formatTime(lavando?.timestamp),
          Termina_Lavado: formatTime(listo?.timestamp),
          Hora_Entrega: formatTime(entregado?.timestamp),
          Operador_Lavado: lavando?.workerId || 'N/A',
          Operador_Entrega: listo?.workerId || 'N/A',
          Estado: job.status,
          Total: `$${(job.total || 0).toLocaleString('es-CL')}`
        };
      })
      .filter((row: any) => {
        if (operativoFilters.plate && !row.Patente.includes(operativoFilters.plate.toUpperCase())) return false;
        if (operativoFilters.status !== 'all' && row.Estado !== operativoFilters.status) return false;
        if (operativoFilters.worker !== 'all' && (row.Operador_Lavado !== operativoFilters.worker && row.Operador_Entrega !== operativoFilters.worker)) return false;
        return true;
      });
  };

  const getTiendaExportData = () => {
    const [sy, sm, sd] = dateRange.start.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0).getTime();
    const [ey, em, ed] = dateRange.end.split('-').map(Number);
    const end = new Date(ey, em - 1, ed, 23, 59, 59, 999).getTime();

    const productSales: any[] = [];
    
    jobs.filter((j: any) => j.status === 'Entregado' && j.entryDate >= start && j.entryDate <= end).forEach((job: any) => {
        if (!job.cart || job.cart.length === 0) return;
        
        const isExpress = job.id?.startsWith('VST-') || job.plate === '🏪 VENTA TIENDA';
        let operator = 'Personal';
        if (isExpress) {
          operator = job.operatorId || job.openedBy || 'Cajero';
        } else {
          const lavandoEvent = job.timeline?.find((t: any) => t.status === 'Lavando');
          const listoEvent = job.timeline?.find((t: any) => t.status === 'Listo');
          operator = lavandoEvent?.workerId || listoEvent?.workerId || 'Sin Asignar';
        }

        const saleDate = job.exitDate || job.entryDate || job.createdAt || new Date().getTime();

        job.cart.forEach((item: any) => {
            if (!item.isTypeService) {
                const itemQty = item.quantity || 1;
                // Apply Tienda filters
                if (tiendaFilters.product && !item.name.toLowerCase().includes(tiendaFilters.product.toLowerCase())) return;
                if (tiendaFilters.operator !== 'all' && operator !== tiendaFilters.operator) return;

                if (tiendaFilters.startTime || tiendaFilters.endTime) {
                    const localTime = new Date(saleDate);
                    const hours = String(localTime.getHours()).padStart(2, '0');
                    const mins = String(localTime.getMinutes()).padStart(2, '0');
                    const timeStr = `${hours}:${mins}`;
                    if (tiendaFilters.startTime && timeStr < tiendaFilters.startTime) return;
                    if (tiendaFilters.endTime && timeStr > tiendaFilters.endTime) return;
                }

                productSales.push({
                    ID_Venta: job.id,
                    Fecha: format(new Date(saleDate), 'dd-MM-yyyy HH:mm'),
                    Producto: item.name,
                    Cantidad: itemQty,
                    PrecioUnitario: item.price / itemQty,
                    Total: item.price,
                    Vendedor: operator
                });
            }
        });
    });
    
    return productSales.sort((a, b) => {
        const da = new Date(a.Fecha.replace(/(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})/, '$3-$2-$1T$4:$5')).getTime();
        const db = new Date(b.Fecha.replace(/(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})/, '$3-$2-$1T$4:$5')).getTime();
        return da - db;
    });
  };

  const getVentasExportData = () => {
    // Sort jobs by date first for correct acumulado calculation
    const sortedJobs = [...jobs]
      .filter(j => j.status === 'Entregado')
      .sort((a, b) => (a.exitDate || a.entryDate) - (b.exitDate || b.entryDate));

    let runningTotal = 0;

    return sortedJobs.map((job: any) => {
      const client = clients?.find((c: any) => c.plate === job.plate);
      const clientName = job.clientName || client?.name || 'Cliente Particular';

      const isExpress = job.id?.startsWith('VST-') || job.plate === '🏪 VENTA TIENDA';
      
      // Calculate sums
      let mainServiceSum = 0;
      let compServiceSum = 0;
      let storeSum = 0;

      if (isExpress) {
        // For express, almost everything is storeSum unless manually marked otherwise (unlikely)
        if (job.cart && job.cart.length > 0) {
          job.cart.forEach((item: any) => {
            if (item.isTypeService) compServiceSum += item.price;
            else storeSum += item.price;
          });
        }
      } else {
        // For workshop
        mainServiceSum = job.serviceTotal || 0;
        if (job.cart && job.cart.length > 0) {
          job.cart.forEach((item: any) => {
            if (!item.isTypeService) {
              storeSum += item.price;
            } else {
              compServiceSum += item.price;
            }
          });
        }
      }

      const totalValue = (job.total || (mainServiceSum + compServiceSum + storeSum));
      runningTotal += totalValue;

      const netoServicio = Math.round(mainServiceSum / 1.19);
      const comision = Math.round(netoServicio * 0.3);

      // Operator logic
      let operador = 'Personal';
      if (isExpress) {
        operador = job.operatorId || job.openedBy || 'Cajero';
      } else {
        // Workshop: Get operator from 'Lavando' stage if exists, else 'Listo'
        const lavandoEvent = job.timeline?.find((t: any) => t.status === 'Lavando');
        const listoEvent = job.timeline?.find((t: any) => t.status === 'Listo');
        operador = lavandoEvent?.workerId || listoEvent?.workerId || 'Sin Asignar';
      }

      return {
        ...job,
        FECHA: format(job.exitDate || job.entryDate || job.createdAt || new Date(), 'dd-MM-yyyy'),
        ID: job.id,
        Patente: job.plate,
        Cliente: clientName,
        mainServiceSum,
        compServiceSum,
        storeSum: storeSum + (job.storeTotal || 0), // Include storeTotal if set directly
        netoServicio,
        comision,
        operador,
        acumulado: runningTotal,
        total: totalValue
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b border-gray-800 overflow-x-auto custom-scrollbar">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === tab.id ? `text-${tab.color} border-b-2 border-${tab.color === 'white' ? 'white' : tab.color} bg-${tab.color === 'white' ? 'white' : tab.color}/5` : 'text-gray-500 hover:text-gray-300'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'ventas' ? (
        <>
          <div className="panel-glass p-6 rounded-2xl border-t-4 border-sw-blue flex flex-col lg:flex-row justify-between items-center gap-6">
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                <TrendingUp className="text-sw-blue" /> Análisis de Operaciones
              </h2>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-widest mt-1">Filtro por rango de fechas.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
              <div className="flex gap-2 mr-2">
                <button 
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setDateRange({ start: today, end: today });
                  }}
                  className="px-3 py-1 rounded-lg bg-black/40 border border-gray-800 text-[14px] font-ui font-bold uppercase text-gray-400 hover:text-sw-blue hover:border-sw-blue transition-all"
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
                  className="px-3 py-1 rounded-lg bg-black/40 border border-gray-800 text-[14px] font-ui font-bold uppercase text-gray-400 hover:text-sw-blue hover:border-sw-blue transition-all"
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
                    className="bg-transparent pl-9 pr-3 py-2 text-white font-mono text-[14px] outline-none focus:text-sw-blue transition-all w-36"
                  />
                </div>
                <span className="text-gray-600 font-bold">→</span>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="bg-transparent pl-9 pr-3 py-2 text-white font-mono text-[14px] outline-none focus:text-sw-blue transition-all w-36"
                  />
                </div>
              </div>
              <button 
                onClick={() => setShowExportModal(true)}
                className="flex-1 lg:flex-none px-6 py-2.5 rounded-xl bg-sw-blue text-black hover:bg-sw-blue/80 transition-all font-black uppercase tracking-[0.2em] text-[14px] flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,168,255,0.2)]"
              >
                <Download size={16} /> Exportar Reporte
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="panel-glass p-6 rounded-2xl border border-gray-800 flex flex-col gap-2">
              <div className="text-[14px] font-bold text-gray-400 font-ui uppercase tracking-widest flex items-center gap-2"><Car size={16} /> Vehículos</div>
              <div className="text-3xl font-mono font-black text-white">{reportData.jobsCount}</div>
              <div className="text-[14px] text-gray-500 uppercase tracking-wider">{reportData.deliveredCount} Entregados</div>
            </div>
            <div className="panel-glass p-6 rounded-2xl border border-gray-800 flex flex-col gap-2">
              <div className="text-[14px] font-bold text-gray-400 font-ui uppercase tracking-widest flex items-center gap-2"><DollarSign size={16} /> Recaudación</div>
              <div className="text-3xl font-mono font-black text-sw-green">${reportData.revenue.total.toLocaleString('es-CL')}</div>
              <div className="text-[14px] text-gray-500 uppercase tracking-wider">Neto (Bruto: ${(reportData.revenue.total + reportData.revenue.descuento).toLocaleString('es-CL')})</div>
            </div>
            <div className="panel-glass p-6 rounded-2xl border border-gray-800 flex flex-col gap-2">
              <div className="text-[14px] font-bold text-gray-400 font-ui uppercase tracking-widest flex items-center gap-2"><ShoppingCart size={16} /> Tienda</div>
              <div className="text-3xl font-mono font-black text-sw-yellow">${reportData.revenue.tienda.toLocaleString('es-CL')}</div>
              <div className="text-[14px] text-gray-500 uppercase tracking-wider">Consumos registrados</div>
            </div>
            <div className="panel-glass p-6 rounded-2xl border border-gray-800 flex flex-col gap-2">
              <div className="text-[14px] font-bold text-gray-400 font-ui uppercase tracking-widest flex items-center gap-2"><Clock size={16} /> Parking</div>
              <div className="text-3xl font-mono font-black text-sw-blue">${reportData.revenue.parking.toLocaleString('es-CL')}</div>
              <div className="text-[14px] text-gray-500 uppercase tracking-wider">Multas por sobretiempo</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="panel-glass p-6 rounded-2xl border border-gray-800">
              <h3 className="text-[14px] font-bold text-white uppercase tracking-widest mb-4 border-b border-gray-800 pb-2">Métodos de Pago</h3>
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
              <h3 className="text-[14px] font-bold text-white uppercase tracking-widest mb-4 border-b border-gray-800 pb-2">Flujo de Caja (Movimientos)</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Ingresos Registrados</span>
                  <span className="font-mono font-bold text-sw-green">+${reportData.cashFlow.income.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Gastos / Retiros</span>
                  <span className="font-mono font-bold text-sw-red">-${reportData.cashFlow.expense.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                  <span className="text-sm font-bold text-white">Balance de Caja</span>
                  <span className={`font-mono font-bold ${reportData.cashFlow.income - reportData.cashFlow.expense >= 0 ? 'text-sw-green' : 'text-sw-red'}`}>
                    ${(reportData.cashFlow.income - reportData.cashFlow.expense).toLocaleString('es-CL')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="panel-glass rounded-2xl border border-gray-800 overflow-hidden mt-8">
            <div className="p-4 bg-black/60 border-b border-gray-800 flex justify-between items-center">
               <h3 className="text-[14px] font-bold text-white uppercase tracking-widest flex items-center gap-2">
                 <List size={16} className="text-sw-blue" /> Desglose de Ventas
               </h3>
               <span className="text-xs text-gray-500 font-mono">
                 Mostrando ventas correspondientes al rango seleccionado
               </span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="bg-black/40 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800">
                  <tr>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">ID</th>
                    <th className="p-4">Patente</th>
                    <th className="p-4">Cliente</th>
                    <th className="p-4 text-right">Servicio PPAL</th>
                    <th className="p-4 text-right">Complementario</th>
                    <th className="p-4 text-right">Tienda</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4">Pago / Doc</th>
                    <th className="p-4">Operador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {getVentasExportData()
                    .filter(row => {
                      const [sy, sm, sd] = dateRange.start.split('-').map(Number);
                      const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
                      const [ey, em, ed] = dateRange.end.split('-').map(Number);
                      const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
                      const [d, m, y] = row.FECHA.split('-');
                      const dt = new Date(Number(y), Number(m)-1, Number(d), 12, 0, 0);
                      return dt >= start && dt <= end;
                    })
                    .map((row: any) => (
                    <tr key={row.ID} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-mono text-xs text-gray-400">{row.FECHA}</td>
                      <td className="p-4 font-mono text-xs text-sw-blue font-bold">{row.ID}</td>
                      <td className="p-4 font-mono text-xs text-white">{row.Patente}</td>
                      <td className="p-4 text-xs text-gray-300">{row.Cliente}</td>
                      <td className="p-4 text-xs text-right font-mono">${(row.mainServiceSum || 0).toLocaleString('es-CL')}</td>
                      <td className="p-4 text-xs text-right font-mono">${(row.compServiceSum || 0).toLocaleString('es-CL')}</td>
                      <td className="p-4 text-xs text-right font-mono">${(row.storeSum || 0).toLocaleString('es-CL')}</td>
                      <td className="p-4 text-xs text-right font-mono text-sw-green font-bold">${(row.total || 0).toLocaleString('es-CL')}</td>
                      <td className="p-4 text-xs">
                        <div className="flex flex-col gap-1">
                          <span className={`px-1 rounded-sm w-max uppercase tracking-wider text-[10px] ${row.paymentMethod === 'Efectivo' ? 'bg-green-500/10 text-green-400' : row.paymentMethod === 'Tarjeta' ? 'bg-blue-500/10 text-blue-400' : row.paymentMethod === 'Crédito' ? 'bg-red-500/10 text-red-500' : 'bg-purple-500/10 text-purple-400'}`}>
                            {row.paymentMethod}
                          </span>
                          <span className="text-gray-500">{row.docType}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-bold text-gray-300">{row.operador}</td>
                    </tr>
                  ))}
                  {getVentasExportData().length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-gray-500 text-sm italic">
                        No hay ventas finalizadas en este período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeSubTab === 'operativo' ? (
        <div className="space-y-6">
          <div className="panel-glass p-6 rounded-2xl border-t-4 border-sw-yellow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <History className="text-sw-yellow" size={24} /> Historial Operativo Detallado
              </h2>
              <p className="text-gray-400 text-sm mt-2 uppercase font-bold tracking-widest">
                Tiempos de proceso, operadores y estados del flujo de trabajo.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-gray-800">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="bg-transparent pl-9 pr-3 py-2 text-white font-mono text-[14px] outline-none focus:text-sw-blue transition-all w-36"
                  />
                </div>
                <span className="text-gray-600 font-bold">→</span>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="bg-transparent pl-9 pr-3 py-2 text-white font-mono text-[14px] outline-none focus:text-sw-blue transition-all w-36"
                  />
                </div>
              </div>
              <button 
                onClick={() => setShowExportModal(true)}
                className="px-6 py-3 rounded-xl bg-sw-yellow text-black hover:bg-sw-yellow/80 transition-all font-black uppercase tracking-[0.2em] text-[14px] flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,232,31,0.2)]"
              >
                <Download size={16} /> Exportar Historial
              </button>
            </div>
          </div>

          <div className="panel-glass p-4 rounded-2xl border border-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
               <input 
                 type="text"
                 placeholder="Buscar patente..."
                 value={operativoFilters.plate}
                 onChange={(e) => setOperativoFilters(prev => ({ ...prev, plate: e.target.value }))}
                 className="w-full bg-black/40 border border-gray-800 text-white rounded-xl py-3 pl-10 pr-4 text-sm focus:border-sw-yellow outline-none uppercase font-mono"
               />
            </div>
            <div className="relative">
               <select
                 value={operativoFilters.worker}
                 onChange={(e) => setOperativoFilters(prev => ({ ...prev, worker: e.target.value }))}
                 className="w-full bg-black/40 border border-gray-800 text-white rounded-xl py-3 pl-4 pr-10 text-sm focus:border-sw-yellow outline-none appearance-none"
               >
                 <option value="all">Todos los Operadores</option>
                 {[...new Set(jobs.flatMap((j: any) => j.timeline?.map((t: any) => t.workerId).filter(Boolean)))].map((op: any) => (
                    <option key={op} value={op}>{op}</option>
                 ))}
               </select>
               <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</span>
            </div>
            <div className="relative">
               <select
                 value={operativoFilters.status}
                 onChange={(e) => setOperativoFilters(prev => ({ ...prev, status: e.target.value }))}
                 className="w-full bg-black/40 border border-gray-800 text-white rounded-xl py-3 pl-4 pr-10 text-sm focus:border-sw-yellow outline-none appearance-none"
               >
                 <option value="all">Todos los Estados</option>
                 <option value="Entregado">Entregado</option>
                 <option value="Listo">Listo (Terminado)</option>
                 <option value="Lavando">En Proceso</option>
                 <option value="Cola">En Espera</option>
                 <option value="Anulado">Anulado</option>
               </select>
               <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</span>
            </div>
          </div>

          <div className="panel-glass rounded-2xl border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="bg-black/40 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800">
                  <tr>
                    <th className="p-4">Folio</th>
                    <th className="p-4">Patente</th>
                    <th className="p-4">Servicio</th>
                    <th className="p-4">Ingreso</th>
                    <th className="p-4">Inicio Lav.</th>
                    <th className="p-4">Fin Lav.</th>
                    <th className="p-4">Entrega</th>
                    <th className="p-4">Operador P.</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {getOperativoExportData().map((row: any) => (
                    <tr key={row.ID} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-mono text-xs text-sw-yellow font-bold">{row.ID}</td>
                      <td className="p-4 font-mono text-xs text-white">{row.Patente}</td>
                      <td className="p-4 text-xs text-gray-300 truncate max-w-[150px]">{row.Servicio}</td>
                      <td className="p-4 font-mono text-xs text-gray-400">{row.Hora_Ingreso}</td>
                      <td className="p-4 font-mono text-xs text-gray-400">{row.Inicia_Lavado}</td>
                      <td className="p-4 font-mono text-xs text-gray-400">{row.Termina_Lavado}</td>
                      <td className="p-4 font-mono text-xs text-gray-400">{row.Hora_Entrega}</td>
                      <td className="p-4 text-xs font-bold text-gray-400">{row.Operador_Lavado}</td>
                      <td className="p-4">
                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full border ${
                          row.Estado === 'Entregado' ? 'bg-sw-green/10 border-sw-green text-sw-green' :
                          row.Estado === 'Listo' ? 'bg-sw-blue/10 border-sw-blue text-sw-blue' :
                          row.Estado === 'Lavando' ? 'bg-sw-yellow/10 border-sw-yellow text-sw-yellow' :
                          'bg-gray-800 border-gray-700 text-gray-500'
                        }`}>
                          {row.Estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeSubTab === 'comisiones' ? (
        <div className="space-y-6">
           <div className="panel-glass p-6 rounded-2xl border-t-4 border-sw-blue flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <DollarSign className="text-sw-blue" size={24} /> Reporte de Comisiones Operativas
              </h2>
              <p className="text-gray-400 text-sm mt-2 uppercase font-bold tracking-widest">Resumen de productividad y participación por trabajador.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <select
                  value={selectedWorkerForCommission}
                  onChange={(e) => setSelectedWorkerForCommission(e.target.value)}
                  className="bg-black/40 border border-gray-800 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-sw-blue appearance-none pr-10 font-bold uppercase tracking-widest w-64"
                >
                  <option value="all">Todos los Operadores</option>
                  {Object.keys(reportData.workerStats).map(workerId => (
                    <option key={workerId} value={workerId}>{workerId}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  ▼
                </div>
              </div>
              <button 
                onClick={() => setShowExportModal(true)}
                className="px-6 py-3 rounded-xl bg-sw-blue text-black hover:bg-sw-blue/80 transition-all font-black uppercase tracking-[0.2em] text-[14px] flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,168,255,0.2)]"
              >
                <Download size={16} /> Exportar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
             {Object.entries(reportData.workerStats)
                .filter(([workerId]) => selectedWorkerForCommission === 'all' || workerId === selectedWorkerForCommission)
                .map(([workerId, stats]: any) => (
                <div key={workerId} className="panel-glass p-6 rounded-2xl border border-gray-800 flex justify-between items-center">
                   <div>
                      <h4 className="text-lg font-bold text-white uppercase">{workerId}</h4>
                      <p className="text-gray-400 text-sm uppercase font-bold">{stats.count} Servicios Realizados</p>
                   </div>
                   <div className="text-right">
                      <div className="text-gray-400 text-xs uppercase font-bold mb-1">Monto Generado</div>
                      <div className="text-2xl font-mono font-black text-sw-blue">${stats.total.toLocaleString('es-CL')}</div>
                   </div>
                </div>
             ))}
             {Object.keys(reportData.workerStats).length === 0 && (
                <div className="text-center py-12 p-6 panel-glass border border-dashed border-gray-800 rounded-2xl">
                   <p className="text-gray-500 font-bold uppercase tracking-widest">No hay datos de comisiones para este rango.</p>
                </div>
             )}
          </div>
        </div>
      ) : (
        <ShiftHistoryView 
          shifts={shifts} 
          jobs={jobs} 
          transactions={transactions} 
          onShowZReport={onShowZReport} 
          currentUser={currentUser}
          showToast={showToast}
          logSystemAction={logSystemAction}
        />
      )}

      {activeSubTab === 'tienda' && (
        <div className="space-y-6">
          <div className="panel-glass p-6 rounded-2xl border-t-4 border-sw-green flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <ShoppingCart className="text-sw-green" size={24} /> Reporte de Tienda Express
              </h2>
              <p className="text-gray-400 text-sm mt-2 uppercase font-bold tracking-widest">
                Detalle de productos vendidos en el rango seleccionado.
              </p>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-gray-800">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="bg-transparent pl-9 pr-3 py-2 text-white font-mono text-[14px] outline-none focus:text-sw-blue transition-all w-36"
                  />
                </div>
                <span className="text-gray-600 font-bold">→</span>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                  <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="bg-transparent pl-9 pr-3 py-2 text-white font-mono text-[14px] outline-none focus:text-sw-blue transition-all w-36"
                  />
                </div>
              </div>
              <button 
                onClick={() => setShowExportModal(true)}
                className="px-6 py-3 rounded-xl bg-sw-green text-black hover:bg-sw-green/80 transition-all font-black uppercase tracking-[0.2em] text-[14px] flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,100,0.2)]"
              >
                <Download size={16} /> Exportar Detalle
              </button>
            </div>
          </div>

          <div className="panel-glass p-4 rounded-2xl border border-gray-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
               <input 
                 type="text"
                 placeholder="Buscar por producto..."
                 value={tiendaFilters.product}
                 onChange={(e) => setTiendaFilters(prev => ({ ...prev, product: e.target.value }))}
                 className="w-full bg-black/40 border border-gray-800 text-white rounded-xl py-3 pl-10 pr-4 text-sm focus:border-sw-green outline-none"
               />
            </div>
            <div className="relative">
               <select
                 value={tiendaFilters.operator}
                 onChange={(e) => setTiendaFilters(prev => ({ ...prev, operator: e.target.value }))}
                 className="w-full bg-black/40 border border-gray-800 text-white rounded-xl py-3 pl-4 pr-10 text-sm focus:border-sw-green outline-none appearance-none"
               >
                 <option value="all">Todos los Operadores</option>
                 {[...new Set(jobs.filter((j: any) => j.status === 'Entregado').map((j: any) => j.operatorId || j.openedBy || (j.timeline?.find((t: any) => t.status === 'Listo')?.workerId) || 'Cajero'))].map((op: any) => (
                    <option key={op} value={op}>{op}</option>
                 ))}
               </select>
               <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</span>
            </div>
            <div className="relative">
               <input 
                 type="time"
                 value={tiendaFilters.startTime}
                 onChange={(e) => setTiendaFilters(prev => ({ ...prev, startTime: e.target.value }))}
                 className="w-full bg-black/40 border border-gray-800 text-white font-mono rounded-xl py-3 px-4 text-sm focus:border-sw-green outline-none"
               />
               <span className="absolute -top-2 left-3 bg-[#0d0d0d] px-1 text-[10px] text-gray-500 font-bold uppercase">Hora Inicial</span>
            </div>
            <div className="relative">
               <input 
                 type="time"
                 value={tiendaFilters.endTime}
                 onChange={(e) => setTiendaFilters(prev => ({ ...prev, endTime: e.target.value }))}
                 className="w-full bg-black/40 border border-gray-800 text-white font-mono rounded-xl py-3 px-4 text-sm focus:border-sw-green outline-none"
               />
               <span className="absolute -top-2 left-3 bg-[#0d0d0d] px-1 text-[10px] text-gray-500 font-bold uppercase">Hora Final</span>
            </div>
          </div>
          
          <div className="panel-glass rounded-2xl border border-gray-800 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="bg-black/40 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800">
                  <tr>
                    <th className="p-4">Fecha/Hora</th>
                    <th className="p-4">Folio Venta</th>
                    <th className="p-4">Producto</th>
                    <th className="p-4 text-center">Cantidad</th>
                    <th className="p-4 text-right">Precio Unitario</th>
                    <th className="p-4 text-right">Total</th>
                    <th className="p-4">Vendedor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {getTiendaExportData().map((row: any, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-mono text-xs text-gray-400">{row.Fecha}</td>
                      <td className="p-4 font-mono text-xs text-sw-green font-bold">{row.ID_Venta}</td>
                      <td className="p-4 text-xs text-white">{row.Producto}</td>
                      <td className="p-4 text-center font-mono text-xs text-gray-300">{row.Cantidad}</td>
                      <td className="p-4 text-right font-mono text-xs text-gray-400">${Math.round(row.PrecioUnitario).toLocaleString('es-CL')}</td>
                      <td className="p-4 text-right font-mono text-xs text-sw-green font-bold">${Math.round(row.Total).toLocaleString('es-CL')}</td>
                      <td className="p-4 text-xs font-bold text-gray-300 uppercase tracking-tight">{row.Vendedor}</td>
                    </tr>
                  ))}
                  {getTiendaExportData().length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500 text-sm italic">
                        No hay productos vendidos en este período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <ExportDataModal 
          title={
            activeSubTab === 'tienda' ? "Reporte Detallado de Tienda" : 
            activeSubTab === 'operativo' ? "Historial de Operaciones" :
            activeSubTab === 'comisiones' ? "Reporte de Comisiones" : 
            "Reporte de Ventas"
          }
          data={
            activeSubTab === 'tienda' ? getTiendaExportData() : 
            activeSubTab === 'operativo' ? getOperativoExportData() :
            activeSubTab === 'comisiones' 
              ? jobs.filter((j: any) => j.status === 'Entregado').map((j: any) => ({ ...j, workerId: j.timeline?.find((t: any) => t.status === 'Listo')?.workerId || 'Sin Asignar' })).filter((j: any) => selectedWorkerForCommission === 'all' || j.workerId === selectedWorkerForCommission)
              : getVentasExportData()
          }
          initialDateRange={dateRange}
          columns={
            activeSubTab === 'comisiones' ? [
              { header: 'ID', key: 'id' },
              { header: 'Patente', key: 'plate' },
              { header: 'Trabajador', key: 'workerId' },
              { header: 'Servicio', key: 'serviceName' },
              { header: 'Total Servicio', key: 'serviceTotal' },
              { header: 'Total Venta', key: 'total' },
              { header: 'Fecha', key: 'FECHA' }
            ] : activeSubTab === 'tienda' ? [
              { header: 'Fecha', key: 'Fecha' },
              { header: 'Folio Venta', key: 'ID_Venta' },
              { header: 'Producto', key: 'Producto' },
              { header: 'Cantidad', key: 'Cantidad' },
              { header: 'Precio Unitario', key: 'PrecioUnitario' },
              { header: 'Total Compra', key: 'Total' },
              { header: 'Vendedor', key: 'Vendedor' }
            ] : activeSubTab === 'operativo' ? [
              { header: 'Folio', key: 'ID' },
              { header: 'Patente', key: 'Patente' },
              { header: 'Servicio', key: 'Servicio' },
              { header: 'Ingreso', key: 'Hora_Ingreso' },
              { header: 'Inicio Lavado', key: 'Inicia_Lavado' },
              { header: 'Fin Lavado', key: 'Termina_Lavado' },
              { header: 'Entrega', key: 'Hora_Entrega' },
              { header: 'Operador Lavado', key: 'Operador_Lavado' },
              { header: 'Operador Entrega', key: 'Operador_Entrega' },
              { header: 'Estado', key: 'Estado' },
              { header: 'Total', key: 'Total' }
            ] : [
              { header: 'FECHA', key: 'FECHA' },
              { header: 'ID', key: 'ID' },
              { header: 'Patente', key: 'Patente' },
              { header: 'Cliente', key: 'Cliente' },
              { header: 'Servicio principal', key: 'mainServiceSum' },
              { header: 'Servicio complementarios', key: 'compServiceSum' },
              { header: 'Venta en tienda', key: 'storeSum' },
              { header: 'Total', key: 'total' },
              { header: 'Método Pago', key: 'paymentMethod' },
              { header: 'Documento', key: 'docType' },
              { header: 'Estado', key: 'status' },
              { header: 'Neto Servicios', key: 'netoServicio' },
              { header: 'Comisión', key: 'comision' },
              { header: 'Operador', key: 'operador' },
              { header: 'Acumulado', key: 'acumulado' }
            ]
          }
          onClose={() => setShowExportModal(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
};

