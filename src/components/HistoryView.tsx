import React, { useState, useEffect } from 'react';
import { Search, History, Download, FileSpreadsheet, Eye, LayoutGrid, List, GripVertical, Printer } from 'lucide-react';
import { Reorder, AnimatePresence, motion } from 'motion/react';
import { exportToExcel, generateDeliveryVoucher } from '../lib/utils';

const DEFAULT_COLUMNS = [
  { id: 'id', label: 'ID' },
  { id: 'plate', label: 'Patente' },
  { id: 'client', label: 'Cliente' },
  { id: 'service', label: 'Servicio' },
  { id: 'entry', label: 'Ingreso' },
  { id: 'exit', label: 'Entrega' },
  { id: 'total', label: 'Total' },
  { id: 'payment', label: 'Pago' },
  { id: 'doc', label: 'Doc' },
];

export const HistoryView = ({ jobs, shifts, showToast, setDetailModalJobId }: any) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [filterMode, setFilterMode] = useState<'current' | 'previous' | 'all'>('current');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('history_columns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem('history_columns', JSON.stringify(columns));
  }, [columns]);
  
  const currentShift = shifts.find((s: any) => s.status === 'open');
  
  const historyJobs = jobs.filter((j: any) => {
    const isDelivered = j.status === 'Entregado';
    const matchesSearch = j.plate.includes(searchTerm.toUpperCase()) || j.id.includes(searchTerm.toUpperCase());
    
    if (!isDelivered || !matchesSearch) return false;

    if (filterMode === 'current') {
      if (!currentShift) return false;
      return j.shiftId === currentShift.id || j.exitDate >= currentShift.openedAt;
    }

    if (filterMode === 'previous') {
      const jobDate = new Date(j.exitDate).toISOString().split('T')[0];
      return jobDate === selectedDate;
    }

    return true;
  });

  const totalRevenue = historyJobs.reduce((sum: number, j: any) => sum + j.total, 0);

  const handleExport = () => {
    const data = historyJobs.map((j: any) => ({
      ID: j.id,
      Patente: j.plate,
      Cliente: j.clientName || 'N/A',
      Servicio: j.serviceName || 'Venta Tienda',
      Ingreso: new Date(j.entryDate).toLocaleString('es-CL'),
      Entrega: j.exitDate ? new Date(j.exitDate).toLocaleString('es-CL') : 'N/A',
      Total: j.total,
      MetodoPago: j.paymentMethod || 'N/A',
      Documento: j.docType || 'N/A'
    }));
    exportToExcel('historial_lavados.xlsx', data);
    showToast('Historial exportado', 'success');
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-[600px]">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 panel-glass p-6 rounded-xl border-t-4 border-sw-yellow">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3 sw-title-font text-sw-yellow tracking-widest">
            <History size={28} /> HISTORIAL DE OPERACIONES
          </h2>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1">Registro completo de misiones finalizadas.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex bg-black/40 p-1 rounded-lg border border-gray-800">
            <button 
              onClick={() => setFilterMode('current')}
              className={`px-4 py-2 rounded text-xs sm:text-sm font-bold uppercase tracking-widest transition-all ${filterMode === 'current' ? 'bg-sw-blue text-black' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Turno Actual
            </button>
            <button 
              onClick={() => setFilterMode('previous')}
              className={`px-4 py-2 rounded text-xs sm:text-sm font-bold uppercase tracking-widest transition-all ${filterMode === 'previous' ? 'bg-sw-blue text-black' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Día Específico
            </button>
            <button 
              onClick={() => setFilterMode('all')}
              className={`px-4 py-2 rounded text-xs sm:text-sm font-bold uppercase tracking-widest transition-all ${filterMode === 'all' ? 'bg-sw-blue text-black' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Todo
            </button>
          </div>

          {filterMode === 'previous' && (
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-black border border-gray-700 rounded px-4 py-2 text-sm text-white outline-none focus:border-sw-blue"
            />
          )}

          <div className="flex bg-black/40 p-1 rounded-lg border border-gray-800">
            <button 
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-all ${viewMode === 'cards' ? 'bg-sw-blue text-black' : 'text-gray-500 hover:text-gray-300'}`}
              title="Vista Tarjetas"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-sw-blue text-black' : 'text-gray-500 hover:text-gray-300'}`}
              title="Vista Tabla"
            >
              <List size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 bg-black px-4 py-2 rounded-lg border border-gray-700 w-full sm:w-64 shadow-inner focus-within:border-sw-yellow transition-all">
            <Search size={18} className="text-gray-500" />
            <input 
              type="text" 
              placeholder="BUSCAR PATENTE O ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-white text-sm outline-none w-full font-mono font-bold uppercase tracking-wider"
            />
          </div>
          <button 
            onClick={handleExport}
            className="p-2.5 rounded-lg bg-sw-yellow/10 border border-sw-yellow text-sw-yellow hover:bg-sw-yellow hover:text-black transition-all shadow-[0_0_10px_rgba(255,232,31,0.2)] flex items-center gap-2"
            title="Exportar Excel"
          >
            <Download size={20} />
            <span className="hidden sm:inline text-sm font-bold uppercase tracking-widest">Exportar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="panel-glass p-4 rounded-xl border border-gray-800 flex justify-between items-center">
          <div className="text-gray-500 text-xs font-bold uppercase tracking-widest">Total Transacciones</div>
          <div className="text-2xl font-mono font-black text-white">{historyJobs.length}</div>
        </div>
        <div className="panel-glass p-4 rounded-xl border border-gray-800 flex justify-between items-center">
          <div className="text-gray-500 text-xs font-bold uppercase tracking-widest">Recaudación Total</div>
          <div className="text-2xl font-mono font-black text-sw-green">${totalRevenue.toLocaleString('es-CL')}</div>
        </div>
        <div className="panel-glass p-4 rounded-xl border border-gray-800 flex justify-between items-center">
          <div className="text-gray-500 text-xs font-bold uppercase tracking-widest">Ticket Promedio</div>
          <div className="text-2xl font-mono font-black text-sw-blue">
            ${historyJobs.length ? Math.floor(totalRevenue / historyJobs.length).toLocaleString('es-CL') : 0}
          </div>
        </div>
      </div>

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {historyJobs.map((job: any) => (
            <div 
              key={job.id} 
              onClick={() => setDetailModalJobId(job.id)} 
              className="panel-glass p-4 rounded-xl border-l-4 border-gray-600 hover:border-sw-blue transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-xl font-mono font-bold text-white group-hover:text-sw-blue transition-colors">{job.plate}</div>
                  <div className="text-xs text-sw-yellow font-bold uppercase tracking-widest">{job.clientName || 'Cliente'}</div>
                </div>
                <span className="bg-black/50 px-2 py-1 rounded text-xs font-bold uppercase tracking-widest text-gray-400">{job.id}</span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="text-xs font-bold text-gray-300 uppercase tracking-widest">{job.serviceName || 'Venta Tienda'}</div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-gray-400">
                  <div>
                    <div className="uppercase text-gray-500 mb-0.5">Ingreso</div>
                    <div className="text-white">{new Date(job.entryDate).toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})}</div>
                    <div>{new Date(job.entryDate).toLocaleDateString('es-CL')}</div>
                  </div>
                  {job.exitDate && (
                    <div>
                      <div className="uppercase text-gray-500 mb-0.5">Entrega</div>
                      <div className="text-white">{new Date(job.exitDate).toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})}</div>
                      <div>{new Date(job.exitDate).toLocaleDateString('es-CL')}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                <div className="text-lg font-bold text-sw-green font-mono">${job.total?.toLocaleString('es-CL')}</div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); generateDeliveryVoucher(job); }}
                    className="p-2 text-gray-400 hover:text-sw-blue transition-colors"
                    title="Imprimir Voucher"
                  >
                    <Printer size={18} />
                  </button>
                  <span className="text-xs bg-gray-800 px-2 py-0.5 rounded font-bold uppercase tracking-widest text-gray-300">
                    {job.paymentMethod?.split(' ')[0]}
                  </span>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{job.docType}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel-glass rounded-xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-black/80">
                <Reorder.Group axis="x" values={columns} onReorder={setColumns} as="tr" className="border-b border-gray-700">
                  {columns.map((col: any) => (
                    <Reorder.Item 
                      key={col.id} 
                      value={col} 
                      as="th" 
                      className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical size={12} className="text-gray-700" />
                        {col.label}
                      </div>
                    </Reorder.Item>
                  ))}
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Acciones</th>
                </Reorder.Group>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {historyJobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-white/5 transition-colors group">
                    {columns.map((col: any) => (
                      <td key={col.id} className="p-4">
                        {col.id === 'id' && <span className="text-xs font-mono text-gray-500">{job.id}</span>}
                        {col.id === 'plate' && <span className="text-xl font-mono font-black text-sw-blue">{job.plate}</span>}
                        {col.id === 'client' && <span className="text-sm font-bold text-white uppercase tracking-wide">{job.clientName || 'N/A'}</span>}
                        {col.id === 'service' && <span className="text-sm text-gray-400 uppercase tracking-widest">{job.serviceName || 'Venta Tienda'}</span>}
                        {col.id === 'entry' && (
                          <div className="text-xs font-mono text-gray-500">
                            <div className="text-white">{new Date(job.entryDate).toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})}</div>
                            <div>{new Date(job.entryDate).toLocaleDateString('es-CL')}</div>
                          </div>
                        )}
                        {col.id === 'exit' && (
                          <div className="text-xs font-mono text-gray-500">
                            {job.exitDate ? (
                              <>
                                <div className="text-white">{new Date(job.exitDate).toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})}</div>
                                <div>{new Date(job.exitDate).toLocaleDateString('es-CL')}</div>
                              </>
                            ) : '-'}
                          </div>
                        )}
                        {col.id === 'total' && <span className="text-base font-mono font-bold text-sw-green">${job.total?.toLocaleString('es-CL')}</span>}
                        {col.id === 'payment' && <span className="text-xs bg-gray-800 px-2 py-0.5 rounded font-bold text-gray-300">{job.paymentMethod?.split(' ')[0]}</span>}
                        {col.id === 'doc' && <span className="text-xs text-gray-500 font-bold uppercase">{job.docType}</span>}
                      </td>
                    ))}
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => generateDeliveryVoucher(job)}
                        className="p-2 text-gray-500 hover:text-sw-blue transition-colors"
                        title="Imprimir Voucher"
                      >
                        <Printer size={18} />
                      </button>
                      <button 
                        onClick={() => setDetailModalJobId(job.id)}
                        className="p-2 text-gray-500 hover:text-sw-blue transition-colors"
                        title="Ver Detalle"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {historyJobs.length === 0 && (
        <div className="col-span-full p-12 text-center text-gray-600 font-bold uppercase tracking-widest italic border-2 border-dashed border-gray-800 rounded-xl">
          No se encontraron registros en los archivos imperiales.
        </div>
      )}
    </div>
  );
};
