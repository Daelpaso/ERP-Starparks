import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const validarPatenteChilena = (patente: string) => {
  if (!patente) return false;
  const limpia = patente.replace(/-/g, '').toUpperCase(); 
  const regexAutosAntiguos = /^[A-Z]{2}[0-9]{4}$/; 
  const regexAutosActuales = /^[BCDFGHJKLPRSTVWXYZ]{4}[0-9]{2}$/;
  const regexMotos = /^[A-Z]{2}[0-9]{3}$|^[BCDFGHJKLPRSTVWXYZ]{3}[0-9]{2}$/;
  return regexAutosAntiguos.test(limpia) || regexAutosActuales.test(limpia) || regexMotos.test(limpia);
};

export const validarTelefonoChileno = (phone: string) => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(\+?56)?9[0-9]{8}$/.test(cleaned);
};

export const validarEmail = (email: string) => {
  if (!email) return true; 
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validarRutChileno = (rut: string) => {
  if (!rut || typeof rut !== 'string') return false;
  const cleanRut = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (cleanRut.length < 8) return false;
  const cuerpo = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);
  let suma = 0; let multiplo = 2;
  for (let i = 1; i <= cuerpo.length; i++) {
    const index = multiplo * parseInt(cuerpo.charAt(cuerpo.length - i), 10);
    suma += index;
    if (multiplo < 7) { multiplo += 1; } else { multiplo = 2; }
  }
  const dvEsperado = 11 - (suma % 11);
  const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
  return dvCalculado === dv;
};

export const formatearRut = (rut: string) => {
  const cleanRut = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (cleanRut.length <= 1) return cleanRut;
  const cuerpo = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);
  return `${cuerpo}-${dv}`;
};

export const calculateParkingTimeAndFee = (job: any, currentTimestamp = Date.now()) => {
  const listoEntry = job.timeline.find((t: any) => t.status === 'Listo');
  if (!listoEntry) return { extraFee: 0, extraMins: 0, totalElapsedSinceReady: 0 };
  let graceStartTimestamp = listoEntry.timestamp;
  if (job.pickupTime) {
    const [hours, mins] = job.pickupTime.split(':').map(Number);
    const pickupDate = new Date(job.entryDate);
    pickupDate.setHours(hours, mins, 0, 0);
    graceStartTimestamp = Math.max(listoEntry.timestamp, pickupDate.getTime());
  }
  const elapsedGraceMins = Math.floor((currentTimestamp - graceStartTimestamp) / 60000);
  let extraMins = 0; let extraFee = 0;
  const PARKING_RATE_PER_MIN = 40;
  if (elapsedGraceMins > 30) { extraMins = elapsedGraceMins - 30; extraFee = extraMins * PARKING_RATE_PER_MIN; }
  const totalElapsedSinceReady = Math.floor((currentTimestamp - listoEntry.timestamp) / 60000);
  return { extraFee, extraMins, totalElapsedSinceReady };
};

export const exportToCSV = (filename: string, rows: any[]) => {
  if (!rows || !rows.length) return;
  const separator = ',';
  const keys = Object.keys(rows[0]);
  const csvContent =
    keys.join(separator) +
    '\n' +
    rows.map(row => {
      return keys.map(k => {
        let cell = row[k] === null || row[k] === undefined ? '' : row[k];
        cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(separator);
    }).join('\n');

  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportToExcel = (filename: string, rows: any[]) => {
  if (!rows || !rows.length) return;
  
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
  
  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  // Create blob and download
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const sendShiftEmail = async (type: 'start' | 'end', shift: any, summary?: any) => {
  // In a real production app, this would call a Cloud Function or an API like SendGrid/EmailJS
  // For this environment, we simulate the notification and log the intent.
  console.log(`[EMAIL SIMULATION] Sending ${type} shift notification for ${shift.id}`);
  console.log(`To: inversioneselcactus@gmail.com, starparkschile@gmail.com`);
  console.log(`Subject: ${type === 'start' ? 'Apertura' : 'Cierre'} de Turno - ${shift.openedBy}`);
  
  if (summary) {
    console.log('Report Z Summary:', summary);
  }

  // We return a promise to simulate network latency
  return new Promise((resolve) => setTimeout(resolve, 1500));
};

export const exportToPDF = (title: string, headers: string[], rows: any[][], summaryData?: {label: string, value: string}[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('STARPARKS', 14, 20);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Carwash Pro V1', 14, 25);

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 35);

  // Date
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${new Date().toLocaleString('es-CL')}`, 14, 41);

  let startY = 48;

  // Summary table
  if (summaryData && summaryData.length > 0) {
    autoTable(doc, {
      startY,
      head: [['Concepto', 'Valor']],
      body: summaryData.map(s => [s.label, s.value]),
      theme: 'grid',
      headStyles: { fillColor: [0, 168, 255], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    });
    startY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Detail table
  if (rows.length > 0) {
    autoTable(doc, {
      startY,
      head: [headers],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 30, doc.internal.pageSize.getHeight() - 10);
    doc.text('STARPARKS — Documento generado automáticamente', 14, doc.internal.pageSize.getHeight() - 10);
  }

  doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
};
