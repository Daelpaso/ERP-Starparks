import React, { useState, useEffect } from 'react';
import { Car, ShoppingCart, CheckCircle2, FileText, Clock, Phone, MessageSquare, AlertTriangle, Zap } from 'lucide-react';
import { STATUS_FLOW } from '../lib/constants';
import { calculateParkingTimeAndFee } from '../lib/utils';

export const WorkshopView = ({ jobs, advanceJobStatus, setStoreModalJobId, setDetailModalJobId, addTimelineEvent }: any) => {
  const columns = STATUS_FLOW.slice(0, 3); // Cola, Lavando, Listo
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[600px]">
      {columns.map((status) => (
        <div key={status} className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-700 pb-2">
            <h3 className="sw-title-font font-bold text-sw-blue uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sw-blue animate-pulse"></span>
              {status}
            </h3>
            <span className="bg-black/50 border border-gray-700 px-2 py-0.5 rounded text-xs font-mono text-gray-400">
              {jobs.filter((j: any) => j.status === status).length}
            </span>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
            {jobs.filter((j: any) => j.status === status).map((job: any) => {
              const { extraFee, extraMins, totalElapsedSinceReady } = calculateParkingTimeAndFee(job, now);
              const isListo = status === 'Listo';
              const graceRemaining = Math.max(0, 30 - (extraMins > 0 ? 30 : totalElapsedSinceReady));
              const isOvertime = extraMins > 0;

              return (
                <div 
                  key={job.id} 
                  onClick={() => setDetailModalJobId(job.id)}
                  className={`panel-glass rounded-xl p-4 border-l-4 transition-all group cursor-pointer relative ${
                    isOvertime ? 'border-sw-red shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-sw-blue hover:border-sw-yellow'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-2xl font-mono font-bold text-white group-hover:text-sw-yellow transition-colors">{job.plate}</div>
                      <div className="text-xs text-gray-500 font-mono uppercase tracking-widest">{job.id}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold uppercase tracking-widest ${isOvertime ? 'text-sw-red' : 'text-sw-blue'}`}>
                        {Math.floor((now - job.entryDate) / 60000)}m
                      </div>
                      <Clock size={12} className="text-gray-600 inline ml-1" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <Car size={14} className="text-sw-yellow" />
                      {job.serviceName || 'Servicio'}
                    </div>
                    {job.pickupTime && (
                      <div className="flex items-center gap-2 text-xs font-bold text-sw-red uppercase tracking-widest">
                        <Clock size={14} />
                        Retiro: {job.pickupTime}
                      </div>
                    )}
                    
                    {isListo && (
                      <div className={`mt-2 p-3 rounded-lg border transition-all ${
                        isOvertime 
                          ? 'bg-sw-red/10 border-sw-red/30 animate-pulse' 
                          : 'bg-black/40 border-gray-800'
                      }`}>
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tiempo en Listo</span>
                            <span className="text-xs font-mono font-bold text-white">{totalElapsedSinceReady} min</span>
                          </div>
                          
                          {isOvertime ? (
                            <div className="flex items-center justify-between text-sw-red mt-1 pt-1 border-t border-sw-red/20">
                              <div className="flex items-center gap-1 text-xs font-black uppercase tracking-tighter">
                                <AlertTriangle size={14} className="animate-bounce" />
                                SOBRETIEMPO: {extraMins}m
                              </div>
                              <div className="text-sm font-mono font-black animate-pulse">
                                +${extraFee.toLocaleString('es-CL')}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-sw-green mt-1 pt-1 border-t border-gray-800">
                              <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                                <Clock size={10} /> Gracia Restante
                              </div>
                              <div className="text-xs font-mono font-bold">{30 - totalElapsedSinceReady}m</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-800">
                    {isListo ? (
                      <>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (job.clientPhone) {
                              window.location.href = `tel:${job.clientPhone}`;
                            }
                          }}
                          className="flex flex-col items-center gap-1 p-2 rounded hover:bg-white/5 text-gray-400 hover:text-sw-blue transition-all"
                          title="Llamar"
                        >
                          <Phone size={18} />
                          <span className="text-xs uppercase font-bold">Llamar</span>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const phone = (job.clientPhone || '').replace(/\D/g, '');
                            const readyTime = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
                            const graceEnd = new Date(Date.now() + 30 * 60000).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
                            const msg = encodeURIComponent(`Estimado cliente, su vehículo ${job.plate} está LISTO para retirar.\n\nHora listo: ${readyTime}\nTiempo de gracia: 30 min (hasta las ${graceEnd})\nDespués: $40/min de estacionamiento.\n\n¡Lo esperamos! — StarParks CarWash`);
                            window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                          }}
                          className="flex flex-col items-center gap-1 p-2 rounded hover:bg-white/5 text-gray-400 hover:text-sw-green transition-all"
                          title="WhatsApp"
                        >
                          <MessageSquare size={18} />
                          <span className="text-xs uppercase font-bold">WhatsApp</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); advanceJobStatus(job.id, job.status); }}
                          className="flex flex-col items-center gap-1 p-2 rounded bg-sw-green/20 text-sw-green border border-sw-green hover:bg-sw-green hover:text-black transition-all shadow-[0_0_10px_rgba(46,204,113,0.2)]"
                          title="Procesar Pago y Entrega"
                        >
                          <CheckCircle2 size={18} />
                          <span className="text-xs uppercase font-bold">Cobrar</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDetailModalJobId(job.id); }}
                          className="flex flex-col items-center gap-1 p-2 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-all"
                          title="Ver Ficha"
                        >
                          <FileText size={18} />
                          <span className="text-xs uppercase font-bold">Ficha</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setStoreModalJobId(job.id); }}
                          className="flex flex-col items-center gap-1 p-2 rounded hover:bg-white/5 text-gray-400 hover:text-sw-yellow transition-all"
                          title="Tienda"
                        >
                          <ShoppingCart size={18} />
                          <span className="text-xs uppercase font-bold">Tienda</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); advanceJobStatus(job.id, job.status); }}
                          className="flex flex-col items-center gap-1 p-2 rounded hover:bg-sw-green/20 text-sw-green transition-all"
                          title="Siguiente"
                        >
                          <CheckCircle2 size={18} />
                          <span className="text-xs uppercase font-bold">Siguiente</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {jobs.filter((j: any) => j.status === status).length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-800/50 rounded-2xl bg-black/20 group-hover:border-sw-blue/30 transition-all">
                <div className="relative mb-4">
                  <Car size={48} className="text-gray-800 group-hover:text-sw-blue/20 transition-all" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap size={20} className="text-gray-900" />
                  </div>
                </div>
                <p className="text-gray-600 text-[10px] font-bold uppercase tracking-[0.3em] text-center px-4">Sector Despejado</p>
                <p className="text-gray-800 text-[8px] font-bold uppercase tracking-widest mt-1">Esperando Órdenes</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
