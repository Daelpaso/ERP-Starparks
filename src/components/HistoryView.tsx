import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Search, History, Download, FileSpreadsheet, Eye, LayoutGrid, List, GripVertical, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Reorder, AnimatePresence, motion } from 'motion/react';
import { exportToExcel } from '../lib/utils';
import { ExportDataModal } from './ExportDataModal';

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
  const [sortConfig, setSortConfig] = useState({ key: 'exit', direction: 'desc' });
  const [filterMode, setFilterMode] = useState<'current' | 'previous' | 'all'>('current');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('history_columns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem('history_columns', JSON.stringify(columns));
  }, [columns]);
  
  const currentShift = shifts.find((s: any) => s.status === 'open');
  
  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const historyJobs = jobs.filter((j: any) => {
    const isDelivered = j.status === 'Entregado';
    const isAnulado = j.status === 'Anulado';
    const plate = (j.plate || '').toUpperCase();
    const id = (j.id || '').toUpperCase();
    const matchesSearch = plate.includes(searchTerm.toUpperCase()) || id.includes(searchTerm.toUpperCase());
    
    if (!(isDelivered || isAnulado) || !matchesSearch) return false;

    if (filterMode === 'current') {
      if (!currentShift) return false;
      return j.exitDate >= currentShift.openedAt;
    }

    if (filterMode === 'previous') {
      const jobDate = new Date(j.exitDate).toISOString().split('T')[0];
      return jobDate === selectedDate;
    }

    return true;
  }).sort((a: any, b: any) => {
    let aValue: any = a[sortConfig.key] || '';
    let bValue: any = b[sortConfig.key] || '';

    if (sortConfig.key === 'entry') aValue = a.entryDate;
    if (sortConfig.key === 'entry') bValue = b.entryDate;
    if (sortConfig.key === 'exit') aValue = a.exitDate || 0;
    if (sortConfig.key === 'exit') bValue = b.exitDate || 0;
    if (sortConfig.key === 'client') aValue = a.clientName || '';
    if (sortConfig.key === 'client') bValue = b.clientName || '';
    if (sortConfig.key === 'service') aValue = a.serviceName || '';
    if (sortConfig.key === 'service') bValue = b.serviceName || '';
    if (sortConfig.key === 'payment') aValue = a.paymentMethod || '';
    if (sortConfig.key === 'payment') bValue = b.paymentMethod || '';
    if (sortConfig.key === 'doc') aValue = a.docType || '';
    if (sortConfig.key === 'doc') bValue = b.docType || '';

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalRevenue = historyJobs.reduce((sum: number, j: any) => sum + j.total, 0);

  // Pagination logic
  const totalItems = historyJobs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedJobs = historyJobs.slice(startIndex, startIndex + itemsPerPage);

  const handleExport = () => {
    setShowExportModal(true);
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-[600px]">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 panel-glass p-6 rounded-xl border-t-4 border-sw-yellow">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3 sw-title-font text-sw-yellow tracking-widest">
            <History size={28} /> HISTORIAL DE OPERACIONES
          </h2>
          <p className="text-gray-400 text-[14px] uppercase tracking-widest mt-1">Registro completo de misiones finalizadas.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex bg-black/40 p-1 rounded-lg border border-gray-800">
            <button 
              onClick={() => setFilterMode('current')}
              className={`px-3 py-1.5 rounded text-[14px] font-bold uppercase tracking-widest transition-all ${filterMode === 'current' ? 'bg-sw-blue text-black' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Turno Actual
            </button>
            <button 
              onClick={() => setFilterMode('previous')}
              className={`px-3 py-1.5 rounded text-[14px] font-bold uppercase tracking-widest transition-all ${filterMode === 'previous' ? 'bg-sw-blue text-black' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Día Específico
            </button>
            <button 
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded text-[14px] font-bold uppercase tracking-widest transition-all ${filterMode === 'all' ? 'bg-sw-blue text-black' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Todo
            </button>
          </div>

          {filterMode === 'previous' && (
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-black border border-gray-700 rounded px-3 py-1.5 text-[14px] text-white outline-none focus:border-sw-blue"
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
            <span className="hidden sm:inline text-[14px] font-bold uppercase tracking-widest">Exportar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="panel-glass p-4 rounded-xl border border-gray-800 flex justify-between items-center">
          <div className="text-gray-500 text-[14px] font-bold uppercase tracking-widest">Total Transacciones</div>
          <div className="text-2xl font-mono font-black text-white">{historyJobs.length}</div>
        </div>
        <div className="panel-glass p-4 rounded-xl border border-gray-800 flex justify-between items-center">
          <div className="text-gray-500 text-[14px] font-bold uppercase tracking-widest">Recaudación Total</div>
          <div className="text-2xl font-mono font-black text-sw-green">${totalRevenue.toLocaleString('es-CL')}</div>
        </div>
        <div className="panel-glass p-4 rounded-xl border border-gray-800 flex justify-between items-center">
          <div className="text-gray-500 text-[14px] font-bold uppercase tracking-widest">Ticket Promedio</div>
          <div className="text-2xl font-mono font-black text-sw-blue">
            ${historyJobs.length ? Math.floor(totalRevenue / historyJobs.length).toLocaleString('es-CL') : 0}
          </div>
        </div>
      </div>

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedJobs.map((job: any) => (
            <div 
              key={job.id} 
              onClick={() => setDetailModalJobId(job.id)} 
              className={`panel-glass p-4 rounded-xl border-l-4 transition-all cursor-pointer group ${
                job.status === 'Anulado' ? 'border-sw-red bg-sw-red/5' : 'border-gray-600 hover:border-sw-blue'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className={`text-xl font-mono font-bold transition-colors ${
                    job.status === 'Anulado' ? 'text-sw-red group-hover:text-sw-red/70' : 'text-white group-hover:text-sw-blue'
                  }`}>{job.plate}</div>
                  <div className="text-[14px] text-sw-yellow font-bold uppercase tracking-widest">{job.clientName || 'Cliente'}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="bg-black/50 px-2 py-1 rounded text-[14px] font-bold uppercase tracking-widest text-gray-400">{job.id}</span>
                  {job.status === 'Anulado' && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="bg-sw-red text-white px-2 py-0.5 rounded text-[14px] font-black uppercase tracking-widest">ANULADO</span>
                      {job.deletionReason && (
                        <span className="text-[14px] text-sw-red font-bold uppercase tracking-tight max-w-[120px] text-right line-clamp-1">Motivo: {job.deletionReason}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="text-[18px] font-bold text-gray-300 uppercase tracking-widest">{job.serviceName || 'Venta Tienda'}</div>
                <div className="grid grid-cols-2 gap-2 text-[14px] font-mono text-gray-400">
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
                  <span className="text-[14px] bg-gray-800 px-2 py-0.5 rounded font-bold uppercase tracking-widest text-gray-300">
                    {job.paymentMethod?.split(' ')[0]}
                  </span>
                  <span className="text-[14px] text-gray-400 font-bold uppercase tracking-widest">{job.docType}</span>
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
                      onClick={() => handleSort(col.id)}
                      className="p-4 text-[14px] font-bold text-gray-500 uppercase tracking-widest cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors group/header"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical size={12} className="text-gray-700" />
                        {col.label}
                        {sortConfig.key === col.id && (
                          <ArrowUpDown size={12} className={sortConfig.direction === 'asc' ? 'text-sw-yellow' : 'text-sw-yellow rotate-180'} />
                        )}
                      </div>
                    </Reorder.Item>
                  ))}
                  <th className="p-4 text-[14px] font-bold text-gray-500 uppercase tracking-widest text-right">Acciones</th>
                </Reorder.Group>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {paginatedJobs.map((job: any) => (
                  <tr key={job.id} className={`hover:bg-white/5 transition-colors group ${job.status === 'Anulado' ? 'opacity-70 bg-sw-red/5' : ''}`}>
                    {columns.map((col: any) => (
                      <td key={col.id} className="p-4">
                        {col.id === 'id' && <span className="text-[14px] font-mono text-gray-500">{job.id}</span>}
                        {col.id === 'plate' && (
                          <div className="flex flex-col">
                            <span className={`text-lg font-mono font-black ${job.status === 'Anulado' ? 'text-sw-red' : 'text-sw-blue'}`}>{job.plate}</span>
                            {job.status === 'Anulado' && (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[14px] font-black uppercase text-sw-red bg-sw-red/10 px-1 rounded self-start leading-tight">Anulado</span>
                                {job.deletionReason && (
                                  <span className="text-[14px] text-gray-500 font-bold uppercase truncate max-w-[150px]">Raz: {job.deletionReason}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {col.id === 'client' && <span className="text-[14px] font-bold text-white uppercase tracking-wide">{job.clientName || 'N/A'}</span>}
                        {col.id === 'service' && <span className="text-[14px] text-gray-400 uppercase tracking-widest">{job.serviceName || 'Venta Tienda'}</span>}
                        {col.id === 'entry' && (
                          <div className="text-[14px] font-mono text-gray-500">
                            <div className="text-white">{new Date(job.entryDate).toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})}</div>
                            <div>{new Date(job.entryDate).toLocaleDateString('es-CL')}</div>
                          </div>
                        )}
                        {col.id === 'exit' && (
                          <div className="text-[14px] font-mono text-gray-500">
                            {job.exitDate ? (
                              <>
                                <div className="text-white">{new Date(job.exitDate).toLocaleTimeString('es-CL', {hour:'2-digit', minute:'2-digit'})}</div>
                                <div>{new Date(job.exitDate).toLocaleDateString('es-CL')}</div>
                              </>
                            ) : '-'}
                          </div>
                        )}
                        {col.id === 'total' && <span className="text-sm font-mono font-bold text-sw-green">${job.total?.toLocaleString('es-CL')}</span>}
                        {col.id === 'payment' && <span className="text-[14px] bg-gray-800 px-2 py-0.5 rounded font-bold text-gray-300">{job.paymentMethod?.split(' ')[0]}</span>}
                        {col.id === 'doc' && <span className="text-[14px] text-gray-500 font-bold uppercase">{job.docType}</span>}
                      </td>
                    ))}
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setDetailModalJobId(job.id)}
                        className="p-2 text-gray-500 hover:text-sw-blue transition-colors"
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

      {/* Pagination Controls */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 panel-glass p-4 rounded-xl border border-gray-800">
          <div className="text-[14px] font-black text-gray-500 uppercase tracking-[0.3em]">
            Mostrando <span className="text-white">{startIndex}</span> - <span className="text-white">{Math.min(startIndex + itemsPerPage, totalItems)}</span> de <span className="text-sw-yellow">{totalItems}</span> operaciones
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-black/40 border border-gray-800 text-gray-500 hover:text-sw-blue disabled:opacity-30 disabled:hover:text-gray-500 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum = i + 1;
                // Basic logic to show pages around current
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 3 + i + 1;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-[14px] font-black transition-all ${currentPage === pageNum ? 'bg-sw-blue text-black shadow-[0_0_10px_rgba(0,168,255,0.3)]' : 'bg-black/20 text-gray-500 hover:text-white border border-gray-800'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-black/40 border border-gray-800 text-gray-500 hover:text-sw-blue disabled:opacity-30 disabled:hover:text-gray-500 transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {showExportModal && (
        <ExportDataModal 
          title="Historial de Operaciones"
          data={historyJobs.map((j: any) => ({
            ...j,
            operator_fmt: j.timeline?.find((t: any) => t.status === 'Listo')?.workerId || j.operatorId || j.openedBy || 'Sin Asignar',
            entryTime_fmt: j.entryDate ? format(new Date(j.entryDate), 'dd-MM-yyyy HH:mm') : '-',
            washTime_fmt: j.timeline?.find((t: any) => t.status === 'Lavando')?.timestamp 
              ? format(new Date(j.timeline.find((t: any) => t.status === 'Lavando').timestamp), 'dd-MM-yyyy HH:mm') : '-',
            readyTime_fmt: j.timeline?.find((t: any) => t.status === 'Listo')?.timestamp 
              ? format(new Date(j.timeline.find((t: any) => t.status === 'Listo').timestamp), 'dd-MM-yyyy HH:mm') : '-',
            exitTime_fmt: j.exitDate ? format(new Date(j.exitDate), 'dd-MM-yyyy HH:mm') : '-'
          }))}
          initialDateRange={filterMode === 'previous' ? { start: selectedDate, end: selectedDate } : undefined}
          columns={[
            { header: 'ID', key: 'id' },
            { header: 'Patente', key: 'plate' },
            { header: 'Cliente', key: 'clientName' },
            { header: 'Servicio', key: 'serviceName' },
            { header: 'Total', key: 'total' },
            { header: 'Método Pago', key: 'paymentMethod' },
            { header: 'Documento', key: 'docType' },
            { header: 'Ingreso', key: 'entryTime_fmt' },
            { header: 'Paso a Lavado', key: 'washTime_fmt' },
            { header: 'Terminado', key: 'readyTime_fmt' },
            { header: 'Entrega (Pagado)', key: 'exitTime_fmt' },
            { header: 'Operador', key: 'operator_fmt' }
          ]}
          onClose={() => setShowExportModal(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
};
