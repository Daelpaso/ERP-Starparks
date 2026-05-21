import React, { useState } from 'react';
import { X, FileText, Download, Calendar, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExportDataModalProps {
  title: string;
  data: any[];
  columns: { header: string; key: string }[];
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
  initialDateRange?: { start: string; end: string };
}

export const ExportDataModal = ({ title, data, columns, onClose, showToast, initialDateRange }: ExportDataModalProps) => {
  const [dateRange, setDateRange] = useState(initialDateRange || {
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [formatType, setFormatType] = useState<'csv' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [includeAll, setIncludeAll] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const getFilteredData = () => {
    let filtered = includeAll ? data : data.filter(item => {
      const itemDate = item.fechaOriginal || item.date || item.createdAt || item.timestamp || item.entryDate || item.exitDate || item.openedAt || item.closedAt;
      if (!itemDate) return true; 
      
      let date;
      if (itemDate && typeof itemDate.toDate === 'function') {
        date = itemDate.toDate();
      } else if (itemDate && typeof itemDate.seconds === 'number') {
        date = new Date(itemDate.seconds * 1000);
      } else {
        date = new Date(itemDate);
      }
      
      if (isNaN(date.getTime())) return true; // Include if we can't parse it to be safe
      
      const [sy, sm, sd] = dateRange.start.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
      
      const [ey, em, ed] = dateRange.end.split('-').map(Number);
      const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
      
      return date >= start && date <= end;
    });

    const hasAcumulado = columns.some(c => c.key === 'acumulado');
    if (hasAcumulado) {
      filtered = [...filtered].sort((a, b) => {
        const da = new Date(a.fechaOriginal || a.entryDate || 0).getTime();
        const db = new Date(b.fechaOriginal || b.entryDate || 0).getTime();
        return da - db;
      });

      let runningTotal = 0;
      filtered = filtered.map(item => {
        if (item.status === 'Entregado') {
          runningTotal += (item.total || 0);
        }
        return {
          ...item,
          acumulado: item.status === 'Entregado' ? runningTotal : 0
        };
      });
    }

    return filtered;
  };

  const handleExport = async (isPreview = false) => {
    setIsExporting(true);
    try {
      const filteredData = getFilteredData();

      if (filteredData.length === 0) {
        showToast('No hay datos en el rango seleccionado', 'error');
        setIsExporting(false);
        return;
      }

      const fileName = `${title.toLowerCase().replace(/\s+/g, '_')}_${dateRange.start}_to_${dateRange.end}`;

      if (formatType === 'csv' && !isPreview) {
        const worksheet = XLSX.utils.json_to_sheet(
          filteredData.map(item => {
            const row: any = {};
            columns.forEach(col => {
              let val = item[col.key];
              if (col.key === 'entryDate' || col.key === 'timestamp' || col.key === 'date') {
                val = format(new Date(val), 'dd-MM-yyyy HH:mm');
              } else if (typeof val === 'number' && (col.key.toLowerCase().includes('total') || col.key.toLowerCase().includes('price') || col.key.toLowerCase().includes('amount') || col.key.includes('Sum') || col.key.includes('neto') || col.key.includes('comision') || col.key === 'acumulado')) {
                val = val; 
                // In XLSX it's better to keep it as number and not prefix $ so users can sum it!
              }
              row[col.header] = val === null || val === undefined ? '-' : val;
            });
            return row;
          })
        );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
        showToast(`Exportación exitosa (XLSX)`, 'success');
        onClose();
      } else {
        const doc = new jsPDF();
        
        // Add Title
        doc.setFontSize(18);
        doc.setTextColor(41, 128, 185); 
        doc.text(title.toUpperCase(), 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Rango: ${dateRange.start} al ${dateRange.end}`, 14, 30);
        doc.text(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 35);

        const tableData = filteredData.map(item => columns.map(col => {
          const val = item[col.key];
          if (typeof val === 'number' && (col.key.toLowerCase().includes('total') || col.key.toLowerCase().includes('price') || col.key.toLowerCase().includes('amount') || col.key.includes('Sum') || col.key.includes('neto') || col.key.includes('comision') || col.key === 'acumulado')) {
            return `$${val.toLocaleString('es-CL')}`;
          }
          if (col.key === 'entryDate' || col.key === 'timestamp' || col.key === 'date') {
            return format(new Date(val), 'dd-MM-yyyy HH:mm');
          }
          return val === null || val === undefined ? '-' : String(val);
        }));

        autoTable(doc, {
          startY: 45,
          head: [columns.map(col => col.header)],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [52, 73, 94], textColor: [255, 255, 255], fontSize: 10 },
          bodyStyles: { fontSize: 9 },
          alternateRowStyles: { fillColor: [240, 240, 240] }
        });

        if (isPreview) {
          const pdfBlob = doc.output('blob');
          const url = URL.createObjectURL(pdfBlob);
          setPreviewPdfUrl(url);
        } else {
          doc.save(`${fileName}.pdf`);
          showToast(`Exportación exitosa (PDF)`, 'success');
          onClose();
        }
      }
    } catch (error) {
      console.error(error);
      showToast('Error al procesar el reporte', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black/90 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="panel-glass rounded-3xl p-8 w-full max-w-lg border border-sw-blue/30 shadow-[0_0_50px_rgba(0,168,255,0.2)]">
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <Download className="text-sw-blue" size={24} />
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Exportar {title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-sw-red transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-8">
          <div className={`space-y-4 transition-all ${includeAll ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
            <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} /> Seleccionar Rango de Fechas
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 border border-gray-800 rounded-2xl p-4">
                <span className="block text-[14px] text-gray-500 mb-1 uppercase font-bold">Desde</span>
                <input 
                  type="date"
                  value={dateRange.start}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="bg-transparent border-none text-white outline-none w-full font-mono"
                />
              </div>
              <div className="bg-black/40 border border-gray-800 rounded-2xl p-4">
                <span className="block text-[14px] text-gray-500 mb-1 uppercase font-bold">Hasta</span>
                <input 
                  type="date"
                  value={dateRange.end}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="bg-transparent border-none text-white outline-none w-full font-mono"
                />
              </div>
            </div>
          </div>

          <button 
            onClick={() => setIncludeAll(!includeAll)}
            className="flex items-center gap-3 group"
          >
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${includeAll ? 'bg-sw-blue border-sw-blue text-black' : 'border-gray-700 bg-black/40 group-hover:border-sw-blue'}`}>
              {includeAll && <CheckCircle2 size={14} />}
            </div>
            <span className={`text-[14px] font-bold uppercase tracking-widest ${includeAll ? 'text-sw-blue' : 'text-gray-500 group-hover:text-gray-300'}`}>
              Exportar todo el historial (Sin filtro de fecha)
            </span>
          </button>

          {/* Format Selection */}
          <div className="space-y-4">
            <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <FileText size={14} /> Formato de Archivo
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setFormatType('csv')}
                className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${
                  formatType === 'csv' 
                    ? 'bg-sw-yellow/10 border-sw-yellow text-sw-yellow shadow-[0_0_20px_rgba(255,232,31,0.15)]' 
                    : 'bg-black/40 border-gray-800 text-gray-500 hover:border-gray-700'
                }`}
              >
                <Download size={32} />
                <span className="text-[14px] font-black uppercase tracking-widest">Excel (XLSX)</span>
                {formatType === 'csv' && <CheckCircle2 size={16} className="absolute top-3 right-3" />}
              </button>
              <button 
                onClick={() => setFormatType('pdf')}
                className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${
                  formatType === 'pdf' 
                    ? 'bg-sw-blue/10 border-sw-blue text-sw-blue shadow-[0_0_20px_rgba(0,168,255,0.15)]' 
                    : 'bg-black/40 border-gray-800 text-gray-500 hover:border-gray-700'
                }`}
              >
                <FileText size={32} />
                <span className="text-[14px] font-black uppercase tracking-widest">Documento (PDF)</span>
                {formatType === 'pdf' && <CheckCircle2 size={16} className="absolute top-3 right-3" />}
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            {formatType === 'pdf' && (
              <button 
                onClick={() => handleExport(true)}
                disabled={isExporting}
                className="flex-1 py-5 bg-black/40 text-sw-blue border border-sw-blue/50 font-black uppercase tracking-widest text-[14px] rounded-2xl hover:bg-sw-blue/10 transition-all flex items-center justify-center gap-3"
              >
                {isExporting ? 'CARGANDO...' : 'PREVISUALIZAR PDF'}
              </button>
            )}
            <button 
              onClick={() => handleExport(false)}
              disabled={isExporting}
              className={`flex-[2] py-5 bg-white text-black font-black uppercase tracking-[0.3em] text-[14px] rounded-2xl hover:bg-sw-blue hover:text-black transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3`}
            >
              {isExporting ? 'PROCESANDO...' : 'GENERAR REPORTE'}
            </button>
          </div>
        </div>

        {previewPdfUrl && (
          <div className="fixed inset-0 z-[600] bg-black/95 flex flex-col p-4 md:p-10 animate-in fade-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white uppercase tracking-widest">Previsualización de Reporte</h3>
                <button 
                   onClick={() => {
                      URL.revokeObjectURL(previewPdfUrl);
                      setPreviewPdfUrl(null);
                   }}
                   className="p-3 bg-sw-red/20 text-sw-red rounded-full hover:bg-sw-red hover:text-white transition-all"
                >
                   <X size={24} />
                </button>
             </div>
             <div className="flex-1 bg-white rounded-2xl overflow-hidden shadow-2xl">
                <iframe src={previewPdfUrl} className="w-full h-full" title="PDF Preview" />
             </div>
             <div className="mt-6 flex justify-center">
                <button 
                   onClick={() => handleExport(false)}
                   className="px-12 py-5 bg-sw-blue text-black font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-lg"
                >
                   Descargar este PDF
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
