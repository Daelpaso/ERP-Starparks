import React, { useState, useMemo } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, 
  eachDayOfInterval, isToday, parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, Car, User, Shield, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CalendarView = ({ jobs, setDetailModalJobId }: any) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  const jobsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    jobs.forEach((job: any) => {
      const dateKey = format(new Date(job.entryDate), 'yyyy-MM-dd');
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(job);
    });
    return map;
  }, [jobs]);

  const selectedDateJobs = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return jobsByDate[dateKey] || [];
  }, [selectedDate, jobsByDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDIENTE': return 'bg-sw-red';
      case 'LAVADO': return 'bg-sw-blue';
      case 'SECADO': return 'bg-sw-yellow';
      case 'TERMINADO': return 'bg-sw-green';
      case 'ENTREGADO': return 'bg-gray-600';
      default: return 'bg-sw-blue';
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      {/* Calendar Grid */}
      <div className="xl:col-span-2 space-y-6">
        <div className="panel-glass p-6 rounded-2xl border border-sw-blue/20">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-sw-blue/10 rounded-xl flex items-center justify-center text-sw-blue border border-sw-blue/30">
                <CalendarIcon size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white sw-title-font tracking-tighter uppercase">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Agenda de Operaciones</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={prevMonth}
                className="p-2 rounded-lg bg-black/40 border border-gray-800 text-gray-400 hover:text-sw-blue hover:border-sw-blue transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => setCurrentMonth(new Date())}
                className="px-4 py-2 rounded-lg bg-black/40 border border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-white hover:border-white transition-all"
              >
                Hoy
              </button>
              <button 
                onClick={nextMonth}
                className="p-2 rounded-lg bg-black/40 border border-gray-800 text-gray-400 hover:text-sw-blue hover:border-sw-blue transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-800/50 rounded-xl overflow-hidden border border-gray-800">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="bg-black/60 p-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {day}
              </div>
            ))}
            {calendarDays.map((day, idx) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayJobs = jobsByDate[dateKey] || [];
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isSelected = isSameDay(day, selectedDate);
              const today = isToday(day);

              return (
                <div 
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-[100px] p-2 transition-all cursor-pointer relative group ${
                    isCurrentMonth ? 'bg-black/40' : 'bg-black/20 opacity-30'
                  } ${isSelected ? 'ring-2 ring-inset ring-sw-blue z-10' : 'hover:bg-white/5'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-mono font-bold ${
                      today ? 'w-6 h-6 rounded-full bg-sw-blue text-black flex items-center justify-center' : 
                      isSelected ? 'text-sw-blue' : 'text-gray-500'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {dayJobs.length > 0 && (
                      <span className="text-[8px] font-bold bg-white/10 px-1.5 py-0.5 rounded text-gray-400">
                        {dayJobs.length}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    {dayJobs.slice(0, 3).map((job, jIdx) => (
                      <div 
                        key={jIdx}
                        className={`h-1.5 rounded-full ${getStatusColor(job.status)} opacity-60`}
                        title={`${job.clientName} - ${job.status}`}
                      ></div>
                    ))}
                    {dayJobs.length > 3 && (
                      <div className="text-[8px] text-gray-600 font-bold text-center">
                        +{dayJobs.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 p-4 bg-black/40 rounded-xl border border-gray-800">
          {[
            { label: 'Pendiente', color: 'bg-sw-red' },
            { label: 'Lavado', color: 'bg-sw-blue' },
            { label: 'Secado', color: 'bg-sw-yellow' },
            { label: 'Terminado', color: 'bg-sw-green' },
            { label: 'Entregado', color: 'bg-gray-600' }
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day Details */}
      <div className="space-y-6">
        <div className="panel-glass p-6 rounded-2xl border border-sw-yellow/20 sticky top-24">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tighter">
                {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </h3>
              <p className="text-[10px] text-sw-yellow font-bold uppercase tracking-widest">Detalle del Día</p>
            </div>
            <div className="w-10 h-10 bg-sw-yellow/10 rounded-lg flex items-center justify-center text-sw-yellow border border-sw-yellow/30">
              <Clock size={20} />
            </div>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {selectedDateJobs.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-xl">
                <AlertCircle size={32} className="mx-auto text-gray-700 mb-2" />
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">No hay servicios programados</p>
              </div>
            ) : (
              selectedDateJobs.map((job: any) => (
                <motion.div 
                  key={job.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setDetailModalJobId(job.id)}
                  className="bg-black/60 p-4 rounded-xl border border-gray-800 hover:border-sw-yellow transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(job.status)} shadow-[0_0_10px_rgba(0,0,0,0.5)]`}></div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{job.status}</span>
                    </div>
                    <span className="text-[10px] font-mono text-sw-yellow font-bold">{format(new Date(job.entryDate), 'HH:mm')}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-sw-blue">
                      <Car size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-black text-white uppercase tracking-tight">{job.plate}</div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{job.serviceName}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">
                    <div className="flex items-center gap-2">
                      <User size={12} className="text-gray-600" />
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate max-w-[100px]">{job.clientName}</span>
                    </div>
                    <div className="text-[10px] font-mono text-sw-green font-black">${job.total.toLocaleString('es-CL')}</div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {selectedDateJobs.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-800">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Estimado</span>
                <span className="text-xl font-mono font-black text-sw-green">
                  ${selectedDateJobs.reduce((acc: number, curr: any) => acc + curr.total, 0).toLocaleString('es-CL')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
