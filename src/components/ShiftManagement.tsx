import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { DollarSign, LogOut, Plus, Minus, FileText, X, CheckCircle2, AlertTriangle, Printer, TrendingUp, TrendingDown, History, FileSpreadsheet, Search, Calendar, LayoutGrid, List, FileDown, ShieldAlert, CreditCard, Send, GripVertical, Cloud, Trash2, Archive, Car, Moon, ArrowUpDown, Clock, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { doc, setDoc, updateDoc, deleteDoc, db } from '../firebase';
import { sendShiftEmail } from '../lib/utils';
import { ExportDataModal } from './ExportDataModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Constants ---
const REASON_CODES = {
  income: [
    'Sencillo Inicial',
    'Aporte Capital',
    'Devolución Proveedor',
    'Otros Ingresos'
  ],
  expense: [
    'Pago Proveedor',
    'Compra Insumos',
    'Retiro Parcial (Sencillo)',
    'Gasto Vario',
    'Ajuste Caja'
  ]
};

const CHILEAN_DENOMINATIONS = [
  { key: 'b20000', label: '$20.000', value: 20000, type: 'billete' },
  { key: 'b10000', label: '$10.000', value: 10000, type: 'billete' },
  { key: 'b5000', label: '$5.000', value: 5000, type: 'billete' },
  { key: 'b2000', label: '$2.000', value: 2000, type: 'billete' },
  { key: 'b1000', label: '$1.000', value: 1000, type: 'billete' },
  { key: 'm500', label: '$500', value: 500, type: 'moneda' },
  { key: 'm100', label: '$100', value: 100, type: 'moneda' },
  { key: 'm50', label: '$50', value: 50, type: 'moneda' },
  { key: 'm10', label: '$10', value: 10, type: 'moneda' }
];

// --- Modals ---

export const OpenShiftModal = ({ currentUser, onClose, showToast, handleLogout }: any) => {
  const [initialCash, setInitialCash] = useState('');
  const operatorName = currentUser?.name || currentUser?.displayName || 'Operador';

  const handleOpen = async () => {
    const amount = parseInt(initialCash, 10);
    if (isNaN(amount) || amount < 0) {
      showToast('Ingrese un monto válido', 'error');
      return;
    }
    const shiftId = `shift_${Date.now()}`;
    try {
      await setDoc(doc(db, 'shifts', shiftId), {
        id: shiftId,
        openedAt: Date.now(),
        closedAt: null,
        openedBy: currentUser.email || currentUser.id,
        operatorName: operatorName,
        status: 'open',
        initialCash: amount,
        declaredCash: null,
        declaredCards: null,
        declaredTransfers: null,
        denominations: null
      });
      localStorage.setItem('shiftStart', Date.now().toString());
      showToast('Turno abierto exitosamente', 'success');
      
      // Send email notification
      sendShiftEmail('start', { id: shiftId, openedBy: currentUser.email || currentUser.id });
      
      if (onClose) onClose();
    } catch (e) {
      showToast('Error al abrir turno', 'error');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md"
      onClick={() => {
        if (onClose) {
          if (initialCash && initialCash !== '0' && !window.confirm('¿Desea cancelar la apertura de turno?')) return;
          onClose();
        }
      }}
    >
      <div 
        className="panel-glass rounded-2xl w-full max-w-sm border border-sw-green/30 shadow-[0_0_50px_rgba(46,204,113,0.15)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-800 bg-sw-green/5 flex justify-between items-center">
          <h2 className="text-xl font-bold sw-title-font text-sw-green tracking-widest uppercase">Apertura de Caja</h2>
          {onClose && <button onClick={onClose} className="text-gray-500 hover:text-sw-red transition-colors"><X size={24} /></button>}
        </div>
        <div className="p-6 space-y-6">
          <div className="bg-sw-green/10 border border-sw-green/20 p-4 rounded-xl text-center">
            <p className="text-[14px] text-gray-400 uppercase tracking-widest font-bold mb-1">Iniciando turno como:</p>
            <p className="text-lg font-black text-white uppercase tracking-tighter">{operatorName}</p>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Fondo de Caja Inicial (Sencillo)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono">$</span>
              <input 
                type="number" 
                value={initialCash}
                onChange={(e) => setInitialCash(e.target.value)}
                className="w-full bg-black/50 border border-gray-800 rounded-xl py-3 pl-8 pr-4 text-white font-mono text-xl focus:border-sw-green focus:ring-1 focus:ring-sw-green outline-none"
                placeholder="0"
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-3">
            <button onClick={handleOpen} className="w-full btn-yoda py-3 rounded-xl font-bold uppercase tracking-widest flex justify-center items-center gap-2">
              <CheckCircle2 size={20} /> Iniciar Turno
            </button>
            {handleLogout && (
              <button onClick={handleLogout} className="w-full py-3 rounded-xl border border-gray-800 text-gray-500 hover:text-white hover:bg-white/5 transition-all font-bold uppercase tracking-widest text-sm flex justify-center items-center gap-2">
                <LogOut size={16} /> Cerrar Sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CashMovementModal = ({ currentShift, currentUser, onClose, showToast }: any) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [note, setNote] = useState('');

  const handleSave = async () => {
    const val = parseInt(amount, 10);
    if (isNaN(val) || val <= 0 || !reasonCode) {
      showToast('Ingrese monto válido y código de razón', 'error');
      return;
    }
    const txId = `tx_${Date.now()}`;
    try {
      await setDoc(doc(db, 'transactions', txId), {
        id: txId,
        shiftId: currentShift.id,
        type,
        amount: val,
        reason: `${reasonCode}${note ? ': ' + note : ''}`,
        timestamp: Date.now(),
        userId: currentUser.id
      });
      showToast('Movimiento registrado', 'success');
      onClose();
    } catch (e) {
      showToast('Error al registrar movimiento', 'error');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md"
      onClick={() => {
        if (amount && !window.confirm('¿Desea cancelar el movimiento de caja?')) return;
        onClose();
      }}
    >
      <div 
        className="panel-glass rounded-2xl w-full max-w-md border border-sw-blue/30 shadow-[0_0_50px_rgba(0,168,255,0.15)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-800 bg-sw-blue/5 flex justify-between items-center">
          <h2 className="text-xl font-bold sw-title-font text-sw-blue tracking-widest uppercase">Movimiento de Caja</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-sw-red transition-colors"><X size={24} /></button>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex gap-2">
            <button onClick={() => { setType('income'); setReasonCode(''); }} className={`flex-1 py-2 rounded-lg font-bold uppercase tracking-widest text-[14px] border transition-all ${type === 'income' ? 'bg-sw-green/20 border-sw-green text-sw-green' : 'bg-black/50 border-gray-800 text-gray-500 hover:border-gray-600'}`}>Ingreso</button>
            <button onClick={() => { setType('expense'); setReasonCode(''); }} className={`flex-1 py-2 rounded-lg font-bold uppercase tracking-widest text-[14px] border transition-all ${type === 'expense' ? 'bg-sw-red/20 border-sw-red text-sw-red' : 'bg-black/50 border-gray-800 text-gray-500 hover:border-gray-600'}`}>Egreso (Retiro)</button>
          </div>
          
          <div>
            <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">Código de Razón</label>
            <select 
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white focus:border-sw-blue outline-none"
            >
              <option value="">Seleccione una razón...</option>
              {REASON_CODES[type].map(code => <option key={code} value={code}>{code}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">Monto</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono">$</span>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-black/50 border border-gray-800 rounded-xl py-3 pl-8 pr-4 text-white font-mono text-xl focus:border-sw-blue focus:ring-1 focus:ring-sw-blue outline-none"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">Nota Adicional (Opcional)</label>
            <input 
              type="text" 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white focus:border-sw-blue focus:ring-1 focus:ring-sw-blue outline-none"
              placeholder="Ej: Factura #1234"
            />
          </div>

          <button onClick={handleSave} className="w-full btn-jedi py-3 rounded-xl font-bold uppercase tracking-widest flex justify-center items-center gap-2">
            <CheckCircle2 size={20} /> Guardar Movimiento
          </button>
        </div>
      </div>
    </div>
  );
};

export const CloseShiftModal = ({ currentShift, currentUser, onClose, showToast, jobs }: any) => {
  const isOwner = currentShift.openedBy === (currentUser?.email || currentUser?.id);
  const [step, setStep] = useState(isOwner ? 1 : 0); // 0: PIN, 1: Warning, 2: Pending Jobs, 3: Calculator
  const [adminPin, setAdminPin] = useState('');
  
  const [declaredCash, setDeclaredCash] = useState('');
  const [declaredCards, setDeclaredCards] = useState('');
  const [declaredTransfers, setDeclaredTransfers] = useState('');
  const [declaredCredit, setDeclaredCredit] = useState('');
  const [completedJobIds, setCompletedJobIds] = useState<string[]>([]);

  const shiftJobs = useMemo(() => {
    return jobs.filter((j: any) => j.shiftId === currentShift.id && j.status === 'Entregado');
  }, [jobs, currentShift.id]);

  const pendingWorkshopJobs = useMemo(() => {
    return jobs.filter((j: any) => (j.status !== 'Entregado' && j.status !== 'Anulado'));
  }, [jobs]);

  const creditTotal = useMemo(() => {
    return shiftJobs.filter((j: any) => j.paymentMethod === 'Crédito').reduce((acc: number, j: any) => acc + (j.total || 0), 0);
  }, [shiftJobs]);

  const isFormComplete = declaredCash !== '' && declaredCards !== '' && declaredTransfers !== '' && declaredCredit !== '';

  const handleCloseShift = async () => {
    try {
      const now = Date.now();

      // Process manual job completions
      for (const jobId of completedJobIds) {
        const job = jobs.find((j: any) => j.id === jobId);
        if (job) {
          await updateDoc(doc(db, 'jobs', jobId), {
            status: 'Entregado',
            exitDate: now,
            timeline: [...(job.timeline || []), { 
              status: 'Entregado', 
              timestamp: now, 
              workerId: null, 
              note: 'Cierre de turno (Fin de jornada)' 
            }]
          });
        }
      }

      const shiftData = {
        status: 'closed',
        closedAt: now,
        declaredCash: parseInt(declaredCash, 10) || 0,
        declaredCards: parseInt(declaredCards, 10) || 0,
        declaredTransfers: parseInt(declaredTransfers, 10) || 0,
        declaredCredit: parseInt(declaredCredit, 10) || 0,
        denominations: null,
        manualCompletions: completedJobIds.length
      };

      await updateDoc(doc(db, 'shifts', currentShift.id), shiftData);
      localStorage.removeItem('shiftStart');
      showToast('Turno cerrado exitosamente. Cierre ciego completado.', 'success');
      
      // Auto-generate PDF for operator
      const fullShift = { ...currentShift, ...shiftData };
      generateShiftPDF(fullShift, jobs);

      // Send email notification with summary
      sendShiftEmail('end', fullShift, {
        totalDeclared: shiftData.declaredCash + shiftData.declaredCards + shiftData.declaredTransfers + shiftData.declaredCredit,
        cash: shiftData.declaredCash,
        cards: shiftData.declaredCards,
        transfers: shiftData.declaredTransfers,
        credit: shiftData.declaredCredit
      });
      
      onClose();
    } catch (e) {
      showToast('Error al cerrar turno', 'error');
    }
  };

  const generateShiftPDF = (shift: any, allJobs: any) => {
    const doc = new jsPDF();
    const shiftJobs = allJobs.filter((j: any) => j.shiftId === shift.id && j.status === 'Entregado');
    
    // Header
    doc.setFontSize(22);
    doc.text('CARWASH PRO - COMPROBANTE DE CIERRE', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Turno ID: ${shift.id}`, 105, 30, { align: 'center' });
    doc.text(`Operador: ${shift.openedBy}`, 105, 35, { align: 'center' });
    doc.text(`Fecha: ${new Date(shift.closedAt).toLocaleString('es-CL')}`, 105, 40, { align: 'center' });

    // Summary Table
    autoTable(doc, {
      startY: 50,
      head: [['Concepto', 'Monto Declarado']],
      body: [
        ['Efectivo en Caja', `$${shift.declaredCash.toLocaleString('es-CL')}`],
        ['Tarjetas', `$${shift.declaredCards.toLocaleString('es-CL')}`],
        ['Transferencias', `$${shift.declaredTransfers.toLocaleString('es-CL')}`],
        ['Créditos', `$${shift.declaredCredit.toLocaleString('es-CL')}`],
        ['TOTAL DECLARADO', `$${(shift.declaredCash + shift.declaredCards + shift.declaredTransfers + shift.declaredCredit).toLocaleString('es-CL')}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [231, 76, 60] }
    });

    // Signatures
    const finalY = (doc as any).lastAutoTable.finalY + 40;
    doc.line(30, finalY, 80, finalY);
    doc.text('Firma Operador', 55, finalY + 5, { align: 'center' });
    
    doc.line(130, finalY, 180, finalY);
    doc.text('Firma Administrador', 155, finalY + 5, { align: 'center' });

    // Second Copy
    doc.addPage();
    doc.text('COPIA ADMINISTRACIÓN', 105, 10, { align: 'center' });
    doc.setFontSize(22);
    doc.text('CARWASH PRO - COMPROBANTE DE CIERRE', 105, 20, { align: 'center' });
    // ... repeat content or just print twice
    
    doc.save(`cierre_turno_${shift.id}.pdf`);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-xl overflow-y-auto"
      onClick={() => {
        if (window.confirm('¿Desea cancelar el cierre de turno? Los datos ingresados se perderán.')) {
          onClose();
        }
      }}
    >
      <AnimatePresence mode="wait">
        {step === 0 ? (
          <motion.div 
            key="pin"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="panel-glass rounded-2xl w-full max-w-sm border border-sw-red/30 p-8 text-center space-y-6"
          >
            <div className="w-16 h-16 bg-sw-red/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-sw-red/50">
              <ShieldAlert size={32} className="text-sw-red" />
            </div>
            <h2 className="text-xl font-black sw-title-font text-white tracking-widest uppercase mb-2">Autorización Requerida</h2>
            <p className="text-[14px] text-gray-400 font-bold uppercase tracking-widest mb-6">Solo un administrador puede forzar el cierre de un turno ajeno.</p>
            
            <input 
              type="password"
              placeholder="PIN de Admin (1124)"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              className="w-full bg-black/50 border border-sw-red/50 focus:border-sw-red rounded-xl px-4 py-3 text-white text-center tracking-[0.5em] font-mono mb-4 focus:outline-none"
            />
            
            <div className="flex gap-4">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-800 text-gray-500 font-bold uppercase tracking-widest text-[14px] hover:bg-white/5">Cancelar</button>
              <button 
                onClick={() => {
                  if (adminPin === '1124') setStep(1);
                  else { showToast('PIN Incorrecto', 'error'); setAdminPin(''); }
                }} 
                className="flex-1 py-3 rounded-xl bg-sw-red text-white font-bold uppercase tracking-widest text-[14px] shadow-[0_0_20px_rgba(231,76,60,0.3)] hover:scale-[1.02] transition-transform"
              >
                Verificar
              </button>
            </div>
          </motion.div>
        ) : step === 1 ? (
          <motion.div 
            key="warning"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="panel-glass rounded-2xl w-full max-w-md border border-sw-red/30 p-8 text-center space-y-6"
          >
            <div className="w-20 h-20 bg-sw-red/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-sw-red/50">
              <AlertTriangle size={40} className="text-sw-red" />
            </div>
            <h2 className="text-3xl font-black sw-title-font text-sw-red tracking-widest uppercase">¿Cerrar Turno?</h2>
            <p className="text-gray-400 text-base">
              Esta acción es <strong className="text-white">IRREVERSIBLE</strong>. Se bloquearán nuevas ventas y deberá declarar los valores físicos en caja.
            </p>
            <div className="flex gap-4">
              <button onClick={onClose} className="flex-1 py-4 rounded-xl border border-gray-800 text-gray-500 font-bold uppercase tracking-widest text-sm hover:bg-white/5">Cancelar</button>
              <button 
                onClick={() => {
                  if (pendingWorkshopJobs.length > 0) {
                    setStep(2);
                  } else {
                    setStep(3);
                  }
                }} 
                className="flex-1 py-4 rounded-xl bg-sw-red text-white font-bold uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(231,76,60,0.3)]"
              >
                Continuar
              </button>
            </div>
          </motion.div>
        ) : step === 2 ? (
          <motion.div 
            key="pendingJobs"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="panel-glass rounded-2xl w-full max-w-2xl border border-sw-yellow/30 p-0 flex flex-col overflow-hidden max-h-[80vh]"
          >
            <div className="p-6 border-b border-gray-800 bg-sw-yellow/10 flex items-center gap-4">
              <div className="w-12 h-12 bg-sw-yellow/20 rounded-xl flex items-center justify-center border border-sw-yellow/50">
                <Car size={24} className="text-sw-yellow" />
              </div>
              <div>
                <h2 className="text-xl font-black sw-title-font text-sw-yellow tracking-widest uppercase">Vehículos Pendientes</h2>
                <p className="text-[14px] text-gray-400 uppercase tracking-widest font-bold">Confirme su estado para el cierre</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <p className="text-sm text-gray-400 mb-6 italic">
                Indique los vehículos que YA se entregaron (para registrarlos en el turno) y los que se quedarán en el taller durante la noche.
              </p>

              {pendingWorkshopJobs.map((job: any) => {
                const isMarkedCompleted = completedJobIds.includes(job.id);
                return (
                  <div key={job.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isMarkedCompleted ? 'bg-sw-green/10 border-sw-green/40 shadow-[0_0_15px_rgba(46,204,113,0.1)]' : 'bg-black/40 border-gray-800 hover:border-gray-700'}`}>
                    <div className="flex items-center gap-4">
                      <div className="font-mono text-xl font-bold text-sw-blue">{job.plate}</div>
                      <div>
                        <div className="text-[14px] font-bold text-white uppercase tracking-wider">{job.serviceName}</div>
                        <div className="text-[14px] text-gray-500 uppercase font-bold">Status actual: {job.status}</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                       <button 
                        onClick={() => {
                          if (isMarkedCompleted) {
                            setCompletedJobIds(prev => prev.filter(id => id !== job.id));
                          } else {
                            setCompletedJobIds(prev => [...prev, job.id]);
                          }
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-[14px] transition-all border ${isMarkedCompleted ? 'bg-sw-green text-black border-sw-green' : 'bg-black/50 border-gray-700 text-gray-500 hover:border-sw-green hover:text-sw-green'}`}
                       >
                        <CheckCircle2 size={14} /> {isMarkedCompleted ? 'Registrar Entrega' : 'Entregar Ahora'}
                       </button>
                       {!isMarkedCompleted && (
                         <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sw-blue/10 border border-sw-blue/20 text-sw-blue text-[14px] font-bold uppercase tracking-widest opacity-60">
                           <Moon size={14} /> Se queda
                         </div>
                       )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-6 border-t border-gray-800 bg-black/40">
              <button 
                onClick={() => setStep(3)}
                className="w-full btn-yoda py-4 rounded-xl font-black uppercase tracking-widest flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(46,204,113,0.2)]"
              >
                Confirmar y Declarar Efectivo <CheckCircle2 size={20} />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="calculator"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="panel-glass rounded-2xl w-full max-w-2xl border border-sw-red/30 shadow-[0_0_50px_rgba(231,76,60,0.15)] flex flex-col my-8"
          >
            <div className="p-8 border-b border-gray-800 bg-sw-red/5 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <FileText className="text-sw-red" size={32} />
                <h2 className="text-2xl font-black sw-title-font text-sw-red tracking-widest uppercase">Cierre de Caja Ciego</h2>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-sw-red transition-colors"><X size={32} /></button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="panel-glass p-6 rounded-2xl border border-gray-800 space-y-4">
                    <div className="flex items-center gap-3 text-sw-green">
                      <DollarSign size={24} />
                      <span className="text-sm font-black uppercase tracking-widest">Efectivo Contado</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-mono text-gray-600">$</span>
                      <input 
                        type="number" 
                        value={declaredCash}
                        onChange={(e) => setDeclaredCash(e.target.value)}
                        className="w-full bg-black border-2 border-gray-800 focus:border-sw-green rounded-xl py-5 pl-12 pr-6 text-3xl font-mono font-black text-white outline-none transition-all"
                        placeholder="0"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="panel-glass p-6 rounded-2xl border border-gray-800 space-y-4">
                    <div className="flex items-center gap-3 text-sw-blue">
                      <CreditCard size={24} />
                      <span className="text-sm font-black uppercase tracking-widest">Vouchers Tarjeta</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-mono text-gray-600">$</span>
                      <input 
                        type="number" 
                        value={declaredCards}
                        onChange={(e) => setDeclaredCards(e.target.value)}
                        className="w-full bg-black border-2 border-gray-800 focus:border-sw-blue rounded-xl py-5 pl-12 pr-6 text-3xl font-mono font-black text-white outline-none transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="panel-glass p-6 rounded-2xl border border-gray-800 space-y-4">
                    <div className="flex items-center gap-3 text-sw-yellow">
                      <Send size={24} />
                      <span className="text-sm font-black uppercase tracking-widest">Total Transferencias</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-mono text-gray-600">$</span>
                      <input 
                        type="number" 
                        value={declaredTransfers}
                        onChange={(e) => setDeclaredTransfers(e.target.value)}
                        className="w-full bg-black border-2 border-gray-800 focus:border-sw-yellow rounded-xl py-5 pl-12 pr-6 text-3xl font-mono font-black text-white outline-none transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="panel-glass p-6 rounded-2xl border border-gray-800 space-y-4">
                    <div className="flex items-center gap-3 text-sw-red">
                      <ShieldAlert size={24} />
                      <span className="text-sm font-black uppercase tracking-widest">Ventas a Crédito</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-mono text-gray-600">$</span>
                      <input 
                        type="number" 
                        value={declaredCredit}
                        onChange={(e) => setDeclaredCredit(e.target.value)}
                        className="w-full bg-black border-2 border-gray-800 focus:border-sw-red rounded-xl py-5 pl-12 pr-6 text-3xl font-mono font-black text-white outline-none transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-black/60 p-8 rounded-3xl border border-gray-800 space-y-4 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-500 uppercase tracking-widest">Total Declarado</span>
                    <span className="text-4xl font-mono font-black text-sw-green">
                      ${(
                        (parseInt(declaredCash, 10) || 0) + 
                        (parseInt(declaredCards, 10) || 0) + 
                        (parseInt(declaredTransfers, 10) || 0) +
                        (parseInt(declaredCredit, 10) || 0)
                      ).toLocaleString('es-CL')}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={handleCloseShift} 
                  disabled={!isFormComplete} 
                  className="w-full btn-sith py-6 rounded-2xl font-black uppercase text-lg tracking-widest flex justify-center items-center gap-4 shadow-[0_0_30px_rgba(231,76,60,0.3)] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100"
                >
                  <LogOut size={28} /> DECLARAR Y CERRAR TURNO
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Admin Shift History View ---
const DEFAULT_SHIFT_COLUMNS = [
  { id: 'id', label: 'ID Turno' },
  { id: 'operator', label: 'Nombre del Operador' },
  { id: 'opening', label: 'Horario de apertura' },
  { id: 'closing', label: 'Horario de cierre' },
  { id: 'status', label: 'Estado' },
  { id: 'variance', label: 'Diferencia' },
];

export const ShiftHistoryView = ({ shifts, jobs, transactions, onShowZReport, currentUser, showToast, logSystemAction }: any) => {
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'management'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'openedAt', direction: 'desc' });
  const [showExportModal, setShowExportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem('shift_history_columns_v2');
    return saved ? JSON.parse(saved) : DEFAULT_SHIFT_COLUMNS;
  });

  const [deleteShiftModal, setDeleteShiftModal] = useState<any>(null); // { shiftId, pin, reason }

  useEffect(() => {
    localStorage.setItem('shift_history_columns_v2', JSON.stringify(columns));
  }, [columns]);

  const handleDeleteShift = async (shiftId: string, pin: string, reason: string) => {
    const isSuperAdmin = currentUser?.email === 'inversioneselcactus@gmail.com' || currentUser?.email === 'daelpaso.digital@gmail.com';
    const isAdmin = currentUser?.role === 'Admin' || isSuperAdmin;

    if (!isAdmin) {
      showToast('Solo el administrador puede eliminar turnos', 'error');
      return;
    }

    if (pin !== '1124') {
      showToast('PIN de Administrador Incorrecto', 'error');
      return;
    }

    if (!reason || reason.length < 5) {
      showToast('Debe ingresar un motivo válido para la eliminación', 'error');
      return;
    }

    try {
      await deleteDoc(doc(db, 'shifts', shiftId));
      
      if (logSystemAction) {
        logSystemAction(
          'ELIMINAR_TURNO',
          `Turno ID: ${shiftId} | Motivo: ${reason}`,
          'N/A',
          currentUser?.name || currentUser?.displayName
        );
      }

      showToast('Turno eliminado correctamente', 'success');
      setDeleteShiftModal(null);
    } catch (e) {
      showToast('Error al eliminar turno', 'error');
    }
  };



  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const shiftStats = useMemo(() => {
    const stats: Record<string, any> = {};
    
    shifts.forEach((s: any) => {
      const shiftJobs = jobs.filter((j: any) => j.shiftId === s.id && j.status !== 'Anulado');
      const shiftTxs = transactions.filter((t: any) => t.shiftId === s.id);
      
      const totalSales = shiftJobs.reduce((sum: number, j: any) => sum + (j.total || 0), 0);
      
      const payments = shiftJobs.reduce((acc: any, j: any) => {
        acc[j.paymentMethod] = (acc[j.paymentMethod] || 0) + (j.total || 0);
        return acc;
      }, { Efectivo: 0, Tarjeta: 0, Transferencia: 0, Crédito: 0 });

      const serviceCounts = shiftJobs.reduce((acc: any, j: any) => {
        acc[j.serviceName] = (acc[j.serviceName] || 0) + 1;
        return acc;
      }, {});

      const txIncome = shiftTxs.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + t.amount, 0);
      const txExpense = shiftTxs.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + t.amount, 0);
      
      const systemCash = (s.initialCash || 0) + (payments['Efectivo'] || 0) + txIncome - txExpense;
      const cashVariance = (s.declaredCash || 0) - systemCash;
      
      stats[s.id] = { totalSales, payments, serviceCounts, cashVariance, hasVariance: cashVariance !== 0 };
    });
    
    return stats;
  }, [shifts, jobs, transactions]);

  const filteredShifts = useMemo(() => {
    let result = shifts
      .filter((s: any) => {
        const matchesSearch = (s.openedBy || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (s.operatorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              s.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = filterDate ? new Date(s.openedAt).toISOString().split('T')[0] === filterDate : true;
        return matchesSearch && matchesDate;
      })
      .sort((a: any, b: any) => {
        let aValue: any = a[sortConfig.key] || '';
        let bValue: any = b[sortConfig.key] || '';
        
        // Custom value mappings for columns that aren't direct properties
        if (sortConfig.key === 'operator') aValue = a.operatorName || a.openedBy;
        if (sortConfig.key === 'operator') bValue = b.operatorName || b.openedBy;
        if (sortConfig.key === 'opening') aValue = a.openedAt;
        if (sortConfig.key === 'opening') bValue = b.openedAt;
        if (sortConfig.key === 'closing') aValue = a.closedAt || 0;
        if (sortConfig.key === 'closing') bValue = b.closedAt || 0;
        if (sortConfig.key === 'variance') {
          const statsA = shiftStats[a.id] || { cashVariance: 0 };
          const statsB = shiftStats[b.id] || { cashVariance: 0 };
          aValue = statsA.cashVariance;
          bValue = statsB.cashVariance;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });

      return result;
  }, [shifts, searchTerm, filterDate, sortConfig, shiftStats]);

  const managementStats = useMemo(() => {
    const hourlyFlow: Record<string, number> = {};
    let totalVehicles = 0;
    
    filteredShifts.forEach((s: any) => {
      const shiftJobs = jobs.filter((j: any) => j.shiftId === s.id && j.status !== 'Anulado');
      totalVehicles += shiftJobs.length;
      
      shiftJobs.forEach((j: any) => {
        const hour = new Date(j.entryDate || j.createdAt).getHours();
        const hourKey = `${hour}:00 - ${hour + 1}:00`;
        hourlyFlow[hourKey] = (hourlyFlow[hourKey] || 0) + 1;
      });
    });

    const flows = Object.entries(hourlyFlow)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { totalVehicles, flows, totalShifts: filteredShifts.length };
  }, [filteredShifts, jobs]);

  // Pagination logic
  const totalItems = filteredShifts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedShifts = filteredShifts.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="panel-glass p-6 rounded-2xl border border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por operador o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/50 border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-white text-sm outline-none focus:border-sw-yellow transition-all"
            />
          </div>
          <div className="relative md:w-48">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-black/50 border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-white text-sm outline-none focus:border-sw-yellow transition-all"
            />
          </div>
        </div>

          <div className="flex items-center gap-2 bg-black/50 p-1 rounded-xl border border-gray-800">
          <button 
            onClick={() => setViewMode('management')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'management' ? 'bg-sw-blue text-white' : 'text-gray-500 hover:text-white'}`}
            title="Vista de Gestión"
          >
            <TrendingUp size={20} />
          </button>
          <button 
            onClick={() => setViewMode('cards')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-sw-yellow text-black' : 'text-gray-500 hover:text-white'}`}
            title="Vista de Tarjetas"
          >
            <LayoutGrid size={20} />
          </button>
          <button 
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-sw-yellow text-black' : 'text-gray-500 hover:text-white'}`}
            title="Vista de Tabla"
          >
            <List size={20} />
          </button>
        </div>

        <button 
          onClick={() => setShowExportModal(true)}
          className="p-3 bg-black/40 border border-gray-800 rounded-xl text-sw-yellow hover:border-sw-yellow transition-all"
          title="Exportar Historial de Turnos"
        >
          <Download size={20} />
        </button>
      </div>

      {viewMode === 'management' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="panel-glass p-6 rounded-2xl border border-gray-800">
              <div className="text-gray-500 font-bold uppercase tracking-widest text-[14px] mb-1">Total Turnos</div>
              <div className="text-3xl font-mono font-black text-white">{managementStats.totalShifts}</div>
            </div>
            <div className="panel-glass p-6 rounded-2xl border border-gray-800">
              <div className="text-gray-500 font-bold uppercase tracking-widest text-[14px] mb-1">Total Vehículos (Rango)</div>
              <div className="text-3xl font-mono font-black text-sw-blue">{managementStats.totalVehicles}</div>
            </div>
            <div className="panel-glass p-6 rounded-2xl border border-gray-800">
              <div className="text-gray-500 font-bold uppercase tracking-widest text-[14px] mb-1">Vehículos p/ Turno</div>
              <div className="text-3xl font-mono font-black text-sw-green">
                {managementStats.totalShifts > 0 ? (managementStats.totalVehicles / managementStats.totalShifts).toFixed(1) : 0}
              </div>
            </div>
          </div>

          <div className="panel-glass p-8 rounded-2xl border border-gray-800">
            <h3 className="text-xl font-bold uppercase tracking-tighter text-white mb-6 flex items-center gap-2">
              <Clock className="text-sw-yellow" /> Flujos de Mayor Cantidad de Vehículos
            </h3>
            <div className="space-y-4">
              {managementStats.flows.map(([hour, count], idx) => (
                <div key={hour} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center font-mono font-bold text-sw-yellow">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white font-bold">{hour}</span>
                      <span className="text-sw-blue font-mono">{count} Vehículos</span>
                    </div>
                    <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-sw-blue" 
                        style={{ width: `${(count / managementStats.flows[0][1]) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
              {managementStats.flows.length === 0 && (
                <p className="text-gray-500 text-center py-8 py-8 italic">No hay datos de flujo disponibles para los filtros aplicados.</p>
              )}
            </div>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedShifts.map((shift: any) => {
            const stats = shiftStats[shift.id] || { totalSales: 0, payments: {}, serviceCounts: {}, cashVariance: 0, hasVariance: false };
            return (
              <div 
                key={shift.id} 
                onClick={() => onShowZReport(shift)}
                className="panel-glass p-6 rounded-2xl border border-gray-800 hover:border-sw-yellow/50 transition-all group relative overflow-hidden cursor-pointer active:scale-[0.98]"
              >
                <div className={`absolute top-0 right-0 w-2 h-full ${shift.status === 'open' ? 'bg-sw-green' : 'bg-gray-800'}`}></div>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-lg font-mono font-bold text-white uppercase">{shift.id}</div>
                      <div className="text-[14px] text-sw-blue font-bold uppercase tracking-widest">Operador: {shift.operatorName || shift.openedBy}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[14px] font-bold uppercase tracking-widest ${shift.status === 'open' ? 'bg-sw-green/20 text-sw-green' : 'bg-gray-800 text-gray-500'}`}>
                      {shift.status === 'open' ? 'Abierto' : 'Cerrado'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 border-y border-gray-800/30 py-4">
                    <div>
                      <div className="text-[14px] text-gray-500 uppercase font-bold mb-1">Total Ventas</div>
                      <div className="text-sm text-white font-mono font-bold">${stats.totalSales.toLocaleString('es-CL')}</div>
                    </div>
                    <div>
                      <div className="text-[14px] text-gray-500 uppercase font-bold mb-1">Diferencia</div>
                      <div className={`text-sm font-mono font-bold ${stats.hasVariance ? 'text-sw-red' : 'text-sw-green'}`}>
                        {stats.hasVariance ? `$${stats.cashVariance.toLocaleString('es-CL')}` : 'Sin Diferencia'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[14px] text-gray-500 uppercase font-bold">Resumen Pagos</div>
                    <div className="flex flex-wrap gap-2">
                       {Object.entries(stats.payments).map(([method, amount]: [string, any]) => (
                         amount > 0 && (
                           <span key={method} className="bg-black/40 px-2 py-1 rounded border border-gray-800 text-[14px] text-gray-300">
                             {method}: ${amount.toLocaleString('es-CL')}
                           </span>
                         )
                       ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[14px] text-gray-500 uppercase font-bold">Servicios ({Object.values(stats.serviceCounts).reduce((a: any, b: any) => a + b, 0)})</div>
                    <div className="flex flex-wrap gap-1">
                       {Object.entries(stats.serviceCounts).map(([name, count]: [string, any]) => (
                         <span key={name} className="text-[14px] text-gray-500 italic">
                           {count}x {name},
                         </span>
                       ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-800">
                    <div className="text-[14px] text-gray-500 font-mono italic">
                      {new Date(shift.openedAt).toLocaleDateString('es-CL')}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setDeleteShiftModal({ shiftId: shift.id, pin: '', reason: '' }); 
                        }}
                        className="p-2 rounded-lg bg-sw-red/10 border border-sw-red/30 text-sw-red hover:bg-sw-red hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        title="Eliminar Turno"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="panel-glass rounded-2xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-black/80">
                <Reorder.Group axis="x" values={columns} onReorder={setColumns} as="tr" className="border-b border-gray-800">
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
                {paginatedShifts.map((shift: any) => {
                  const stats = shiftStats[shift.id] || { totalSales: 0, payments: {}, serviceCounts: {}, cashVariance: 0, hasVariance: false };
                  return (
                    <tr 
                      key={shift.id} 
                      onClick={() => onShowZReport(shift)}
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      {columns.map((col: any) => (
                        <td key={col.id} className="p-4">
                          {col.id === 'id' && <span className="font-mono text-sm text-white group-hover:text-sw-yellow transition-colors">{shift.id}</span>}
                          {col.id === 'operator' && <span className="text-[14px] text-gray-300 uppercase">{shift.operatorName || shift.openedBy}</span>}
                          {col.id === 'opening' && <span className="text-[14px] text-gray-400 font-mono">{new Date(shift.openedAt).toLocaleString('es-CL')}</span>}
                          {col.id === 'closing' && <span className="text-[14px] text-gray-400 font-mono">{shift.closedAt ? new Date(shift.closedAt).toLocaleString('es-CL') : '-'}</span>}
                          {col.id === 'status' && (
                            <span className={`px-2 py-0.5 rounded text-[14px] font-bold uppercase tracking-widest ${shift.status === 'open' ? 'bg-sw-green/20 text-sw-green' : 'bg-gray-800 text-gray-500'}`}>
                              {shift.status === 'open' ? 'Abierto' : 'Cerrado'}
                            </span>
                          )}
                          {col.id === 'variance' && (
                            <span className={`text-[14px] font-bold font-mono ${stats.hasVariance ? 'text-sw-red' : 'text-sw-green'}`}>
                              {stats.hasVariance ? `$${stats.cashVariance.toLocaleString('es-CL')}` : 'Sin Diferencia'}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onShowZReport(shift); }}
                            className="p-2 text-sw-yellow hover:bg-sw-yellow/10 rounded-lg transition-all"
                            title="Ver Reporte Z"
                          >
                            <FileText size={18} />
                          </button>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setDeleteShiftModal({ shiftId: shift.id, pin: '', reason: '' }); 
                            }}
                            className="p-2 text-sw-red hover:bg-sw-red/10 rounded-lg transition-all"
                            title="Eliminar Turno"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 panel-glass p-4 rounded-xl border border-gray-800">
          <div className="text-[14px] font-black text-gray-500 uppercase tracking-[0.3em]">
            Mostrando <span className="text-white">{startIndex}</span> - <span className="text-white">{Math.min(startIndex + itemsPerPage, totalItems)}</span> de <span className="text-sw-yellow">{totalItems}</span> turnos
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-black/40 border border-gray-800 text-gray-500 hover:text-sw-yellow disabled:opacity-30 disabled:hover:text-gray-500 transition-all font-bold"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 3 + i + 1;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-[14px] font-black transition-all ${currentPage === pageNum ? 'bg-sw-yellow text-black shadow-[0_0_10px_rgba(255,232,31,0.3)]' : 'bg-black/20 text-gray-500 hover:text-white border border-gray-800'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-black/40 border border-gray-800 text-gray-500 hover:text-sw-yellow disabled:opacity-30 disabled:hover:text-gray-500 transition-all font-bold"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {showExportModal && (
        <ExportDataModal 
          title="Historial de Turnos"
          data={shifts.map((s: any) => ({
            ...s,
            variance: shiftStats[s.id]?.cashVariance || 0,
            totalSales: shiftStats[s.id]?.totalSales || 0
          }))}
          columns={[
            { header: 'ID Turno', key: 'id' },
            { header: 'Operador', key: 'openedBy' },
            { header: 'Apertura', key: 'openedAt' },
            { header: 'Cierre', key: 'closedAt' },
            { header: 'Estado', key: 'status' },
            { header: 'Ventas Totales', key: 'totalSales' },
            { header: 'Diferencia Caja', key: 'variance' }
          ]}
          onClose={() => setShowExportModal(false)}
          showToast={showToast}
        />
      )}

      {deleteShiftModal && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 backdrop-blur-xl">
          <div className="panel-glass rounded-2xl w-full max-w-md border border-sw-red/30 shadow-[0_0_50px_rgba(231,76,60,0.2)] p-0 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-800 bg-linear-to-r from-sw-red/10 to-transparent flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ShieldAlert size={24} className="text-sw-red" />
                <h2 className="text-xl font-bold font-mono text-white tracking-widest uppercase">ELIMINAR TURNO</h2>
              </div>
              <button 
                onClick={() => setDeleteShiftModal(null)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="bg-sw-red/5 border border-sw-red/10 p-4 rounded-xl text-center">
                <p className="text-gray-400 text-[14px] font-bold uppercase tracking-widest mb-1">Folio del Turno</p>
                <p className="text-white font-mono font-bold">{deleteShiftModal.shiftId}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">Motivo de Eliminación</label>
                  <textarea 
                    value={deleteShiftModal.reason}
                    onChange={(e) => setDeleteShiftModal({ ...deleteShiftModal, reason: e.target.value })}
                    className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white text-sm focus:border-sw-red outline-none resize-none h-24"
                    placeholder="Especifique el motivo (mínimo 5 caracteres)..."
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">PIN Administrador</label>
                  <input 
                    type="password"
                    value={deleteShiftModal.pin}
                    onChange={(e) => setDeleteShiftModal({ ...deleteShiftModal, pin: e.target.value })}
                    className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white font-mono tracking-widest text-center text-xl focus:border-sw-red outline-none"
                    placeholder="****"
                    maxLength={4}
                  />
                </div>
              </div>

              <button 
                onClick={() => handleDeleteShift(deleteShiftModal.shiftId, deleteShiftModal.pin, deleteShiftModal.reason)}
                disabled={!deleteShiftModal.pin || (deleteShiftModal.reason || '').length < 5}
                className="w-full btn-sith py-4 rounded-xl font-black uppercase tracking-[0.2em] text-sm shadow-[0_0_20px_rgba(231,76,60,0.2)] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
              >
                CONFIRMAR ELIMINACIÓN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
