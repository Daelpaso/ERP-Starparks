import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToPDF = (title: string, headers: string[], rows: any[][], summary?: { label: string, value: string }[]) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(0, 168, 255); // StarParks Blue
  doc.text('StarParks CarWash Pro', 14, 15);
  
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text(title, 14, 25);
  
  doc.setFontSize(10);
  doc.text(`Fecha de Emisión: ${new Date().toLocaleString('es-CL')}`, 14, 32);
  
  // Summary Section
  if (summary && summary.length > 0) {
    let y = 40;
    doc.setFontSize(11);
    doc.setTextColor(50);
    summary.forEach(item => {
      doc.text(`${item.label}: ${item.value}`, 14, y);
      y += 6;
    });
    
    // Start table after summary
    autoTable(doc, {
      startY: y + 5,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [0, 168, 255], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
  } else {
    autoTable(doc, {
      startY: 40,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [0, 168, 255], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });
  }
  
  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
};

export const generateDeliveryVoucher = (job: any) => {
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 150] // Mini thermal printer style
  });

  doc.setFontSize(14);
  doc.setTextColor(0, 168, 255);
  doc.text('STARPARKS', 40, 10, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Carwash Pro V1', 40, 14, { align: 'center' });
  
  doc.setDrawColor(200);
  doc.line(10, 17, 70, 17);

  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text('RECOMPROMISO DE ENTREGA', 40, 23, { align: 'center' });

  doc.setFontSize(8);
  let y = 32;
  const addLine = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 10, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${value}`, 40, y);
    y += 5;
  };

  addLine('FOLIO JOB', job.id);
  addLine('PATENTE', job.plate);
  addLine('CLIENTE', job.clientName || 'Particular');
  addLine('ESTADO', job.status);
  addLine('ENTRADA', new Date(job.entryDate).toLocaleString('es-CL'));
  if (job.exitDate) addLine('SALIDA', new Date(job.exitDate).toLocaleString('es-CL'));
  
  doc.line(10, y + 2, 70, y + 2);
  y += 8;

  addLine('SERVICIO', job.serviceName || 'N/A');
  addLine('VALOR BASE', `$${(job.serviceTotal || 0).toLocaleString('es-CL')}`);
  if (job.storeTotal > 0) addLine('TIENDA', `$${job.storeTotal.toLocaleString('es-CL')}`);
  if (job.parkingFee > 0) addLine('PARKING', `$${job.parkingFee.toLocaleString('es-CL')}`);
  if (job.discountAmount > 0) addLine('DESC.', `-$${job.discountAmount.toLocaleString('es-CL')}`);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  y += 5;
  doc.text('TOTAL:', 10, y);
  doc.text(`$${(job.total || 0).toLocaleString('es-CL')}`, 40, y);

  y += 10;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text('¡Gracias por preferir StarParks!', 40, y, { align: 'center' });
  doc.text('www.starparks.cl', 40, y + 4, { align: 'center' });

  doc.save(`voucher_${job.plate}_${Date.now()}.pdf`);
};

export const validarPatenteChilena = (patente: string) => {
  if (!patente) return false;
  const limpia = patente.replace(/[\s-]/g, '').toUpperCase(); 
  const regexLLNNNN = /^[A-Z]{2}[0-9]{4}$/; 
  const regexLLLLNN = /^[A-Z]{4}[0-9]{2}$/;
  const regexMotos = /^[A-Z]{2}[0-9]{3}$|^[A-Z]{3}[0-9]{2}$/;
  return regexLLNNNN.test(limpia) || regexLLLLNN.test(limpia) || regexMotos.test(limpia);
};

export const validarTelefonoChileno = (phone: string) => {
  if (!phone) return false;
  // Limpiamos todo excepto números y el signo +
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Formatos válidos: +569XXXXXXXX (12 chars), 569XXXXXXXX (11 chars), 9XXXXXXXX (9 chars)
  return /^(\+569|569|9)[0-9]{8}$/.test(cleaned);
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

export const calculateShiftStats = (shift: any, jobs: any[], transactions: any[]) => {
  const shiftJobs = jobs.filter((j: any) => j.shiftId === shift.id && j.status === 'Entregado');
  const shiftTxs = transactions.filter((t: any) => t.shiftId === shift.id);

  const systemJobsTotal = shiftJobs.reduce((acc: number, j: any) => acc + (j.total || 0), 0);
  const txIncome = shiftTxs.filter((t: any) => t.type === 'income').reduce((acc: number, t: any) => acc + t.amount, 0);
  const txExpense = shiftTxs.filter((t: any) => t.type === 'expense').reduce((acc: number, t: any) => acc + t.amount, 0);

  const systemTotal = (shift.initialCash || 0) + systemJobsTotal + txIncome - txExpense;
  const declaredTotal = (shift.declaredCash || 0) + (shift.declaredCards || 0) + (shift.declaredTransfers || 0) + (shift.declaredCredit || 0);
  
  return { 
    systemTotal, 
    declaredTotal, 
    diff: declaredTotal - systemTotal,
    jobsTotal: systemJobsTotal,
    incomesTotal: txIncome,
    expensesTotal: txExpense
  };
};

export const sendSMS = async (phone: string, message: string) => {
  // Integration point for SMS API (Twilio, AWS SNS, etc.)
  console.log(`[SMS INTEGRATION] Target: ${phone} | Content: ${message}`);
  
  // Simulation of successful delivery
  return new Promise((resolve) => setTimeout(resolve, 1200));
};
