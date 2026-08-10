import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingCart, FileText, Clock, Trash2, CheckCircle2, ShieldCheck, AlertTriangle, Edit2, Shield, ChevronLeft, UserPlus, Eye, EyeOff, MessageCircle, MessageSquare, Printer, DollarSign, Package, Plus, Sparkles, Star, TrendingUp, XCircle } from 'lucide-react';
import { calculateParkingTimeAndFee, generateDeliveryVoucher } from '../lib/utils';
import { PAYMENT_METHODS, DOC_TYPES } from '../lib/constants';
import { doc, updateDoc, setDoc, deleteDoc, db, increment, handleFirestoreError, OperationType } from '../firebase';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export const JobDetailModal = ({ jobId, jobs, onClose, advanceJobStatus, setStoreModalJobId, addTimelineEvent, hasPermission, currentUser, currentShift }: any) => {
  const job = jobs.find((j: any) => j.id === jobId);
  const [note, setNote] = useState(job?.notes || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePin, setDeletePin] = useState('');
  const [deletionReason, setDeletionReason] = useState('');
  if (!job) return null;

  const { extraFee, extraMins, totalElapsedSinceReady } = calculateParkingTimeAndFee(job);
  const isShiftOwner = currentShift?.openedBy === (currentUser?.email || currentUser?.id);
  const [showSupervisorPin, setShowSupervisorPin] = useState(false);
  const [supervisorPin, setSupervisorPin] = useState('');

  const handleSaveNote = async () => {
    if (!hasPermission('write_workshop')) return;
    try {
      await updateDoc(doc(db, 'jobs', jobId), { notes: note });
      if (note !== job.notes) {
        addTimelineEvent(jobId, 'Nota añadida/modificada');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteVehicle = async () => {
    if (deletePin !== '1124') {
      alert('PIN de Administrador Inválido');
      return;
    }
    
    if (!deletionReason || deletionReason.length < 5) {
      alert('Debe ingresar un motivo válido (mínimo 5 caracteres) para la eliminación.');
      return;
    }

    try {
      const now = Date.now();
      const txId = `tx_del_${Date.now()}`;
      
      // 1. Log in transactions (Shift Audit) if there's an active shift
      if (currentShift?.status === 'open') {
        await setDoc(doc(db, 'transactions', txId), {
          id: txId,
          shiftId: currentShift.id,
          type: 'expense', // Use expense to track as a "loss" or removal of expected income
          amount: 0, // No monetary value but it reflects in the log
          reason: `ANULACIÓN: ${job.plate} - ${deletionReason}`,
          timestamp: now,
          userId: currentUser?.id || 'system',
          jobId: job.id,
          isDeletion: true
        });
      }

      // 2. Update job to mark as deleted/anulado
      await updateDoc(doc(db, 'jobs', jobId), { 
        isActive: false, 
        active: false, 
        status: 'Anulado',
        deletedAt: now,
        deletedBy: currentUser?.email || currentUser?.id || 'system',
        deletionReason: deletionReason,
        timeline: [
          ...(job.timeline || []),
          {
            status: 'Anulado',
            timestamp: now,
            workerId: currentUser?.id || 'system',
            note: `Eliminado por Admin. Motivo: ${deletionReason}`
          }
        ]
      });

      onClose();
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, 'jobs');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="panel-glass rounded-2xl w-full max-w-4xl border border-sw-blue/30 shadow-[0_0_50px_rgba(0,168,255,0.15)] flex flex-col max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-sw-blue/5">
          <div>
            <h2 className="text-3xl font-mono font-black text-white tracking-tighter">{job.plate}</h2>
            <p className="text-[14px] text-sw-blue font-ui font-bold uppercase tracking-[0.2em]">{job.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => generateDeliveryVoucher(job)} className="p-2 hover:bg-sw-blue/20 text-gray-500 hover:text-sw-blue rounded-xl transition-all" title="Reimprimir Voucher"><Printer size={24} /></button>
            {job.status === 'Cola' && (
              <button onClick={() => setShowDeleteConfirm(true)} className="p-2 hover:bg-sw-red/20 text-gray-500 hover:text-sw-red rounded-xl transition-all" title="Eliminar Vehículo">
                <Trash2 size={24} />
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-sw-red/20 hover:text-sw-red rounded-full transition-all text-gray-500"><X size={24} /></button>
          </div>
        </div>
        
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-6 rounded-2xl flex-col backdrop-blur-md">
            <AlertTriangle size={64} className="text-sw-red mb-6 animate-pulse" />
            <h2 className="text-2xl font-black uppercase text-white mb-2 text-center underline decoration-sw-red decoration-2 underline-offset-8">Confirmación de Auditoría</h2>
            <p className="text-gray-400 text-center mb-8 max-w-md text-sm">Esta acción anulará el servicio de la patente <span className="text-white font-mono font-bold">{job.plate}</span>. Quedará registro en el historial de administradores.</p>
            
            <div className="w-full max-w-sm space-y-4">
              <div className="space-y-2">
                <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest ml-1">Motivo de Anulación</label>
                <textarea 
                  placeholder="Ej: Cliente se arrepintió, datos mal ingresados, etc..." 
                  value={deletionReason} 
                  onChange={(e) => setDeletionReason(e.target.value)} 
                  className="w-full bg-black/50 border border-gray-800 text-gray-200 p-4 rounded-xl text-sm focus:border-sw-red focus:ring-1 focus:ring-sw-red outline-none resize-none h-24"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest ml-1">PIN de Seguridad Admin</label>
                <input 
                  type="password" 
                  placeholder="****" 
                  value={deletePin} 
                  max={4}
                  onChange={(e) => setDeletePin(e.target.value)} 
                  className="w-full bg-black border border-sw-red text-sw-red text-center font-mono text-2xl py-3 rounded-xl tracking-[0.5em] focus:outline-none focus:ring-4 focus:ring-sw-red/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button 
                  onClick={() => { 
                    setShowDeleteConfirm(false); 
                    setDeletePin(''); 
                    setDeletionReason('');
                  }} 
                  className="py-4 rounded-xl border border-gray-800 text-gray-500 hover:bg-gray-800 transition-all font-bold uppercase tracking-widest text-[14px]"
                >
                  Regresar
                </button>
                <button 
                  onClick={handleDeleteVehicle} 
                  disabled={deletePin.length !== 4 || deletionReason.length < 5} 
                  className="py-4 rounded-xl bg-sw-red text-white font-bold uppercase tracking-widest text-[14px] disabled:opacity-50 disabled:grayscale transition-all shadow-[0_0_20px_rgba(231,76,60,0.3)] hover:shadow-[0_0_30px_rgba(231,76,60,0.5)]"
                >
                  Confirmar Anulación
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                <div className="text-[14px] text-gray-500 font-bold uppercase tracking-widest mb-2">Información del Vehículo</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[14px]"><span className="text-gray-500">Modelo:</span><span className="text-white font-bold">{job.clientVehicleModel || job.vehicleModel || 'No especificado'}</span></div>
                  <div className="flex justify-between text-[14px]"><span className="text-gray-500">Color:</span><span className="text-white font-bold">{job.vehicleColor || 'No especificado'}</span></div>
                </div>
              </div>
              <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                <div className="text-[14px] text-gray-500 font-bold uppercase tracking-widest mb-2">Datos del Cliente</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[14px]"><span className="text-gray-500">Nombre:</span><span className="text-white font-bold">{job.clientName || 'Cliente'}</span></div>
                  <div className="flex justify-between text-[14px]"><span className="text-gray-500">Teléfono:</span><span className="text-sw-blue font-mono">{job.clientPhone || 'No registrado'}</span></div>
                  <div className="flex justify-between text-[14px]"><span className="text-gray-500">Email:</span><span className="text-gray-300 truncate max-w-[120px]">{job.clientEmail || 'No registrado'}</span></div>
                </div>
              </div>
              <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                <div className="text-[14px] text-gray-500 font-bold uppercase tracking-widest mb-2">Estado Actual</div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-sw-green animate-pulse"></div>
                  <span className="text-xl font-bold text-white uppercase tracking-widest">{job.status}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                <div className="text-[14px] text-gray-500 font-bold uppercase tracking-widest mb-2">Servicio</div>
                <div className="text-lg font-bold text-sw-blue uppercase tracking-wide">{job.serviceName || 'Lavado'}</div>
                <div className="text-sm font-mono text-sw-green mt-1">${job.serviceTotal.toLocaleString('es-CL')}</div>
              </div>
              <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                <div className="text-[14px] text-gray-500 font-bold uppercase tracking-widest mb-2">Tiempos</div>
                <div className="space-y-2 text-[14px] font-mono">
                  <div className="flex justify-between text-gray-400"><span>Ingreso:</span><span className="text-white">{new Date(job.entryDate).toLocaleTimeString()}</span></div>
                  {job.pickupTime && <div className="flex justify-between text-sw-red font-bold"><span>Retiro Est:</span><span>{job.pickupTime}</span></div>}
                  {job.status === 'Listo' && (
                    <div className="flex justify-between text-sw-blue">
                      <span>En Listo:</span>
                      <span>{totalElapsedSinceReady} min</span>
                    </div>
                  )}
                  {extraMins > 0 && (
                    <div className="flex justify-between text-sw-red font-black animate-pulse">
                      <span>SOBRETIEMPO:</span>
                      <span>{extraMins} min</span>
                    </div>
                  )}
                </div>
              </div>
              <div className={`p-4 rounded-xl border transition-all ${extraFee > 0 ? 'bg-sw-red/5 border-sw-red/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'bg-sw-green/5 border-sw-green/20'}`}>
                <div className={`text-[14px] font-ui font-bold uppercase tracking-[0.1em] mb-2 ${extraFee > 0 ? 'text-sw-red' : 'text-sw-green'}`}>
                  {extraFee > 0 ? 'Total con Multa' : 'Total Acumulado'}
                </div>
                <div className={`text-3xl font-mono font-black ${extraFee > 0 ? 'text-sw-red' : 'text-sw-green'}`}>
                  ${(job.total + extraFee).toLocaleString('es-CL')}
                </div>
                {extraFee > 0 && (
                  <div className="text-[14px] text-sw-red/60 font-bold uppercase mt-1">
                    Incluye ${extraFee.toLocaleString('es-CL')} por sobretiempo
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[14px] font-bold text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800 pb-2">Observaciones de Ingreso</h3>
            <div className="p-4 bg-sw-yellow/5 border border-sw-yellow/20 rounded-xl text-sm text-gray-300 italic">
              {job.observations || 'Sin observaciones de ingreso.'}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[14px] font-bold text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800 pb-2">Notas de Seguimiento (Internas)</h3>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={handleSaveNote}
              placeholder="Añadir notas u observaciones..."
              className="w-full bg-black/50 border border-gray-800 rounded-xl p-4 text-sm text-gray-300 focus:border-sw-blue focus:ring-1 focus:ring-sw-blue outline-none resize-none h-24"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-[14px] font-bold text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800 pb-2 flex items-center gap-2"><Clock size={14} /> LÍNEA DE TIEMPO</h3>
            <div className="space-y-3">
              {job.timeline.map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-4 text-[14px]">
                  <div className="w-20 font-mono text-gray-500">{new Date(t.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                  <div className="w-2 h-2 rounded-full bg-sw-blue shadow-[0_0_5px_var(--color-sw-blue)]"></div>
                  <div className="flex-1 bg-black/30 p-2 rounded border border-gray-800 font-bold uppercase tracking-widest text-gray-300">{t.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 bg-black/50 flex flex-col gap-4">
          {showSupervisorPin ? (
            <div className="w-full flex items-center gap-3">
              <input 
                type="password" 
                maxLength={4}
                autoFocus
                placeholder="PIN 1124"
                value={supervisorPin}
                onChange={e => setSupervisorPin(e.target.value)}
                className="flex-1 bg-black/50 border border-sw-yellow rounded-xl px-4 py-3 text-white text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-1 focus:ring-sw-yellow"
              />
              <button 
                onClick={() => {
                  if (supervisorPin === '1124') {
                    onClose();
                    advanceJobStatus(job.id, job.status);
                  } else {
                    alert('PIN Incorrecto');
                    setSupervisorPin('');
                  }
                }}
                className="py-3 px-6 rounded-xl bg-sw-yellow text-black hover:bg-white transition-all font-bold uppercase tracking-widest text-[14px]"
              >
                Aprobar
              </button>
              <button 
                onClick={() => { setShowSupervisorPin(false); setSupervisorPin(''); }}
                className="p-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white transition-all"
              >
                <XCircle size={20} />
              </button>
            </div>
          ) : (
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => { onClose(); setStoreModalJobId(job.id); }}
                className="flex-1 py-3 rounded-xl border border-sw-yellow/50 text-sw-yellow hover:bg-sw-yellow/10 transition-all font-bold uppercase tracking-widest text-[14px] flex items-center justify-center gap-2"
              >
                <ShoppingCart size={16} /> Tienda
              </button>
              {job.status !== 'Entregado' && (
                <button 
                  onClick={() => { 
                    if (!isShiftOwner) {
                       setShowSupervisorPin(true);
                       return;
                    }
                    if (!hasPermission('write_workshop')) return;
                    onClose(); 
                    advanceJobStatus(job.id, job.status); 
                  }}
                  className={`flex-1 py-3 rounded-xl transition-all font-bold uppercase tracking-widest text-[14px] flex items-center justify-center gap-2 ${
                    !isShiftOwner 
                      ? 'bg-transparent border border-gray-600 text-gray-500 hover:border-sw-yellow hover:text-sw-yellow' 
                      : 'bg-sw-green/20 border border-sw-green text-sw-green hover:bg-sw-green hover:text-black'
                  }`}
                >
                  <CheckCircle2 size={16} /> {!isShiftOwner ? 'Forzar Estado' : 'Siguiente Estado'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const QuickStoreModal = ({ jobId, jobs, setJobs, storeProducts, showToast, onClose, hasPermission }: any) => {
  const job = jobs.find((j: any) => j.id === jobId);
  if (!job) return null;

  const addToCart = async (prod: any) => {
    if (!hasPermission('write_pos')) {
      showToast('No tiene permisos para modificar la tienda', 'error');
      return;
    }
    const newCart = [...job.cart, prod];
    const newStoreTotal = newCart.reduce((sum, item) => sum + item.price, 0);
    const newTotal = job.serviceTotal + newStoreTotal + job.parkingFee - job.manualDiscount;
    
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        cart: newCart,
        storeTotal: newStoreTotal,
        total: newTotal
      });
      showToast(`${prod.name} añadido`, 'success');
    } catch (error) {
      showToast('Error al añadir producto', 'error');
    }
  };

  const removeFromCart = async (idx: number) => {
    if (!hasPermission('write_pos')) {
      showToast('No tiene permisos para modificar la tienda', 'error');
      return;
    }
    const newCart = job.cart.filter((_: any, i: number) => i !== idx);
    const newStoreTotal = newCart.reduce((sum, item) => sum + item.price, 0);
    const newTotal = job.serviceTotal + newStoreTotal + job.parkingFee - job.manualDiscount;
    
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        cart: newCart,
        storeTotal: newStoreTotal,
        total: newTotal
      });
    } catch (error) {
      showToast('Error al remover producto', 'error');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-lg"
      onClick={onClose}
    >
      <div 
        className="panel-glass rounded-2xl w-full max-w-4xl border border-sw-yellow/30 shadow-[0_0_50px_rgba(255,232,31,0.1)] flex flex-col h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-sw-yellow/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sw-yellow/10 rounded-xl border border-sw-yellow/30 text-sw-yellow"><ShoppingCart size={24} /></div>
            <div>
              <h2 className="text-xl font-bold sw-title-font text-sw-yellow tracking-widest uppercase">TIENDA IMPERIAL - {job.plate}</h2>
              <p className="text-[14px] text-gray-500 font-bold uppercase tracking-widest">Añadir consumos a la cuenta del vehículo.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-sw-red/20 hover:text-sw-red rounded-full transition-all text-gray-500"><X size={24} /></button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar grid grid-cols-2 sm:grid-cols-3 gap-4 bg-black/20">
            {storeProducts.map((prod: any) => (
              <button key={prod.id} onClick={() => addToCart(prod)} className="panel-glass p-4 rounded-xl text-left hover:border-sw-yellow transition-all group flex flex-col justify-between h-32">
                <div className="flex justify-between items-start">
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-300">{prod.icon}</span>
                  <span className="text-[14px] font-mono text-gray-500">STK: {prod.stock}</span>
                </div>
                <div>
                  <div className="text-[14px] font-bold text-white uppercase tracking-wide line-clamp-1">{prod.name}</div>
                  <div className="text-sm font-mono font-black text-sw-yellow">${prod.price.toLocaleString('es-CL')}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="w-full md:w-80 bg-black/40 border-l border-gray-800 p-6 flex flex-col">
            <h3 className="text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-6 border-b border-gray-800 pb-2">CARRITO ACTUAL</h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mb-6">
              {job.cart.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-black/60 p-3 rounded-lg border border-gray-800 group animate-fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[14px] font-bold text-gray-300 uppercase truncate w-24">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-mono font-bold text-sw-yellow">${item.price}</span>
                    <button onClick={() => removeFromCart(idx)} className="text-gray-600 hover:text-sw-red transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {job.cart.length === 0 && <div className="text-center py-12 text-gray-700 text-[14px] font-bold uppercase tracking-[0.2em] italic">Vacío</div>}
            </div>
            <div className="pt-4 border-t border-gray-800">
              <div className="flex justify-between items-end mb-6">
                <span className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Total Tienda:</span>
                <span className="text-2xl font-mono font-black text-sw-yellow">${job.storeTotal.toLocaleString('es-CL')}</span>
              </div>
              <button onClick={onClose} className="w-full btn-gold py-3 rounded-xl font-bold uppercase tracking-widest text-sm">FINALIZAR SELECCIÓN</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ClientDetailModal = ({ clientId, clients, jobs, onClose, setDetailModalJobId, systemSettings, categories, showToast }: any) => {
  const client = clients.find((c: any) => c.id === clientId);
  const [activeTab, setActiveTab] = useState('resumen');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const loyaltyConfig = systemSettings?.loyalty || { enabled: true, requiredVisits: 6, rewardDiscount: 100 };

  if (!client) return null;

  const handleStartEdit = () => {
    setEditData({
      name: client.name,
      phone: client.phone,
      email: client.email,
      lastVehicleTypeId: client.lastVehicleTypeId || ''
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateDoc(doc(db, 'clients', client.id), editData);
      showToast('Datos del cliente actualizados', 'success');
      setIsEditing(false);
    } catch (e) {
      showToast('Error al actualizar cliente', 'error');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/99 z-[100] flex items-center justify-center p-4 backdrop-blur-xl"
      onClick={onClose}
    >
      <div 
        className="panel-glass rounded-2xl w-full max-w-3xl border border-sw-yellow/40 shadow-[0_0_80px_rgba(255,232,31,0.2)] flex flex-col max-h-[95vh] relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-8 border-b border-gray-800 bg-sw-yellow/5">
          <div className="flex flex-col gap-1">
            <h2 className="text-5xl font-mono font-black text-sw-blue tracking-tighter leading-none">{client.plate}</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-[0.3em] font-ui">{client.name}</span>
              {client.isVIP && <Star size={16} className="text-sw-yellow fill-sw-yellow shadow-lg" />}
            </div>
          </div>
          <div className="flex gap-3">
            {!isEditing ? (
              <button 
                onClick={handleStartEdit}
                className="p-3 bg-black/40 border border-gray-800 rounded-xl text-gray-400 hover:text-sw-blue hover:border-sw-blue transition-all"
              >
                <Edit2 size={24} />
              </button>
            ) : (
              <button 
                onClick={handleSaveEdit}
                className="p-3 bg-sw-green text-black rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(46,204,113,0.4)]"
              >
                <ShieldCheck size={24} />
              </button>
            )}
            <button onClick={onClose} className="p-3 bg-black/40 border border-gray-800 rounded-xl hover:bg-sw-red/20 hover:text-sw-red transition-all text-gray-500">
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="flex border-b border-gray-800">
          {['resumen', 'financiero', 'marketing'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'text-sw-yellow border-b-2 border-sw-yellow bg-sw-yellow/5' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'resumen' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-black/60 p-6 rounded-2xl border border-gray-800 space-y-4">
                  <div className="text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2 border-b border-gray-800 pb-2">Información del Cliente</div>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-[14px] text-gray-500 font-bold uppercase block mb-1">Nombre</label>
                        <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-sw-blue" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[14px] text-gray-500 font-bold uppercase block mb-1">Teléfono</label>
                          <input type="text" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white text-sm outline-none font-mono focus:border-sw-blue" />
                        </div>
                        <div>
                          <label className="text-[14px] text-gray-500 font-bold uppercase block mb-1">Email</label>
                          <input type="email" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-sw-blue" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[14px] text-gray-500 font-bold uppercase block mb-1">Modelo de Vehículo Preferido</label>
                        <select value={editData.lastVehicleTypeId} onChange={e => setEditData({...editData, lastVehicleTypeId: e.target.value})} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-white text-sm outline-none focus:border-sw-blue appearance-none">
                          <option value="">Ninguno</option>
                          {categories.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-col">
                        <span className="text-[14px] text-gray-500 uppercase font-black mb-1">Modelo Habitual</span>
                        <span className="text-sw-blue font-bold tracking-widest text-lg">
                          {categories.find((c: any) => c.id === client.lastVehicleTypeId)?.name || 'NO REGISTRADO'}
                        </span>
                      </div>
                      <div className="flex flex-col pt-3 border-t border-gray-800/50">
                        <span className="text-[14px] text-gray-500 uppercase font-bold">Contacto Principal</span>
                        <div className="text-white text-lg font-bold">{client.phone}</div>
                        <div className="text-sm text-gray-400 font-mono italic">{client.email || 'Sin email'}</div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="bg-black/60 p-6 rounded-2xl border border-gray-800 flex flex-col justify-between">
                  <div>
                    <div className="text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-4 border-b border-gray-800 pb-2">Resumen de Actividad</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-sw-yellow/10 p-4 rounded-xl border border-sw-yellow/20 flex flex-col items-center">
                        <div className="text-2xl font-black text-sw-yellow font-mono">{client.visits}</div>
                        <div className="text-[14px] text-sw-yellow uppercase font-black">Visitas</div>
                      </div>
                      <div className="bg-sw-blue/10 p-4 rounded-xl border border-sw-blue/20 flex flex-col items-center">
                        <div className="text-sm font-bold text-white mb-1 uppercase">Fecha Reg.</div>
                        <div className="text-[14px] font-mono font-bold text-sw-blue">{new Date(client.date).toLocaleDateString('es-CL')}</div>
                      </div>
                    </div>
                  </div>
                  
                  {isEditing && (
                    <button onClick={handleSaveEdit} className="w-full mt-4 py-4 bg-sw-green text-black font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(46,204,113,0.3)] hover:scale-105 transition-all">Guardar Cambios</button>
                  )}
                </div>
              </div>

              {/* Loyalty Tracker */}
              {loyaltyConfig.enabled && (
              <div className="panel-glass p-6 rounded-2xl border border-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-sw-yellow uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 size={18} /> Progreso Fidelización (Premio al llegar a {loyaltyConfig.requiredVisits + 1} visitas)
                  </h3>
                  <span className="text-[14px] font-mono text-gray-400">{(client.visits % (loyaltyConfig.requiredVisits + 1))} / {loyaltyConfig.requiredVisits} Visitas</span>
                </div>
                <div className="flex gap-2 justify-between max-w-lg mx-auto flex-wrap">
                  {Array.from({ length: loyaltyConfig.requiredVisits + 1 }).map((_, i) => {
                    const isCompleted = i < (client.visits % (loyaltyConfig.requiredVisits + 1));
                    const isGoal = i === loyaltyConfig.requiredVisits;
                    return (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                          isCompleted 
                            ? 'bg-sw-green/20 border-sw-green text-sw-green shadow-[0_0_15px_rgba(46,204,113,0.3)]' 
                            : isGoal 
                              ? 'bg-sw-yellow/10 border-sw-yellow border-dashed text-sw-yellow' 
                              : 'bg-black/40 border-gray-700 text-gray-600'
                        }`}>
                          {isCompleted ? <CheckCircle2 size={20} /> : isGoal ? <span className="font-black text-[14px]">PREMIO</span> : (i + 1)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}
            </div>
          )}
          {activeTab === 'financiero' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                  <div className="text-[14px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Gastado</div>
                  <div className="text-2xl font-mono font-black text-sw-green">
                    ${jobs?.filter((j: any) => j.plate === client.plate && j.status === 'Entregado').reduce((acc: number, j: any) => acc + (j.total || 0), 0).toLocaleString('es-CL')}
                  </div>
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                  <div className="text-[14px] text-gray-500 font-bold uppercase tracking-widest mb-1">Ticket Promedio</div>
                  <div className="text-2xl font-mono font-black text-sw-blue">
                    ${(client.visits > 0 ? (jobs?.filter((j: any) => j.plate === client.plate && j.status === 'Entregado').reduce((acc: number, j: any) => acc + (j.total || 0), 0) / client.visits) : 0).toLocaleString('es-CL', {maximumFractionDigits: 0})}
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4 pt-4 border-t border-gray-800">
                <button 
                  onClick={async () => {
                    const pin = window.prompt('Ingrese PIN de Administrador (1124) para agregar registro manual:');
                    if (pin === '1124') {
                       const amountStr = window.prompt('Ingrese el monto de la venta manual (ej: 15000):');
                       const amount = parseInt(amountStr || '0', 10);
                       if (amount > 0) {
                         try {
                           const jobId = `MAN-${Date.now()}`;
                           await setDoc(doc(db, 'jobs', jobId), {
                             id: jobId, plate: client.plate, status: 'Entregado', entryDate: Date.now(), exitDate: Date.now(),
                             total: amount, serviceTotal: amount, serviceName: 'Venta Manual',
                             isManual: true, paymentMethod: 'Efectivo', docType: 'Boleta'
                           });
                           await updateDoc(doc(db, 'clients', clientId), { visits: increment(1) });
                           alert('Registro manual agregado correctamente.');
                         } catch (e) {
                           alert('Error al agregar registro.');
                         }
                       }
                    } else if (pin !== null) {
                      alert('PIN Incorrecto');
                    }
                  }}
                  className="bg-black border border-sw-blue text-sw-blue px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-sw-blue hover:text-black transition-all flex items-center gap-2"
                >
                  <Plus size={16} /> Agregar Venta Manual
                </button>
              </div>

              <div className="panel-glass rounded-xl border border-gray-800 overflow-hidden mt-4">
                <table className="w-full text-left">
                  <thead className="bg-black/60 border-b border-gray-800">
                    <tr>
                      <th className="p-4 text-[14px] font-bold text-gray-500 uppercase tracking-widest">Fecha</th>
                      <th className="p-4 text-[14px] font-bold text-gray-500 uppercase tracking-widest">Servicio</th>
                      <th className="p-4 text-[14px] font-bold text-gray-500 uppercase tracking-widest">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {jobs?.filter((j: any) => j.plate === client.plate && j.status === 'Entregado').sort((a: any, b: any) => b.entryDate - a.entryDate).map((job: any) => (
                      <tr key={job.id} className="hover:bg-white/5 cursor-pointer" onClick={() => { if(setDetailModalJobId) setDetailModalJobId(job.id); }}>
                        <td className="p-4 text-sm text-gray-300">{new Date(job.entryDate).toLocaleDateString('es-CL')}</td>
                        <td className="p-4 text-sm font-bold text-white uppercase tracking-wider">{job.serviceName || 'Venta Tienda'}{job.isManual ? ' (Manual)' : ''}</td>
                        <td className="p-4 text-sm font-mono font-bold text-sw-green">${job.total?.toLocaleString('es-CL')}</td>
                      </tr>
                    ))}
                    {!jobs?.find((j: any) => j.plate === client.plate && j.status === 'Entregado') && (
                      <tr><td colSpan={3} className="p-8 text-center text-gray-600 text-[14px] font-bold uppercase tracking-widest">Sin historial de pagos registrados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'marketing' && (
            <div className="space-y-6">
              <div className="panel-glass p-6 rounded-2xl border border-sw-green/30">
                <h3 className="text-sm font-bold text-sw-green uppercase tracking-widest mb-4 flex items-center gap-2">
                  <MessageSquare size={18} /> Comunicación por WhatsApp
                </h3>
                <p className="text-gray-400 text-sm mb-6">El cliente tiene vinculado el número: <strong className="text-white font-mono">{client.phone}</strong></p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      if (!client.phone) return alert('Cliente no tiene teléfono registrado');
                      const phone = client.phone.replace(/\D/g, '');
                      const msg = encodeURIComponent(`¡Buenas noticias de StarParks CarWash!\n\nEstimado ${client.name}, ¡ha ganado un PREMIO! 🎉\nAcaba de completar sus ${loyaltyConfig.requiredVisits} visitas. Lo esperamos para canjear su beneficio en su próxima visita.\n\nMostrando este mensaje en caja validaremos su premio. ¡Gracias por preferirnos!`);
                      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                    }}
                    className="bg-sw-green/10 border border-sw-green/50 text-sw-green px-4 py-4 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-sw-green hover:text-black transition-all text-center"
                  >
                    Notificar Premio (Lavado Gratis)
                  </button>

                  <button 
                    onClick={() => {
                      if (!client.phone) return alert('Cliente no tiene teléfono registrado');
                      const phone = client.phone.replace(/\D/g, '');
                      window.open(`https://wa.me/${phone}`, '_blank');
                    }}
                    className="bg-black/40 border border-gray-700 text-gray-300 px-4 py-4 rounded-xl text-sm font-bold uppercase tracking-widest hover:border-white hover:text-white transition-all text-center"
                  >
                    Mensaje Personalizado (Abrir Chat)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export const UserDetailModal = ({ userId, users, onClose, isSuperAdmin, togglePermission, applyPreset, PREDEFINED_PERMISSIONS, showToast }: any) => {
  const user = users.find((u: any) => u.id === userId);
  const [isEditing, setIsEditing] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    rut: user?.rut || '',
    email: user?.email || '',
    phone: user?.phone || '',
    notes: user?.notes || '',
    notifications: user?.notifications ?? true,
    role: user?.role || 'Operario',
    pin: user?.pin || '0000'
  });

  if (!user) return null;

  const handleEditClick = async () => {
    if (isEditing) {
      // Save changes
      try {
        await updateDoc(doc(db, 'users', user.id), {
          ...formData
        });
        setIsEditing(false);
        setHasUnsavedChanges(false);
        showToast('Cambios guardados correctamente', 'success');
      } catch (e) {
        showToast('Error al guardar cambios', 'error');
      }
    } else {
      setShowPinModal(true);
    }
  };

  const verifyPin = () => {
    // PIN updated to 1124 as requested
    if (pin === '1124') {
      setIsEditing(true);
      setShowPinModal(false);
      setPin('');
      showToast('Modo edición activado', 'success');
    } else {
      showToast('PIN Incorrecto', 'error');
      setPin('');
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handlePermissionToggle = (pId: string) => {
    setHasUnsavedChanges(true);
    togglePermission(user.id, pId);
  };

  const handlePresetApply = (role: string) => {
    setHasUnsavedChanges(true);
    applyPreset(user.id, role);
    setFormData(prev => ({ ...prev, role }));
  };

  const handleCredentialSave = (creds: { email: string, pin: string }) => {
    setFormData(prev => ({ ...prev, email: creds.email, pin: creds.pin }));
    setHasUnsavedChanges(true);
    showToast('Credenciales preparadas. Haz clic en GUARDAR CAMBIOS para finalizar.', 'info');
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleArchiveUser = async () => {
    if (!window.confirm(`¿Estás seguro de ELIMINAR PERMANENTEMENTE a ${user.name}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, 'users', user.id));
      showToast('Usuario eliminado permanentemente', 'success');
      onClose();
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, 'users');
      showToast('Error al eliminar usuario', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-800 bg-black/50 backdrop-blur-xl flex justify-between items-center relative z-20">
        <button 
          onClick={handleClose}
          className="flex items-center gap-3 text-gray-400 hover:text-white transition-all group"
        >
          <ChevronLeft size={32} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold uppercase tracking-widest text-sm">Volver al Personal</span>
        </button>
        
        <div className="flex gap-4">
          {isSuperAdmin && !isEditing && (
            <button 
              onClick={handleArchiveUser}
              className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest flex items-center gap-3 transition-all bg-sw-red/10 border border-sw-red/30 text-sw-red hover:bg-sw-red hover:text-white"
            >
              <Trash2 size={20} /> ARCHIVAR
            </button>
          )}
          {isSuperAdmin && (
            <button 
              onClick={handleEditClick}
              className={`px-6 py-3 rounded-xl font-bold uppercase tracking-widest flex items-center gap-3 transition-all ${
                isEditing 
                  ? 'bg-sw-green text-black shadow-[0_0_20px_rgba(46,204,113,0.4)]' 
                  : 'bg-sw-blue/10 border border-sw-blue/30 text-sw-blue hover:bg-sw-blue hover:text-black'
              }`}
            >
              {isEditing ? <ShieldCheck size={20} /> : <Edit2 size={20} />}
              {isEditing ? 'GUARDAR CAMBIOS' : 'SOLICITAR EDICIÓN'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        <div className="stars opacity-30"></div>
        <div className="max-w-5xl mx-auto p-8 md:p-16 space-y-16 relative z-10">
          
          {/* Hero Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div className="space-y-4 flex-1">
              <div className="inline-block px-4 py-1 rounded-full bg-sw-blue/10 border border-sw-blue/30 text-sw-blue text-[14px] font-bold uppercase tracking-[0.4em]">
                {isEditing ? (
                  <select 
                    value={formData.role} 
                    onChange={(e) => handleChange('role', e.target.value)}
                    className="bg-transparent border-none outline-none cursor-pointer"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Cajero">Cajero</option>
                    <option value="Operario">Operario</option>
                    <option value="Visualizador">Visualizador</option>
                  </select>
                ) : user.role}
              </div>
              {isEditing ? (
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full bg-transparent text-4xl md:text-6xl font-black text-white sw-title-font tracking-tighter uppercase leading-none border-b-2 border-sw-blue/30 focus:border-sw-blue outline-none py-2"
                  placeholder="NOMBRE DEL TRABAJADOR"
                />
              ) : (
                <h2 className="text-4xl md:text-6xl font-black text-white sw-title-font tracking-tighter uppercase leading-none">
                  {user.name}
                </h2>
              )}
            </div>
            <div className={`w-32 h-32 rounded-3xl flex items-center justify-center text-5xl font-black border-4 ${
              formData.role === 'Admin' ? 'border-sw-red text-sw-red bg-sw-red/10' : 
              formData.role === 'Cajero' ? 'border-sw-yellow text-sw-yellow bg-sw-yellow/10' : 
              'border-sw-blue text-sw-blue bg-sw-blue/10'
            }`}>
              {formData.name.charAt(0) || '?'}
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="panel-glass p-8 rounded-3xl border border-gray-800 space-y-2">
              <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Correo Electrónico</label>
              {isEditing ? (
                <div className="flex gap-2">
                  <input 
                    type="email"
                    value={formData.email}
                    readOnly
                    className="flex-1 bg-black/20 border border-gray-700 rounded-xl p-3 text-lg font-mono text-gray-500 outline-none"
                  />
                  <button 
                    onClick={() => setShowCredentialModal(true)}
                    className="px-4 bg-sw-blue/20 text-sw-blue rounded-xl border border-sw-blue/30 font-bold text-[14px] uppercase hover:bg-sw-blue hover:text-black transition-all"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="text-xl font-mono text-white break-all">{user.email}</div>
              )}
            </div>
            <div className="panel-glass p-8 rounded-3xl border border-gray-800 space-y-2">
              <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">RUT / Identificación</label>
              {isEditing ? (
                <input 
                  type="text"
                  value={formData.rut}
                  onChange={(e) => handleChange('rut', e.target.value)}
                  className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-lg font-mono text-white outline-none focus:border-sw-blue"
                />
              ) : (
                <div className="text-xl font-mono text-white">{user.rut}</div>
              )}
            </div>
            <div className="panel-glass p-8 rounded-3xl border border-gray-800 space-y-2">
              <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Teléfono de Contacto</label>
              {isEditing ? (
                <input 
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-lg font-mono text-white outline-none focus:border-sw-blue"
                />
              ) : (
                <div className="text-xl font-mono text-white">{user.phone || 'No registrado'}</div>
              )}
            </div>
            <div className="panel-glass p-8 rounded-3xl border border-gray-800 space-y-2">
              <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Código PIN / Acceso</label>
              <div className="flex justify-between items-center">
                <div className="text-xl font-mono text-sw-yellow">****</div>
                {isEditing && (
                  <button 
                    onClick={() => setShowCredentialModal(true)}
                    className="px-4 py-1 bg-sw-yellow/10 text-sw-yellow rounded-lg border border-sw-yellow/30 font-bold text-[14px] uppercase hover:bg-sw-yellow hover:text-black transition-all"
                  >
                    Cambiar
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="panel-glass p-8 rounded-3xl border border-gray-800 space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Notificaciones Habilitadas</label>
                <button 
                  onClick={() => isEditing && handleChange('notifications', !formData.notifications)}
                  className={`w-12 h-6 rounded-full transition-all relative ${formData.notifications ? 'bg-sw-green' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.notifications ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
              <p className="text-[14px] text-gray-500 uppercase">Recibir alertas de turnos y reportes vía email</p>
            </div>
            <div className="panel-glass p-8 rounded-3xl border border-gray-800 space-y-4">
              <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Comentarios / Notas</label>
              {isEditing ? (
                <textarea 
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-sm text-white outline-none focus:border-sw-blue h-20 resize-none"
                  placeholder="Notas internas sobre el trabajador..."
                />
              ) : (
                <div className="text-sm text-gray-400 italic">{user.notes || 'Sin comentarios adicionales'}</div>
              )}
            </div>
          </div>

          {/* Permissions Section */}
          <div className="space-y-8 pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-4">
                  <Shield size={32} className="text-sw-blue" /> MATRIZ DE FACULTADES
                </h3>
                <p className="text-gray-500 text-[14px] mt-2 uppercase tracking-widest font-bold">
                  {isEditing ? 'Selecciona los permisos para actualizar el perfil' : 'Consulta los permisos asignados actualmente'}
                </p>
              </div>
              
              {isEditing && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-[14px] text-gray-500 w-full mb-1 uppercase tracking-widest font-black">Presets Rápidos:</span>
                  {['Cajero', 'Operario', 'Visualizador', 'Admin'].map(r => (
                    <button 
                      key={r}
                      onClick={() => handlePresetApply(r)}
                      className="px-4 py-2 rounded-xl bg-sw-blue/10 border border-sw-blue/30 text-sw-blue hover:bg-sw-blue hover:text-black transition-all font-bold uppercase text-[14px]"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PREDEFINED_PERMISSIONS.map((p: any) => {
                const hasPerm = user.permissions?.[p.id] ?? p.roles.includes(user.role);
                return (
                  <div 
                    key={p.id}
                    onClick={() => isEditing && handlePermissionToggle(p.id)}
                    className={`p-6 rounded-2xl border flex items-center justify-between transition-all ${
                      hasPerm 
                        ? 'bg-sw-green/10 border-sw-green text-sw-green shadow-[0_0_30px_rgba(46,204,113,0.1)]' 
                        : 'bg-black/40 border-gray-800 text-gray-600'
                    } ${isEditing ? 'cursor-pointer hover:border-sw-blue hover:scale-[1.02]' : 'opacity-80'}`}
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-black uppercase tracking-tight">{p.label}</div>
                      <div className="text-[14px] opacity-50 font-bold uppercase tracking-widest">ID: {p.id}</div>
                    </div>
                    {hasPerm ? <CheckCircle2 size={24} /> : <X size={24} className="opacity-20" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* PIN Modal Overlay */}
      <AnimatePresence>
        {showPinModal && (
          <div key="pin-modal-overlay" className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div 
              key="pin-modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="panel-glass p-8 rounded-3xl max-w-sm w-full border border-sw-blue/30 text-center space-y-8"
            >
              <div className="w-20 h-20 bg-sw-blue/10 rounded-full flex items-center justify-center mx-auto text-sw-blue">
                <Shield size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Verificación de Mando</h3>
                <p className="text-gray-500 text-[14px] font-bold uppercase tracking-widest">Ingresa el PIN de Administrador para editar</p>
              </div>
              
              <input 
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-black/60 border-2 border-gray-800 rounded-2xl p-6 text-4xl text-center font-black tracking-[1em] text-sw-blue focus:border-sw-blue outline-none transition-all"
                maxLength={4}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && verifyPin()}
              />

              <div className="flex gap-4">
                <button 
                  onClick={() => { setShowPinModal(false); setPin(''); }}
                  className="flex-1 py-4 rounded-xl border border-gray-800 text-gray-500 font-bold uppercase tracking-widest text-[14px] hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={verifyPin}
                  className="flex-1 py-4 rounded-xl bg-sw-blue text-black font-bold uppercase tracking-widest text-[14px] hover:scale-105 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Credential Modal Overlay */}
      <AnimatePresence>
        {showCredentialModal && (
          <CredentialModal 
            key="credential-modal"
            user={{ ...user, ...formData }}
            onClose={() => setShowCredentialModal(false)}
            onSave={handleCredentialSave}
            showToast={showToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export const CredentialModal = ({ user, onClose, onSave, showToast }: any) => {
  const [email, setEmail] = useState(user.email);
  const [confirmEmail, setConfirmEmail] = useState(user.email);
  const [pin, setPin] = useState(user.pin || '');
  const [showPin, setShowPin] = useState(false);

  const handleSave = () => {
    if (email !== confirmEmail) {
      showToast('Los correos electrónicos no coinciden', 'error');
      return;
    }
    if (!email.includes('@')) {
      showToast('Correo electrónico inválido', 'error');
      return;
    }
    if (pin.length < 4) {
      showToast('El PIN debe tener al menos 4 dígitos', 'error');
      return;
    }
    onSave({ email, pin });
    onClose();
  };

  return (
    <div key="credential-modal-overlay" className="fixed inset-0 bg-black/95 z-[350] flex items-center justify-center p-4 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="panel-glass p-8 rounded-3xl max-w-md w-full border border-sw-blue/30 space-y-8"
      >
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Cambiar Credenciales</h3>
          <p className="text-gray-500 text-[14px] font-bold uppercase tracking-widest">Actualiza el acceso para {user.name}</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Nuevo Correo Electrónico</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-gray-800 rounded-xl p-4 text-white outline-none focus:border-sw-blue font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Confirmar Correo</label>
            <input 
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="w-full bg-black/40 border border-gray-800 rounded-xl p-4 text-white outline-none focus:border-sw-blue font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Nueva Contraseña / PIN</label>
            <div className="relative">
              <input 
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-black/40 border border-gray-800 rounded-xl p-4 text-white outline-none focus:border-sw-blue font-mono tracking-[0.5em]"
              />
              <button 
                onClick={() => setShowPin(!showPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-xl border border-gray-800 text-gray-500 font-bold uppercase tracking-widest text-[14px] hover:text-white transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 py-4 rounded-xl bg-sw-blue text-black font-bold uppercase tracking-widest text-[14px] hover:scale-105 transition-all"
          >
            Confirmar Cambios
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const UserCreateModal = ({ onClose, showToast, currentUser, hasPermission }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    rut: '',
    email: '',
    phone: '',
    role: 'Operario',
    pin: '0000'
  });

  const handleSave = async () => {
    // Validate permission
    const isSuperAdmin = currentUser?.email === 'inversioneselcactus@gmail.com' || currentUser?.email === 'daelpaso.digital@gmail.com';
    if (!isSuperAdmin && !hasPermission('edit_users')) {
      showToast('No tienes permisos para crear usuarios', 'error');
      return;
    }

    if (!formData.name || !formData.email || !formData.rut) {
      showToast('Nombre, Email y RUT son obligatorios', 'error');
      return;
    }

    try {
      const id = `user_${Date.now()}`;
      await setDoc(doc(db, 'users', id), {
        ...formData,
        id,
        active: true,
        isActive: true,
        permissions: {},
        createdAt: Date.now()
      });
      showToast('Nuevo usuario reclutado con éxito', 'success');
      onClose();
    } catch (e: any) {
      handleFirestoreError(e, OperationType.CREATE, 'users');
      showToast(e.message || 'Error al reclutar usuario', 'error');
    }
  };

  return (
    <div key="user-create-modal-overlay" className="fixed inset-0 bg-black/95 z-[250] flex items-center justify-center p-4 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="panel-glass p-8 rounded-3xl max-w-lg w-full border border-sw-blue/30 space-y-6"
      >
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <UserPlus size={28} className="text-sw-blue" /> RECLUTAR PERSONAL
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-sw-red transition-colors"><X size={24} /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Nombre Completo</label>
              <input 
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-sw-blue"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">RUT</label>
              <input 
                type="text"
                value={formData.rut}
                onChange={(e) => setFormData({...formData, rut: e.target.value})}
                className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-sw-blue"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Correo Electrónico</label>
            <input 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-sw-blue"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Teléfono</label>
              <input 
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-sw-blue"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Rol Inicial</label>
              <select 
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-sw-blue"
              >
                <option value="Admin">Admin</option>
                <option value="Cajero">Cajero</option>
                <option value="Operario">Operario</option>
                <option value="Visualizador">Visualizador</option>
              </select>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full py-4 rounded-xl bg-sw-blue text-black font-bold uppercase tracking-widest hover:scale-105 transition-all"
        >
          DAR DE ALTA EN EL SISTEMA
        </button>
      </motion.div>
    </div>
  );
};

export const ServiceModal = ({ serviceId, services, jobs, onClose, showToast, hasPermission, isAdmin }: any) => {
  const service = services.find((s: any) => s.id === serviceId);
  const [formData, setFormData] = useState({
    name: service?.name || '',
    basePrice: service?.basePrice || 0,
    recipe: service?.recipe || [],
    estimatedCost: service?.estimatedCost || 0,
    type: service?.type || 'Servicio',
    categoryId: service?.categoryId || ''
  });

  const netPrice = Math.round(formData.basePrice / 1.19);
  const iva = formData.basePrice - netPrice;
  const utility = formData.basePrice - formData.estimatedCost;

  const history = React.useMemo(() => {
    if (!serviceId) return [];
    return (jobs || []).filter((j: any) => (j.serviceId === serviceId || j.serviceName === service?.name) && j.status === 'Entregado')
      .sort((a: any, b: any) => b.entryDate - a.entryDate)
      .slice(0, 5);
  }, [jobs, serviceId, service?.name]);

  if (!hasPermission('edit_pricing')) return null;

  const handleSave = async () => {
    if (!formData.name || formData.basePrice <= 0) {
      showToast('Nombre y precio base son obligatorios', 'error');
      return;
    }

    try {
      const id = serviceId || `srv_${Date.now()}`;
      await setDoc(doc(db, 'services', id), {
        ...formData,
        id,
        active: true,
        isActive: true
      });
      showToast(serviceId ? 'Servicio actualizado' : 'Servicio creado', 'success');
      onClose();
    } catch (e) {
      showToast('Error al guardar el servicio', 'error');
    }
  };

  const handleDelete = async () => {
    if (!isAdmin) {
      showToast('No tiene permisos para eliminar servicios', 'error');
      return;
    }
    if (!window.confirm(`¿Está seguro de que desea ELIMINAR PERMANENTEMENTE "${formData.name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'services', serviceId));
      showToast('Servicio eliminado', 'success');
      onClose();
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, 'services');
      showToast('Error al eliminar', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 backdrop-blur-xl" onClick={onClose}>
      <div className="panel-glass rounded-3xl w-full max-w-2xl border border-sw-green/30 shadow-[0_0_80px_rgba(46,204,113,0.15)] flex flex-col max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 border-b border-gray-800 bg-sw-green/5 flex justify-between items-center text-sw-green">
          <div className="flex items-center gap-4">
            <Sparkles size={32} />
            <div>
              <h2 className="text-2xl font-black sw-title-font tracking-widest uppercase">
                {serviceId ? 'Detalle de Servicio' : 'Nuevo Servicio'}
              </h2>
              <p className="text-[14px] font-mono uppercase tracking-widest text-white">{formData.name || 'Personalizar Parámetros'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-sw-red transition-colors"><X size={32} /></button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8 bg-black/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-[14px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-800 pb-2">Configuración Base</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-1">Nombre del Servicio</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-black/40 border border-gray-800 rounded-xl p-4 text-white font-bold focus:border-sw-green outline-none"
                    placeholder="Ej: Lavado de Motor"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-1 text-sw-green">Precio de Venta Final (IVA Incl.)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-mono">$</span>
                    <input 
                      type="number" 
                      value={formData.basePrice}
                      onChange={(e) => setFormData({...formData, basePrice: Number(e.target.value)})}
                      className="w-full bg-black/40 border border-gray-800 rounded-xl py-4 pl-10 pr-4 text-2xl font-mono font-black text-white focus:border-sw-green outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[14px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-800 pb-2">Desglose Tributario y Utilidad</h3>
              <div className="panel-glass rounded-2xl border border-gray-800 p-6 space-y-4 shadow-inner">
                <div className="flex justify-between items-center text-[14px] font-mono">
                  <span className="text-gray-500">Precio Neto:</span>
                  <span className="text-white">${netPrice.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex justify-between items-center text-[14px] font-mono">
                  <span className="text-gray-500">IVA (19%):</span>
                  <span className="text-white">${iva.toLocaleString('es-CL')}</span>
                </div>
                <div className="pt-4 border-t border-gray-800 space-y-4">
                  <div>
                    <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-1">Costo Estimado (Suministros + MO)</label>
                    <input 
                      type="number" 
                      value={formData.estimatedCost}
                      onChange={(e) => setFormData({...formData, estimatedCost: Number(e.target.value)})}
                      className="w-full bg-black/20 border border-gray-800 rounded-lg p-2 text-sm text-sw-red font-mono outline-none focus:border-sw-red"
                    />
                  </div>
                  <div className="flex justify-between items-center p-3 bg-sw-green/5 rounded-xl border border-sw-green/20">
                    <span className="text-[14px] font-bold text-sw-green uppercase tracking-widest">Utilidad Bruta</span>
                    <span className="text-xl font-mono font-black text-sw-green">${utility.toLocaleString('es-CL')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[14px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-800 pb-2">Historial Reciente de Ventas</h3>
            <div className="space-y-2">
              {history.length > 0 ? history.map((h: any) => (
                <div key={h.id} className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-gray-800">
                  <div className="flex gap-4 items-center">
                    <span className="font-mono text-sw-blue text-[14px]">{h.clientPlate}</span>
                    <span className="text-[14px] text-gray-500">{new Date(h.entryDate).toLocaleDateString()}</span>
                  </div>
                  <span className="font-mono font-bold text-sw-green text-sm">${h.total.toLocaleString('es-CL')}</span>
                </div>
              )) : (
                <div className="text-center p-4 bg-black/10 border border-dashed border-gray-800 rounded-xl text-gray-600 text-[14px] font-bold uppercase tracking-widest">Sin registros de venta entregados</div>
              )}
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            {serviceId && isAdmin && (
              <button 
                onClick={handleDelete} 
                className="flex-[0.3] bg-black border border-gray-800 hover:border-sw-red hover:text-sw-red text-gray-500 py-3 rounded-2xl font-bold uppercase text-[14px] tracking-widest transition-all flex justify-center items-center gap-2"
              >
                <Trash2 size={18} /> Eliminar
              </button>
            )}
            <button onClick={handleSave} className="flex-1 btn-yoda py-5 rounded-2xl font-black uppercase text-xl tracking-[0.2em] flex justify-center items-center gap-4 shadow-[0_0_30px_rgba(46,204,113,0.3)] hover:scale-[1.02] transition-all active:scale-95">
              <ShieldCheck size={28} /> GUARDAR PARÁMETROS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CategoryModal = ({ categoryId, categories, onClose, showToast, hasPermission }: any) => {
  const category = categories.find((c: any) => c.id === categoryId);
  const [formData, setFormData] = useState({
    name: category?.name || '',
    factor: category?.factor || 1
  });

  if (!hasPermission('edit_pricing')) return null;

  const handleSave = async () => {
    if (!formData.name || formData.factor <= 0) {
      showToast('Nombre y factor son obligatorios', 'error');
      return;
    }

    try {
      const id = categoryId || `cat_${Date.now()}`;
      await setDoc(doc(db, 'categories', id), {
        ...formData,
        id
      });
      showToast(categoryId ? 'Modelo actualizado' : 'Modelo creado', 'success');
      onClose();
    } catch (e) {
      showToast('Error al guardar el modelo', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[150] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
      <div className="panel-glass rounded-2xl w-full max-w-md border border-sw-blue/30 shadow-[0_0_50px_rgba(0,168,255,0.15)] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-800 bg-sw-blue/5 flex justify-between items-center">
          <h2 className="text-xl font-bold sw-title-font text-sw-blue tracking-widest uppercase">
            {categoryId ? 'EDITAR MODELO' : 'NUEVO MODELO'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-sw-red transition-colors"><X size={24} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-1">Nombre del Modelo de Vehículo</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-black/40 border border-gray-800 rounded-lg p-3 text-white focus:border-sw-blue outline-none"
              placeholder="Ej: CITY CAR, SEDAN, CAMIONETA..."
            />
          </div>
          <div>
            <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-1">Ajuste de Precio (Factor)</label>
            <input 
              type="number" 
              step="0.01"
              value={formData.factor}
              onChange={(e) => setFormData({...formData, factor: Number(e.target.value)})}
              className="w-full bg-black/40 border border-gray-800 rounded-lg p-3 text-white font-mono focus:border-sw-blue outline-none"
            />
            <p className="text-[14px] text-gray-500 mt-1 italic">1.0 = Precio Normal, 0.8 = 20% Descuento, 1.2 = 20% Recargo</p>
          </div>
          <div className="pt-4">
            <button onClick={handleSave} className="w-full btn-jedi py-4 rounded-xl font-bold uppercase text-lg tracking-widest flex justify-center items-center gap-3">
              <ShieldCheck size={24} /> GUARDAR MODELO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CheckoutModal = ({ jobId, jobs, setJobs, currentShift, showToast, onClose, hasPermission, clients, systemSettings, currentUser, logSystemAction }: any) => {
  const [payMethod, setPayMethod] = useState(PAYMENT_METHODS[0]);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  
  const [showPrintJob, setShowPrintJob] = useState<any>(null);
  
  const job = jobs.find((j: any) => j.id === jobId);
  if (!job) return null;

  const isExpress = jobId.startsWith('VST-') || job.plate === '🏪 VENTA TIENDA';
  const { extraFee, extraMins } = isExpress ? { extraFee: 0, extraMins: 0 } : calculateParkingTimeAndFee(job);
  const discountAmount = discountType === 'percent' ? (job.total * discount / 100) : discount;
  const finalTotal = Math.max(0, job.total + extraFee - discountAmount);

  const handleFinish = async () => {
    if (discount > 0 && pin !== '314211') {
      showToast('PIN de Administrador requerido para descuentos', 'error');
      setShowPinModal(true);
      return;
    }

    if (!hasPermission('write_pos')) {
      showToast('No tiene permisos para procesar pagos', 'error');
      return;
    }
    if (!currentShift) {
      showToast('Debe tener un turno abierto para procesar pagos', 'error');
      return;
    }
    const now = Date.now();
    try {
      const updatedJob = {
        ...job,
        status: 'Entregado', 
        exitDate: now, 
        paymentMethod: payMethod, 
        docType: docType, 
        parkingFee: extraFee, 
        parkingMins: extraMins,
        discount: discountAmount,
        total: finalTotal,
        shiftId: currentShift.id,
        operatorId: isExpress ? (currentUser?.name || currentUser?.displayName) : (job.operatorId || 'Personal'),
        timeline: [...(job.timeline || []), { status: 'Entregado', timestamp: now, workerId: null }]
      };

      await updateDoc(doc(db, 'jobs', jobId), updatedJob);

      // Register financial transaction
      const txId = `TX-${Date.now()}`;
      await setDoc(doc(db, 'transactions', txId), {
        id: txId,
        jobId: jobId,
        shiftId: currentShift.id,
        type: 'income',
        amount: finalTotal,
        paymentMethod: payMethod,
        docType: docType,
        customerName: updatedJob.clientName || 'Particular',
        plate: updatedJob.plate,
        timestamp: now,
        userId: currentUser?.uid || currentUser?.id,
        userName: currentUser?.name || currentUser?.displayName,
        description: isExpress ? `Venta Express: ${jobId}` : `Servicio Carwash: ${jobId} (${updatedJob.plate})`
      });

      // Log System Action
      if (logSystemAction) {
        logSystemAction(
          isExpress ? 'VENTA_EXPRESS' : 'CHECKOUT_COMPLETADO',
          `Folio: ${jobId} | Total: $${finalTotal.toLocaleString('es-CL')}`,
          currentUser?.name || currentUser?.displayName
        );
      }

      // 1. Decrement stock for shop products in the cart (Standard and Express Jobs)
      for (const item of (job.cart || [])) {
        if (!item.isTypeService && item.id) {
          try {
            await updateDoc(doc(db, 'storeProducts', item.id), {
              stock: increment(-1)
            });
          } catch (e) {
            console.error('Error decrementing stock for:', item.name, e);
          }
        }
      }
      
      const client = clients?.find((c: any) => c.plate === job.plate);
      if (client) {
        await updateDoc(doc(db, 'clients', client.id), { visits: increment(1) }).catch(console.error);
      }

      showToast(`Misión Finalizada: ${job.plate}`, 'success');
      
      // Set the job to show the print popup instead of auto-generating PDF
      setShowPrintJob(updatedJob);
    } catch (error) {
      showToast('Error al finalizar', 'error');
    }
  };

  if (showPrintJob) {
    return (
      <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-xl">
        <div className="panel-glass rounded-2xl w-full max-w-sm border border-sw-green/40 shadow-[0_0_30px_rgba(46,204,113,0.1)] flex flex-col overflow-hidden">
          <div className="bg-white text-black p-6" id="printable-voucher-final">
            <div className="text-center mb-4 border-b-2 border-black pb-4">
              <h2 className="text-2xl font-black uppercase">STARPARKS</h2>
              <p className="text-[14px] font-bold uppercase">{isExpress ? 'Venta Tienda' : 'Carwash Pro - Recibo de Pago'}</p>
            </div>
            
            <div className="space-y-3 text-sm font-mono font-bold mb-6">
              <div className="flex justify-between border-b border-black/10 pb-1">
                <span>FOLIO:</span>
                <span className="text-sm font-black">{showPrintJob.id}</span>
              </div>
              
              <div className="flex flex-col gap-1 border-b border-black/10 pb-1">
                <span className="text-[14px] text-gray-400 uppercase">Cliente:</span>
                <div className="flex justify-between">
                  <span className="uppercase">{showPrintJob.clientName || 'Particular'}</span>
                  <span>{showPrintJob.clientPhone || ''}</span>
                </div>
              </div>

              <div className="flex justify-between border-b border-black/10 pb-1">
                <span>PATENTE:</span>
                <span className="text-xl font-black">{isExpress ? 'VENTA DIRECTA' : showPrintJob.plate}</span>
              </div>

              <div className="flex flex-col gap-1 border-b border-black/10 pb-1">
                <span className="text-[14px] text-gray-400 uppercase">Detalle:</span>
                <div className="space-y-1">
                  {(showPrintJob.cart || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="uppercase">{item.name}</span>
                      <span>${item.price.toLocaleString('es-CL')}</span>
                    </div>
                  ))}
                  {!showPrintJob.cart?.length && showPrintJob.serviceName && (
                    <span className="font-black uppercase">{showPrintJob.serviceName}</span>
                  )}
                </div>
              </div>

              {showPrintJob.parkingFee > 0 && (
                <div className="flex justify-between border-b border-black/10 pb-1">
                  <span>SOBRETIEMPO:</span>
                  <span>${showPrintJob.parkingFee.toLocaleString('es-CL')}</span>
                </div>
              )}

              {showPrintJob.discount > 0 && (
                <div className="flex justify-between border-b border-black/10 pb-1 text-sw-red">
                  <span>DSCTO:</span>
                  <span>-${showPrintJob.discount.toLocaleString('es-CL')}</span>
                </div>
              )}

              <div className="flex justify-between items-end pt-2">
                <span className="text-lg">TOTAL:</span>
                <span className="text-3xl font-black">${showPrintJob.total.toLocaleString('es-CL')}</span>
              </div>
              
              <div className="pt-2 text-[14px] flex justify-between border-t border-black/10 mt-4">
                <span>MÉTODO: {showPrintJob.paymentMethod}</span>
                <span>FECHA: {new Date(showPrintJob.exitDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="border-t-2 border-black pt-4 text-center space-y-2">
              <p className="text-[14px] font-bold uppercase">¡Gracias por su preferencia!</p>
              <p className="text-[14px] font-bold uppercase">Conserve su recibo para garantías.</p>
              <p className="text-[14px] font-black uppercase mt-3">PROCESADO POR STARPARKS PRO</p>
            </div>
          </div>

          <div className="p-4 flex gap-3 bg-black/60">
            <button 
              onClick={onClose} 
              className="flex-1 bg-gray-900 border border-gray-700 text-gray-400 py-3 rounded-xl font-bold uppercase tracking-widest text-[14px] transition-all hover:border-gray-500"
            >
              Cerrar
            </button>
            <button
              onClick={() => {
                const w = window.open('', '', 'width=400,height=600');
                const c = document.getElementById('printable-voucher-final');
                if (w && c) { 
                  w.document.write(`<html><head><title>Comprobante de Pago</title><style>body{font-family:monospace;padding:0;margin:0 auto;width:58mm;font-size:14px;color:#000}*{box-sizing:border-box}.flex{display:flex}.flex-col{display:flex;flex-direction:column}.gap-1{gap:0.25rem}.justify-between{justify-content:space-between}.items-end{align-items:flex-end}.text-center{text-align:center}.mb-4{margin-bottom:1rem}.mb-6{margin-bottom:1.5rem}.mt-3{margin-top:0.75rem}.pb-4{padding-bottom:1rem}.pt-4{padding-top:1rem}.pb-1{padding-bottom:0.25rem}.border-b-2{border-bottom:2px dashed #000}.border-t-2{border-top:2px dashed #000}.border-b{border-bottom:1px solid #ddd}.border-t{border-top:1px solid #ddd}.text-2xl{font-size:1.5rem}.text-3xl{font-size:1.875rem}.text-xl{font-size:1.25rem}.text-lg{font-size:1.125rem}.text-sm{font-size:0.875rem}.text-xs{font-size:14px}.text-gray-400{color:#666}.font-black{font-weight:900}.font-bold{font-weight:700}.uppercase{text-transform:uppercase}.space-y-3>*{margin-top:0.75rem;margin-bottom:0}.space-y-2>*{margin-top:0.5rem;margin-bottom:0}@page{margin:0;padding:0}@media print{body{width:58mm;margin:0;padding:2mm}}</style></head><body>${c.innerHTML}</body></html>`); 
                  w.document.close(); 
                  w.focus(); 
                  w.print(); 
                  w.close(); 
                }
                onClose();
              }}
              className="flex-1 btn-jedi py-3 rounded-xl font-bold uppercase tracking-widest text-[14px]"
            >
              Imprimir
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-xl"
      onClick={() => {
        if (window.confirm('¿Desea cancelar la liquidación final? Los cambios no se guardarán.')) {
          onClose();
        }
      }}
    >
      <div 
        className="panel-glass rounded-2xl w-full max-w-md border border-sw-green/30 shadow-[0_0_50px_rgba(46,204,113,0.15)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-800 bg-sw-green/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sw-green/10 rounded-lg text-sw-green border border-sw-green/30"><ShieldCheck size={24} /></div>
            <h2 className="text-xl font-bold sw-title-font text-sw-green tracking-widest uppercase">LIQUIDACIÓN FINAL</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-sw-red transition-colors"><X size={24} /></button>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-black/40 p-6 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex justify-between items-center text-[14px] font-bold uppercase tracking-widest text-gray-500"><span>Patente</span><span className="text-sw-blue font-mono text-xl">{job.plate}</span></div>
            <div className="flex justify-between items-center text-[14px] font-bold uppercase tracking-widest text-gray-500"><span>Servicio</span><span className="text-white">{job.serviceName || 'Lavado'}</span></div>
            <div className="flex justify-between items-center text-[14px] font-bold uppercase tracking-widest text-gray-500"><span>Consumo Tienda</span><span className="text-white">${job.storeTotal.toLocaleString('es-CL')}</span></div>
            
            <div className="pt-4 border-t border-gray-800 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Descuento</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setDiscountType('fixed')}
                    className={`px-2 py-1 rounded text-[14px] font-bold border transition-all ${discountType === 'fixed' ? 'bg-sw-blue/20 border-sw-blue text-sw-blue' : 'bg-black/40 border-gray-800 text-gray-600'}`}
                  >
                    $
                  </button>
                  <button 
                    onClick={() => setDiscountType('percent')}
                    className={`px-2 py-1 rounded text-[14px] font-bold border transition-all ${discountType === 'percent' ? 'bg-sw-blue/20 border-sw-blue text-sw-blue' : 'bg-black/40 border-gray-800 text-gray-600'}`}
                  >
                    %
                  </button>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono">{discountType === 'fixed' ? '$' : '%'}</span>
                <input 
                  type="number" 
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full bg-black/40 border border-gray-800 rounded-lg py-2 pl-8 pr-4 text-white font-mono text-sm focus:border-sw-blue outline-none"
                  placeholder="0"
                />
              </div>
              {discount > 0 && (
                <div className="flex justify-between items-center text-[14px] font-bold uppercase tracking-widest text-sw-yellow">
                  <span>Total Descuento</span>
                  <span>-${discountAmount.toLocaleString('es-CL')}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-800 space-y-2">
              <div className="flex justify-between items-center text-[14px] font-bold uppercase tracking-widest text-gray-500">
                <span>Monto Neto</span>
                <span className="text-xl font-mono text-gray-400">${Math.round(finalTotal / 1.19).toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between items-center text-[14px] font-bold uppercase tracking-widest text-gray-500">
                <span>IVA (19%)</span>
                <span className="text-xl font-mono text-gray-400">${(finalTotal - Math.round(finalTotal / 1.19)).toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between items-end pt-4 border-t border-gray-800/50 mt-2">
                <span className="text-sm font-black uppercase tracking-widest text-gray-400">TOTAL A PAGAR</span>
                <span className="text-5xl font-mono font-black text-sw-green drop-shadow-[0_0_20px_rgba(46,204,113,0.3)]">${finalTotal.toLocaleString('es-CL')}</span>
              </div>
            </div>
          </div>

          {showPinModal && (
            <div className="bg-sw-red/10 border border-sw-red/30 p-4 rounded-xl space-y-3">
              <p className="text-[14px] font-bold text-sw-red uppercase tracking-widest text-center">PIN DE ADMINISTRADOR REQUERIDO</p>
              <input 
                type="password" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-black/60 border border-sw-red/50 rounded-lg p-3 text-center text-white font-mono tracking-[1em] outline-none"
                placeholder="****"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => { setShowPinModal(false); setDiscount(0); setPin(''); }} className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-400 text-[14px] font-bold uppercase">Cancelar</button>
                <button onClick={handleFinish} className="flex-1 py-2 rounded-lg bg-sw-red text-white text-[14px] font-bold uppercase">Validar</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
             <div>
               <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">Medio de Pago</label>
               <div className="grid grid-cols-1 gap-2">
                 {PAYMENT_METHODS.map(m => (
                   <button key={m} onClick={() => setPayMethod(m)} className={`w-full text-left p-3 rounded-lg border text-[14px] font-bold uppercase tracking-widest transition-all ${payMethod === m ? 'btn-yoda' : 'bg-black/50 border-gray-800 text-gray-500 hover:border-gray-600'}`}>{m}</button>
                 ))}
               </div>
             </div>
             <div>
               <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">Tipo de Documento</label>
               <div className="grid grid-cols-3 gap-2">
                 {DOC_TYPES.map(d => (
                   <button key={d} onClick={() => setDocType(d)} className={`p-2 rounded-lg border text-[14px] font-bold uppercase tracking-widest transition-all ${docType === d ? 'btn-jedi' : 'bg-black/50 border-gray-800 text-gray-500 hover:border-gray-600'}`}>{d.split(' ')[0]}</button>
                 ))}
               </div>
             </div>
          </div>

          <button onClick={handleFinish} className="w-full btn-yoda py-4 rounded-xl font-bold uppercase text-lg tracking-widest flex justify-center items-center gap-3 shadow-[0_0_20px_rgba(46,204,113,0.2)]"><CheckCircle2 size={24} /> FINALIZAR Y ENTREGAR</button>
        </div>
      </div>
    </div>
  );
};

export const InventoryItemModal = ({ item, type, onClose, showToast, hasPermission, jobs = [], transactions = [] }: any) => {
  const isNew = !item;
  const [name, setName] = useState(item?.name || '');
  const [stock, setStock] = useState(item?.stock || 0);
  const [unitCost, setUnitCost] = useState(item?.unitCost || 0);
  const [price, setPrice] = useState(item?.price || 0);
  const [uom, setUom] = useState(item?.uom || 'un');
  const [reorderPoint, setReorderPoint] = useState(item?.reorderPoint || 0);
  const [icon, setIcon] = useState(item?.icon || '📦');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');

  const renderChart = () => {
    if (isNew || type === 'raw') return null;

    const data = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      data.push({
        dateStr: d.toISOString().split('T')[0],
        dateLabel: d.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' }),
        count: 0
      });
    }

    jobs.forEach((j: any) => {
      if (!j.entryDate || !j.cart) return;
      const jDate = new Date(j.entryDate).toISOString().split('T')[0];
      const dayData = data.find(d => d.dateStr === jDate);
      if (dayData) {
        // Find if this product is in the cart
        const addon = j.cart.find((cItem: any) => cItem.id === item.id);
        if (addon) dayData.count += 1;
      }
    });

    const totalVentas = data.reduce((acc, curr) => acc + curr.count, 0);

    return (
      <div className="mt-8 border-t border-gray-800 pt-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-sw-yellow mb-4 flex items-center gap-2">
          <TrendingUp size={16} /> 
          Ventas últimos 30 días
        </h3>
        <div className="mb-4">
          <span className="text-2xl font-mono font-black text-white">{totalVentas}</span>
          <span className="text-[14px] text-gray-500 font-bold uppercase tracking-widest ml-2">Unidades vendidas</span>
        </div>
        <div className="h-48 w-full bg-black/50 p-4 rounded-xl border border-gray-800">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorProdSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffe81f" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ffe81f" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="dateLabel" hide={true} />
              <YAxis hide={true} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                itemStyle={{ color: '#ffe81f', fontWeight: 'bold' }}
                formatter={(v: any) => [v, 'Ventas']}
              />
              <Area type="monotone" dataKey="count" stroke="#ffe81f" fillOpacity={1} fill="url(#colorProdSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const handleSave = async () => {
    if (stock !== item?.stock || price !== item?.price || unitCost !== item?.unitCost) {
      if (pin !== '1124') {
        setShowPinModal(true);
        return;
      }
    }

    try {
      const data: any = {
        name,
        stock: Number(stock),
      };

      if (type === 'raw') {
        data.unitCost = Number(unitCost);
        data.uom = uom;
        data.reorderPoint = Number(reorderPoint);
      } else {
        data.price = Number(price);
        data.icon = icon;
      }

      if (isNew) {
        const id = type === 'raw' ? `RM-${Date.now()}` : `SP-${Date.now()}`;
        data.id = id;
        await setDoc(doc(db, type === 'raw' ? 'rawMaterials' : 'storeProducts', id), data);
        showToast('Item creado correctamente', 'success');
      } else {
        await updateDoc(doc(db, type === 'raw' ? 'rawMaterials' : 'storeProducts', item.id), data);
        showToast('Item actualizado correctamente', 'success');
      }
      onClose();
    } catch (e) {
      showToast('Error al guardar item', 'error');
    }
  };

  const handleDelete = async () => {
    if (confirm('¿Está seguro de eliminar este item permanentemente? No se podrá recuperar.')) {
      const pinPrompt = window.prompt('Ingrese PIN de Administrador (1124) para eliminar:');
      if (pinPrompt === '1124') {
        try {
          const collectionName = type === 'raw' ? 'rawMaterials' : 'storeProducts';
          await deleteDoc(doc(db, collectionName, item.id));
          showToast('Item eliminado permanentemente', 'success');
          onClose();
        } catch (e: any) {
          handleFirestoreError(e, OperationType.DELETE, type === 'raw' ? 'rawMaterials' : 'storeProducts');
          showToast('Error al eliminar', 'error');
        }
      } else if (pinPrompt !== null) {
        alert('PIN Incorrecto');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
      <div className="panel-glass rounded-2xl w-full max-w-md border border-sw-yellow/30 shadow-[0_0_50px_rgba(255,232,31,0.15)] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-sw-yellow/5">
          <h2 className="text-xl font-bold font-mono text-white tracking-widest uppercase">{isNew ? 'NUEVO' : 'EDITAR'} {type === 'raw' ? 'INSUMO' : 'PRODUCTO'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-sw-red transition-all"><X size={24} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">Nombre</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white focus:border-sw-yellow outline-none uppercase" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">Stock Actual</label>
              <input type="number" value={stock} onChange={e => setStock(Number(e.target.value))} className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white font-mono focus:border-sw-yellow outline-none" />
            </div>
            {type === 'raw' ? (
              <div>
                <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">Unidad</label>
                <input type="text" value={uom} onChange={e => setUom(e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white focus:border-sw-yellow outline-none" />
              </div>
            ) : (
              <div>
                <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">Icono</label>
                <input type="text" value={icon} onChange={e => setIcon(e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white text-center text-xl focus:border-sw-yellow outline-none" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">{type === 'raw' ? 'Costo Unitario' : 'Precio Venta'}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono">$</span>
                <input 
                  type="number" 
                  value={type === 'raw' ? unitCost : price} 
                  onChange={e => type === 'raw' ? setUnitCost(Number(e.target.value)) : setPrice(Number(e.target.value))} 
                  className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 pl-8 text-white font-mono focus:border-sw-yellow outline-none" 
                />
              </div>
            </div>
            {type === 'raw' && (
              <div>
                <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">Punto Reorden</label>
                <input type="number" value={reorderPoint} onChange={e => setReorderPoint(Number(e.target.value))} className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white font-mono focus:border-sw-yellow outline-none" />
              </div>
            )}
          </div>

          {renderChart()}

          {showPinModal && (
            <div className="bg-sw-red/10 border border-sw-red/30 p-4 rounded-xl space-y-3">
              <p className="text-[14px] font-bold text-sw-red uppercase tracking-widest text-center">PIN DE ADMINISTRADOR REQUERIDO</p>
              <input 
                type="password" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-black/60 border border-sw-red/50 rounded-lg p-3 text-center text-white font-mono tracking-[1em] outline-none"
                placeholder="****"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => { setShowPinModal(false); setPin(''); }} className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-400 text-[14px] font-bold uppercase">Cancelar</button>
                <button onClick={handleSave} className="flex-1 py-2 rounded-lg bg-sw-red text-white text-[14px] font-bold uppercase">Validar</button>
              </div>
            </div>
          )}

          {!showPinModal && (
            <div className="flex gap-3 pt-4">
              {!isNew && (
                <button onClick={handleDelete} className="p-3 rounded-xl border border-sw-red text-sw-red hover:bg-sw-red hover:text-white transition-all">
                  <Trash2 size={24} />
                </button>
              )}
              <button onClick={handleSave} className="flex-1 py-4 rounded-xl bg-sw-yellow text-black font-bold uppercase tracking-widest hover:scale-105 transition-all">
                {isNew ? 'CREAR ITEM' : 'GUARDAR CAMBIOS'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CancelJobModal = ({ jobId, jobs, onClose, onConfirm }: any) => {
  const job = jobs.find((j: any) => j.id === jobId);
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');

  if (!job) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="panel-glass rounded-2xl w-full max-w-md border border-sw-red/30 shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-800 bg-sw-red/5">
          <div className="flex items-center gap-3 text-sw-red mb-1">
            <XCircle size={24} />
            <h2 className="text-xl font-bold uppercase tracking-widest sw-title-font">Retirar Vehículo</h2>
          </div>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Patente: {job.plate}</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest">Motivo del Retiro</label>
            <textarea 
              placeholder="Ej: Cliente se arrepintió, espera muy larga..." 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              className="w-full bg-black/50 border border-gray-800 text-gray-200 p-4 rounded-xl text-sm focus:border-sw-red focus:ring-1 focus:ring-sw-red outline-none resize-none h-24"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest text-center">PIN de Seguridad Administrador</label>
            <div className="relative">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-sw-red/40" size={20} />
              <input 
                type="password" 
                placeholder="****" 
                value={pin} 
                maxLength={4}
                onChange={(e) => setPin(e.target.value)} 
                className="w-full bg-black border border-sw-red/50 text-sw-red text-center font-mono text-2xl py-4 rounded-xl tracking-[0.8em] focus:outline-none focus:ring-4 focus:ring-sw-red/10 pl-12"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 flex gap-4 bg-black/20">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-xl border border-gray-800 text-gray-400 hover:bg-white/5 transition-all font-bold uppercase tracking-widest text-[14px]"
          >
            Volver
          </button>
          <button 
            onClick={() => onConfirm(jobId, pin, reason)}
            disabled={pin.length < 4 || reason.length < 5}
            className="flex-1 py-4 rounded-xl bg-sw-red text-white font-black uppercase tracking-widest text-[14px] disabled:opacity-50 disabled:grayscale transition-all shadow-[0_0_20px_rgba(231,76,60,0.3)]"
          >
            Confirmar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

