import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, 
  DollarSign, Bell, Receipt, Trash2, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, addDoc, deleteDoc, doc, updateDoc } from '../firebase';

const EVENT_TYPES = [
  { id: 'income', label: 'Ingreso Extra', icon: DollarSign, color: 'text-sw-green', bg: 'bg-sw-green/10', border: 'border-sw-green' },
  { id: 'expense', label: 'Gasto/Egresos', icon: Receipt, color: 'text-sw-red', bg: 'bg-sw-red/10', border: 'border-sw-red' },
  { id: 'reminder', label: 'Recordatorio', icon: Bell, color: 'text-sw-blue', bg: 'bg-sw-blue/10', border: 'border-sw-blue' },
  { id: 'event', label: 'Evento', icon: CalendarIcon, color: 'text-sw-yellow', bg: 'bg-sw-yellow/10', border: 'border-sw-yellow' }
];

export const CalendarView = ({ events, showToast, currentUser }: any) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // New Event Form State
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'reminder',
    amount: 0,
    time: '',
    description: '',
    isCompleted: false
  });

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const days = [];
  const totalDays = daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const startDay = firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(i);

  const getDayEvents = (day: number) => {
    return events.filter((e: any) => {
      const d = new Date(e.date);
      return d.getDate() === day && 
             d.getMonth() === currentDate.getMonth() && 
             d.getFullYear() === currentDate.getFullYear();
    });
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || selectedDay === null) return;
    try {
      const eventDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay);
      await addDoc(collection(db, 'calendarEvents'), {
        ...newEvent,
        date: eventDate.getTime(),
        createdAt: Date.now(),
        createdBy: currentUser?.name || 'Sistema'
      });
      showToast('Evento creado', 'success');
      setShowAddModal(false);
      setNewEvent({ title: '', type: 'reminder', amount: 0, time: '', description: '', isCompleted: false });
    } catch (e) {
      showToast('Error al crear evento', 'error');
    }
  };

  const toggleEventStatus = async (eventId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'calendarEvents', eventId), { isCompleted: !currentStatus });
    } catch (e) {
      showToast('Error al actualizar', 'error');
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (confirm('¿Eliminar este evento?')) {
      try {
        await deleteDoc(doc(db, 'calendarEvents', eventId));
        showToast('Evento eliminado', 'success');
      } catch (e) {
        showToast('Error al eliminar', 'error');
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-[600px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 panel-glass p-6 rounded-xl border-t-4 border-sw-blue">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3 sw-title-font text-sw-blue tracking-widest uppercase">
            <CalendarIcon size={28} /> Agenda de Gestión
          </h2>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1">Control de finanzas, eventos y recordatorios.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-gray-800">
            <button onClick={handlePrevMonth} className="p-2 text-sw-blue hover:bg-sw-blue/10 rounded-lg transition-all"><ChevronLeft size={20} /></button>
            <div className="px-4 text-sm font-bold uppercase tracking-[0.2em] text-white min-w-[150px] text-center">
              {currentDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
            </div>
            <button onClick={handleNextMonth} className="p-2 text-sw-blue hover:bg-sw-blue/10 rounded-lg transition-all"><ChevronRight size={20} /></button>
          </div>
          <button 
            onClick={() => { setSelectedDay(new Date().getDate()); setShowAddModal(true); }}
            className="btn-jedi flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest"
          >
            <Plus size={20} /> Nuevo Evento
          </button>
        </div>
      </div>

      {/* Stats / Quick Toggles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {EVENT_TYPES.map(type => (
          <div key={type.id} className={`panel-glass p-4 rounded-xl border border-gray-800 flex items-center gap-3`}>
            <div className={`p-2 rounded-lg ${type.bg} ${type.color}`}><type.icon size={20} /></div>
            <div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{type.label}</div>
              <div className="text-sm font-bold text-white uppercase">{events.filter((e:any) => e.type === type.id).length}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 panel-glass rounded-xl border border-gray-800 overflow-hidden flex flex-col">
        <div className="grid grid-cols-7 bg-black/60 border-b border-gray-800">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
            <div key={d} className="p-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 flex-1">
          {days.map((day, idx) => {
            const dayEvents = day ? getDayEvents(day) : [];
            const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
            
            return (
              <div 
                key={idx} 
                onClick={() => { if(day) { setSelectedDay(day); setShowAddModal(true); } }}
                className={`min-h-[100px] border-r border-b border-gray-800 p-2 transition-all hover:bg-white/5 cursor-pointer flex flex-col gap-1 ${!day ? 'bg-black/20' : ''} ${isToday ? 'bg-sw-blue/5' : ''}`}
              >
                {day && (
                  <>
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-xs font-mono font-bold ${isToday ? 'bg-sw-blue text-black w-6 h-6 flex items-center justify-center rounded-full' : 'text-gray-500'}`}>
                        {day}
                      </span>
                      {dayEvents.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-sw-blue shadow-[0_0_5px_rgba(0,168,255,1)]"></span>}
                    </div>
                    <div className="space-y-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map((e: any) => {
                        const typeInfo = EVENT_TYPES.find(t => t.id === e.type) || EVENT_TYPES[0];
                        return (
                          <div 
                            key={e.id} 
                            className={`text-[8px] p-1 rounded flex items-center gap-1 font-bold uppercase tracking-tight truncate ${typeInfo.bg} ${typeInfo.color} ${e.isCompleted ? 'opacity-40 line-through' : ''}`}
                          >
                            <typeInfo.icon size={8} /> {e.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && <div className="text-[7px] text-gray-600 text-center font-bold">+{dayEvents.length - 3} más</div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setShowAddModal(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="panel-glass p-8 rounded-2xl max-w-2xl w-full border border-sw-blue/30 shadow-[0_0_50px_rgba(0,168,255,0.15)] flex flex-col md:flex-row gap-8"
            >
              {/* Left Column: Form */}
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-bold text-white sw-title-font tracking-widest uppercase">Gestionar Día {selectedDay}</h3>
                  <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-sw-red"><Plus size={24} className="rotate-45" /></button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Título / Concepto</label>
                    <input 
                      type="text" 
                      value={newEvent.title}
                      onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                      className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white focus:border-sw-blue outline-none uppercase text-sm"
                      placeholder="Ej: Pago de Luz"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Tipo</label>
                      <select 
                        value={newEvent.type}
                        onChange={e => setNewEvent({...newEvent, type: e.target.value})}
                        className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white focus:border-sw-blue outline-none text-xs"
                      >
                        {EVENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Monto (Si aplica)</label>
                      <input 
                        type="number" 
                        value={newEvent.amount}
                        onChange={e => setNewEvent({...newEvent, amount: Number(e.target.value)})}
                        className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white focus:border-sw-blue outline-none font-mono"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Hora</label>
                      <input 
                        type="time" 
                        value={newEvent.time}
                        onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                        className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white focus:border-sw-blue outline-none"
                      />
                    </div>
                    <div className="flex items-end">
                      <button 
                        onClick={handleCreateEvent}
                        disabled={!newEvent.title}
                        className="w-full py-3 rounded-xl bg-sw-blue text-black font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all disabled:opacity-50"
                      >
                        Añadir Evento
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Day View */}
              <div className="w-full md:w-80 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-gray-800 pt-6 md:pt-0 md:pl-6 max-h-[400px]">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <Clock size={12} /> Eventos Programados
                </h4>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                  {selectedDay && getDayEvents(selectedDay).length > 0 ? getDayEvents(selectedDay).map((e: any) => {
                    const typeInfo = EVENT_TYPES.find(t => t.id === e.type) || EVENT_TYPES[0];
                    return (
                      <div key={e.id} className={`p-3 rounded-xl border ${typeInfo.border} ${typeInfo.bg} flex flex-col gap-2 relative group`}>
                        <button 
                          onClick={() => deleteEvent(e.id)}
                          className="absolute -top-2 -right-2 p-1 bg-sw-red text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                        
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className={`${typeInfo.color}`}><typeInfo.icon size={14} /></div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${e.isCompleted ? 'line-through opacity-50' : 'text-white'}`}>{e.title}</span>
                          </div>
                          <span className="text-[9px] font-mono text-gray-500">{e.time || '--:--'}</span>
                        </div>
                        
                        {(e.type === 'income' || e.type === 'expense') && (
                          <div className={`text-sm font-mono font-bold ${e.type === 'income' ? 'text-sw-green' : 'text-sw-red'}`}>
                            {e.type === 'income' ? '+' : '-'}${e.amount?.toLocaleString('es-CL')}
                          </div>
                        )}

                        <button 
                          onClick={() => toggleEventStatus(e.id, e.isCompleted)}
                          className={`w-full py-1 rounded text-[8px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 transition-all ${e.isCompleted ? 'bg-sw-green text-black' : 'bg-black/30 text-gray-500 hover:text-white'}`}
                        >
                          {e.isCompleted ? <><CheckCircle2 size={10} /> Completado</> : 'Marcar Completado'}
                        </button>
                      </div>
                    );
                  }) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-gray-800 rounded-xl">
                      <AlertCircle size={32} className="text-gray-700 mb-2" />
                      <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">No hay eventos para este día.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
