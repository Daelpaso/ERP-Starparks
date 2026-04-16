import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingCart, FileText, Clock, Trash2, CheckCircle2, ShieldCheck, AlertTriangle, Edit2, Shield, ChevronLeft, UserPlus, Eye, EyeOff, MessageCircle, MessageSquare, Printer, DollarSign, Package, Plus } from 'lucide-react';
import { calculateParkingTimeAndFee, generateDeliveryVoucher } from '../lib/utils';
import { PAYMENT_METHODS, DOC_TYPES } from '../lib/constants';
import { doc, updateDoc, setDoc, deleteDoc, db, increment } from '../firebase';

export const JobDetailModal = ({ jobId, jobs, onClose, advanceJobStatus, setStoreModalJobId, addTimelineEvent, hasPermission }: any) => {
  const job = jobs.find((j: any) => j.id === jobId);
  const [note, setNote] = useState(job?.notes || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePin, setDeletePin] = useState('');
  if (!job) return null;

  const { extraFee, extraMins, totalElapsedSinceReady } = calculateParkingTimeAndFee(job);

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
      alert('PIN Inválido');
      return;
    }
    try {
      await deleteDoc(doc(db, 'jobs', jobId));
      onClose();
    } catch (e) {
      console.error(e);
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
            <p className="text-xs text-sw-blue font-ui font-bold uppercase tracking-[0.2em]">{job.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => generateDeliveryVoucher(job)} className="p-2 hover:bg-sw-blue/20 text-gray-500 hover:text-sw-blue rounded-xl transition-all" title="Reimprimir Voucher"><Printer size={24} /></button>
            <button onClick={() => setShowDeleteConfirm(true)} className="p-2 hover:bg-sw-red/20 text-gray-500 hover:text-sw-red rounded-xl transition-all" title="Eliminar Vehículo"><Trash2 size={24} /></button>
            <button onClick={onClose} className="p-2 hover:bg-sw-red/20 hover:text-sw-red rounded-full transition-all text-gray-500"><X size={24} /></button>
          </div>
        </div>
        
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-6 rounded-2xl flex-col backdrop-blur-md">
            <AlertTriangle size={64} className="text-sw-red mb-6 animate-pulse" />
            <h2 className="text-2xl font-black uppercase text-white mb-2 text-center">PELIGRO: Eliminar Vehículo</h2>
            <p className="text-gray-400 text-center mb-8 max-w-md">Esta acción es irreversible y eliminará completamente el vehículo del sistema.</p>
            <div className="w-full max-w-xs space-y-4">
              <input 
                type="password" 
                placeholder="PIN ADMIN" 
                value={deletePin} 
                onChange={(e) => setDeletePin(e.target.value)} 
                className="w-full bg-black border border-sw-red text-sw-red text-center font-mono text-2xl py-3 rounded-xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-sw-red"
              />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setShowDeleteConfirm(false); setDeletePin(''); }} className="py-3 rounded-xl border border-gray-600 text-gray-400 hover:bg-gray-800 font-bold uppercase tracking-widest text-xs">Cancelar</button>
                <button onClick={handleDeleteVehicle} disabled={deletePin.length !== 4} className="py-3 rounded-xl bg-sw-red/20 border border-sw-red text-sw-red hover:bg-sw-red hover:text-white font-bold uppercase tracking-widest text-xs disabled:opacity-50 transition-all">Eliminar</button>
              </div>
            </div>
          </div>
        )}
        
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Información del Vehículo</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Modelo:</span><span className="text-white font-bold">{job.vehicleModel || 'No especificado'}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Color:</span><span className="text-white font-bold">{job.vehicleColor || 'No especificado'}</span></div>
                </div>
              </div>
              <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Datos del Cliente</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Nombre:</span><span className="text-white font-bold">{job.clientName || 'Cliente'}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Teléfono:</span><span className="text-sw-blue font-mono">{job.clientPhone || 'No registrado'}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Email:</span><span className="text-gray-300 truncate max-w-[120px]">{job.clientEmail || 'No registrado'}</span></div>
                </div>
              </div>
              <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Estado Actual</div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-sw-green animate-pulse"></div>
                  <span className="text-xl font-bold text-white uppercase tracking-widest">{job.status}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Servicio</div>
                <div className="text-lg font-bold text-sw-blue uppercase tracking-wide">{job.serviceName || 'Lavado'}</div>
                <div className="text-sm font-mono text-sw-green mt-1">${job.serviceTotal.toLocaleString('es-CL')}</div>
              </div>
              <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Tiempos</div>
                <div className="space-y-2 text-xs font-mono">
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
                <div className={`text-xs font-ui font-bold uppercase tracking-[0.1em] mb-2 ${extraFee > 0 ? 'text-sw-red' : 'text-sw-green'}`}>
                  {extraFee > 0 ? 'Total con Multa' : 'Total Acumulado'}
                </div>
                <div className={`text-3xl font-mono font-black ${extraFee > 0 ? 'text-sw-red' : 'text-sw-green'}`}>
                  ${(job.total + extraFee).toLocaleString('es-CL')}
                </div>
                {extraFee > 0 && (
                  <div className="text-[10px] text-sw-red/60 font-bold uppercase mt-1">
                    Incluye ${extraFee.toLocaleString('es-CL')} por sobretiempo
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800 pb-2">Notas del Vehículo</h3>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={handleSaveNote}
              placeholder="Añadir notas u observaciones..."
              className="w-full bg-black/50 border border-gray-800 rounded-xl p-4 text-sm text-gray-300 focus:border-sw-blue focus:ring-1 focus:ring-sw-blue outline-none resize-none h-24"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800 pb-2 flex items-center gap-2"><Clock size={14} /> LÍNEA DE TIEMPO</h3>
            <div className="space-y-3">
              {job.timeline.map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-4 text-xs">
                  <div className="w-20 font-mono text-gray-500">{new Date(t.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                  <div className="w-2 h-2 rounded-full bg-sw-blue shadow-[0_0_5px_var(--color-sw-blue)]"></div>
                  <div className="flex-1 bg-black/30 p-2 rounded border border-gray-800 font-bold uppercase tracking-widest text-gray-300">{t.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 bg-black/50 flex gap-4">
          <button 
            onClick={() => { onClose(); setStoreModalJobId(job.id); }}
            className="flex-1 py-3 rounded-xl border border-sw-yellow/50 text-sw-yellow hover:bg-sw-yellow/10 transition-all font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            <ShoppingCart size={16} /> Tienda
          </button>
          {job.status !== 'Entregado' && (
            <button 
              onClick={() => { 
                if (!hasPermission('write_workshop')) return;
                onClose(); 
                advanceJobStatus(job.id, job.status); 
              }}
              className="flex-1 py-3 rounded-xl bg-sw-green/20 border border-sw-green text-sw-green hover:bg-sw-green hover:text-black transition-all font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} /> Siguiente Estado
            </button>
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
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Añadir consumos a la cuenta del vehículo.</p>
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
                  <span className="text-[10px] font-mono text-gray-500">STK: {prod.stock}</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white uppercase tracking-wide line-clamp-1">{prod.name}</div>
                  <div className="text-sm font-mono font-black text-sw-yellow">${prod.price.toLocaleString('es-CL')}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="w-full md:w-80 bg-black/40 border-l border-gray-800 p-6 flex flex-col">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 border-b border-gray-800 pb-2">CARRITO ACTUAL</h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mb-6">
              {job.cart.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-black/60 p-3 rounded-lg border border-gray-800 group animate-fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-xs font-bold text-gray-300 uppercase truncate w-24">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-sw-yellow">${item.price}</span>
                    <button onClick={() => removeFromCart(idx)} className="text-gray-600 hover:text-sw-red transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {job.cart.length === 0 && <div className="text-center py-12 text-gray-700 text-[10px] font-bold uppercase tracking-[0.2em] italic">Vacío</div>}
            </div>
            <div className="pt-4 border-t border-gray-800">
              <div className="flex justify-between items-end mb-6">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Tienda:</span>
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

export const ClientDetailModal = ({ clientId, clients, jobs, onClose, setDetailModalJobId }: any) => {
  const client = clients.find((c: any) => c.id === clientId);
  const [activeTab, setActiveTab] = useState('resumen');

  if (!client) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="panel-glass rounded-2xl w-full max-w-3xl border border-sw-yellow/30 shadow-[0_0_50px_rgba(255,232,31,0.15)] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-sw-yellow/5">
          <div>
            <h2 className="text-3xl font-mono font-black text-white tracking-tighter">{client.name}</h2>
            <p className="text-[10px] text-sw-yellow font-bold uppercase tracking-[0.3em]">{client.plate}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-sw-red/20 hover:text-sw-red rounded-full transition-all text-gray-500"><X size={24} /></button>
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
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Contacto</div>
                  <div className="text-sm text-white mb-1"><span className="text-gray-500 mr-2">Tel:</span>{client.phone}</div>
                  <div className="text-sm text-white"><span className="text-gray-500 mr-2">Email:</span>{client.email || 'No registrado'}</div>
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Actividad</div>
                  <div className="text-sm text-white mb-1"><span className="text-gray-500 mr-2">Visitas:</span><span className="text-sw-yellow font-bold">{client.visits}</span></div>
                  <div className="text-sm text-white"><span className="text-gray-500 mr-2">Registro:</span>{new Date(client.date).toLocaleDateString('es-CL')}</div>
                </div>
              </div>

              {/* 6+1 Tracker */}
              <div className="panel-glass p-6 rounded-2xl border border-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-sw-yellow uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 size={18} /> Progreso Fidelización (6+1: El séptimo lavado es ¡GRATIS!)
                  </h3>
                  <span className="text-xs font-mono text-gray-400">{(client.visits % 7) || 0}/6 Visitas</span>
                </div>
                <div className="flex gap-2 justify-between max-w-lg mx-auto">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const isCompleted = i < (client.visits % 7);
                    const isGoal = i === 6;
                    return (
                      <div key={i} className="flex flex-col items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                          isCompleted 
                            ? 'bg-sw-green/20 border-sw-green text-sw-green shadow-[0_0_15px_rgba(46,204,113,0.3)]' 
                            : isGoal 
                              ? 'bg-sw-yellow/10 border-sw-yellow border-dashed text-sw-yellow' 
                              : 'bg-black/40 border-gray-700 text-gray-600'
                        }`}>
                          {isCompleted ? <CheckCircle2 size={20} /> : isGoal ? <span className="font-black text-xs">GRATIS</span> : (i + 1)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'financiero' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Gastado</div>
                  <div className="text-2xl font-mono font-black text-sw-green">
                    ${jobs?.filter((j: any) => j.plate === client.plate && j.status === 'Entregado').reduce((acc: number, j: any) => acc + (j.total || 0), 0).toLocaleString('es-CL')}
                  </div>
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Ticket Promedio</div>
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
                      <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Fecha</th>
                      <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Servicio</th>
                      <th className="p-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Monto</th>
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
                      <tr><td colSpan={3} className="p-8 text-center text-gray-600 text-xs font-bold uppercase tracking-widest">Sin historial de pagos registrados</td></tr>
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
                      const msg = encodeURIComponent(`¡Buenas noticias de StarParks CarWash!\n\nEstimado ${client.name}, ¡ha ganado un LAVADO GRATIS! 🎉\nAcaba de completar sus 6 visitas. Lo esperamos para canjear su 7mo lavado 100% gratuito.\n\nMostrando este mensaje en caja validaremos su premio. ¡Gracias por preferirnos!`);
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
              <div className="inline-block px-4 py-1 rounded-full bg-sw-blue/10 border border-sw-blue/30 text-sw-blue text-xs font-bold uppercase tracking-[0.4em]">
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
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Correo Electrónico</label>
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
                    className="px-4 bg-sw-blue/20 text-sw-blue rounded-xl border border-sw-blue/30 font-bold text-[10px] uppercase hover:bg-sw-blue hover:text-black transition-all"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="text-xl font-mono text-white break-all">{user.email}</div>
              )}
            </div>
            <div className="panel-glass p-8 rounded-3xl border border-gray-800 space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Identificación (RUT)</label>
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
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Teléfono de Contacto</label>
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
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Código PIN / Acceso</label>
              <div className="flex justify-between items-center">
                <div className="text-xl font-mono text-sw-yellow">****</div>
                {isEditing && (
                  <button 
                    onClick={() => setShowCredentialModal(true)}
                    className="px-4 py-1 bg-sw-yellow/10 text-sw-yellow rounded-lg border border-sw-yellow/30 font-bold text-[10px] uppercase hover:bg-sw-yellow hover:text-black transition-all"
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
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Notificaciones Habilitadas</label>
                <button 
                  onClick={() => isEditing && handleChange('notifications', !formData.notifications)}
                  className={`w-12 h-6 rounded-full transition-all relative ${formData.notifications ? 'bg-sw-green' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.notifications ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
              <p className="text-[10px] text-gray-500 uppercase">Recibir alertas de turnos y reportes vía email</p>
            </div>
            <div className="panel-glass p-8 rounded-3xl border border-gray-800 space-y-4">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Comentarios / Notas</label>
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
                <p className="text-gray-500 text-xs mt-2 uppercase tracking-widest font-bold">
                  {isEditing ? 'Selecciona los permisos para actualizar el perfil' : 'Consulta los permisos asignados actualmente'}
                </p>
              </div>
              
              {isEditing && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] text-gray-500 w-full mb-1 uppercase tracking-widest font-black">Presets Rápidos:</span>
                  {['Cajero', 'Operario', 'Visualizador', 'Admin'].map(r => (
                    <button 
                      key={r}
                      onClick={() => handlePresetApply(r)}
                      className="px-4 py-2 rounded-xl bg-sw-blue/10 border border-sw-blue/30 text-sw-blue hover:bg-sw-blue hover:text-black transition-all font-bold uppercase text-xs"
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
                      <div className="text-[9px] opacity-50 font-bold uppercase tracking-widest">ID: {p.id}</div>
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
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Ingresa el PIN de Administrador para editar</p>
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
                  className="flex-1 py-4 rounded-xl border border-gray-800 text-gray-500 font-bold uppercase tracking-widest text-xs hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={verifyPin}
                  className="flex-1 py-4 rounded-xl bg-sw-blue text-black font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all"
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
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Actualiza el acceso para {user.name}</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nuevo Correo Electrónico</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-gray-800 rounded-xl p-4 text-white outline-none focus:border-sw-blue font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Confirmar Correo</label>
            <input 
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="w-full bg-black/40 border border-gray-800 rounded-xl p-4 text-white outline-none focus:border-sw-blue font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nueva Contraseña / PIN</label>
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
            className="flex-1 py-4 rounded-xl border border-gray-800 text-gray-500 font-bold uppercase tracking-widest text-xs hover:text-white transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 py-4 rounded-xl bg-sw-blue text-black font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all"
          >
            Confirmar Cambios
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const UserCreateModal = ({ onClose, showToast }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    rut: '',
    email: '',
    phone: '',
    role: 'Operario',
    pin: '0000'
  });

  const handleSave = async () => {
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
        permissions: {},
        createdAt: Date.now()
      });
      showToast('Nuevo usuario reclutado con éxito', 'success');
      onClose();
    } catch (e) {
      showToast('Error al reclutar usuario', 'error');
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
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nombre Completo</label>
              <input 
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-sw-blue"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">RUT</label>
              <input 
                type="text"
                value={formData.rut}
                onChange={(e) => setFormData({...formData, rut: e.target.value})}
                className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-sw-blue"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Correo Electrónico</label>
            <input 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-sw-blue"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Teléfono</label>
              <input 
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-white outline-none focus:border-sw-blue"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Rol Inicial</label>
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

export const ServiceModal = ({ serviceId, services, onClose, showToast, hasPermission }: any) => {
  const service = services.find((s: any) => s.id === serviceId);
  const [formData, setFormData] = useState({
    name: service?.name || '',
    basePrice: service?.basePrice || 0,
    recipe: service?.recipe || []
  });

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
        id
      });
      showToast(serviceId ? 'Servicio actualizado' : 'Servicio creado', 'success');
      onClose();
    } catch (e) {
      showToast('Error al guardar el servicio', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[150] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
      <div className="panel-glass rounded-2xl w-full max-w-md border border-sw-green/30 shadow-[0_0_50px_rgba(46,204,113,0.15)] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-800 bg-sw-green/5 flex justify-between items-center">
          <h2 className="text-xl font-bold sw-title-font text-sw-green tracking-widest uppercase">
            {serviceId ? 'EDITAR SERVICIO' : 'NUEVO SERVICIO'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-sw-red transition-colors"><X size={24} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Nombre del Servicio</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-black/40 border border-gray-800 rounded-lg p-3 text-white focus:border-sw-green outline-none"
              placeholder="Ej: Lavado de Motor"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Precio Base (CLP)</label>
            <input 
              type="number" 
              value={formData.basePrice}
              onChange={(e) => setFormData({...formData, basePrice: Number(e.target.value)})}
              className="w-full bg-black/40 border border-gray-800 rounded-lg p-3 text-white font-mono focus:border-sw-green outline-none"
            />
          </div>
          <div className="pt-4">
            <button onClick={handleSave} className="w-full btn-yoda py-4 rounded-xl font-bold uppercase text-lg tracking-widest flex justify-center items-center gap-3">
              <ShieldCheck size={24} /> GUARDAR SERVICIO
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
      showToast(categoryId ? 'Categoría actualizada' : 'Categoría creada', 'success');
      onClose();
    } catch (e) {
      showToast('Error al guardar la categoría', 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[150] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
      <div className="panel-glass rounded-2xl w-full max-w-md border border-sw-blue/30 shadow-[0_0_50px_rgba(0,168,255,0.15)] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-800 bg-sw-blue/5 flex justify-between items-center">
          <h2 className="text-xl font-bold sw-title-font text-sw-blue tracking-widest uppercase">
            {categoryId ? 'EDITAR CATEGORÍA' : 'NUEVA CATEGORÍA'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-sw-red transition-colors"><X size={24} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Nombre de la Categoría / Sociedad</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-black/40 border border-gray-800 rounded-lg p-3 text-white focus:border-sw-blue outline-none"
              placeholder="Ej: Convenio Empresa X"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Factor de Multiplicación</label>
            <input 
              type="number" 
              step="0.01"
              value={formData.factor}
              onChange={(e) => setFormData({...formData, factor: Number(e.target.value)})}
              className="w-full bg-black/40 border border-gray-800 rounded-lg p-3 text-white font-mono focus:border-sw-blue outline-none"
            />
            <p className="text-[10px] text-gray-500 mt-1 italic">1.0 = Precio Normal, 0.8 = 20% Descuento, 1.2 = 20% Recargo</p>
          </div>
          <div className="pt-4">
            <button onClick={handleSave} className="w-full btn-jedi py-4 rounded-xl font-bold uppercase text-lg tracking-widest flex justify-center items-center gap-3">
              <ShieldCheck size={24} /> GUARDAR CATEGORÍA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CheckoutModal = ({ jobId, jobs, setJobs, currentShift, showToast, onClose, hasPermission }: any) => {
  const [payMethod, setPayMethod] = useState(PAYMENT_METHODS[0]);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  
  const job = jobs.find((j: any) => j.id === jobId);
  if (!job) return null;

  const { extraFee, extraMins } = calculateParkingTimeAndFee(job);
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
      await updateDoc(doc(db, 'jobs', jobId), {
        status: 'Entregado', 
        exitDate: now, 
        paymentMethod: payMethod, 
        docType: docType, 
        parkingFee: extraFee, 
        parkingMins: extraMins,
        discount: discountAmount,
        total: finalTotal,
        shiftId: currentShift.id,
        timeline: [...job.timeline, { status: 'Entregado', timestamp: now, workerId: null }]
      });
      showToast(`Misión Finalizada: ${job.plate}`, 'success');
      
      // Auto-generate Delivery Voucher
      generateDeliveryVoucher({
        ...job,
        exitDate: now,
        paymentMethod: payMethod,
        docType: docType,
        parkingFee: extraFee,
        parkingMins: extraMins,
        discount: discountAmount,
        total: finalTotal
      });

      onClose();
    } catch (error) {
      showToast('Error al finalizar', 'error');
    }
  };

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
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-gray-500"><span>Patente</span><span className="text-sw-blue font-mono text-xl">{job.plate}</span></div>
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-gray-500"><span>Servicio</span><span className="text-white">{job.serviceName || 'Lavado'}</span></div>
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-gray-500"><span>Consumo Tienda</span><span className="text-white">${job.storeTotal.toLocaleString('es-CL')}</span></div>
            {extraFee > 0 && <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-sw-red"><span>Multa Parking ({extraMins}m)</span><span>+${extraFee.toLocaleString('es-CL')}</span></div>}
            
            <div className="pt-4 border-t border-gray-800 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Descuento</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setDiscountType('fixed')}
                    className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${discountType === 'fixed' ? 'bg-sw-blue/20 border-sw-blue text-sw-blue' : 'bg-black/40 border-gray-800 text-gray-600'}`}
                  >
                    $
                  </button>
                  <button 
                    onClick={() => setDiscountType('percent')}
                    className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${discountType === 'percent' ? 'bg-sw-blue/20 border-sw-blue text-sw-blue' : 'bg-black/40 border-gray-800 text-gray-600'}`}
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
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-sw-yellow">
                  <span>Total Descuento</span>
                  <span>-${discountAmount.toLocaleString('es-CL')}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-800 flex justify-between items-end">
              <span className="text-sm font-bold uppercase tracking-widest text-gray-400">TOTAL A PAGAR</span>
              <span className="text-4xl font-mono font-black text-sw-green drop-shadow-[0_0_10px_rgba(46,204,113,0.3)]">${finalTotal.toLocaleString('es-CL')}</span>
            </div>
          </div>

          {showPinModal && (
            <div className="bg-sw-red/10 border border-sw-red/30 p-4 rounded-xl space-y-3">
              <p className="text-[10px] font-bold text-sw-red uppercase tracking-widest text-center">PIN DE ADMINISTRADOR REQUERIDO</p>
              <input 
                type="password" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-black/60 border border-sw-red/50 rounded-lg p-3 text-center text-white font-mono tracking-[1em] outline-none"
                placeholder="****"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => { setShowPinModal(false); setDiscount(0); setPin(''); }} className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-400 text-[10px] font-bold uppercase">Cancelar</button>
                <button onClick={handleFinish} className="flex-1 py-2 rounded-lg bg-sw-red text-white text-[10px] font-bold uppercase">Validar</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
             <div>
               <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Medio de Pago</label>
               <div className="grid grid-cols-1 gap-2">
                 {PAYMENT_METHODS.map(m => (
                   <button key={m} onClick={() => setPayMethod(m)} className={`w-full text-left p-3 rounded-lg border text-xs font-bold uppercase tracking-widest transition-all ${payMethod === m ? 'btn-yoda' : 'bg-black/50 border-gray-800 text-gray-500 hover:border-gray-600'}`}>{m}</button>
                 ))}
               </div>
             </div>
             <div>
               <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Tipo de Documento</label>
               <div className="grid grid-cols-3 gap-2">
                 {DOC_TYPES.map(d => (
                   <button key={d} onClick={() => setDocType(d)} className={`p-2 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all ${docType === d ? 'btn-jedi' : 'bg-black/50 border-gray-800 text-gray-500 hover:border-gray-600'}`}>{d.split(' ')[0]}</button>
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

export const InventoryItemModal = ({ item, type, onClose, showToast, hasPermission }: any) => {
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
    if (confirm('¿Está seguro de eliminar este item?')) {
      const pinPrompt = window.prompt('Ingrese PIN de Administrador (1124) para eliminar:');
      if (pinPrompt === '1124') {
        try {
          await deleteDoc(doc(db, type === 'raw' ? 'rawMaterials' : 'storeProducts', item.id));
          showToast('Item eliminado', 'success');
          onClose();
        } catch (e) {
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
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Nombre</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white focus:border-sw-yellow outline-none uppercase" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Stock Actual</label>
              <input type="number" value={stock} onChange={e => setStock(Number(e.target.value))} className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white font-mono focus:border-sw-yellow outline-none" />
            </div>
            {type === 'raw' ? (
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Unidad</label>
                <input type="text" value={uom} onChange={e => setUom(e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white focus:border-sw-yellow outline-none" />
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Icono</label>
                <input type="text" value={icon} onChange={e => setIcon(e.target.value)} className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white text-center text-xl focus:border-sw-yellow outline-none" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{type === 'raw' ? 'Costo Unitario' : 'Precio Venta'}</label>
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
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Punto Reorden</label>
                <input type="number" value={reorderPoint} onChange={e => setReorderPoint(Number(e.target.value))} className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white font-mono focus:border-sw-yellow outline-none" />
              </div>
            )}
          </div>

          {showPinModal && (
            <div className="bg-sw-red/10 border border-sw-red/30 p-4 rounded-xl space-y-3">
              <p className="text-[10px] font-bold text-sw-red uppercase tracking-widest text-center">PIN DE ADMINISTRADOR REQUERIDO</p>
              <input 
                type="password" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-black/60 border border-sw-red/50 rounded-lg p-3 text-center text-white font-mono tracking-[1em] outline-none"
                placeholder="****"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => { setShowPinModal(false); setPin(''); }} className="flex-1 py-2 rounded-lg bg-gray-800 text-gray-400 text-[10px] font-bold uppercase">Cancelar</button>
                <button onClick={handleSave} className="flex-1 py-2 rounded-lg bg-sw-red text-white text-[10px] font-bold uppercase">Validar</button>
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

