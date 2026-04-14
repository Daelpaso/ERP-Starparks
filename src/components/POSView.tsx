import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Car, Store, ShoppingCart, Zap, ShieldCheck, CheckCircle2, Users, Clock, Plus, X, Sparkles } from 'lucide-react';
import { INITIAL_CATEGORIES, PAYMENT_METHODS } from '../lib/constants';
import { validarPatenteChilena, validarTelefonoChileno, validarEmail } from '../lib/utils';
import { doc, setDoc, updateDoc, db, increment } from '../firebase';

export const POSView = ({ jobs, setJobs, clients, setClients, services, storeProducts, categories, showToast, setActiveTab, hasPermission, currentShift }: any) => {
  const [posTab, setPosTab] = useState<'lavado' | 'tienda'>('lavado');

  // Lavado state
  const [plate, setPlate] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [pickupMode, setPickupMode] = useState('');
  const [customPickupTime, setCustomPickupTime] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [showDiscountPanel, setShowDiscountPanel] = useState(false);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountPin, setDiscountPin] = useState('');
  const [addonCart, setAddonCart] = useState<any[]>([]);
  const [pendingSale, setPendingSale] = useState<any>(null);
  const [printTicketJob, setPrintTicketJob] = useState<any>(null);

  // Express state
  const [expressCart, setExpressCart] = useState<any[]>([]);
  const [expressPay, setExpressPay] = useState(PAYMENT_METHODS[0]);

  useEffect(() => {
    if (categories?.length > 0 && !selectedCat) setSelectedCat(categories[0].id);
  }, [categories, selectedCat]);

  useEffect(() => {
    if (services?.length > 0 && !selectedService) setSelectedService(services[0].id);
  }, [services, selectedService]);

  const filteredCategories = useMemo(() =>
    (categories?.length > 0 ? categories : INITIAL_CATEGORIES).filter((c: any) => !c.name.toLowerCase().includes('convenio'))
  , [categories]);

  const existingClient = clients.find((c: any) => c.plate === plate.toUpperCase().replace(/-/g, ''));
  const isTenthVisit = existingClient && existingClient.visits === 9;
  const isNewClient = validarPatenteChilena(plate) && !existingClient;
  const isPlateFilled = plate.length >= 5;

  const serviceBase = useMemo(() => {
    const cat = filteredCategories.find((c: any) => c.id === selectedCat);
    const srv = services?.find((s: any) => s.id === selectedService);
    let base = (srv?.basePrice || 0) * (cat?.factor || 1);
    if (isTenthVisit) base = base * 0.7;
    return base;
  }, [selectedCat, selectedService, isTenthVisit, services, filteredCategories]);

  const discountAmount = useMemo(() => {
    if (!discountApplied) return 0;
    return discountType === 'percent' ? Math.round(serviceBase * discount / 100) : discount;
  }, [serviceBase, discount, discountType, discountApplied]);

  const addonTotal = addonCart.reduce((sum, item) => sum + item.price, 0);
  const expressTotal = expressCart.reduce((sum, item) => sum + item.price, 0);
  const finalTotal = Math.max(0, serviceBase - discountAmount) + addonTotal;

  const estimatedPickupTime = useMemo(() => {
    if (!pickupMode) return null;
    if (pickupMode === 'custom') return customPickupTime || null;
    const h = parseInt(pickupMode.replace('h', ''));
    return new Date(Date.now() + h * 3600000).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  }, [pickupMode, customPickupTime]);

  const selectedServiceObj = services?.find((s: any) => s.id === selectedService);

  const handleApplyDiscount = () => {
    if (discount <= 0) { showToast('Ingrese un monto de descuento', 'error'); return; }
    if (discountPin !== '1124') { showToast('PIN de administrador incorrecto', 'error'); return; }
    setDiscountApplied(true);
    showToast(`Descuento aplicado`, 'success');
  };

  const resetForm = () => {
    setPlate(''); setClientName(''); setClientPhone(''); setClientEmail('');
    setPickupMode(''); setCustomPickupTime('');
    setDiscount(0); setDiscountApplied(false); setDiscountPin(''); setShowDiscountPanel(false);
    setAddonCart([]);
  };

  const handlePreSubmit = () => {
    if (!currentShift) { showToast('Debe iniciar un turno primero', 'error'); return; }
    if (!hasPermission('write_pos')) { showToast('Sin permisos de venta', 'error'); return; }
    if (!validarPatenteChilena(plate)) { showToast('Patente inválida', 'error'); return; }
    if (isNewClient) {
      if (!clientName.trim() || !clientPhone.trim()) { showToast('Ingrese datos del cliente nuevo', 'error'); return; }
      if (!validarTelefonoChileno(clientPhone)) { showToast('Celular inválido (+569...)', 'error'); return; }
    }
    if (pickupMode === 'custom' && !customPickupTime) { showToast('Defina la hora de retiro', 'error'); return; }
    setPendingSale({
      plate: plate.toUpperCase().replace(/-/g, ''),
      catName: filteredCategories.find((c: any) => c.id === selectedCat)?.name,
      srvName: services?.find((s: any) => s.id === selectedService)?.name,
      total: finalTotal, discountAmount,
      isDiscounted: isTenthVisit || discountApplied,
      pickupTime: estimatedPickupTime,
      isNewClient, clientName, clientPhone, clientEmail, addonCart
    });
  };

  const confirmSale = async () => {
    if (!pendingSale) return;
    try {
      if (pendingSale.isNewClient) {
        const nc = { id: `cli_${Date.now()}`, plate: pendingSale.plate, name: pendingSale.clientName.trim(), phone: pendingSale.clientPhone.trim(), email: pendingSale.clientEmail.trim(), date: Date.now(), visits: 0 };
        await setDoc(doc(db, 'clients', nc.id), nc);
      }
      const now = Date.now();
      const job = {
        id: `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        shiftId: currentShift.id, plate: pendingSale.plate,
        categoryId: selectedCat, serviceId: selectedService,
        clientName: pendingSale.clientName || existingClient?.name || 'Cliente',
        clientPhone: pendingSale.clientPhone || existingClient?.phone || '',
        clientEmail: pendingSale.clientEmail || existingClient?.email || '',
        status: 'Cola', serviceTotal: serviceBase, storeTotal: addonTotal,
        parkingFee: 0, parkingMins: 0, manualDiscount: pendingSale.discountAmount,
        total: pendingSale.total, cart: pendingSale.addonCart || [],
        isDiscounted: pendingSale.isDiscounted, entryDate: now, exitDate: null,
        pickupTime: pendingSale.pickupTime, paymentMethod: 'Pendiente', docType: 'Pendiente',
        timeline: [{ status: 'Cola', timestamp: now, workerId: null }]
      };
      await setDoc(doc(db, 'jobs', job.id), job);
      for (const item of (pendingSale.addonCart || [])) {
        try { await updateDoc(doc(db, 'storeProducts', item.id), { stock: increment(-1) }); } catch (_) {}
      }
      showToast('Vehículo ingresado al Taller', 'success');
      setPrintTicketJob(job);
      setPendingSale(null);
      resetForm();
    } catch {
      showToast('Error al guardar', 'error');
    }
  };

  const handleExpressSale = async () => {
    if (!currentShift) { showToast('Debe iniciar un turno primero', 'error'); return; }
    if (!hasPermission('write_pos')) { showToast('Sin permisos de venta', 'error'); return; }
    if (expressCart.length === 0) { showToast('Carrito vacío', 'error'); return; }
    const now = Date.now();
    try {
      const job = {
        id: `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        shiftId: currentShift.id, plate: '🏪 VENTA TIENDA',
        categoryId: null, serviceId: null, status: 'Entregado',
        serviceTotal: 0, storeTotal: expressTotal, parkingFee: 0, parkingMins: 0,
        manualDiscount: 0, total: expressTotal, cart: expressCart,
        isDiscounted: false, entryDate: now, exitDate: now,
        pickupTime: null, paymentMethod: expressPay, docType: 'Boleta',
        timeline: [{ status: 'Entregado', timestamp: now, workerId: null }]
      };
      await setDoc(doc(db, 'jobs', job.id), job);
      for (const item of expressCart) {
        try { await updateDoc(doc(db, 'storeProducts', item.id), { stock: increment(-1) }); } catch (_) {}
      }
      showToast('¡Venta registrada!', 'success');
      setExpressCart([]);
    } catch {
      showToast('Error al registrar venta', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 120px)' }}>

      {/* ─── CONFIRMATION MODAL ─── */}
      {pendingSale && (
        <div className="fixed inset-0 bg-black/90 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="panel-glass rounded-2xl w-full max-w-md border border-sw-yellow/40 shadow-[0_0_40px_rgba(255,232,31,0.1)] flex flex-col">
            <div className="flex items-center gap-3 p-5 border-b border-sw-yellow/20 bg-sw-yellow/5 rounded-t-2xl">
              <ShieldCheck size={22} className="text-sw-yellow" />
              <span className="sw-title-font text-sw-yellow tracking-widest text-lg">CONFIRMAR INGRESO</span>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 uppercase tracking-widest text-xs font-bold">Patente</span>
                <span className="font-mono text-sw-blue font-black text-2xl">{pendingSale.plate}</span>
              </div>
              <div className="flex justify-between"><span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Servicio</span><span className="text-white font-semibold text-sm text-right max-w-xs">{pendingSale.srvName}</span></div>
              <div className="flex justify-between"><span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Clase</span><span className="text-white font-semibold text-sm">{pendingSale.catName}</span></div>
              {pendingSale.pickupTime && (
                <div className="flex justify-between bg-sw-yellow/10 p-3 rounded-xl border border-sw-yellow/30">
                  <span className="text-sw-yellow text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Clock size={14} /> Retiro Est.</span>
                  <span className="text-sw-yellow font-mono font-black text-xl">{pendingSale.pickupTime}</span>
                </div>
              )}
              {pendingSale.addonCart?.length > 0 && (
                <div className="bg-sw-green/5 p-3 rounded-xl border border-sw-green/20 space-y-1">
                  <span className="text-[10px] text-sw-green font-bold uppercase tracking-widest">+ {pendingSale.addonCart.length} producto(s) tienda</span>
                  {pendingSale.addonCart.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs text-gray-400">
                      <span>{item.icon} {item.name}</span>
                      <span className="text-sw-yellow font-mono">${item.price.toLocaleString('es-CL')}</span>
                    </div>
                  ))}
                </div>
              )}
              {pendingSale.isNewClient && (
                <div className="bg-sw-blue/10 p-3 rounded-xl border border-sw-blue/30">
                  <div className="text-xs text-sw-blue mb-1 font-bold uppercase tracking-widest">Nuevo Cliente</div>
                  <div className="font-bold text-white">{pendingSale.clientName}</div>
                  <div className="text-gray-400 font-mono text-sm">{pendingSale.clientPhone}</div>
                </div>
              )}
              <div className="border-t border-gray-700 pt-4 flex justify-between items-end">
                <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Total</span>
                <span className="text-4xl font-black text-sw-green font-mono">${pendingSale.total.toLocaleString('es-CL')}</span>
              </div>
            </div>
            <div className="p-4 flex gap-3 border-t border-gray-800 bg-black/40 rounded-b-2xl">
              <button onClick={() => setPendingSale(null)} className="flex-1 bg-black border border-gray-700 hover:border-sw-red hover:text-sw-red text-gray-400 py-3.5 rounded-xl font-bold uppercase tracking-widest transition-all text-sm">Cancelar</button>
              <button onClick={confirmSale} className="flex-1 btn-jedi py-3.5 rounded-xl font-bold uppercase tracking-widest text-sm">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TICKET MODAL ─── */}
      {printTicketJob && (
        <div className="fixed inset-0 bg-black/90 z-[90] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="panel-glass rounded-2xl w-full max-w-sm border border-sw-blue/40 shadow-[0_0_30px_rgba(0,168,255,0.1)] flex flex-col overflow-hidden">
            <div className="bg-white text-black p-6" id="printable-ticket">
              <div className="text-center mb-4 border-b-2 border-black pb-4"><h2 className="text-2xl font-black uppercase">STARPARKS</h2><p className="text-xs font-bold uppercase">Carwash Pro</p></div>
              <div className="space-y-2 text-sm font-mono font-bold mb-6">
                <div className="flex justify-between"><span>TICKET:</span><span className="text-xs">{printTicketJob.id}</span></div>
                <div className="flex justify-between"><span>PATENTE:</span><span className="text-2xl font-black">{printTicketJob.plate}</span></div>
                <div className="flex justify-between"><span>INGRESO:</span><span>{new Date(printTicketJob.entryDate).toLocaleTimeString()}</span></div>
              </div>
              <div className="border-t-2 border-black pt-4 text-center space-y-2">
                <p className="text-xs font-bold uppercase">Se le notificará cuando su vehículo esté listo.</p>
                <p className="text-xs font-bold uppercase">Gracia: 30 minutos · Después: $40/min</p>
                <p className="text-lg font-black uppercase mt-3">** NO PIERDA ESTE PAPEL **</p>
              </div>
            </div>
            <div className="p-4 flex gap-3 bg-black/60">
              <button onClick={() => { setPrintTicketJob(null); setActiveTab('taller'); }} className="flex-1 bg-gray-900 border border-gray-700 text-gray-400 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all hover:border-gray-500">Cerrar</button>
              <button
                onClick={() => {
                  const w = window.open('', '', 'width=400,height=600');
                  const c = document.getElementById('printable-ticket');
                  if (w && c) { w.document.write(`<html><head><title>Ticket</title><style>body{font-family:monospace;padding:20px}*{box-sizing:border-box}.flex{display:flex}.justify-between{justify-content:space-between}</style></head><body>${c.innerHTML}</body></html>`); w.document.close(); w.focus(); w.print(); w.close(); }
                }}
                className="flex-1 btn-jedi py-3 rounded-xl font-bold uppercase tracking-widest text-xs"
              >Imprimir</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB SWITCHER ─── */}
      <div className="flex gap-3 justify-center flex-shrink-0">
        <button onClick={() => setPosTab('lavado')} className={`flex items-center gap-2.5 px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-all border ${posTab === 'lavado' ? 'bg-sw-blue/10 border-sw-blue text-sw-blue shadow-[0_0_20px_rgba(0,168,255,0.15)]' : 'bg-black/40 border-gray-800 text-gray-500 hover:text-gray-200 hover:border-gray-600'}`}>
          <Car size={20} /> Ingreso Lavado
        </button>
        <button onClick={() => setPosTab('tienda')} className={`flex items-center gap-2.5 px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-all border ${posTab === 'tienda' ? 'bg-sw-green/10 border-sw-green text-sw-green shadow-[0_0_20px_rgba(46,204,113,0.15)]' : 'bg-black/40 border-gray-800 text-gray-500 hover:text-gray-200 hover:border-gray-600'}`}>
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

            {/* ── Patente + Clase (lado a lado) ── */}
            <div className="p-5 border-b border-gray-800/60">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Patente */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-sm font-bold uppercase tracking-[0.15em] text-gray-400">Patente</label>
                    {existingClient && (
                      <span className="text-sm text-sw-green flex items-center gap-1.5 font-bold bg-sw-green/10 px-3 py-1 rounded-full border border-sw-green/30">
                        <CheckCircle2 size={14} /> {existingClient.visits}/10 visitas
                      </span>
                    )}
                  </div>
                  <input
                    type="text" value={plate}
                    onChange={e => setPlate(e.target.value.toUpperCase())}
                    placeholder="ABCD12"
                    maxLength={7}
                    className="w-full bg-black/60 border-2 border-gray-800 focus:border-sw-blue rounded-xl px-5 py-4 text-white uppercase text-3xl font-mono font-black tracking-widest shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] focus:shadow-[0_0_15px_rgba(0,168,255,0.15)] outline-none transition-all placeholder-gray-800 text-center"
                  />
                </div>
                {/* Clase de Vehículo */}
                <div className="flex flex-col">
                  <label className="text-sm font-bold uppercase tracking-[0.15em] text-gray-400 mb-2">Clase de Vehículo</label>
                  <select
                    value={selectedCat} onChange={e => setSelectedCat(e.target.value)}
                    className="w-full flex-1 bg-black/60 border-2 border-gray-800 focus:border-sw-blue rounded-xl py-4 px-5 text-white font-bold uppercase outline-none cursor-pointer transition-all appearance-none"
                    style={{ fontSize: '1.15rem' }}
                  >
                    {filteredCategories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Nuevo Cliente ── */}
            {isNewClient && (
              <div className="px-5 py-4 border-b border-gray-800/60 bg-sw-blue/5 animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={16} className="text-sw-blue" />
                  <span className="text-sw-blue font-bold text-sm uppercase tracking-widest">Nuevo Cliente — Datos Requeridos</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre Completo *"
                    className="bg-black/50 border border-sw-blue/30 focus:border-sw-blue rounded-xl px-4 py-3 text-white text-base font-semibold outline-none transition-all placeholder-gray-600" />
                  <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+569 XXXX XXXX *"
                    className="bg-black/50 border border-sw-blue/30 focus:border-sw-blue rounded-xl px-4 py-3 text-white text-base font-mono outline-none transition-all placeholder-gray-600" />
                  <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Email (opcional)"
                    className="bg-black/50 border border-sw-blue/30 focus:border-sw-blue rounded-xl px-4 py-3 text-white text-base outline-none transition-all placeholder-gray-600" />
                </div>
              </div>
            )}

            {/* ── Servicio a Realizar (grande) ── */}
            <div className="flex-1 flex flex-col justify-center p-5 border-b border-gray-800/60">
              <label className="text-sm font-bold uppercase tracking-[0.15em] text-gray-400 mb-3">Servicio a Realizar</label>
              <select
                value={selectedService} onChange={e => setSelectedService(e.target.value)}
                className="w-full bg-black/60 border-2 border-gray-800 focus:border-sw-blue rounded-xl py-5 px-6 text-white font-bold outline-none cursor-pointer transition-all appearance-none"
                style={{ fontSize: '1.3rem' }}
              >
                {services?.map((srv: any) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name} — ${srv.basePrice.toLocaleString('es-CL')} — ~{srv.estimatedDuration || '?'} min
                  </option>
                ))}
              </select>
            </div>

            {/* ── Hora de Retiro ── */}
            <div className="p-5">
              <label className="text-sm font-bold uppercase tracking-[0.15em] text-gray-400 mb-3 block">Hora de Retiro Estimada (Opcional)</label>
              <div className="flex gap-2">
                {[
                  { val: '', label: 'Sin hora' },
                  { val: '1h', label: '+1 hora' },
                  { val: '2h', label: '+2 horas' },
                  { val: '3h', label: '+3 horas' },
                  { val: 'custom', label: 'Personalizada' },
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => { setPickupMode(opt.val); if (opt.val === 'custom') setShowTimePicker(true); else setCustomPickupTime(''); }}
                    className={`flex-1 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider border transition-all ${pickupMode === opt.val ? 'bg-sw-yellow/15 border-sw-yellow text-sw-yellow' : 'bg-black/40 border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-600'}`}
                  >{opt.label}</button>
                ))}
              </div>
              {estimatedPickupTime && (
                <div className="mt-3 flex justify-center">
                  <div className="bg-sw-yellow/10 border border-sw-yellow/50 px-6 py-3 rounded-xl inline-flex items-center gap-3">
                    <Clock size={20} className="text-sw-yellow" />
                    <span className="text-sw-yellow font-mono font-black text-2xl">{estimatedPickupTime}</span>
                    <span className="text-sw-yellow text-sm font-bold uppercase tracking-widest">Retiro</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Addon Cart ── */}
            {addonCart.length > 0 && (
              <div className="px-5 pb-3 border-t border-gray-800/60">
                <div className="flex justify-between items-center mb-2 pt-3">
                  <span className="text-sm font-bold text-sw-green uppercase tracking-widest flex items-center gap-1.5"><ShoppingCart size={16} /> {addonCart.length} Producto(s) Tienda</span>
                  <span className="text-base font-mono font-black text-sw-yellow">+${addonTotal.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {addonCart.map((item, idx) => (
                    <span key={idx} className="text-sm bg-black/50 px-3 py-1.5 rounded-lg text-gray-300 flex items-center gap-1.5 border border-gray-800">
                      {item.icon} {item.name}
                      <button onClick={() => setAddonCart(addonCart.filter((_, i) => i !== idx))} className="text-gray-600 hover:text-sw-red ml-1"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Add product shortcut ── */}
            <div className="px-5 pb-5 border-t border-gray-800/60">
              <button
                onClick={() => setPosTab('tienda')}
                className="w-full mt-3 py-3.5 rounded-xl border border-dashed border-gray-700 text-gray-400 hover:text-sw-green hover:border-sw-green/40 hover:bg-sw-green/5 transition-all text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <ShoppingCart size={16} /> Agregar Producto de Tienda
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN — Total + Descuento + CTA (2/5) */}
          <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">

            {/* Total Card — compacto */}
            <div className="panel-glass rounded-2xl p-5 border border-gray-800">
              <div className="text-sm font-bold uppercase tracking-[0.15em] text-gray-500 mb-1 flex items-center gap-2">
                <Sparkles size={14} className="text-sw-yellow" /> Total Estimado
              </div>
              <div className="text-4xl font-black text-sw-green font-mono tracking-tight">
                ${finalTotal.toLocaleString('es-CL')}
              </div>

              <div className="mt-3 space-y-1.5">
                {selectedServiceObj && (
                  <div className="flex justify-between items-center text-base text-gray-400">
                    <span>Duración estimada</span>
                    <span className="font-mono font-bold text-gray-200">~{selectedServiceObj.estimatedDuration || '?'} min</span>
                  </div>
                )}
                {isTenthVisit && (
                  <div className="bg-sw-green/10 border border-sw-green/30 text-sw-green text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-2 animate-pulse">
                    <CheckCircle2 size={16} /> 10° Visita — 30% OFF
                  </div>
                )}
                {discountApplied && (
                  <div className="bg-sw-yellow/10 border border-sw-yellow/30 text-sw-yellow text-sm font-bold px-4 py-2 rounded-xl">
                    Descuento: -${discountAmount.toLocaleString('es-CL')}
                  </div>
                )}
                {addonTotal > 0 && (
                  <div className="flex justify-between text-base text-gray-400">
                    <span>Productos tienda</span>
                    <span className="text-sw-blue font-mono font-bold">+${addonTotal.toLocaleString('es-CL')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Discount Block */}
            <div className="panel-glass rounded-2xl border border-gray-800 overflow-hidden">
              {!showDiscountPanel ? (
                <button
                  onClick={() => setShowDiscountPanel(true)}
                  className="w-full py-4 flex items-center justify-center gap-2 text-gray-500 hover:text-sw-blue hover:bg-sw-blue/5 transition-all text-sm font-bold uppercase tracking-widest"
                >
                  <Plus size={17} /> Agregar Descuento
                </button>
              ) : (
                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-white uppercase tracking-widest">Descuento Especial</span>
                    <button onClick={() => { setShowDiscountPanel(false); setDiscount(0); setDiscountApplied(false); setDiscountPin(''); }} className="text-gray-600 hover:text-sw-red transition-colors"><X size={16} /></button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setDiscountType('fixed')} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${discountType === 'fixed' ? 'bg-sw-blue/15 border-sw-blue text-sw-blue' : 'bg-black/40 border-gray-800 text-gray-600'}`}>$ Pesos</button>
                    <button onClick={() => setDiscountType('percent')} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${discountType === 'percent' ? 'bg-sw-blue/15 border-sw-blue text-sw-blue' : 'bg-black/40 border-gray-800 text-gray-600'}`}>% Porcentaje</button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-lg">{discountType === 'fixed' ? '$' : '%'}</span>
                    <input type="number" value={discount || ''} onChange={e => setDiscount(Math.round(Number(e.target.value)))}
                      className="w-full bg-black/60 border border-gray-800 rounded-xl py-3.5 pl-9 pr-4 text-white font-mono text-xl focus:border-sw-blue outline-none" placeholder="0" step="1" />
                  </div>
                  <input type="password" value={discountPin} onChange={e => setDiscountPin(e.target.value)}
                    className="w-full bg-black/60 border border-gray-800 rounded-xl py-3.5 px-4 text-center text-white font-mono text-lg tracking-[0.4em] focus:border-sw-red outline-none" placeholder="PIN Admin" />
                  <button onClick={handleApplyDiscount} disabled={discountApplied}
                    className={`w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${discountApplied ? 'bg-sw-green/15 text-sw-green border border-sw-green/30 cursor-default' : 'bg-sw-blue/15 border border-sw-blue text-sw-blue hover:bg-sw-blue hover:text-black'}`}>
                    {discountApplied ? '✓ Descuento Aplicado' : 'Aplicar Descuento'}
                  </button>
                </div>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={handlePreSubmit}
              className="btn-jedi py-6 rounded-2xl font-black uppercase tracking-widest flex justify-center items-center gap-3 active:scale-[0.98] transition-all text-lg shadow-[0_0_25px_rgba(0,168,255,0.2)]"
            >
              <Car size={26} /> Ingresar Vehículo
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          TIENDA TAB
      ══════════════════════════════════════ */}
      {posTab === 'tienda' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-5 min-h-0">

          {/* Products */}
          <div className="lg:col-span-3 panel-glass rounded-2xl border-t-2 border-sw-green shadow-[0_0_25px_rgba(46,204,113,0.06)] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-800/60 flex-shrink-0">
              <h3 className="sw-title-font text-lg text-sw-green tracking-wider flex items-center gap-2"><Store size={20} /> PRODUCTOS</h3>
              <button onClick={() => setPosTab('lavado')} className="text-xs font-bold text-gray-500 hover:text-sw-blue transition-all uppercase tracking-widest px-4 py-2 rounded-xl border border-gray-800 hover:border-sw-blue/30">← Volver</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
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
                        <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${prod.stock < 5 ? 'text-sw-red bg-sw-red/10' : 'text-gray-600'}`}>{prod.stock}</span>
                      </div>
                    </div>
                  </button>
                ))}
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
                <div key={idx} className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-gray-800 mb-2 group">
                  <span className="flex items-center gap-3 text-sm font-bold text-gray-200"><span className="text-2xl">{item.icon}</span> {item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-sw-yellow text-base">${item.price.toLocaleString('es-CL')}</span>
                    <button onClick={() => setExpressCart(expressCart.filter((_, i) => i !== idx))} className="text-gray-700 hover:text-sw-red opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-gray-800/60 space-y-4 flex-shrink-0">
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button key={m} onClick={() => setExpressPay(m)} className={`py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all ${expressPay === m ? 'bg-sw-green/15 border-sw-green text-sw-green' : 'bg-black/40 border-gray-800 text-gray-600 hover:text-gray-400'}`}>
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
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-sw-blue">Hora de Retiro</span>
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
