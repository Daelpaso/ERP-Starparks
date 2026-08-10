import React, { useState, useEffect } from 'react';
import { Car, ShoppingCart, CheckCircle2, FileText, Clock, Phone, MessageSquare, AlertTriangle, Star, XCircle } from 'lucide-react';
import { STATUS_FLOW } from '../lib/constants';
import { calculateParkingTimeAndFee } from '../lib/utils';

export const WorkshopView = ({ jobs, clients, advanceJobStatus, setStoreModalJobId, setDetailModalJobId, addTimelineEvent, onCancelJob, isAdmin, isShiftOwner }: any) => {
  const columns = STATUS_FLOW.slice(0, 3); // Cola, Lavando, Listo
  const [now, setNow] = useState(Date.now());

  // Helper to check if a job belongs to a VIP client
  const isVIPJob = (job: any) => {
    if (job.isVIP) return true; // Static check
    const client = clients?.find((c: any) => c.plate === job.plate);
    return client?.isVIP || false;
  };

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
            <span className="bg-black/50 border border-gray-700 px-2 py-0.5 rounded text-[14px] font-mono text-gray-400">
              {jobs.filter((j: any) => j.status === status).length}
            </span>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
            {jobs.filter((j: any) => j.status === status).map((job: any) => {
              const { extraFee, extraMins, totalElapsedSinceReady } = calculateParkingTimeAndFee(job, now);
              const isListo = status === 'Listo';
              const isVIP = isVIPJob(job);
              const isOvertime = extraMins > 0;

              return (
                <div 
                  key={job.id} 
                  onClick={() => setDetailModalJobId(job.id)}
                  className={`panel-glass rounded-xl p-4 border-l-4 transition-all group cursor-pointer relative ${
                    isOvertime ? 'border-sw-red shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 
                    isVIP ? 'border-sw-yellow bg-gradient-to-br from-sw-yellow/20 to-sw-yellow/5' :
                    'border-sw-blue hover:border-sw-yellow'
                  }`}
                >
                  {isVIP && (
                    <div className="absolute -top-2 -right-2 bg-sw-yellow text-black p-1 rounded-full shadow-[0_0_10px_rgba(255,232,31,0.5)] z-10">
                      <Star size={12} className="fill-black" />
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-2xl font-mono font-bold text-white group-hover:text-sw-yellow transition-colors">{job.plate}</div>
                      <div className="text-[14px] text-gray-500 font-mono uppercase tracking-widest">{job.id}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[14px] font-bold uppercase tracking-widest ${isOvertime ? 'text-sw-red' : 'text-sw-blue'}`}>
                        {Math.floor((now - job.entryDate) / 60000)}m
                      </div>
                      <Clock size={12} className="text-gray-600 inline ml-1" />
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-[18px] font-bold text-gray-400 uppercase tracking-widest">
                      <Car size={14} className="text-sw-yellow" />
                      {job.clientVehicleModel ? `${job.clientVehicleModel} — ` : ''}{job.serviceName || 'Servicio'}
                    </div>
                    {job.observations && (
                      <div className="bg-sw-yellow/10 border border-sw-yellow/30 p-2 rounded-lg text-[14px] font-bold text-sw-yellow uppercase tracking-tight leading-tight flex items-start gap-1.5">
                        <MessageSquare size={12} className="flex-shrink-0 mt-0.5" />
                        {job.observations}
                      </div>
                    )}
                    {job.pickupTime && (
                      <div className="flex items-center gap-2 text-[14px] font-bold text-sw-red uppercase tracking-widest">
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
                            <span className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Tiempo en Listo</span>
                            <span className="text-[14px] font-mono font-bold text-white">{totalElapsedSinceReady} min</span>
                          </div>
                          
                          {isOvertime ? (
                            <div className="flex items-center justify-between text-sw-red mt-1 pt-1 border-t border-sw-red/20">
                              <div className="flex items-center gap-1 text-[14px] font-black uppercase tracking-tighter">
                                <AlertTriangle size={14} className="animate-bounce" />
                                SOBRETIEMPO: {extraMins}m
                              </div>
                              <div className="text-sm font-mono font-black animate-pulse">
                                +${extraFee.toLocaleString('es-CL')}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-sw-green mt-1 pt-1 border-t border-gray-800">
                              <div className="text-[14px] font-bold uppercase tracking-widest flex items-center gap-1">
                                <Clock size={10} /> Gracia Restante
                              </div>
                              <div className="text-[14px] font-mono font-bold">{30 - totalElapsedSinceReady}m</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`grid ${isShiftOwner ? (isListo ? 'grid-cols-3' : (status === 'Cola' && isAdmin ? 'grid-cols-4' : 'grid-cols-3')) : 'grid-cols-1'} gap-2 pt-3 border-t border-gray-800`}>
                    {isShiftOwner ? (
                      isListo ? (
                        <>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              addTimelineEvent(job.id, 'Llamada al cliente');
                              window.location.href = `tel:${job.clientPhone}`;
                            }}
                            className="flex flex-col items-center gap-1 p-2 rounded hover:bg-white/5 text-gray-400 hover:text-sw-blue transition-all"
                            title="Llamar"
                          >
                            <Phone size={18} />
                            <span className="text-[14px] uppercase font-bold">Llamar</span>
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              addTimelineEvent(job.id, 'Mensaje enviado al cliente');
                              window.location.href = `sms:${job.clientPhone}`;
                            }}
                            className="flex flex-col items-center gap-1 p-2 rounded hover:bg-white/5 text-gray-400 hover:text-sw-green transition-all"
                            title="Mensaje"
                          >
                            <MessageSquare size={18} />
                            <span className="text-[14px] uppercase font-bold">Mensaje</span>
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); advanceJobStatus(job.id, job.status); }}
                            className="flex flex-col items-center gap-1 p-2 rounded hover:bg-sw-green/20 text-sw-green transition-all"
                            title="Siguiente"
                          >
                            <CheckCircle2 size={18} />
                            <span className="text-[14px] uppercase font-bold">Aprobar</span>
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
                            <span className="text-[14px] uppercase font-bold text-center">Ficha</span>
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setStoreModalJobId(job.id); }}
                            className="flex flex-col items-center gap-1 p-2 rounded hover:bg-white/5 text-gray-400 hover:text-sw-yellow transition-all"
                            title="Tienda"
                          >
                            <ShoppingCart size={18} />
                            <span className="text-[14px] uppercase font-bold text-center">Tienda</span>
                          </button>
                          {status === 'Cola' && isAdmin && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); onCancelJob(job.id); }}
                              className="flex flex-col items-center gap-1 p-2 rounded hover:bg-sw-red/20 text-sw-red transition-all"
                              title="Retirar Vehículo"
                            >
                              <XCircle size={18} />
                              <span className="text-[14px] uppercase font-bold text-center">Retirar</span>
                            </button>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); advanceJobStatus(job.id, job.status); }}
                            className="flex flex-col items-center gap-1 p-2 rounded hover:bg-sw-green/20 text-sw-green transition-all"
                            title="Siguiente"
                          >
                            <CheckCircle2 size={18} />
                            <span className="text-[14px] uppercase font-bold text-center">Aprobar</span>
                          </button>
                        </>
                      )
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDetailModalJobId(job.id); }}
                        className="flex items-center justify-center gap-2 p-2 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-all w-full"
                        title="Ver Ficha"
                      >
                        <FileText size={18} />
                        <span className="text-[14px] uppercase font-bold">Ver Detalles</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {jobs.filter((j: any) => j.status === status).length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-xl">
                <p className="text-gray-600 text-[14px] font-bold uppercase tracking-widest">Sin vehículos</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
