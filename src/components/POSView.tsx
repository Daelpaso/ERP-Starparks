import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, Store, ShoppingCart, Zap, ShieldCheck, CheckCircle2, Users, Clock, Plus, X, Sparkles, Star, UserPlus, ChevronDown, EyeOff, Lock } from 'lucide-react';
import { INITIAL_CATEGORIES, PAYMENT_METHODS } from '../lib/constants';
import { validarPatenteChilena, validarTelefonoChileno, validarEmail } from '../lib/utils';
import { doc, setDoc, updateDoc, db, increment, runTransaction } from '../firebase';

export const POSView = ({ jobs, setJobs, clients, setClients, services, storeProducts, categories, showToast, setActiveTab, hasPermission, currentShift, systemSettings, setCheckoutModalJobId, currentUser }: any) => {
  const [posTab, setPosTab] = useState<'lavado' | 'tienda'>('lavado');

  // Lavado state
  const [plate, setPlate] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [pickupMode, setPickupMode] = useState<string | null>(null);
  const [customPickupTime, setCustomPickupTime] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+56');
  const [clientEmail, setClientEmail] = useState('');
  const [clientModel, setClientModel] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const [isClientHovered, setIsClientHovered] = useState(false);
  const [isClientFocused, setIsClientFocused] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [showDiscountPanel, setShowDiscountPanel] = useState(false);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountPin, setDiscountPin] = useState('');
  const [addonCart, setAddonCart] = useState<any[]>([]);
  const [pendingSale, setPendingSale] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [printTicketJob, setPrintTicketJob] = useState<any>(null);

  // Express state
  const [expressCart, setExpressCart] = useState<any[]>([]);
  const [expressPay, setExpressPay] = useState(PAYMENT_METHODS[0]);

  const availableServices = useMemo(() => {
    return services?.filter((s: any) => 
      s.isActive !== false && 
      s.active !== false && 
      s.type === 'Servicio' && 
      (!s.categoryId || s.categoryId === selectedCat)
    ) || [];
  }, [services, selectedCat]);

  const complementaryServices = useMemo(() => {
    return services?.filter((s: any) => 
      s.isActive !== false && 
      s.active !== false && 
      s.type === 'Adicional'
    ) || [];
  }, [services]);

  const existingClient = clients.find((c: any) => c.plate === plate.toUpperCase().replace(/-/g, ''));
  const loyaltyConfig = systemSettings?.loyalty || { enabled: true, requiredVisits: 6, rewardDiscount: 100 };
  const isFreeWash = existingClient && loyaltyConfig.enabled && ((existingClient.visits % (loyaltyConfig.requiredVisits + 1)) === loyaltyConfig.requiredVisits);
  const isNewClient = validarPatenteChilena(plate) && !existingClient;

  useEffect(() => {
    if (existingClient?.lastVehicleTypeId && categories?.some((c: any) => c.id === existingClient.lastVehicleTypeId)) {
      setSelectedCat(existingClient.lastVehicleTypeId);
    }
    
    // Auto-fill client details if found
    if (existingClient) {
      setClientName(existingClient.name || '');
      setClientPhone(existingClient.phone || '+56');
      setClientEmail(existingClient.email || '');
      setClientModel(existingClient.vehicleModel || '');
    } else {
      // Clear if no client and only if not manually typed (simple check)
      if (!plate) {
        setClientName('');
        setClientPhone('+56');
        setClientEmail('');
        setClientModel('');
      }
    }
  }, [existingClient, categories, plate]);

  const filteredCategories = useMemo(() =>
    (categories?.length > 0 ? categories : INITIAL_CATEGORIES).filter((c: any) => !c.name.toLowerCase().includes('convenio'))
  , [categories]);

  const isPlateFilled = plate.length >= 5;

  const serviceBaseBeforeFree = useMemo(() => {
    const cat = filteredCategories.find((c: any) => c.id === selectedCat);
    const srv = availableServices?.find((s: any) => s.id === selectedService);
    
    // If the service has a hardcoded category, it's an exact price, no factor needed
    const isExactPrice = !!srv?.categoryId;
    return isExactPrice ? (srv?.basePrice || 0) : ((srv?.basePrice || 0) * (cat?.factor || 1));
  }, [selectedCat, selectedService, availableServices, filteredCategories]);

  const serviceBase = useMemo(() => {
    let base = serviceBaseBeforeFree;
    if (isFreeWash) {
      base = base * (1 - (loyaltyConfig.rewardDiscount / 100));
    }
    return base;
  }, [serviceBaseBeforeFree, isFreeWash, loyaltyConfig.rewardDiscount]);

  const discountAmount = useMemo(() => {
    if (!discountApplied) return 0;
    return discountType === 'percent' ? Math.round(serviceBase * discount / 100) : discount;
  }, [serviceBase, discount, discountType, discountApplied]);

  const addonTotal = addonCart.reduce((sum, item) => sum + item.price, 0);
  const expressTotal = expressCart.reduce((sum, item) => sum + item.price, 0);
  const finalTotal = Math.max(0, serviceBase - discountAmount) + addonTotal;
  const serviceNeto = Math.round(finalTotal / 1.19);
  const serviceIva = finalTotal - serviceNeto;

  const estimatedPickupTime = useMemo(() => {
    if (!pickupMode || pickupMode === 'none') return null;
    if (pickupMode === 'custom') return customPickupTime || null;
    if (pickupMode === '18:00') return '18:00';
    const h = parseInt(pickupMode.replace('h', ''));
    return new Date(Date.now() + h * 3600000).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  }, [pickupMode, customPickupTime]);

  const selectedServiceObj = services?.find((s: any) => s.id === selectedService);

  const isPlateValid = useMemo(() => validarPatenteChilena(plate), [plate]);
  const isCategoryEnabled = isPlateValid;
  const isServiceEnabled = isCategoryEnabled && !!selectedCat;
  const isPickupEnabled = isServiceEnabled && !!selectedService;
  const isAddonsEnabled = isPickupEnabled && pickupMode !== null;

  // Prevent POS access if no shift or wrong user
  if (!currentShift) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4 animate-fade-in">
        <div className="bg-gray-900/50 border-2 border-gray-800 rounded-3xl p-12 max-w-lg w-full flex flex-col items-center backdrop-blur-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-red-500 opacity-50"></div>
          <Zap size={64} className="text-gray-500 mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
          <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-4">Caja Cerrada</h2>
          <p className="text-gray-400 font-medium">Debes iniciar un turno para poder utilizar el Punto de Venta y generar ingresos.</p>
        </div>
      </div>
    );
  }

  const isShiftOwner = currentShift.openedBy === (currentUser?.email || currentUser?.id);
  if (!isShiftOwner) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4 animate-fade-in">
        <div className="bg-gray-900/50 border-2 border-sw-yellow/30 rounded-3xl p-12 max-w-lg w-full flex flex-col items-center backdrop-blur-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sw-yellow via-[#00a8ff] to-sw-yellow opacity-50"></div>
          <Lock size={64} className="text-sw-yellow mb-6 drop-shadow-[0_0_15px_rgba(255,232,31,0.2)]" />
          <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-4">Caja en Uso</h2>
          <p className="text-gray-400 font-medium">
            El turno actual está siendo operado por <strong className="text-sw-yellow">{currentShift.operatorName || currentShift.openedBy}</strong>. 
          </p>
          <div className="mt-8 bg-black/40 border border-gray-800 rounded-xl p-4 w-full">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Protección de Cuadratura</p>
            <p className="text-xs text-gray-600 mt-2">Solo el cajero principal puede procesar ventas para mantener el control financiero. Puedes consultar los otros módulos.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleApplyDiscount = () => {
    if (discount <= 0) { showToast('Ingrese un monto de descuento', 'error'); return; }
    if (discountPin !== '1124') { showToast('PIN de administrador incorrecto', 'error'); return; }
    setDiscountApplied(true);
    showToast(`Descuento aplicado`, 'success');
  };

  const resetForm = () => {
    setPlate(''); setClientName(''); setClientPhone('+56'); setClientEmail('');
    setClientModel(''); setClientNotes('');
    setPickupMode(null); setCustomPickupTime('');
    setSelectedCat(''); setSelectedService('');
    setDiscount(0); setDiscountApplied(false); setDiscountPin(''); setShowDiscountPanel(false);
    setAddonCart([]);
  };

  const handlePreSubmit = () => {
    if (!currentShift) { showToast('Debe iniciar un turno primero', 'error'); return; }
    if (!hasPermission('write_pos')) { showToast('Sin permisos de venta', 'error'); return; }
    if (!selectedCat) { showToast('Seleccione un tipo de vehículo', 'error'); return; }
    if (!selectedService) { showToast('Seleccione un servicio', 'error'); return; }
    if (!validarPatenteChilena(plate)) { showToast('Patente inválida', 'error'); return; }

    // Check for existing active vehicle with same plate in the taller
    const cleanPlateInput = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const activeDuplicate = jobs.find((j: any) => 
      j.plate && j.plate.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanPlateInput && j.status !== 'Entregado' && j.status !== 'Anulado'
    );
    if (activeDuplicate) {
      showToast(`El vehículo con patente ${plate.toUpperCase()} ya está activo en el Taller (${activeDuplicate.status})`, 'error');
      return;
    }

    if (clientName.trim() || (clientPhone.trim() && clientPhone !== '+56')) {
      if (!clientName.trim()) { showToast('El nombre es obligatorio', 'error'); return; }
      if (!clientPhone.trim() || clientPhone === '+56') { showToast('El teléfono es obligatorio', 'error'); return; }
      if (clientPhone.trim() && !validarTelefonoChileno(clientPhone)) { showToast('Celular inválido (+569...)', 'error'); return; }
    }
    if (pickupMode === 'custom' && !customPickupTime) { showToast('Defina la hora de retiro', 'error'); return; }
    setPendingSale({
      plate: plate.toUpperCase().replace(/-/g, ''),
      catName: filteredCategories.find((c: any) => c.id === selectedCat)?.name,
      srvName: services?.find((s: any) => s.id === selectedService)?.name,
      total: finalTotal, discountAmount,
      isDiscounted: isFreeWash || discountApplied,
      pickupTime: estimatedPickupTime,
      isNewClient, 
      clientName: clientName.trim(), 
      clientPhone: clientPhone.trim(), 
      clientEmail: clientEmail.trim(), 
      clientModel: clientModel.trim(), 
      clientNotes: clientNotes.trim(), 
      addonCart
    });
  };

  const confirmSale = async () => {
    if (!pendingSale) return;
    if (isSubmitting) return;

    // Double check just before saving in case someone added it simultaneously
    const cleanPlateInput = pendingSale.plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const activeDuplicate = jobs.find((j: any) => 
      j.plate && j.plate.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanPlateInput && j.status !== 'Entregado' && j.status !== 'Anulado'
    );
    if (activeDuplicate) {
      showToast(`El vehículo con patente ${pendingSale.plate} ya está activo en el taller`, 'error');
      setPendingSale(null);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create or Update Client Info
      if (pendingSale.isNewClient) {
        const nc = { 
          id: `cli_${Date.now()}`, 
          plate: pendingSale.plate, 
          name: pendingSale.clientName || 'Cliente Particular', 
          phone: pendingSale.clientPhone || '', 
          email: pendingSale.clientEmail || '', 
          vehicleModel: pendingSale.clientModel || '',
          lastVehicleTypeId: selectedCat,
          date: Date.now(), 
          visits: 0 
        };
        await setDoc(doc(db, 'clients', nc.id), nc);
      } else if (existingClient) {
        // Update existing client with info from form if provided
        const updateData: any = { 
          lastVehicleTypeId: selectedCat,
          name: pendingSale.clientName || existingClient.name,
          phone: pendingSale.clientPhone || existingClient.phone,
          email: pendingSale.clientEmail || existingClient.email,
          vehicleModel: pendingSale.clientModel || existingClient.vehicleModel
        };
        await updateDoc(doc(db, 'clients', existingClient.id), updateData);
      }
      const now = Date.now();
      const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      const counterRef = doc(db, 'settings', 'ticket_counters');
      const newTktCount = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let count = 1;
        if (!counterDoc.exists()) {
          transaction.set(counterRef, { TKT: 1 });
        } else {
          const data = counterDoc.data();
          count = (data.TKT || 0) + 1;
          transaction.update(counterRef, { TKT: count });
        }
        return count;
      });
      const ticketId = `TKT-${dateStr}-${String(newTktCount).padStart(5, '0')}`;
      
      const job = {
        id: ticketId,
        shiftId: currentShift.id, plate: pendingSale.plate,
        categoryId: selectedCat, serviceId: selectedService,
        serviceName: services.find((s: any) => s.id === selectedService)?.name || 'Servicio',
        clientName: pendingSale.clientName || existingClient?.name || 'Cliente',
        clientPhone: pendingSale.clientPhone || existingClient?.phone || '',
        clientEmail: pendingSale.clientEmail || existingClient?.email || '',
        clientVehicleModel: pendingSale.clientModel || existingClient?.vehicleModel || '',
        observations: pendingSale.clientNotes || '',
        status: 'Cola', serviceTotal: serviceBase, storeTotal: addonTotal,
        parkingFee: 0, parkingMins: 0, manualDiscount: pendingSale.discountAmount,
        total: pendingSale.total, cart: pendingSale.addonCart || [],
        isDiscounted: pendingSale.isDiscounted, entryDate: now, exitDate: null,
        isVIP: existingClient?.isVIP || false,
        pickupTime: pendingSale.pickupTime, paymentMethod: 'Pendiente', docType: 'Pendiente',
        timeline: [{ status: 'Cola', timestamp: now, workerId: null }]
      };
      await setDoc(doc(db, 'jobs', job.id), job);
      for (const item of (pendingSale.addonCart || [])) {
        if (!item.isTypeService) {
          try { await updateDoc(doc(db, 'storeProducts', item.id), { stock: increment(-1) }); } catch (_) {}
        }
      }
      showToast('Vehículo ingresado al Taller', 'success');
      setPrintTicketJob(job);
      setPendingSale(null);
      resetForm();
    } catch {
      showToast('Error al guardar', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExpressSale = async () => {
    if (!currentShift) { showToast('Debe iniciar un turno primero', 'error'); return; }
    if (!hasPermission('write_pos')) { showToast('Sin permisos de venta', 'error'); return; }
    if (expressCart.length === 0) { showToast('Carrito vacío', 'error'); return; }
    if (isSubmitting) return;

    setIsSubmitting(true);
    const now = Date.now();
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    try {
      const counterRef = doc(db, 'settings', 'ticket_counters');
      const newVstCount = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let count = 1;
        if (!counterDoc.exists()) {
          transaction.set(counterRef, { VST: 1 });
        } else {
          const data = counterDoc.data();
          count = (data.VST || 0) + 1;
          transaction.update(counterRef, { VST: count });
        }
        return count;
      });
      const ticketId = `VST-${dateStr}-${String(newVstCount).padStart(5, '0')}`;

      const job = {
        id: ticketId,
        shiftId: currentShift.id, plate: '🏪 VENTA TIENDA',
        categoryId: null, serviceId: null, status: 'En Caja',
        serviceTotal: 0, storeTotal: expressTotal, parkingFee: 0, parkingMins: 0,
        manualDiscount: 0, total: expressTotal, cart: expressCart,
        isDiscounted: false, entryDate: now, exitDate: null,
        pickupTime: null, paymentMethod: 'Pendiente', docType: 'Pendiente',
        timeline: [{ status: 'En Caja (Tienda)', timestamp: now, workerId: null }]
      };
      await setDoc(doc(db, 'jobs', job.id), job);
      
      // Instead of finishing here, we open the checkout modal
      setCheckoutModalJobId(ticketId);
      setExpressCart([]);
      showToast('Iniciando Checkout...', 'info');
    } catch (e) {
      console.error(e);
      showToast('Error al preparar venta express', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 120px)' }}>

      {/* ─── CONFIRMATION MODAL ─── */}
      {pendingSale && (
        <div className="fixed inset-0 bg-black/90 z-[80] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="panel-glass rounded-2xl w-full max-w-2xl border border-sw-yellow/40 shadow-[0_0_40px_rgba(255,232,31,0.1)] flex flex-col my-8">
            <div className="flex items-center justify-center gap-3 p-6 border-b border-sw-yellow/20 bg-sw-yellow/5 rounded-t-2xl">
              <ShieldCheck size={28} className="text-sw-yellow" />
              <span className="sw-title-font text-sw-yellow tracking-widest text-2xl">CONFIRMAR INGRESO</span>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                <span className="text-gray-400 uppercase tracking-widest text-sm font-bold">Patente</span>
                <span className="font-mono text-sw-blue font-black text-4xl">{pendingSale.plate}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                   <div className="text-gray-500 text-[14px] font-bold uppercase tracking-widest mb-1">Servicio</div>
                   <div className="text-white font-bold text-lg">{pendingSale.srvName || 'Solo Tienda'}</div>
                 </div>
                 <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                   <div className="text-gray-500 text-[14px] font-bold uppercase tracking-widest mb-1">Clase</div>
                   <div className="text-white font-bold text-lg">{pendingSale.catName || 'N/A'}</div>
                 </div>
              </div>
              
              {pendingSale.pickupTime && (
                <div className="flex justify-between items-center bg-sw-yellow/10 p-5 rounded-xl border border-sw-yellow/30">
                  <span className="text-sw-yellow text-sm font-bold uppercase tracking-widest flex items-center gap-2"><Clock size={18} /> Retiro Est.</span>
                  <span className="text-sw-yellow font-mono font-black text-3xl">{pendingSale.pickupTime}</span>
                </div>
              )}
              
              {pendingSale.addonCart?.length > 0 && (
                <div className="bg-sw-green/5 p-5 rounded-xl border border-sw-green/20 space-y-3">
                  <span className="text-[14px] text-sw-green font-bold uppercase tracking-widest block border-b border-sw-green/20 pb-2">PRODUCTOS TIENDA ({pendingSale.addonCart.length})</span>
                  {pendingSale.addonCart.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-white font-bold uppercase tracking-wider">{item.name}</span>
                      <span className="text-sw-yellow font-mono font-bold">${item.price.toLocaleString('es-CL')}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {pendingSale.isNewClient && (
                <div className="bg-sw-blue/10 p-5 rounded-xl border border-sw-blue/30 flex justify-between items-center">
                  <div>
                    <div className="text-[14px] text-sw-blue mb-1 font-bold uppercase tracking-widest">Nuevo Cliente</div>
                    <div className="font-bold text-white text-lg">{pendingSale.clientName}</div>
                  </div>
                  <div className="text-gray-400 font-mono text-lg">{pendingSale.clientPhone}</div>
                </div>
              )}
              
              <div className="border-t border-gray-700 pt-6 flex justify-between items-center bg-black/40 p-6 rounded-xl border border-sw-green/20">
                <span className="text-gray-400 font-bold uppercase tracking-widest text-sm">Total Estimado</span>
                <span className="text-5xl font-black text-sw-green font-mono">${pendingSale.total.toLocaleString('es-CL')}</span>
              </div>
            </div>
            <div className="p-5 flex gap-4 border-t border-gray-800 bg-black/40 rounded-b-2xl">
              <button 
                onClick={() => {
                  const pin = window.prompt('Ingrese PIN de Administrador (1124) para cancelar:');
                  if (pin === '1124') {
                    setPendingSale(null);
                  } else if (pin !== null) {
                    showToast('PIN Incorrecto', 'error');
                  }
                }} 
                className="flex-[0.5] bg-black border border-gray-700 hover:border-sw-red hover:text-sw-red text-gray-400 py-4 rounded-xl font-bold uppercase tracking-widest transition-all text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmSale} 
                disabled={isSubmitting}
                className="flex-1 btn-jedi py-4 rounded-xl font-bold uppercase tracking-widest text-lg shadow-[0_0_20px_rgba(46,204,113,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    Guardando...
                  </>
                ) : (
                  "Confirmar Ingreso"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TICKET MODAL ─── */}
      {printTicketJob && (
        <div className="fixed inset-0 bg-black/90 z-[90] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="panel-glass rounded-2xl w-full max-w-sm border border-sw-blue/40 shadow-[0_0_30px_rgba(0,168,255,0.1)] flex flex-col overflow-hidden">
            <div className="bg-white text-black p-6" id="printable-ticket">
              <div className="text-center mb-4 border-b-2 border-black pb-4"><h2 className="text-2xl font-black uppercase">STARPARKS</h2><p className="text-[14px] font-bold uppercase">Carwash Pro</p></div>
              <div className="space-y-3 text-sm font-mono font-bold mb-6">
                <div className="flex justify-between border-b border-black/10 pb-1"><span>TICKET:</span><span className="text-sm font-black">{printTicketJob.id}</span></div>
                <div className="flex flex-col gap-1 border-b border-black/10 pb-1">
                  <span className="text-[14px] text-gray-500 uppercase">Cliente:</span>
                  <div className="flex justify-between">
                    <span className="uppercase">{printTicketJob.clientName}</span>
                    <span>{printTicketJob.clientPhone}</span>
                  </div>
                </div>
                <div className="flex justify-between border-b border-black/10 pb-1">
                   <span>PLATE:</span><span className="text-2xl font-black">{printTicketJob.plate}</span>
                </div>
                <div className="flex flex-col gap-1 border-b border-black/10 pb-1">
                  <span className="text-[14px] text-gray-500 uppercase">Servicio:</span>
                  <span className="font-black uppercase">{printTicketJob.serviceName}</span>
                </div>
                <div className="flex justify-between"><span>HORA:</span><span>{new Date(printTicketJob.entryDate).toLocaleTimeString()}</span></div>
              </div>
              <div className="border-t-2 border-black pt-4 text-center space-y-2">
                <p className="text-[14px] font-bold uppercase">Se le notificará cuando su vehículo esté listo.</p>
                <p className="text-[14px] font-bold uppercase">Gracia: 30 minutos · Después: $40/min</p>
                <p className="text-lg font-black uppercase mt-3">** NO PIERDA ESTE PAPEL **</p>
              </div>
            </div>
            <div className="p-4 flex gap-3 bg-black/60">
              <button 
                onClick={() => { setPrintTicketJob(null); setActiveTab('taller'); }} 
                className="flex-1 bg-gray-900 border border-gray-700 text-gray-400 py-3 rounded-xl font-bold uppercase tracking-widest text-[14px] transition-all hover:border-gray-500"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  const w = window.open('', '', 'width=400,height=600');
                  const c = document.getElementById('printable-ticket');
                  if (w && c) { 
                    w.document.write(`<html><head><title>Ticket</title><style>body{font-family:monospace;padding:0;margin:0 auto;width:58mm;font-size:12px;color:#000}*{box-sizing:border-box}.flex{display:flex}.justify-between{justify-content:space-between}.text-center{text-align:center}.mb-4{margin-bottom:1rem}.mb-6{margin-bottom:1.5rem}.mt-3{margin-top:0.75rem}.pb-4{padding-bottom:1rem}.pt-4{padding-top:1rem}.border-b-2{border-bottom:2px dashed #000}.border-t-2{border-top:2px dashed #000}.text-2xl{font-size:1.5rem}.text-lg{font-size:1.125rem}.text-[12px]{font-size:12px}.font-black{font-weight:900}.font-bold{font-weight:700}.uppercase{text-transform:uppercase}.space-y-2>*{margin-top:0.5rem;margin-bottom:0}@page{margin:0;padding:0}@media print{body{width:58mm;margin:0;padding:2mm}}</style></head><body>${c.innerHTML}</body></html>`); 
                    w.document.close(); 
                    w.focus(); 
                    w.print(); 
                    w.close(); 
                  }
                  setPrintTicketJob(null);
                  setActiveTab('taller');
                }}
                className="flex-1 btn-jedi py-3 rounded-xl font-bold uppercase tracking-widest text-[14px]"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB SWITCHER ─── */}
      <div className="flex gap-3 justify-center flex-shrink-0">
        <button onClick={() => setPosTab('lavado')} className={`flex items-center gap-2.5 px-8 py-3 rounded-xl font-ui font-bold uppercase tracking-widest text-sm transition-all border ${posTab === 'lavado' ? 'bg-sw-blue/10 border-sw-blue text-sw-blue shadow-[0_0_20px_rgba(0,168,255,0.15)]' : 'bg-black/40 border-gray-800 text-gray-500 hover:text-gray-200 hover:border-gray-600'}`}>
          <Car size={20} /> Ingreso Lavado
        </button>
        <button onClick={() => setPosTab('tienda')} className={`flex items-center gap-2.5 px-8 py-3 rounded-xl font-ui font-bold uppercase tracking-widest text-sm transition-all border ${posTab === 'tienda' ? 'bg-sw-green/10 border-sw-green text-sw-green shadow-[0_0_20px_rgba(46,204,113,0.15)]' : 'bg-black/40 border-gray-800 text-gray-500 hover:text-gray-200 hover:border-gray-600'}`}>
          <Store size={20} /> Tienda Exprés
        </button>
      </div>

      {/* ═══════════════════════════════════════
          LAVADO TAB
      ══════════════════════════════════════ */}
      {posTab === 'lavado' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-5 min-h-0">

          {/* LEFT COLUMN — Formulario (3/5) */}
          <div className="lg:col-span-3 panel-glass rounded-2xl border-t-2 border-sw-blue shadow-[0_0_25px_rgba(0,168,255,0.06)] flex flex-col overflow-hidden">

            {/* 1. IDENTIFICACIÓN Y TIPO */}
            <div className="p-5 border-b border-gray-800/60 transition-all flex-shrink-0 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Car className="text-sw-blue" size={20} />
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">1. Detalle del Vehículo</h3>
                </div>
                {isCategoryEnabled && selectedCat && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-sw-green">
                    <CheckCircle2 size={20} />
                  </motion.div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Patente */}
                <div className="relative">
                  <label className="text-[14px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1.5 block">Patente</label>
                  <input
                    type="text" value={plate}
                    onChange={e => setPlate(e.target.value.toUpperCase())}
                    placeholder="ABCD12"
                    maxLength={7}
                    className="w-full bg-black/60 border-2 border-gray-800 focus:border-sw-blue rounded-xl px-5 py-3 text-white uppercase text-2xl font-mono font-black tracking-widest shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] focus:shadow-[0_0_15px_rgba(0,168,255,0.15)] outline-none transition-all placeholder-gray-800 text-center"
                  />
                  {plate.length >= 4 && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      key={isPlateValid ? 'valid' : 'invalid'}
                      className={`absolute right-4 bottom-3 ${isPlateValid ? 'text-sw-green drop-shadow-[0_0_10px_rgba(46,204,113,0.5)]' : 'text-sw-red drop-shadow-[0_0_10px_rgba(231,76,60,0.5)]'}`}
                    >
                      {isPlateValid ? <CheckCircle2 size={24} /> : <X size={24} />}
                    </motion.div>
                  )}
                </div>

                {/* Tipo de Vehículo */}
                <div className={`flex flex-col transition-all duration-300 ${!isCategoryEnabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                  <label className="text-[14px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-1.5 block">
                    Tipo de Vehículo {!isCategoryEnabled && '🔒'}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCat} onChange={e => setSelectedCat(e.target.value)}
                      disabled={!isCategoryEnabled}
                      className="w-full bg-black/60 border-2 border-gray-800 focus:border-sw-blue rounded-xl px-4 py-3 text-white font-bold uppercase outline-none cursor-pointer transition-all appearance-none text-base hover:border-gray-600"
                    >
                      <option value="" disabled className="bg-[#0a0a0a] text-gray-500">SELECCIONAR TIPO</option>
                      {filteredCategories.map((cat: any) => (
                        <option key={cat.id} value={cat.id} className="bg-[#0a0a0a] text-white py-2">{cat.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 group-focus-within:text-sw-blue">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Cliente Encontrado */}
              {existingClient && (
                <div className="mt-4 p-4 bg-sw-green/10 border border-sw-green/30 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-fade-in">
                  <div className="flex gap-4 items-center">
                    <div className="h-10 w-10 rounded-full bg-sw-green/20 flex items-center justify-center border border-sw-green/50 text-sw-green">
                      <Users size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-sw-green uppercase tracking-widest leading-none mb-1">Cliente Registrado</span>
                      <span className="text-lg font-black text-white leading-none">{existingClient.name || 'Sin Nombre'}</span>
                      <span className="text-[14px] font-mono text-gray-400 mt-1">{existingClient.phone || 'Sin Teléfono'}</span>
                    </div>
                  </div>
                  {loyaltyConfig.enabled && (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5 bg-sw-green/20 px-3 py-1.5 rounded-lg border border-sw-green/40">
                         <Star size={14} className="text-sw-green" fill="currentColor" />
                         <span className="text-sw-green font-black text-[14px]">{existingClient.visits} VISITAS</span>
                      </div>
                      {isFreeWash && (
                        <span className="text-sw-yellow font-black uppercase text-[14px] mt-1.5 tracking-widest animate-pulse">¡Lavado de Premio!</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Formulario Cliente (Accordion Hover/Focus) */}
              <div 
                className="mt-4 relative group"
                onMouseEnter={() => setIsClientHovered(true)}
                onMouseLeave={() => setIsClientHovered(false)}
              >
                <div className={`w-full bg-black/40 border rounded-xl py-3 px-4 flex justify-between items-center transition-all ${isClientHovered || isClientFocused ? 'border-sw-blue bg-sw-blue/5' : 'border-gray-800 text-gray-500'}`}>
                  <div className="flex items-center gap-2">
                    <UserPlus size={18} className={isClientHovered || isClientFocused ? 'text-sw-blue' : 'text-gray-500'} />
                    <span className={`text-sm font-bold uppercase tracking-widest ${isClientHovered || isClientFocused ? 'text-sw-blue' : 'text-gray-500'}`}>
                      {existingClient ? 'Actualizar Datos del Cliente' : 'Datos del Cliente'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {clientName && clientPhone && clientPhone !== '+56' && (
                       <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-sw-blue">
                         <CheckCircle2 size={16} />
                       </motion.div>
                    )}
                    <span className={`text-xl transition-transform duration-300 ${isClientHovered || isClientFocused ? 'rotate-180 text-sw-blue' : 'text-gray-500'}`}>▾</span>
                  </div>
                </div>
                
                <AnimatePresence>
                  {(isClientHovered || isClientFocused) && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-black/40 border-x border-b border-gray-800 rounded-b-xl px-4 py-5 space-y-4 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[14px] font-bold text-sw-blue uppercase tracking-widest mb-1.5 block">Nombre del Cliente</label>
                          <input 
                            type="text" value={clientName} 
                            onFocus={() => {
                              if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                              setIsClientFocused(true);
                            }}
                            onBlur={() => {
                              blurTimeoutRef.current = setTimeout(() => setIsClientFocused(false), 200);
                            }}
                            onChange={e => setClientName(e.target.value)} 
                            placeholder="Nombre y Apellido"
                            className="w-full bg-black/80 border border-gray-700 focus:border-sw-blue rounded-lg px-3 py-2.5 text-white text-sm outline-none transition-all" 
                          />
                        </div>
                        <div className="relative">
                          <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">WhatsApp / Teléfono</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              inputMode="numeric"
                              value={clientPhone}
                              onFocus={() => {
                                if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                                setIsClientFocused(true);
                              }}
                              onBlur={() => {
                                blurTimeoutRef.current = setTimeout(() => setIsClientFocused(false), 200);
                              }}
                              onChange={e => {
                                const val = e.target.value;
                                // Strictly allow numbers and some formatting characters
                                const numbers = val.replace(/\D/g, '');
                                
                                // Reset logic: if user cleared it, let it be empty
                                if (!val) {
                                  setClientPhone('');
                                  return;
                                }

                                // Handle country code if present or implied
                                let digits = numbers;
                                if (numbers.startsWith('569')) digits = numbers.slice(3);
                                else if (numbers.startsWith('56') && numbers.length > 2) digits = numbers.slice(2);
                                else if (numbers.startsWith('9')) digits = numbers.slice(1);
                                
                                const limited = digits.slice(0, 8);
                                let formatted = '+56 9';
                                if (limited.length > 0) formatted += ' ' + limited.slice(0, 4);
                                if (limited.length > 4) formatted += ' ' + limited.slice(4, 8);
                                setClientPhone(formatted);
                              }} 
                              placeholder="+56 9 1234 5678"
                              className={`w-full bg-black/80 border rounded-lg px-3 py-2.5 text-white text-2xl font-mono font-bold outline-none transition-all placeholder:text-gray-700 h-16 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] ${
                                clientPhone.length > 5 
                                  ? (validarTelefonoChileno(clientPhone) ? 'border-sw-green/50 focus:border-sw-green' : 'border-sw-red/50 focus:border-sw-red') 
                                  : 'border-gray-700 focus:border-sw-blue'
                              }`} 
                            />
                            {clientPhone.length > 6 && (
                              <motion.div 
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                key={validarTelefonoChileno(clientPhone) ? 'phone-valid' : 'phone-invalid'}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 ${validarTelefonoChileno(clientPhone) ? 'text-sw-green' : 'text-sw-red'}`}
                              >
                                {validarTelefonoChileno(clientPhone) ? <CheckCircle2 size={24} /> : <X size={24} />}
                              </motion.div>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Correo Electrónico (Opcional)</label>
                          <input 
                            type="email" value={clientEmail}
                            onFocus={() => {
                              if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                              setIsClientFocused(true);
                            }}
                            onBlur={() => {
                              blurTimeoutRef.current = setTimeout(() => setIsClientFocused(false), 200);
                            }}
                            onChange={e => setClientEmail(e.target.value)} 
                            placeholder="email@ejemplo.com"
                            className="w-full bg-black/80 border border-gray-700 focus:border-sw-blue rounded-lg px-3 py-2.5 text-white text-sm outline-none transition-all h-14" 
                          />
                        </div>
                        <div>
                          <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Modelo del Vehículo (Opcional)</label>
                          <input 
                            type="text" value={clientModel}
                            onFocus={() => {
                              if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                              setIsClientFocused(true);
                            }}
                            onBlur={() => {
                              blurTimeoutRef.current = setTimeout(() => setIsClientFocused(false), 200);
                            }}
                            onChange={e => setClientModel(e.target.value)} 
                            placeholder="Ej: Toyota Yaris"
                            className="w-full bg-black/80 border border-gray-700 focus:border-sw-blue rounded-lg px-3 py-2.5 text-white text-sm outline-none transition-all h-14" 
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Observaciones (Opcional)</label>
                          <textarea 
                            value={clientNotes}
                            onFocus={() => {
                              if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                              setIsClientFocused(true);
                            }}
                            onBlur={() => {
                              blurTimeoutRef.current = setTimeout(() => setIsClientFocused(false), 200);
                            }}
                            onChange={e => setClientNotes(e.target.value)} 
                            placeholder="Detalles sobre el vehículo o preferencias del cliente..."
                            className="w-full bg-black/80 border border-gray-700 focus:border-sw-blue rounded-lg px-3 py-2.5 text-white text-sm outline-none transition-all h-20 resize-none" 
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* 2. SELECCIÓN DE SERVICIO (Dropdown Brief) */}
            <div className={`p-5 border-b border-gray-800/60 transition-all duration-300 flex-shrink-0 ${!isServiceEnabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-sw-yellow" size={20} />
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                    2. Selección de Servicio {!isServiceEnabled && '🔒'}
                  </h3>
                </div>
                {selectedService && (
                   <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-sw-green">
                     <CheckCircle2 size={20} />
                   </motion.div>
                )}
              </div>
              <div className="relative group">
                <select 
                  value={selectedService} 
                  onChange={e => setSelectedService(e.target.value)}
                  disabled={!isServiceEnabled}
                  className="w-full bg-black/60 border-2 border-gray-800 focus:border-sw-yellow rounded-xl px-5 py-4 text-white font-black uppercase outline-none cursor-pointer tracking-widest transition-all appearance-none text-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] focus:shadow-[0_0_20px_rgba(255,232,31,0.1)] pr-12 hover:border-gray-600"
                >
                  <option value="" disabled className="bg-[#0a0a0a] text-gray-500">SELEICONAR SERVICIO REGISTRADO</option>
                  {availableServices?.map((srv: any) => {
                    const price = (srv.categoryId ? srv.basePrice : srv.basePrice * (filteredCategories.find((c: any) => c.id === selectedCat)?.factor || 1));
                    const duration = srv.estimatedDuration ? `${Math.floor(srv.estimatedDuration / 60)}h ${(srv.estimatedDuration % 60).toString().padStart(2, '0')}m` : '--';
                    return (
                      <option key={srv.id} value={srv.id} className="bg-[#0a0a0a] text-white py-2">
                        {srv.name} — ${price.toLocaleString('es-CL')} — {duration}
                      </option>
                    );
                  })}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-sw-yellow">
                   <Sparkles size={18} className="animate-pulse" />
                </div>
              </div>
            </div>

            {/* 3. Hora de Retiro ── */}
            <div className={`p-5 transition-all duration-300 flex-shrink-0 ${!isPickupEnabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="text-sw-green" size={20} />
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                    3. Hora de Retiro Estimada {!isPickupEnabled && '🔒'}
                  </h3>
                </div>
                {pickupMode && (
                   <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-sw-green">
                     <CheckCircle2 size={20} />
                   </motion.div>
                )}
              </div>
              <div className="flex flex-col lg:flex-row gap-4 items-start pb-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 flex-1 w-full">
                  {[
                    { val: 'none', label: 'Sin hora' },
                    { val: '1h', label: '+1 hora' },
                    { val: '2h', label: '+2 horas' },
                    { val: '5h', label: '+5 horas' },
                    { val: '18:00', label: '18:00 hrs' },
                    { val: 'custom', label: 'Elegir' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      disabled={!isPickupEnabled}
                      onClick={() => { 
                        setPickupMode(opt.val); 
                        if (opt.val === 'custom') setShowTimePicker(true); 
                        else if (opt.val === '18:00') setCustomPickupTime('18:00');
                        else setCustomPickupTime(''); 
                      }}
                      className={`py-4 rounded-xl text-[14px] font-bold uppercase tracking-wider border transition-all ${pickupMode === opt.val ? 'bg-sw-yellow/15 border-sw-yellow text-sw-yellow shadow-[0_0_15px_rgba(255,232,31,0.1)]' : 'bg-black/40 border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-600 disabled:opacity-50'}`}
                    >
                      {opt.label === 'Sin hora' ? <span className="flex items-center justify-center gap-2"><EyeOff size={16} /> {opt.label}</span> : opt.label}
                    </button>
                  ))}
                </div>
                {estimatedPickupTime && (
                  <div className="lg:w-1/3 flex justify-center w-full mt-2 lg:mt-0">
                    <div className="bg-sw-yellow/10 border border-sw-yellow/50 px-6 py-6 rounded-xl flex flex-col items-center justify-center gap-2 w-full h-full animate-fade-in shadow-[0_0_20px_rgba(255,232,31,0.05)]">
                      <Clock size={24} className="text-sw-yellow mb-1" />
                      <span className="text-sw-yellow font-mono font-black text-3xl">{estimatedPickupTime}</span>
                      <span className="text-sw-yellow text-[14px] font-bold uppercase tracking-widest text-center mt-1">Estimación<br/>Retiro</span>
                    </div>
                  </div>
                )}
                {pickupMode === 'none' && (
                  <div className="lg:w-1/3 flex justify-center w-full mt-2 lg:mt-0">
                    <div className="bg-gray-800/10 border border-gray-700/50 px-6 py-6 rounded-xl flex flex-col items-center justify-center gap-2 w-full h-full animate-fade-in">
                      <X size={24} className="text-gray-600 mb-1" />
                      <span className="text-gray-500 font-mono font-black text-lg uppercase tracking-tight">Sin Horario</span>
                      <span className="text-gray-600 text-[14px] font-bold uppercase tracking-widest text-center mt-1">A convenir<br/>Hoy</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN — Total + Descuento + CTA (2/5) */}
          <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">

            {/* Quick Actions (Add Product / Add Addon) */}
            <div className={`grid grid-cols-2 gap-3 mb-2 flex-shrink-0 transition-all duration-300 ${!isAddonsEnabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <button
                disabled={!isAddonsEnabled}
                onClick={() => setPosTab('tienda')}
                className="py-6 rounded-xl border border-dashed border-gray-700 text-gray-400 hover:text-sw-green hover:border-sw-green/40 hover:bg-sw-green/5 transition-all text-[14px] font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShoppingCart size={24} className="flex-shrink-0" />
                <span className="text-center">Prod. Tienda {!isAddonsEnabled && '🔒'}</span>
              </button>
              
              <div className="relative group">
                <button
                  disabled={!isAddonsEnabled}
                  className="w-full py-6 rounded-xl border border-dashed border-gray-700 text-gray-400 hover:text-sw-blue hover:border-sw-blue/40 hover:bg-sw-blue/5 transition-all text-[14px] font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus size={24} className="flex-shrink-0" /> 
                  <span className="text-center">Serv. Adicional {!isAddonsEnabled && '🔒'}</span>
                </button>
                {isAddonsEnabled && (
                  <select 
                    value=""
                    onChange={e => {
                      const srvId = e.target.value;
                      const srv = complementaryServices.find(s => s.id === srvId);
                      if (srv) {
                        const cat = filteredCategories.find(c => c.id === selectedCat);
                        // If categoryId is set to a specific ID (not ALL), it's a fixed price for that category.
                        // If it's empty or ALL, we might apply the multiplier or use base price depending on intent.
                        // Usually, Adicionales in StarParks are fixed if a category is assigned, or calculated if not.
                        const price = (srv.categoryId && srv.categoryId !== 'ALL') ? srv.basePrice : srv.basePrice * (cat?.factor || 1);
                        setAddonCart(prev => [...prev, {
                          id: srv.id,
                          name: srv.name,
                          price: price,
                          isTypeService: true
                        }]);
                        showToast(`Agregado: ${srv.name}`, 'success');
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  >
                    <option value="" disabled className="bg-[#0a0a0a] text-gray-500">Seleccionar Adicional</option>
                    {complementaryServices
                      .filter(s => !s.categoryId || s.categoryId === 'ALL' || s.categoryId === selectedCat)
                      .map((srv: any) => {
                        const cat = filteredCategories.find(c => c.id === selectedCat);
                        // Using the factor pricing correctly
                        const price = (srv.categoryId && srv.categoryId !== 'ALL') ? srv.basePrice : Math.round(srv.basePrice * (cat?.factor || 1));
                        return (
                          <option key={srv.id} value={srv.id} className="bg-[#0a0a0a] text-white py-2">{srv.name} — ${price.toLocaleString('es-CL')}</option>
                        );
                      })}
                  </select>
                )}
              </div>
            </div>

            {/* Cart Panel / Total Card */}
            <div className="panel-glass rounded-2xl border border-gray-800 flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 border-b border-gray-800 bg-white/5 flex justify-between items-center flex-shrink-0">
                <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Resumen de Venta</span>
                <button 
                  onClick={() => setShowDiscountPanel(!showDiscountPanel)}
                  className={`text-sm font-bold uppercase tracking-wider px-2 py-1 rounded border ${discountApplied ? 'bg-sw-green/10 border-sw-green text-sw-green' : 'bg-black/40 border-gray-700 text-gray-500 hover:text-sw-blue'}`}
                >
                  {discountApplied ? 'Dscto Aplicado' : 'Añadir Descuento'}
                </button>
              </div>

              {/* Discount Panel (Inline) */}
              {showDiscountPanel && (
                <div className="p-4 bg-sw-blue/5 border-b border-sw-blue/20 animate-fade-in space-y-2 flex-shrink-0">
                  <div className="flex gap-2">
                    <button onClick={() => setDiscountType('fixed')} className={`flex-1 py-1.5 rounded-lg text-[14px] font-bold border transition-all ${discountType === 'fixed' ? 'bg-sw-blue/15 border-sw-blue text-sw-blue' : 'bg-black/40 border-gray-800 text-gray-600'}`}>$</button>
                    <button onClick={() => setDiscountType('percent')} className={`flex-1 py-1.5 rounded-lg text-[14px] font-bold border transition-all ${discountType === 'percent' ? 'bg-sw-blue/15 border-sw-blue text-sw-blue' : 'bg-black/40 border-gray-800 text-gray-600'}`}>%</button>
                    <input type="number" value={discount || ''} onChange={e => setDiscount(Math.round(Number(e.target.value)))}
                      className="w-20 bg-black/60 border border-gray-800 rounded-lg px-2 text-white font-mono text-[14px] outline-none" placeholder="Cant." />
                    <input type="password" value={discountPin} onChange={e => setDiscountPin(e.target.value)}
                      className="w-20 bg-black/60 border border-gray-800 rounded-lg px-2 text-white font-mono text-[14px] outline-none" placeholder="PIN" />
                    <button onClick={handleApplyDiscount} className="bg-sw-blue/20 text-sw-blue p-2 rounded-lg hover:bg-sw-blue hover:text-black transition-all">
                      <CheckCircle2 size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Itemized List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0 bg-black/20">
                {/* Main Service */}
                {selectedService && (
                  <div className="flex justify-between items-start bg-sw-blue/5 border border-sw-blue/20 rounded-xl p-3">
                    <div className="flex flex-col">
                      <span className="text-[14px] text-sw-blue font-bold uppercase tracking-widest">Servicio Principal</span>
                      <span className="text-sm font-bold text-white uppercase">{services.find((s:any)=>s.id===selectedService)?.name}</span>
                      <span className="text-[14px] text-gray-500 uppercase font-bold">{filteredCategories.find((c:any)=>c.id===selectedCat)?.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-mono font-black text-white">${serviceBase.toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                )}

                {/* Addons and Products */}
                {addonCart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-black/40 border border-gray-800/60 rounded-xl p-3 group hover:border-gray-600 transition-all">
                    <div className="flex flex-col">
                      <span className="text-[14px] text-gray-500 font-bold uppercase tracking-widest">{item.isTypeService ? 'Adicional' : 'Tienda'}</span>
                      <span className="text-sm font-bold text-gray-200 uppercase">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-bold text-gray-300">${item.price.toLocaleString('es-CL')}</span>
                      <button 
                        onClick={() => setAddonCart(addonCart.filter((_, i) => i !== idx))} 
                        className="text-gray-700 hover:text-sw-red p-1 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {!selectedService && addonCart.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50">
                    <ShoppingCart size={40} />
                    <span className="text-[14px] font-bold uppercase tracking-[0.2em]">Carrito Vacío</span>
                  </div>
                )}
              </div>

              {/* Summary Bottom */}
              <div className="p-6 bg-black/40 border-t border-gray-800 flex-shrink-0">
                <div className="space-y-4">
                  {/* Descuentos y Promociones */}
                  {(discountApplied || isFreeWash) && (
                    <div className="space-y-2 border-b border-gray-800/50 pb-4">
                      {discountApplied && (
                        <div className="flex justify-between items-center text-[14px] text-sw-yellow font-bold uppercase tracking-widest">
                          <span>Descuento Manual</span>
                          <span className="font-mono">-${discountAmount.toLocaleString('es-CL')}</span>
                        </div>
                      )}
                      {isFreeWash && (
                        <div className="flex justify-between items-center text-[14px] text-sw-green font-bold uppercase tracking-widest">
                          <span>Premio Fidelidad (Gratis)</span>
                          <span className="font-mono">-${Math.round(serviceBaseBeforeFree * (loyaltyConfig.rewardDiscount / 100)).toLocaleString('es-CL')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Neto e IVA */}
                  <div className="space-y-3 pt-2 border-b border-gray-800/50 pb-4">
                    <div className="flex justify-between items-center text-sm text-gray-500 font-bold uppercase tracking-[0.2em]">
                      <span>Monto Neto</span>
                      <span className="font-mono text-xl font-bold text-gray-400">
                        ${serviceNeto.toLocaleString('es-CL')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500 font-bold uppercase tracking-[0.2em]">
                      <span>IVA (19%)</span>
                      <span className="font-mono text-xl font-bold text-gray-400">
                        ${serviceIva.toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-6">
                    <span className="text-gray-400 font-black uppercase tracking-[0.2em] text-[14px]">Total</span>
                    <span className="text-4xl font-black text-sw-green font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(46,204,113,0.3)]">${finalTotal.toLocaleString('es-CL')}</span>
                  </div>

                  <button 
                    onClick={handlePreSubmit}
                    className={`w-full py-5 rounded-2xl font-black uppercase text-xl tracking-[0.2em] flex justify-center items-center gap-4 transition-all active:scale-95 shadow-[0_0_30px_rgba(0,168,255,0.2)] ${selectedService ? 'btn-jedi' : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'}`}
                    disabled={!selectedService || isSubmitting}
                  >
                    <Zap size={24} fill="currentColor" /> INGRESAR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          TIENDA Y ADICIONALES TAB
      ══════════════════════════════════════ */}
      {posTab === 'tienda' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-5 min-h-0">

          {/* Products & Addons */}
          <div className="lg:col-span-3 panel-glass rounded-2xl border-t-2 border-sw-green shadow-[0_0_25px_rgba(46,204,113,0.06)] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-800/60 flex-shrink-0">
              <h3 className="sw-title-font text-lg text-sw-green tracking-wider flex items-center gap-2"><Store size={20} /> TIENDA Y ADICIONALES</h3>
              <button onClick={() => setPosTab('lavado')} className="text-[14px] font-bold text-gray-500 hover:text-sw-blue transition-all uppercase tracking-widest px-4 py-2 rounded-xl border border-gray-800 hover:border-sw-blue/30">← Volver</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
              
              {/* Adicionales */}
              {services?.filter((s:any) => s.type === 'Adicional' && (s.categoryId === 'ALL' || s.categoryId === selectedCat)).length > 0 && (
                <div>
                  <h4 className="text-[14px] font-bold uppercase tracking-widest text-gray-500 mb-3 border-b border-gray-800 pb-2">Servicios Complementarios</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {services.filter((s:any) => s.type === 'Adicional' && (s.categoryId === 'ALL' || s.categoryId === selectedCat)).map((srv: any) => {
                      const cat = filteredCategories.find(c => c.id === selectedCat);
                      const price = (srv.categoryId && srv.categoryId !== 'ALL') ? srv.basePrice : Math.round(srv.basePrice * (cat?.factor || 1));
                      return (
                        <button
                          key={srv.id}
                          onClick={() => setExpressCart([...expressCart, { id: srv.id, name: srv.name, price: price, isTypeService: true }])}
                          className="rounded-xl p-4 text-left flex flex-col justify-between min-h-[90px] transition-all bg-sw-blue/5 border border-sw-blue/20 hover:border-sw-blue hover:bg-sw-blue/10 active:scale-[0.97]"
                        >
                          <div className="text-sm font-bold text-white uppercase tracking-wide line-clamp-2">{srv.name}</div>
                          <div className="flex justify-between items-end mt-2">
                            <span className="text-base font-black font-mono text-sw-yellow">${price.toLocaleString('es-CL')}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Products */}
              <div>
                <h4 className="text-[14px] font-bold uppercase tracking-widest text-gray-500 mb-3 border-b border-gray-800 pb-2">Productos Tienda</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
                  {storeProducts.map((prod: any) => (
                    <button
                      key={prod.id}
                      onClick={() => setExpressCart([...expressCart, prod])}
                      disabled={prod.stock <= 0}
                      className="rounded-xl p-4 text-left flex flex-col justify-between h-32 transition-all bg-black/50 border border-gray-800 hover:border-gray-600 hover:bg-black/70 active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <div className="text-3xl">{prod.icon}</div>
                      <div>
                        <div className="text-sm font-bold text-gray-200 uppercase tracking-wide line-clamp-1 mt-1">{prod.name}</div>
                        <div className="flex justify-between items-end mt-1">
                          <span className="text-base font-black font-mono text-sw-yellow">${prod.price.toLocaleString('es-CL')}</span>
                          <span className={`text-[14px] font-mono font-bold px-1.5 py-0.5 rounded ${prod.stock < 5 ? 'text-sw-red bg-sw-red/10' : 'text-gray-600'}`}>{prod.stock}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {expressCart.length > 0 && (
              <div className="p-4 border-t border-gray-800/60 flex-shrink-0">
                <button
                  onClick={() => { setAddonCart([...addonCart, ...expressCart]); setExpressCart([]); setPosTab('lavado'); showToast(`${expressCart.length} producto(s) agregados al lavado`, 'success'); }}
                  className="w-full py-4 rounded-xl border border-sw-blue text-sw-blue hover:bg-sw-blue/10 transition-all text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Car size={18} /> Agregar {expressCart.length} producto(s) al Lavado
                </button>
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="lg:col-span-2 panel-glass rounded-2xl border-t-2 border-sw-red shadow-[0_0_25px_rgba(231,76,60,0.06)] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-800/60 flex-shrink-0">
              <h3 className="sw-title-font text-lg text-sw-red tracking-wider flex items-center gap-2"><ShoppingCart size={20} /> CARRITO EXPRÉS</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {expressCart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-700 text-center">
                  <ShoppingCart size={48} className="mb-3 opacity-20" />
                  <span className="text-sm font-bold uppercase tracking-widest">Seleccione productos</span>
                </div>
              ) : expressCart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-black/40 px-4 py-3 rounded-xl border border-gray-800 mb-2 group hover:border-gray-600 transition-all">
                  <span className="text-sm font-bold text-gray-200">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-mono font-black text-sw-yellow text-sm block">${item.price.toLocaleString('es-CL')}</span>
                      <span className="text-[14px] text-gray-500 font-bold tracking-widest uppercase">Stock: {item.stock}</span>
                    </div>
                    <button onClick={() => setExpressCart(expressCart.filter((_, i) => i !== idx))} className="text-gray-600 hover:text-sw-red ml-2 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-gray-800/60 space-y-4 flex-shrink-0">
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button key={m} onClick={() => setExpressPay(m)} className={`py-3 rounded-xl border text-[14px] font-bold uppercase tracking-widest transition-all ${expressPay === m ? 'bg-sw-green/15 border-sw-green text-sw-green' : 'bg-black/40 border-gray-800 text-gray-600 hover:text-gray-400'}`}>
                    {m.split(' ')[0]}
                  </button>
                ))}
              </div>
              <div className="bg-black/40 px-5 py-4 rounded-xl flex justify-between items-end border border-gray-800/60">
                <span className="text-gray-500 text-sm font-bold uppercase tracking-widest">Total</span>
                <span className="text-5xl font-black text-sw-red font-mono">${expressTotal.toLocaleString('es-CL')}</span>
              </div>
              <button
                onClick={handleExpressSale}
                disabled={expressCart.length === 0}
                className="w-full bg-sw-red/15 border border-sw-red text-sw-red hover:bg-sw-red hover:text-white py-5 rounded-xl font-black uppercase tracking-widest flex justify-center items-center gap-3 transition-all text-base active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Zap size={22} /> Cobrar Venta Exprés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TIME PICKER ─── */}
      {showTimePicker && (
        <TimeWheelPicker
          initialTime={customPickupTime || '12:00'}
          onSave={(t: string) => { setCustomPickupTime(t); setShowTimePicker(false); }}
          onClose={() => setShowTimePicker(false)}
        />
      )}
    </div>
  );
};

/* ─── TIME WHEEL PICKER ─── */
const TimeWheelPicker = ({ initialTime, onSave, onClose }: any) => {
  const [h, m] = initialTime.split(':').map((v: string) => parseInt(v, 10));
  const [hour, setHour] = useState(isNaN(h) ? 12 : h);
  const [minute, setMinute] = useState(isNaN(m) ? 0 : m);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroll = (ref: React.RefObject<HTMLDivElement>, val: number) => {
      if (!ref.current) return;
      const item = ref.current.children[val + 2] as HTMLElement;
      if (item) ref.current.scrollTop = item.offsetTop - ref.current.clientHeight / 2 + item.clientHeight / 2;
    };
    scroll(hourRef, hour);
    scroll(minuteRef, minute);
  }, []);

  const handleScroll = (ref: React.RefObject<HTMLDivElement>, max: number, setter: (v: number) => void) => {
    if (!ref.current) return;
    const center = ref.current.scrollTop + ref.current.clientHeight / 2;
    let closest = 0, minDiff = Infinity;
    Array.from(ref.current.children).forEach((child: any, idx) => {
      const d = Math.abs(center - (child.offsetTop + child.clientHeight / 2));
      if (d < minDiff) { minDiff = d; closest = idx - 2; }
    });
    if (closest >= 0 && closest < max) setter(closest);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={onClose}>
      <div className="panel-glass w-full max-w-xs rounded-3xl border border-sw-blue/30 shadow-[0_0_50px_rgba(0,168,255,0.2)] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 bg-sw-blue/5 border-b border-white/10 text-center">
          <span className="text-[14px] font-bold uppercase tracking-[0.2em] text-sw-blue">Hora de Retiro</span>
        </div>
        <div className="relative h-56 flex bg-black/40">
          <div className="absolute inset-x-0 h-14" style={{ top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,168,255,0.07)', borderTop: '1px solid rgba(0,168,255,0.25)', borderBottom: '1px solid rgba(0,168,255,0.25)' }} />
          <div ref={hourRef} onScroll={() => handleScroll(hourRef, 24, setHour)} className="flex-1 overflow-y-auto snap-y snap-mandatory" style={{ scrollbarWidth: 'none' }}>
            <div style={{ height: '50%' }} />{hours.map(v => (<div key={v} className={`h-14 flex items-center justify-center snap-center transition-all ${hour === v ? 'text-sw-blue text-3xl font-black' : 'text-gray-600 text-xl font-bold'}`}>{v.toString().padStart(2, '0')}</div>))}<div style={{ height: '50%' }} />
          </div>
          <div className="flex items-center text-sw-blue font-black text-3xl z-10">:</div>
          <div ref={minuteRef} onScroll={() => handleScroll(minuteRef, 60, setMinute)} className="flex-1 overflow-y-auto snap-y snap-mandatory" style={{ scrollbarWidth: 'none' }}>
            <div style={{ height: '50%' }} />{minutes.map(v => (<div key={v} className={`h-14 flex items-center justify-center snap-center transition-all ${minute === v ? 'text-sw-blue text-3xl font-black' : 'text-gray-600 text-xl font-bold'}`}>{v.toString().padStart(2, '0')}</div>))}<div style={{ height: '50%' }} />
          </div>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3 bg-black/60">
          <button onClick={onClose} className="py-3.5 rounded-xl border border-gray-800 text-gray-400 font-bold uppercase tracking-widest text-sm hover:bg-white/5 transition-all">Cancelar</button>
          <button onClick={() => onSave(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)} className="py-3.5 rounded-xl bg-sw-blue text-black font-bold uppercase tracking-widest text-sm shadow-[0_0_15px_rgba(0,168,255,0.4)]">Confirmar</button>
        </div>
      </div>
    </div>
  );
};

const Trash2 = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 9v4m4-4v4" />
  </svg>
);
