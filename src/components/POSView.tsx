import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Car, Store, ShoppingCart, Zap, ShieldCheck, CheckCircle2, Users, Clock, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { INITIAL_CATEGORIES, PAYMENT_METHODS } from '../lib/constants';
import { validarPatenteChilena, validarTelefonoChileno, validarEmail } from '../lib/utils';
import { doc, setDoc, db } from '../firebase';

export const POSView = ({ jobs, setJobs, clients, setClients, services, storeProducts, categories, showToast, setActiveTab, hasPermission, currentShift }: any) => {
  const [posTab, setPosTab] = useState('lavado'); 
  const [plate, setPlate] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [pickupMode, setPickupMode] = useState(''); 

  useEffect(() => {
    if (categories?.length > 0 && !selectedCat) {
      setSelectedCat(categories[0].id);
    }
  }, [categories, selectedCat]);

  useEffect(() => {
    if (services?.length > 0 && !selectedService) {
      setSelectedService(services[0].id);
    }
  }, [services, selectedService]);
  const [customPickupTime, setCustomPickupTime] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pendingSale, setPendingSale] = useState<any>(null); 
  const [printTicketJob, setPrintTicketJob] = useState<any>(null);
  const [showAllServices, setShowAllServices] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showDiscountAccordion, setShowDiscountAccordion] = useState(false);

  const filteredCategories = useMemo(() => {
    return (categories?.length > 0 ? categories : INITIAL_CATEGORIES).filter((cat: any) => 
      !cat.name.toLowerCase().includes('convenio')
    );
  }, [categories]);

  const filteredServices = useMemo(() => {
    let result = services;
    if (serviceSearch) {
      result = result.filter((s: any) => s.name.toLowerCase().includes(serviceSearch.toLowerCase()));
    }
    return result;
  }, [services, serviceSearch]);

  const displayedServices = showAllServices ? filteredServices : filteredServices.slice(0, 3);

  const existingClient = clients.find((c: any) => c.plate === plate.toUpperCase().replace(/-/g, ''));
  const isTenthVisit = existingClient && existingClient.visits === 9;
  const isNewClient = validarPatenteChilena(plate) && !existingClient; 

  const serviceBase = useMemo(() => {
    const cat = filteredCategories.find((c: any) => c.id === selectedCat);
    const srv = services.find((s: any) => s.id === selectedService);
    let base = (srv?.basePrice || 0) * (cat?.factor || 1);
    if (isTenthVisit) base = base * 0.7; 
    return base;
  }, [selectedCat, selectedService, isTenthVisit, services, filteredCategories]);

  const discountAmount = useMemo(() => {
    return discountType === 'percent' ? (serviceBase * discount / 100) : discount;
  }, [serviceBase, discount, discountType]);

  const finalTotal = Math.max(0, serviceBase - discountAmount);

  const calculatePickupTimeStr = () => {
    if (!pickupMode) return null;
    if (pickupMode === 'custom') return customPickupTime || null;
    const hoursToAdd = parseInt(pickupMode.replace('h', ''));
    const targetTime = new Date(Date.now() + hoursToAdd * 3600000);
    return targetTime.toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit', hour12: false});
  };

  const handlePreSubmit = () => {
    if (!currentShift) {
      showToast('Debe iniciar un turno para registrar vehículos', 'error');
      return;
    }

    if (!hasPermission('write_pos')) {
      showToast('No tiene permisos para crear ventas', 'error');
      return;
    }

    if (discount > 0 && pin !== '314211') {
      setShowPinModal(true);
      return;
    }

    if (!plate || !validarPatenteChilena(plate)) return showToast('Patente Inválida', 'error');
    if (isNewClient) {
      if (!clientName.trim() || !clientPhone.trim()) return showToast('Se requieren datos del cliente', 'error');
      if (!validarTelefonoChileno(clientPhone)) return showToast('Celular inválido. Ej: +569...', 'error');
      if (!validarEmail(clientEmail)) return showToast('Email inválido', 'error');
    }
    if (pickupMode === 'custom' && !customPickupTime) return showToast('Establezca tiempo de retiro', 'error');

      setPendingSale({
        plate: plate.toUpperCase().replace(/-/g, ''),
        catName: filteredCategories.find((c: any) => c.id === selectedCat)?.name,
        srvName: services.find((s: any) => s.id === selectedService)?.name,
        total: finalTotal,
        discountAmount,
        isDiscounted: isTenthVisit || discount > 0,
        pickupTime: calculatePickupTimeStr(),
        isNewClient, clientName, clientPhone, clientEmail,
        vehicleModel, vehicleColor
      });
    } catch (e) {
      // Catching potential errors in find
      showToast('Error al preparar la venta', 'error');
    }
  };

  const confirmSale = async () => {
    try {
      if (pendingSale.isNewClient) {
        const newClientData = { id: `cli_${Date.now()}`, plate: pendingSale.plate, name: pendingSale.clientName.trim(), phone: pendingSale.clientPhone.trim(), email: pendingSale.clientEmail.trim(), date: Date.now(), visits: 0 };
        await setDoc(doc(db, 'clients', newClientData.id), newClientData);
      }
      const now = Date.now();
      const newJob = {
        id: `TRX-${Date.now()}-${Math.floor(Math.random()*1000)}`, 
        shiftId: currentShift.id,
        plate: pendingSale.plate, categoryId: selectedCat, serviceId: selectedService,
        clientName: pendingSale.clientName || existingClient?.name || 'Cliente',
        clientPhone: pendingSale.clientPhone || existingClient?.phone || '',
        clientEmail: pendingSale.clientEmail || existingClient?.email || '',
        vehicleModel: pendingSale.vehicleModel,
        vehicleColor: pendingSale.vehicleColor,
        status: 'Cola', serviceTotal: serviceBase, storeTotal: 0, parkingFee: 0, parkingMins: 0, manualDiscount: pendingSale.discountAmount, total: pendingSale.total, cart: [],
        isDiscounted: pendingSale.isDiscounted, entryDate: now, exitDate: null, pickupTime: pendingSale.pickupTime, paymentMethod: 'Pendiente', docType: 'Pendiente', timeline: [{ status: 'Cola', timestamp: now, workerId: null }]
      };
      await setDoc(doc(db, 'jobs', newJob.id), newJob);
      showToast('Vehículo ingresado al Taller', 'success');
      
      setPrintTicketJob(newJob);
      setPendingSale(null);
      // Reset fields
      setPlate(''); setClientName(''); setClientPhone(''); setClientEmail(''); setVehicleModel(''); setVehicleColor(''); setDiscount(0); setPin('');
    } catch (error) {
      showToast('Error al guardar en la base de datos', 'error');
    }
  };

  const handleCloseTicket = () => {
    setPlate(''); setClientName(''); setClientPhone(''); setClientEmail(''); setPickupMode(''); setCustomPickupTime(''); 
    setPrintTicketJob(null);
    setActiveTab('taller');
  };

  const [expressCart, setExpressCart] = useState<any[]>([]);
  const [expressPay, setExpressPay] = useState(PAYMENT_METHODS[0]);
  const expressTotal = expressCart.reduce((sum, item) => sum + item.price, 0);

  const handleExpressSale = async () => {
    if (!currentShift) {
      showToast('Debe iniciar un turno para realizar ventas', 'error');
      return;
    }
    if (!hasPermission('write_pos')) {
      showToast('No tiene permisos para crear ventas', 'error');
      return;
    }
    if (expressCart.length === 0) return showToast('Tienda vacía', 'error');
    const now = Date.now();
    const newJob = {
      id: `TRX-${Date.now()}-${Math.floor(Math.random()*1000)}`, 
      shiftId: currentShift.id,
      plate: '🏪 VENTA TIENDA', categoryId: null, serviceId: null,
      status: 'Entregado', serviceTotal: 0, storeTotal: expressTotal, parkingFee: 0, parkingMins: 0, manualDiscount: 0, total: expressTotal, cart: expressCart,
      isDiscounted: false, entryDate: now, exitDate: now, pickupTime: null, paymentMethod: expressPay, docType: 'Boleta', timeline: [{ status: 'Entregado', timestamp: now, workerId: null }]
    };
    try {
      await setDoc(doc(db, 'jobs', newJob.id), newJob);
      showToast('Venta en Tienda Exitosa', 'success');
      setExpressCart([]);
    } catch (error) {
      showToast('Error al registrar venta', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {pendingSale && (
        <div className="fixed inset-0 bg-black/90 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="panel-glass rounded-xl w-full max-w-sm border border-sw-yellow/40 shadow-[0_0_30px_rgba(255,232,31,0.1)] flex flex-col">
            <div className="flex items-center gap-2 p-4 border-b border-sw-yellow/30 bg-sw-yellow/10 rounded-t-xl text-sw-yellow sw-title-font tracking-widest text-lg"><ShieldCheck size={20} /> CONFIRMACIÓN</div>
            <div className="p-6 space-y-4 text-sm font-semibold uppercase tracking-wide">
              <div className="flex justify-between border-b border-gray-700 pb-2"><span className="text-gray-400">Patente:</span><span className="font-mono text-sw-blue font-bold text-xl">{pendingSale.plate}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Servicio:</span><span className="text-white text-right">{pendingSale.srvName}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Clase:</span><span className="text-white">{pendingSale.catName}</span></div>
              {pendingSale.pickupTime && <div className="flex justify-between text-sw-yellow font-bold bg-sw-yellow/10 p-2 rounded"><span>Retiro Est.:</span><span className="font-mono text-lg">{pendingSale.pickupTime}</span></div>}
              {pendingSale.isNewClient && <div className="bg-sw-blue/10 p-3 rounded border border-sw-blue/30"><div className="text-xs text-sw-blue mb-1">Nuevo Cliente:</div><div className="font-bold text-lg">{pendingSale.clientName}</div><div className="text-gray-400 font-mono">{pendingSale.clientPhone}</div></div>}
              <div className="flex justify-between items-end pt-4 border-t border-gray-700 mt-4">
                <span className="text-gray-400 font-bold">TOTAL:</span>
                <div className="text-right">
                  <span className="text-3xl font-black text-sw-green font-mono">${pendingSale.total.toLocaleString('es-CL')}</span>
                  {pendingSale.isDiscounted && <div className="text-xs text-sw-green font-bold mt-1 bg-sw-green/20 inline-block px-2 py-0.5 rounded">-30% Cliente Frecuente</div>}
                </div>
              </div>
            </div>
            <div className="p-4 flex gap-3 border-t border-gray-700 bg-black/40 rounded-b-xl">
              <button onClick={() => setPendingSale(null)} className="flex-1 bg-gray-800 hover:bg-sw-red/20 hover:text-sw-red border border-gray-600 hover:border-sw-red text-white py-3 rounded-lg font-bold uppercase tracking-widest transition-all">CANCELAR</button>
              <button onClick={confirmSale} className="flex-1 btn-jedi py-3 rounded-lg font-bold uppercase tracking-widest">INGRESAR VEHÍCULO</button>
            </div>
          </div>
        </div>
      )}

      {printTicketJob && (
        <div className="fixed inset-0 bg-black/90 z-[90] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="panel-glass rounded-xl w-full max-w-sm border border-sw-blue/40 shadow-[0_0_30px_rgba(0,168,255,0.1)] flex flex-col overflow-hidden">
            <div className="bg-white text-black p-6" id="printable-ticket">
              <div className="text-center mb-4 border-b-2 border-black pb-4">
                <h2 className="text-2xl font-black uppercase tracking-tighter">STARPARKS</h2>
                <p className="text-xs font-bold uppercase tracking-widest">Carwash Pro</p>
              </div>
              <div className="space-y-2 text-sm font-mono font-bold mb-6">
                <div className="flex justify-between"><span>TICKET:</span><span>{printTicketJob.id}</span></div>
                <div className="flex justify-between"><span>PATENTE:</span><span className="text-xl">{printTicketJob.plate}</span></div>
                <div className="flex justify-between"><span>INGRESO:</span><span>{new Date(printTicketJob.entryDate).toLocaleTimeString()}</span></div>
              </div>
              <div className="border-t-2 border-black pt-4 text-center space-y-3">
                <p className="text-xs font-bold uppercase">Le llegará una notificación cuando su vehículo esté listo.</p>
                <p className="text-xs font-bold uppercase">Tendrá un periodo de gracia de 30 minutos a partir de esa hora.</p>
                <p className="text-sm font-black uppercase">Costo extra: $40 / minuto</p>
                <p className="text-lg font-black uppercase mt-4">** NO PIERDA ESTE PAPEL **</p>
              </div>
            </div>
            <div className="p-4 flex gap-3 bg-black/40">
              <button onClick={handleCloseTicket} className="flex-1 bg-gray-800 hover:bg-white/10 border border-gray-600 text-white py-3 rounded-lg font-bold uppercase tracking-widest transition-all">Cerrar</button>
              <button 
                onClick={() => {
                  const printContent = document.getElementById('printable-ticket');
                  const windowPrint = window.open('', '', 'width=400,height=600');
                  if (windowPrint && printContent) {
                    windowPrint.document.write(`
                      <html>
                        <head>
                          <title>Ticket ${printTicketJob.plate}</title>
                          <style>
                            body { font-family: monospace; padding: 20px; color: black; }
                            .text-center { text-align: center; }
                            .flex { display: flex; }
                            .justify-between { justify-content: space-between; }
                            .font-bold { font-weight: bold; }
                            .font-black { font-weight: 900; }
                            .text-2xl { font-size: 1.5rem; }
                            .text-xl { font-size: 1.25rem; }
                            .text-lg { font-size: 1.125rem; }
                            .text-sm { font-size: 0.875rem; }
                            .text-xs { font-size: 0.75rem; }
                            .mb-4 { margin-bottom: 1rem; }
                            .mb-6 { margin-bottom: 1.5rem; }
                            .pb-4 { padding-bottom: 1rem; }
                            .pt-4 { padding-top: 1rem; }
                            .mt-4 { margin-top: 1rem; }
                            .border-b-2 { border-bottom: 2px solid black; }
                            .border-t-2 { border-top: 2px solid black; }
                            .space-y-2 > * + * { margin-top: 0.5rem; }
                            .space-y-3 > * + * { margin-top: 0.75rem; }
                            .uppercase { text-transform: uppercase; }
                          </style>
                        </head>
                        <body>${printContent.innerHTML}</body>
                      </html>
                    `);
                    windowPrint.document.close();
                    windowPrint.focus();
                    windowPrint.print();
                    windowPrint.close();
                  }
                }} 
                className="flex-1 btn-jedi py-3 rounded-lg font-bold uppercase tracking-widest"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center">
        <button onClick={() => setPosTab('lavado')} className={`flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-lg transition-all ${posTab === 'lavado' ? 'btn-jedi shadow-[0_0_20px_#00a8ff]' : 'bg-gray-900 border border-gray-700 text-gray-500 hover:text-sw-blue'}`}><Car size={20} /> INGRESO LAVADO</button>
        <button onClick={() => setPosTab('tienda')} className={`flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-bold uppercase tracking-widest text-lg transition-all ${posTab === 'tienda' ? 'btn-yoda shadow-[0_0_20px_#2ecc71]' : 'bg-gray-900 border border-gray-700 text-gray-500 hover:text-sw-green'}`}><Store size={20} /> TIENDA EXPRÉS</button>
      </div>

      {posTab === 'lavado' && (
        <div className="panel-glass rounded-xl p-4 sm:p-8 border-t-4 border-sw-blue shadow-2xl">
           <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
             <div className="w-full lg:w-2/3 space-y-6">
               <div>
                 <div className="flex justify-between items-end mb-2">
                   <label className="block text-xs font-bold uppercase tracking-widest text-gray-400">Patente del Vehículo</label>
                   {existingClient && <div className="flex flex-col items-end"><span className="text-[10px] text-sw-green flex items-center gap-1 uppercase tracking-widest font-bold bg-sw-green/10 px-2 py-0.5 rounded border border-sw-green/30"><CheckCircle2 size={10} /> Cliente Frecuente</span><span className="text-[10px] text-sw-blue mt-1 font-bold uppercase tracking-widest">{existingClient.visits}/10 Atenciones</span></div>}
                 </div>
                 <input type="text" value={plate} onChange={e => setPlate(e.target.value)} placeholder="ABCD12" className="w-full bg-black border-2 border-gray-700 focus:border-sw-blue rounded-lg p-4 sm:p-5 text-white uppercase text-3xl sm:text-4xl font-mono font-bold shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] focus:shadow-[0_0_15px_rgba(0,168,255,0.3)] outline-none transition-all placeholder-gray-800" />
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                   <div>
                     <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Modelo</label>
                     <input type="text" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="Ej: Toyota Hilux" className="w-full bg-black border border-gray-700 focus:border-sw-blue rounded p-3 text-white outline-none transition-colors text-sm" />
                   </div>
                   <div>
                     <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Color</label>
                     <input type="text" value={vehicleColor} onChange={e => setVehicleColor(e.target.value)} placeholder="Ej: Blanco" className="w-full bg-black border border-gray-700 focus:border-sw-blue rounded p-3 text-white outline-none transition-colors text-sm" />
                   </div>
                 </div>

                 {isNewClient && (
                   <div className="mt-4 p-4 sm:p-5 bg-sw-blue/10 border border-sw-blue/40 rounded-lg space-y-4 animate-fade-in">
                     <div className="flex items-center gap-2 text-sw-blue font-bold text-sm uppercase tracking-widest border-b border-sw-blue/30 pb-2"><Users size={16} /> Registro Requerido</div>
                     <div><input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nombre del Cliente *" className="w-full bg-black border border-gray-700 focus:border-sw-blue rounded p-3 text-white outline-none transition-colors font-semibold tracking-wide" /></div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Celular (Ej: +569)" className="w-full bg-black border border-gray-700 focus:border-sw-blue rounded p-3 text-white outline-none transition-colors font-mono" />
                       <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Email (Opcional)" className="w-full bg-black border border-gray-700 focus:border-sw-blue rounded p-3 text-white outline-none transition-colors font-semibold tracking-wide" />
                     </div>
                   </div>
                 )}
               </div>
               <div>
                 <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Despegue (Opcional)</label>
                 <div className="grid grid-cols-4 gap-2 mb-2">
                   {['1h', '2h', '3h', 'custom'].map(opt => (
                     <button key={opt} onClick={() => { setPickupMode(opt); if(opt !== 'custom') setCustomPickupTime(''); }} className={`p-2 sm:p-3 rounded border text-xs font-bold uppercase tracking-widest transition-all ${pickupMode === opt ? 'btn-gold' : 'bg-black/50 border-gray-700 text-gray-500 hover:border-sw-yellow hover:text-sw-yellow'}`}>{opt === 'custom' ? 'Fija' : `+${opt}`}</button>
                   ))}
                 </div>
                 {pickupMode === 'custom' && (
                   <div className="animate-fade-in mt-3">
                     <button 
                       onClick={() => setShowTimePicker(true)}
                       className="w-full bg-black border-2 border-sw-yellow/50 rounded-lg p-4 text-sw-yellow font-mono text-xl font-bold focus:border-sw-yellow focus:shadow-[0_0_15px_rgba(255,232,31,0.3)] outline-none flex items-center justify-between"
                     >
                       <span>{customPickupTime || '00:00'}</span>
                       <Clock size={20} className="text-sw-yellow/50" />
                     </button>
                   </div>
                 )}
               </div>
               <div>
                 <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Clase de Vehículo</label>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {filteredCategories.map((cat: any) => <button key={cat.id} onClick={() => setSelectedCat(cat.id)} className={`p-3 rounded border text-sm font-bold uppercase tracking-widest transition-all ${selectedCat === cat.id ? 'btn-jedi' : 'bg-black/50 border-gray-700 text-gray-500 hover:border-gray-500'}`}>{cat.name}</button>)}
                 </div>
               </div>
               <div>
                 <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-400">Servicio a Realizar</label>
                    <div className="flex items-center gap-2">
                      {showSearchInput && (
                        <input 
                          type="text" 
                          value={serviceSearch}
                          onChange={(e) => setServiceSearch(e.target.value)}
                          placeholder="Buscar servicio..."
                          className="bg-black border border-gray-700 rounded px-2 py-1 text-[10px] text-white focus:border-sw-blue outline-none animate-fade-in"
                          autoFocus
                        />
                      )}
                      <button 
                        onClick={() => setShowSearchInput(!showSearchInput)}
                        className={`p-1.5 rounded transition-all ${showSearchInput ? 'text-sw-blue bg-sw-blue/10' : 'text-gray-500 hover:text-sw-blue'}`}
                      >
                        <Search size={16} />
                      </button>
                    </div>
                  </div>
                 <div className="space-y-2">
                   {displayedServices.map((srv: any) => (
                     <button key={srv.id} onClick={() => setSelectedService(srv.id)} className={`w-full text-left p-3 sm:p-4 rounded border flex justify-between items-center transition-all uppercase tracking-widest font-bold ${selectedService === srv.id ? 'btn-jedi' : 'bg-black/50 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                       <span className="text-sm sm:text-base">{srv.name}</span><span className="font-mono text-sw-yellow bg-sw-yellow/10 px-2 py-1 rounded border border-sw-yellow/30">${srv.basePrice.toLocaleString('es-CL')}</span>
                     </button>
                   ))}
                 </div>
               </div>
             </div>
             
             <div className="w-full lg:w-1/3 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-gray-800 pt-6 lg:pt-0 lg:pl-10">
                <div className="bg-black/40 p-4 sm:p-6 rounded-xl border border-gray-800 shadow-inner">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Total Estimado</div>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-5xl sm:text-6xl font-black text-sw-green font-mono drop-shadow-[0_0_10px_rgba(46,204,113,0.3)]">${finalTotal.toLocaleString('es-CL')}</div>
                    {isTenthVisit && <div className="mt-2 text-xs bg-sw-green/20 text-sw-green px-3 py-1 rounded border border-sw-green/50 font-bold uppercase tracking-widest animate-pulse">-30% Cliente Frecuente</div>}
                  </div>
                </div>

                <div className="bg-black/40 p-4 rounded-xl border border-gray-800 mt-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Descuento Especial</span>
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
                      <span>Monto Descuento</span>
                      <span>-${discountAmount.toLocaleString('es-CL')}</span>
                    </div>
                  )}
                </div>

                {showPinModal && (
                  <div className="bg-sw-red/10 border border-sw-red/30 p-4 rounded-xl mt-4 space-y-3">
                    <p className="text-[10px] font-bold text-sw-red uppercase tracking-widest text-center">PIN ADMINISTRADOR</p>
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
                      <button onClick={handlePreSubmit} className="flex-1 py-2 rounded-lg bg-sw-red text-white text-[10px] font-bold uppercase">Validar</button>
                    </div>
                  </div>
                )}

                <button onClick={handlePreSubmit} className="w-full btn-jedi py-4 sm:py-5 rounded-xl font-bold uppercase text-xl sm:text-2xl tracking-widest flex justify-center items-center gap-3 mt-6 sm:mt-8"><Car size={24} /> INGRESAR VEHÍCULO</button>
             </div>
           </div>
        </div>
      )}

      {posTab === 'tienda' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div className="panel-glass p-4 sm:p-6 rounded-xl grid grid-cols-2 gap-3 sm:gap-4 h-fit border-t-4 border-sw-green">
            <div className="col-span-2 mb-2 border-b border-gray-700 pb-2"><h3 className="sw-title-font text-lg sm:text-xl text-sw-green tracking-wider">PRODUCTOS ({storeProducts.length})</h3></div>
            {storeProducts.map((prod: any) => (
              <button key={prod.id} onClick={() => setExpressCart([...expressCart, prod])} className={`rounded-xl p-3 sm:p-5 text-left flex flex-col justify-between h-24 sm:h-32 transition-all btn-gold`}>
                <div className="flex justify-between items-start"><div className="text-2xl sm:text-4xl drop-shadow-[0_0_5px_rgba(255,232,31,0.5)]">{prod.icon}</div><span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${prod.stock < 0 ? 'bg-red-900 text-red-400' : 'bg-black text-gray-400'}`}>STK:${prod.stock}</span></div>
                <div><div className="text-xs sm:text-sm font-bold text-white mb-1 uppercase tracking-wide line-clamp-1">{prod.name}</div><div className="text-xs sm:text-sm font-bold font-mono text-sw-yellow">${prod.price.toLocaleString('es-CL')}</div></div>
              </button>
            ))}
          </div>

          <div className="panel-glass p-4 sm:p-6 rounded-xl flex flex-col border-t-4 border-sw-red">
            <h3 className="text-lg sm:text-xl font-bold border-b border-gray-700 pb-3 mb-4 flex items-center gap-2 sw-title-font text-sw-red tracking-wider"><ShoppingCart size={20} /> CARRITO DE COMPRAS</h3>
            <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 mb-4 sm:mb-6 min-h-[150px] sm:min-h-[200px] custom-scrollbar">
              {expressCart.length === 0 ? <div className="text-gray-600 text-sm font-bold text-center mt-8 sm:mt-12 uppercase tracking-widest">Sin productos</div> : 
                expressCart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-black/60 p-2 sm:p-3 rounded-lg border border-gray-800 text-sm shadow-inner">
                    <span className="font-bold text-gray-200 uppercase tracking-wide text-xs sm:text-sm"><span className="text-base sm:text-xl mr-2">{item.icon}</span> {item.name}</span>
                    <div className="flex items-center gap-3 sm:gap-4"><span className="font-bold text-sw-yellow font-mono text-sm sm:text-base">${item.price.toLocaleString('es-CL')}</span><button onClick={() => setExpressCart(expressCart.filter((_, i) => i !== idx))} className="text-gray-500 hover:text-sw-red transition-colors"><Trash2 size={16} /></button></div>
                  </div>
                ))
              }
            </div>
            <div className="border-t border-gray-700 pt-4 sm:pt-6">
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
                 {PAYMENT_METHODS.slice(0,2).map(m => (
                   <button key={m} onClick={() => setExpressPay(m)} className={`px-2 sm:px-4 py-2 sm:py-3 rounded border text-xs sm:text-sm font-bold uppercase tracking-widest transition-all ${expressPay === m ? 'btn-yoda' : 'bg-black/50 border-gray-700 text-gray-500 hover:text-white'}`}>{m.split(' ')[0]}</button>
                 ))}
              </div>
              <div className="bg-black/40 p-3 sm:p-4 rounded-lg flex justify-between items-end mb-4 sm:mb-6 border border-gray-800"><span className="text-gray-500 text-xs sm:text-sm font-bold uppercase tracking-widest">TOTAL:</span><span className="text-3xl sm:text-5xl font-black text-sw-red font-mono drop-shadow-[0_0_10px_rgba(255,56,56,0.3)]">${expressTotal.toLocaleString('es-CL')}</span></div>
              <button onClick={() => { handleExpressSale(); }} className="w-full btn-sith py-3 sm:py-4 rounded-xl font-bold uppercase text-lg sm:text-xl tracking-widest flex justify-center items-center gap-2 sm:gap-3"><Zap size={20} /> COBRAR VENTA EXPRÉS</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Time Wheel Picker Modal */}
      {showTimePicker && (
        <TimeWheelPicker 
          initialTime={customPickupTime || '12:00'} 
          onSave={(time: string) => { setCustomPickupTime(time); setShowTimePicker(false); }}
          onClose={() => setShowTimePicker(false)}
        />
      )}
    </div>
  );
};

const TimeWheelPicker = ({ initialTime, onSave, onClose }: any) => {
  const [h, m] = initialTime.split(':').map((v: string) => parseInt(v, 10));
  const [hour, setHour] = useState(isNaN(h) ? 12 : h);
  const [minute, setMinute] = useState(isNaN(m) ? 0 : m);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hourRef.current) {
      const item = hourRef.current.children[hour + 2] as HTMLElement;
      if (item) hourRef.current.scrollTop = item.offsetTop - hourRef.current.clientHeight / 2 + item.clientHeight / 2;
    }
    if (minuteRef.current) {
      const item = minuteRef.current.children[minute + 2] as HTMLElement;
      if (item) minuteRef.current.scrollTop = item.offsetTop - minuteRef.current.clientHeight / 2 + item.clientHeight / 2;
    }
  }, []);

  const handleScroll = (ref: React.RefObject<HTMLDivElement>, setter: (v: number) => void) => {
    if (!ref.current) return;
    const center = ref.current.scrollTop + ref.current.clientHeight / 2;
    let closest = 0;
    let minDiff = Infinity;
    
    Array.from(ref.current.children).forEach((child: any, idx) => {
      const diff = Math.abs(center - (child.offsetTop + child.clientHeight / 2));
      if (diff < minDiff) {
        minDiff = diff;
        closest = idx - 2; // Offset for padding items
      }
    });
    
    if (closest >= 0 && closest < (ref === hourRef ? 24 : 60)) {
      setter(closest);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="panel-glass w-full max-w-[280px] rounded-3xl border border-sw-blue/30 shadow-[0_0_50px_rgba(0,168,255,0.2)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 bg-sw-blue/5 text-center">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-sw-blue">Seleccionar Hora</h3>
        </div>

        <div className="relative h-64 flex items-center justify-center bg-black/40">
          {/* Highlight Bar */}
          <div className="absolute inset-x-0 h-12 bg-sw-blue/10 border-y border-sw-blue/30 pointer-events-none"></div>
          
          <div className="flex w-full h-full px-4">
            {/* Hours */}
            <div 
              ref={hourRef}
              onScroll={() => handleScroll(hourRef, setHour)}
              className="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar py-24"
            >
              <div className="h-12"></div><div className="h-12"></div>
              {hours.map(v => (
                <div key={v} className={`h-12 flex items-center justify-center snap-center transition-all ${hour === v ? 'text-sw-blue text-2xl font-black' : 'text-gray-600 text-lg font-bold'}`}>
                  {v.toString().padStart(2, '0')}
                </div>
              ))}
              <div className="h-12"></div><div className="h-12"></div>
            </div>

            <div className="flex items-center text-sw-blue font-black text-2xl">:</div>

            {/* Minutes */}
            <div 
              ref={minuteRef}
              onScroll={() => handleScroll(minuteRef, setMinute)}
              className="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar py-24"
            >
              <div className="h-12"></div><div className="h-12"></div>
              {minutes.map(v => (
                <div key={v} className={`h-12 flex items-center justify-center snap-center transition-all ${minute === v ? 'text-sw-blue text-2xl font-black' : 'text-gray-600 text-lg font-bold'}`}>
                  {v.toString().padStart(2, '0')}
                </div>
              ))}
              <div className="h-12"></div><div className="h-12"></div>
            </div>
          </div>
        </div>

        <div className="p-4 grid grid-cols-2 gap-3 bg-black/60">
          <button 
            onClick={onClose}
            className="py-3 rounded-xl border border-gray-800 text-gray-500 font-bold uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all"
          >
            Reset
          </button>
          <button 
            onClick={() => onSave(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)}
            className="py-3 rounded-xl bg-sw-blue text-black font-bold uppercase tracking-widest text-[10px] shadow-[0_0_15px_rgba(0,168,255,0.4)] transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const Trash2 = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 9v4m4-4v4"/></svg>
);
