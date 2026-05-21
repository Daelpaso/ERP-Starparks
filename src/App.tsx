import React, { useState, useEffect, useMemo } from 'react';
import { 
  Menu, X, LayoutDashboard, Wrench, History, Store, Users, Settings, 
  LogOut, Moon, Sun, Zap, Eye, EyeOff, AlertCircle, CheckCircle2, Info, Bell,
  Shield, DollarSign, Package, Clock, ChevronLeft, ChevronRight, Calendar,
  Accessibility, Type, ZoomIn, ZoomOut, RotateCcw, TrendingUp, Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Internal Imports
import { 
  INITIAL_USERS, INITIAL_CATEGORIES, INITIAL_RAW_MATERIALS, 
  INITIAL_SERVICES, INITIAL_STORE_PRODUCTS, INITIAL_CLIENTS,
  STATUS_FLOW
} from './lib/constants';
import { validarPatenteChilena } from './lib/utils';
import { WorkshopView } from './components/WorkshopView';
import { HistoryView } from './components/HistoryView';
import { DailyReportView } from './components/DailyReportView';
import { POSView } from './components/POSView';
import { CalendarView } from './components/CalendarView';
import { AuthGuard } from './components/AuthGuard';
import { PricingView, ConfigView, UsersView, ClientsView } from './components/AdminViews';
import { JobDetailModal, QuickStoreModal, CheckoutModal, ClientDetailModal, ServiceModal, UserDetailModal, UserCreateModal, InventoryItemModal, CancelJobModal } from './components/Modals';
import { OpenShiftModal, CashMovementModal, CloseShiftModal, ShiftHistoryView } from './components/ShiftManagement';
import { HistoricalZReportModal } from './components/HistoricalZReportModal';

// Firebase Imports
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged,
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, getDoc, getDocs,
  handleFirestoreError, OperationType, limit, orderBy, where, serverTimestamp
} from './firebase';

// --- Components ---

const SystemClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex flex-col items-end font-mono">
      <div className="text-xl font-black text-sw-blue tracking-tighter leading-none">
        {time.toLocaleTimeString('es-CL', { hour12: false })}
      </div>
      <div className="text-[14px] text-gray-500 font-bold uppercase tracking-widest">
        {time.toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })}
      </div>
    </div>
  );
};

const A11yMenu = ({ a11y, setA11y }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  const fontSizes = [
    { id: 'small', label: 'Pequeño', icon: ZoomOut },
    { id: 'medium', label: 'Normal', icon: Type },
    { id: 'large', label: 'Grande', icon: ZoomIn },
    { id: 'xlarge', label: 'Extra Grande', icon: ZoomIn },
  ];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2.5 rounded-lg transition-all border ${isOpen ? 'bg-sw-blue border-sw-blue text-black shadow-[0_0_15px_rgba(0,168,255,0.4)]' : 'bg-black/40 border-gray-800 text-sw-blue hover:border-sw-blue'}`}
        title="Opciones de Accesibilidad"
      >
        <Accessibility size={20} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              key="a11y-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" 
              onClick={() => setIsOpen(false)}
            ></motion.div>
            <motion.div 
              key="a11y-menu"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-72 panel-glass rounded-2xl border border-sw-blue/30 shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-[70] overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 bg-sw-blue/5">
                <h3 className="text-[14px] font-bold uppercase tracking-[0.2em] text-sw-blue">Centro de Accesibilidad</h3>
              </div>

              <div className="p-4 space-y-6">
                {/* Visual Modes */}
                <div className="space-y-3">
                  <p className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Modos Visuales</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setA11y({...a11y, darkMode: !a11y.darkMode})}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${a11y.darkMode ? 'bg-sw-yellow/10 border-sw-yellow text-sw-yellow' : 'bg-white/5 border-gray-800 text-gray-400'}`}
                    >
                      {a11y.darkMode ? <Moon size={18} /> : <Sun size={18} />}
                      <span className="text-[14px] font-bold uppercase tracking-tighter">{a11y.darkMode ? 'Modo Oscuro' : 'Modo Claro'}</span>
                    </button>
                    <button 
                      onClick={() => setA11y({...a11y, highContrast: !a11y.highContrast})}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${a11y.highContrast ? 'bg-sw-blue/10 border-sw-blue text-sw-blue' : 'bg-white/5 border-gray-800 text-gray-400'}`}
                    >
                      <Zap size={18} />
                      <span className="text-[14px] font-bold uppercase tracking-tighter">Alto Contraste</span>
                    </button>
                  </div>
                </div>

                {/* Font Size */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Tamaño de Texto</p>
                    <button 
                      onClick={() => setA11y({...a11y, fontSize: 'medium'})}
                      className="text-[14px] font-bold text-sw-blue uppercase tracking-widest hover:underline"
                    >
                      Restablecer
                    </button>
                  </div>
                  <div className="flex bg-black/40 p-1 rounded-xl border border-gray-800">
                    {fontSizes.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => setA11y({...a11y, fontSize: size.id})}
                        title={size.label}
                        className={`flex-1 flex justify-center py-2 rounded-lg transition-all ${a11y.fontSize === size.id ? 'bg-sw-blue text-black' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        <size.icon size={16} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Motion */}
                <div className="space-y-3">
                  <p className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Rendimiento</p>
                  <button 
                    onClick={() => setA11y({...a11y, reduceMotion: !a11y.reduceMotion})}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${a11y.reduceMotion ? 'bg-sw-red/10 border-sw-red text-sw-red' : 'bg-white/5 border-gray-800 text-gray-400'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Zap size={18} className={a11y.reduceMotion ? 'rotate-180' : ''} />
                      <span className="text-[14px] font-bold uppercase tracking-widest">Reducir Animaciones</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-all ${a11y.reduceMotion ? 'bg-sw-red' : 'bg-gray-700'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${a11y.reduceMotion ? 'left-4.5' : 'left-0.5'}`}></div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-black/60 text-center">
                <p className="text-[14px] text-gray-600 font-bold uppercase tracking-[0.2em]">StarParks Accessibility Protocol</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const LoginView = ({ onLogin }: { onLogin: () => void }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-black">
      <div className="stars"></div>
      <div className="twinkling"></div>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 panel-glass p-12 rounded-2xl border border-sw-blue/30 shadow-[0_0_50px_rgba(0,168,255,0.15)] flex flex-col items-center max-w-md w-full mx-4"
      >
        <div className="w-20 h-20 bg-sw-yellow rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(255,232,31,0.5)] mb-6">
          <Zap size={40} className="text-black fill-black" />
        </div>
        <h1 className="text-4xl font-black tracking-tighter sw-title-font leading-none text-white mb-2 text-center">STARPARKS</h1>
        <p className="text-[14px] text-sw-yellow font-bold uppercase tracking-[0.3em] mb-12 text-center">Carwash Pro V1</p>
        
        <button 
          onClick={onLogin}
          className="w-full btn-jedi py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 text-[14px] transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,168,255,0.2)]"
        >
          <Users size={20} />
          ACCESO CON GOOGLE
        </button>
        
        <p className="mt-8 text-[14px] text-gray-500 font-bold uppercase tracking-widest text-center">
          Solo personal autorizado. El acceso requiere credenciales de la República.
        </p>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState('pos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [longShiftNotify, setLongShiftNotify] = useState(false);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);

  // Auth State
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(sessionStorage.getItem('impersonatedUserId'));
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Data State
  const [jobs, setJobs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [shiftsAudit, setShiftsAudit] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>({
    loyalty: { enabled: true, requiredVisits: 6, rewardType: 'free_wash', rewardDiscount: 100 }
  });
  
  // UI State
  const [toast, setToast] = useState<any>(null);
  const [a11y, setA11y] = useState({ darkMode: true, highContrast: false, reduceMotion: false, fontSize: 'medium' });
  const [clientModalId, setClientModalId] = useState<string | null>(null);
  const [serviceModalId, setServiceModalId] = useState<string | null>(null);
  const [userModalId, setUserModalId] = useState<string | null>(null);
  const [showUserCreateModal, setShowUserCreateModal] = useState(false);
  const [inventoryModalId, setInventoryModalId] = useState<any>(null); // {id, type: 'raw' | 'store'}
  const [isShiftsLoaded, setIsShiftsLoaded] = useState(false);

  const [shiftElapsed, setShiftElapsed] = useState(0);

  // Current Shift
  const currentShift = useMemo(() => shifts.find(s => s.status === 'open'), [shifts]);

  useEffect(() => {
    if (!currentShift?.openedAt) {
      setShiftElapsed(0);
      return;
    }
    const timer = setInterval(() => {
      setShiftElapsed(Date.now() - currentShift.openedAt);
    }, 1000);
    setShiftElapsed(Date.now() - currentShift.openedAt);
    return () => clearInterval(timer);
  }, [currentShift]);

  const formatShiftTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Modal State
  const [detailModalJobId, setDetailModalJobId] = useState<string | null>(null);
  const [storeModalJobId, setStoreModalJobId] = useState<string | null>(null);
  const [checkoutModalJobId, setCheckoutModalJobId] = useState<string | null>(null);
  const [cancelJobId, setCancelJobId] = useState<string | null>(null);
  const [confirmReadyJobId, setConfirmReadyJobId] = useState<string | null>(null);
  const [confirmWashJobId, setConfirmWashJobId] = useState<string | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('');
  const [smsNotificationJobId, setSmsNotificationJobId] = useState<string | null>(null);
  const [smsCountdown, setSmsCountdown] = useState(10);
  
  // Shift Modals State
  const [showCashMovementModal, setShowCashMovementModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showZReportModal, setShowZReportModal] = useState<any>(null); // holds the shift object

  useEffect(() => {
    if (currentShift && isAuthReady && currentUser) {
      const FOUR_HOURS = 4 * 60 * 60 * 1000;
      const THIRTY_MINUTES = 30 * 60 * 1000;
      
      const checkLongShift = () => {
        const isOwner = currentShift.openedBy === (currentUser.email || currentUser.id);
        if (!isOwner) return;

        const now = Date.now();
        const elapsed = now - currentShift.openedAt;

        if (elapsed >= FOUR_HOURS) {
          if (!lastNotificationTime || (now - lastNotificationTime >= THIRTY_MINUTES)) {
            setLongShiftNotify(true);
            setLastNotificationTime(now);
            
            // Auto close after 5 seconds
            setTimeout(() => {
              setLongShiftNotify(false);
            }, 5000);
          }
        }
      };

      const interval = setInterval(checkLongShift, 60000); // Check every minute
      checkLongShift();
      return () => clearInterval(interval);
    } else {
      setLongShiftNotify(false);
      setLastNotificationTime(0);
    }
  }, [currentShift, isAuthReady, currentUser, lastNotificationTime]);

  useEffect(() => {
    if (isShiftsLoaded && currentShift) {
      setShowOpenShiftModal(false);
    }
  }, [currentShift, isShiftsLoaded]);

  // --- Helpers ---
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const logSystemAction = async (action: string, details: string, approvedBy?: string) => {
    try {
      const logId = `log_${Date.now()}`;
      await setDoc(doc(db, 'system_logs', logId), {
        id: logId,
        timestamp: Date.now(),
        action,
        details,
        operatorId: currentUser?.email || currentUser?.id || 'system',
        operatorName: currentUser?.name || 'Sistema',
        approvedBy: approvedBy || null
      });
    } catch (e) {
      console.error('Error logging action:', e);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Autenticación exitosa', 'success');
    } catch (error: any) {
      console.error(error);
      showToast('Error al iniciar sesión: ' + error.message, 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      localStorage.removeItem('shiftStart'); // Reset shift on logout
      showToast('Sesión cerrada', 'info');
    } catch (error: any) {
      showToast('Error al cerrar sesión', 'error');
    }
  };

  const addTimelineEvent = async (jobId: string, status: string) => {
    if (!hasPermission('write_workshop')) {
      showToast('No tiene permisos para modificar el taller', 'error');
      return;
    }
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    try {
      const updatedTimeline = [...job.timeline, { status, timestamp: Date.now(), workerId: currentUser?.id }];
      const isValidStatus = STATUS_FLOW.includes(status);
      const updateData: any = { ...job, timeline: updatedTimeline };
      if (isValidStatus) {
        updateData.status = status;
      }
      await setDoc(doc(db, 'jobs', jobId), updateData);
    } catch (e) {
      console.error(e);
    }
  };

  const hasPermission = (permissionId: string) => {
    if (!currentUser) return false;
    if (currentUser.email === 'inversioneselcactus@gmail.com' || currentUser.email === 'daelpaso.digital@gmail.com') return true;
    
    // Check dynamic permissions first
    if (currentUser.permissions && currentUser.permissions[permissionId] !== undefined) {
      return currentUser.permissions[permissionId];
    }

    // Fallback to role-based defaults
    const defaults: any = {
      'write_pos': ['Admin', 'Cajero'],
      'write_workshop': ['Admin', 'Operario'],
      'manage_shifts': ['Admin', 'Cajero'],
      'view_reports': ['Admin', 'Visualizador'],
      'edit_inventory': ['Admin'],
      'edit_pricing': ['Admin']
    };

    return defaults[permissionId]?.includes(currentUser.role) || currentUser.role === 'Admin';
  };

  const advanceJobStatus = async (jobId: string, currentStatus: string) => {
    if (!hasPermission('write_workshop')) {
      showToast('No tiene permisos para modificar el taller', 'error');
      return;
    }
    
    if (currentStatus === 'Cola') {
      setConfirmWashJobId(jobId);
      return;
    }
    
    if (currentStatus === 'Lavando') {
      setConfirmReadyJobId(jobId);
      return;
    }

    const currentIndex = STATUS_FLOW.indexOf(currentStatus);
    if (currentIndex === -1) return;
    
    if (currentStatus === 'Listo') {
      setCheckoutModalJobId(jobId);
      return;
    }
    
    const nextStatus = STATUS_FLOW[currentIndex + 1];
    await addTimelineEvent(jobId, nextStatus);
    showToast(`Vehículo movido a ${nextStatus}`, 'success');
  };

  const confirmWashStatus = async () => {
    if (!hasPermission('write_workshop')) {
      showToast('No tiene permisos para modificar el taller', 'error');
      return;
    }
    if (!confirmWashJobId) return;
    if (!selectedOperatorId) {
      showToast('Debe seleccionar un operador para iniciar el lavado', 'error');
      return;
    }

    const job = jobs.find(j => j.id === confirmWashJobId);
    if (!job) return;

    try {
      const now = Date.now();
      const updatedTimeline = [...job.timeline, { 
        status: 'Lavando', 
        timestamp: now, 
        workerId: selectedOperatorId 
      }];
      
      const operator = users.find(u => u.id === selectedOperatorId) || 
                       [{ id: 'op1', name: 'Operador 1' }, { id: 'op2', name: 'Operador 2' }].find(o => o.id === selectedOperatorId);

      await setDoc(doc(db, 'jobs', confirmWashJobId), {
        ...job,
        status: 'Lavando',
        workerId: selectedOperatorId,
        workerName: operator?.name || 'Operador',
        timeline: updatedTimeline
      });
      
      setConfirmWashJobId(null);
      setSelectedOperatorId('');
      showToast(`Vehículo movido a Lavando bajo supervisión de ${operator?.name || 'Operador'}`, 'success');
    } catch (error: any) {
      showToast('Error al actualizar estado', 'error');
    }
  };

  const confirmReadyStatus = async () => {
    if (!hasPermission('write_workshop')) {
      showToast('No tiene permisos para modificar el taller', 'error');
      return;
    }
    if (!confirmReadyJobId) return;
    const job = jobs.find(j => j.id === confirmReadyJobId);
    if (!job) return;

    try {
      const updatedTimeline = [...job.timeline, { status: 'Listo', timestamp: Date.now(), workerId: currentUser?.id }];
      await setDoc(doc(db, 'jobs', confirmReadyJobId), {
        ...job,
        status: 'Listo',
        timeline: updatedTimeline
      });
      setConfirmReadyJobId(null);
      setSmsNotificationJobId(job.id);
      setSmsCountdown(10);
      showToast(`Vehículo movido a Listo`, 'success');
    } catch (error: any) {
      showToast('Error al actualizar estado', 'error');
    }
  };

  const handleConfirmCancelJob = async (jobId: string, pin: string, reason: string) => {
    if (pin !== '1124') {
      showToast('PIN de Administrador Incorrecto', 'error');
      return;
    }

    const job = jobs.find(j => j.id === jobId);
    if (!job) {
      setCancelJobId(null);
      return;
    }

    try {
      const now = Date.now();
      const txId = `tx_cancel_${now}`;
      
      // 1. Log in transactions if shift is open
      if (currentShift?.status === 'open') {
        await setDoc(doc(db, 'transactions', txId), {
          id: txId,
          shiftId: currentShift.id,
          type: 'expense',
          amount: 0,
          reason: `RETIRO/CANCELACIÓN: ${job.plate} - ${reason}`,
          timestamp: now,
          userId: currentUser?.id || 'system',
          jobId: job.id,
          isCancellation: true
        });
      }

      // 2. Mark job as Anulado
      await updateDoc(doc(db, 'jobs', jobId), { 
        status: 'Anulado',
        isActive: false,
        active: false,
        cancelledAt: now,
        cancelledBy: currentUser?.email || currentUser?.id || 'system',
        cancelReason: reason,
        timeline: [
          ...(job.timeline || []),
          {
            status: 'Anulado',
            timestamp: now,
            workerId: currentUser?.id || 'system',
            note: `Retirado de Cola. Motivo: ${reason}`
          }
        ]
      });

      // 3. Log System Action
      logSystemAction(
        'RETIRO_VEHICULO',
        `Folio: ${jobId} | Patente: ${job.plate} | Motivo: ${reason}`,
        currentUser?.name || currentUser?.displayName
      );

      setCancelJobId(null);
      showToast('Vehículo retirado exitosamente', 'success');
    } catch (error: any) {
      console.error(error);
      showToast('Error al retirar vehículo', 'error');
    }
  };

  useEffect(() => {
    let timer: any;
    if (smsNotificationJobId && smsCountdown > 0) {
      timer = setInterval(() => setSmsCountdown(prev => prev - 1), 1000);
    } else if (smsNotificationJobId && smsCountdown === 0) {
      showToast('SMS enviado automáticamente', 'success');
      setSmsNotificationJobId(null);
    }
    return () => timer && clearInterval(timer);
  }, [smsNotificationJobId, smsCountdown]);

  // --- Effects ---
  const cleanupPerformed = React.useRef(false);
  useEffect(() => {
    if (cleanupPerformed.current || !isAuthReady || !firebaseUser) return;
    cleanupPerformed.current = true;
    
    const runCleanup = async () => {
      const targetIds = [
        'TKT-260512-00002',
        'TKT-260512-00001',
        'TRX-1778515626735-232',
        'TKT-260511-2117',
        'TKT-260511-5224',
        'TKT-260511-6034',
        'TKT-260512-1945',
        'TRX-1778551706549-416',
        'TRX-1778551719237-948',
        'VST-260512-00001',
        'VST-260512-00002'
      ];
      const collections = ['jobs', 'transactions', 'shifts', 'clients', 'shifts_audit', 'calendarEvents'];
      
      try {
        let deletedCount = 0;
        for (const col of collections) {
          for (const id of targetIds) {
            const docRef = doc(db, col, id);
            const d = await getDoc(docRef);
            if (d.exists()) {
              await deleteDoc(docRef);
              deletedCount++;
            }
          }
        }

        // Reset Ticket Counters to restart sequence
        await setDoc(doc(db, 'settings', 'ticket_counters'), { TKT: 0, VST: 0 });

        if (deletedCount > 0) {
          showToast(`Se eliminaron ${deletedCount} registros y se reinició la secuencia de tickets.`, 'success');
        }
        console.log('Robust cleanup and counter reset finished, deleted:', deletedCount);
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    };
    runCleanup();
  }, [isAuthReady, firebaseUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        // Check if user exists in DB or is the default admin
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setCurrentUser({ id: user.uid, ...userDoc.data() });
        } else if (user.email === 'inversioneselcactus@gmail.com' || user.email === 'starparkiquique@gmail.com' || user.email === 'daelpaso.digital@gmail.com') {
          // Bootstrap default admin
          let rut = '11111111-1';
          let name = user.displayName || 'Admin Principal';

          if (user.email === 'starparkiquique@gmail.com') {
            rut = '22222222-2';
            name = user.displayName || 'StarPark Iquique';
          } else if (user.email === 'daelpaso.digital@gmail.com') {
            rut = '33333333-3';
            name = user.displayName || 'Braulio Admin';
          }

          const adminData = {
            id: user.uid,
            rut: rut,
            name: name,
            role: 'Admin',
            pin: '3142', // Changing default pin for new superadmin
            active: true,
            email: user.email
          };
          await setDoc(doc(db, 'users', user.uid), adminData);
          setCurrentUser(adminData);
        } else {
          // Block login for unregistered users
          await auth.signOut();
          setFirebaseUser(null);
          setCurrentUser(null);
          alert('ACCESO DENEGADO.\n\nSu cuenta de Google no está autorizada ni registrada en StarParks CarWash Pro.\n\nContáctese con la administración a inversioneselcactus@gmail.com o a Daelpaso para solicitar su incorporación al sistema.');
        }
      } else {
        setFirebaseUser(null);
        setCurrentUser(null);
        setImpersonatedUserId(null);
        sessionStorage.removeItem('impersonatedUserId');
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Handle Impersonation
  useEffect(() => {
    if (impersonatedUserId && users.length > 0) {
      const targetUser = users.find((u: any) => u.id === impersonatedUserId);
      if (targetUser) {
        setCurrentUser(targetUser);
      }
    } else if (!impersonatedUserId && firebaseUser && users.length > 0) {
      // Revert to real user if impersonation cleared
      const realUser = users.find((u: any) => u.id === firebaseUser.uid);
      if (realUser) setCurrentUser(realUser);
    }
  }, [impersonatedUserId, users, firebaseUser]);

  useEffect(() => {
    if (!isAuthReady || !firebaseUser) return;

    // Subscriptions to Firestore
    
    // 1. JOBS: Limit to 1000 to ensure plenty of capacity.
    const jobsQuery = query(collection(db, 'jobs'), orderBy('entryDate', 'desc'), limit(1000));
    const unsubJobs = onSnapshot(jobsQuery, (snapshot) => {
      setJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'jobs'));

    // 2. TRANSACTIONS: Limit to last 500
    const transQuery = query(collection(db, 'transactions'), orderBy('date', 'desc'), limit(500));
    const unsubTransactions = onSnapshot(transQuery, (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'transactions'));

    // 3. SHIFTS: Limit to last 100
    const shiftsQuery = query(collection(db, 'shifts'), orderBy('openedAt', 'desc'), limit(100));
    const unsubShifts = onSnapshot(shiftsQuery, (snapshot) => {
      setShifts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsShiftsLoaded(true);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'shifts'));

    // 4. USERS, SERVICES, CATEGORIES, STORE, RAW: Usually small, but good to keep clean
    const clientsQuery = query(collection(db, 'clients'), orderBy('date', 'desc'), limit(500));
    const unsubClients = onSnapshot(clientsQuery, (snapshot) => {
      setClients(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'clients'));

    const unsubUsers = onSnapshot(query(collection(db, 'users'), limit(100)), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    const unsubServices = onSnapshot(query(collection(db, 'services'), limit(200)), (snapshot) => {
      setServices(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'services'));

    const unsubStore = onSnapshot(query(collection(db, 'storeProducts'), limit(200)), (snapshot) => {
      setStoreProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'storeProducts'));

    const unsubRaw = onSnapshot(query(collection(db, 'rawMaterials'), limit(200)), (snapshot) => {
      setRawMaterials(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'rawMaterials'));

    const unsubCategories = onSnapshot(query(collection(db, 'categories'), limit(50)), (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'categories'));

    // 5. AUDIT: Only for admins, limited to last 100
    let unsubAudit = () => {};
    if (currentUser?.role === 'Admin') {
      const auditQuery = query(collection(db, 'shifts_audit'), orderBy('timestamp', 'desc'), limit(100));
      unsubAudit = onSnapshot(auditQuery, (snapshot) => {
        setShiftsAudit(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'shifts_audit'));
    }

    // 6. CALENDAR & SETTINGS
    const calendarQuery = query(collection(db, 'calendarEvents'), orderBy('date', 'desc'), limit(150));
    const unsubCalendar = onSnapshot(calendarQuery, (snapshot) => {
      setCalendarEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'calendarEvents'));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSystemSettings(docSnap.data());
      } else {
        const defaultSettings = { loyalty: { enabled: true, requiredVisits: 6, rewardType: 'free_wash', rewardDiscount: 100 } };
        setDoc(doc(db, 'settings', 'global'), defaultSettings).catch(console.error);
        setSystemSettings(defaultSettings);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/global'));

    return () => {
      unsubJobs(); 
      unsubClients(); 
      unsubUsers(); 
      unsubServices(); 
      unsubStore(); 
      unsubRaw(); 
      unsubShifts(); 
      unsubTransactions(); 
      unsubCategories(); 
      if (unsubAudit) unsubAudit(); 
      unsubCalendar();
      unsubSettings();
    };
  }, [isAuthReady, firebaseUser, currentUser?.role]);

  // Unified Master Data Management (Initialization)
  useEffect(() => {
    if (!isAuthReady || !currentUser || currentUser.role !== 'Admin') return;

    const runMasterDataManagement = async () => {
      const lastSync = localStorage.getItem('LAST_MASTER_DATA_SYNC');
      
      // Initial Seed: Only if everything is totally empty and never synced
      if (services.length === 0 && storeProducts.length === 0 && !lastSync) {
        try {
          showToast('Inicializando sistema...', 'info');
          for (const srv of INITIAL_SERVICES) await setDoc(doc(db, 'services', srv.id), srv);
          for (const prod of INITIAL_STORE_PRODUCTS) await setDoc(doc(db, 'storeProducts', prod.id), prod);
          for (const raw of INITIAL_RAW_MATERIALS) await setDoc(doc(db, 'rawMaterials', raw.id), raw);
          for (const cat of INITIAL_CATEGORIES) await setDoc(doc(db, 'categories', cat.id), cat);
          localStorage.setItem('LAST_MASTER_DATA_SYNC', Date.now().toString());
          showToast('Datos maestros cargados.', 'success');
        } catch (e) { console.error('Initial seed failed:', e); }
      }

      // Migration: Create specific operator users
      const newOperators = [
        {
          email: 'navarrorail636@gmail.com',
          name: 'Raul Navarro',
          rut: '18000000-3',
          phone: '999999999',
          role: 'Operario'
        },
        {
          email: 'amoya0150@gmail.com',
          name: 'Alonso Moya',
          rut: '19999999-9',
          phone: '988888888',
          role: 'Operario'
        }
      ];

      for (const op of newOperators) {
        // Look for existing user by email
        const existingOp = users.find(u => u.email === op.email);
        if (!existingOp) {
          try {
            // Use email as a deterministic ID or generate one
            const opId = `op_${op.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
            await setDoc(doc(db, 'users', opId), {
              ...op,
              id: opId,
              active: true,
              createdAt: serverTimestamp()
            });
            console.log(`[Migration] Created operator: ${op.name}`);
          } catch (err) {
            console.error(`[Migration] Failed to create operator ${op.name}:`, err);
          }
        }
      }

      // Migration: Remove obsolete services
      const obsoleteServiceIds = ['srv_ext_simple', 'srv_full_cera'];
      const obsoleteNames = ['LAVADO EXTERIOR SIMPLE', 'LAVADO FULL + CERA'];
      
      for (const srv of services) {
        if (obsoleteServiceIds.includes(srv.id) || obsoleteNames.includes((srv.name || '').toUpperCase())) {
          try {
            await deleteDoc(doc(db, 'services', srv.id));
            console.log(`[Migration] Removed obsolete service: ${srv.name} (${srv.id})`);
          } catch (err) {
            console.error(`[Migration] Failed to remove ${srv.id}:`, err);
          }
        }
      }

      // Migration: History Cleanup (Operations, Transactions, Shifts)
      const CLEANUP_KEY = 'HISTORY_CLEANUP_2026_05_06';
      if (!localStorage.getItem(CLEANUP_KEY)) {
        try {
          showToast('Limpiando historial de operaciones...', 'info');
          const collectionsToClean = ['jobs', 'transactions', 'shifts', 'shifts_audit', 'calendarEvents'];
          
          for (const colName of collectionsToClean) {
            const snapshot = await getDocs(collection(db, colName));
            const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, colName, document.id)));
            await Promise.all(deletePromises);
            console.log(`[Cleanup] Cleared collection: ${colName}`);
          }
          
          localStorage.setItem(CLEANUP_KEY, 'true');
          showToast('Historial de operaciones eliminado con éxito.', 'success');
        } catch (err) {
          console.error('[Cleanup] Failed to clear history:', err);
          showToast('Error al limpiar historial.', 'error');
        }
      }

      // Migration: Move specific services to Complementaries if they are miscategorized
      const MisplacedServiceNames = [
        'LAVADO DE MOTOR', 
        'LIMPIEZA DE TAPIZ FULL', 
        'PULIDO DE FOCOS'
      ];
      
      const servicesToFix = services.filter(s => {
        const name = (s.name || '').toUpperCase();
        return MisplacedServiceNames.includes(name) && (s.type === 'Servicio' || !s.type);
      });

      if (servicesToFix.length > 0) {
        try {
          for (const s of servicesToFix) {
            await updateDoc(doc(db, 'services', s.id), { 
              type: 'Adicional', 
              categoryId: 'ALL' // Make them available for all vehicle types as they are add-ons
            });
          }
          console.log(`[Migration] Fixed ${servicesToFix.length} misplaced services.`);
        } catch (err) {
          console.error('[Migration] Failed to fix services:', err);
        }
      }
    };

    // Delay initial run slightly to ensure state is populated from onSnapshot
    const timeout = setTimeout(runMasterDataManagement, 3000);
    return () => clearTimeout(timeout);
  }, [isAuthReady, currentUser?.id, services.length === 0, storeProducts.length === 0]); // Re-run if empty or user changes

  useEffect(() => {
    const body = document.body;
    body.classList.toggle('light-mode', !a11y.darkMode);
    body.classList.toggle('high-contrast', a11y.highContrast);
    body.classList.toggle('reduce-motion', a11y.reduceMotion);
    
    // Font Size Classes
    body.classList.remove('font-size-small', 'font-size-medium', 'font-size-large', 'font-size-xlarge');
    body.classList.add(`font-size-${a11y.fontSize}`);
  }, [a11y]);

  const navItems = [
    { id: 'pos', label: 'Punto de Venta', icon: Store, permission: null },
    { id: 'taller', label: 'Taller / Kanban', icon: Wrench, permission: null },
    { id: 'clientes', label: 'Clientes', icon: Users, permission: null },
    { id: 'calendario', label: 'Calendario', icon: Calendar, permission: null },
    { id: 'hist', label: 'Historial', icon: History, permission: null },
    { id: 'reportes', label: 'Reportes', icon: TrendingUp, permission: 'view_reports' },
    { id: 'config', label: 'Configuraciones', icon: Settings, permission: null },
  ];

  if (!isAuthReady) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-sw-blue font-mono">Iniciando Sistemas...</div>;
  }

  if (!currentUser) {
    return (
      <>
        <AnimatePresence>
          {toast && (
            <motion.div 
              key="toast-login"
              initial={{ opacity: 0, y: -50, x: '-50%' }}
              animate={{ opacity: 1, y: 20, x: '-50%' }}
              exit={{ opacity: 0, y: -50, x: '-50%' }}
              className={`fixed top-0 left-1/2 z-[200] px-6 py-3 rounded-xl border shadow-2xl flex items-center gap-3 backdrop-blur-md min-w-[300px] ${
                toast.type === 'success' ? 'bg-sw-green/20 border-sw-green text-sw-green' :
                toast.type === 'error' ? 'bg-sw-red/20 border-sw-red text-sw-red' :
                'bg-sw-blue/20 border-sw-blue text-sw-blue'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle2 size={20} /> : 
               toast.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
              <span className="font-bold uppercase tracking-widest text-sm">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <LoginView onLogin={handleGoogleLogin} />
      </>
    );
  }

  const resetDatabase = async () => {
    if (!window.confirm('¿Está ABSOLUTAMENTE SEGURO de querer eliminar todos los datos de clientes y vehículos? Esta acción es irreversible y reseteará el ERP para un nuevo inicio.')) return;
    try {
      showToast('Iniciando reseteo de órbita...', 'info');
      // Delete Jobs
      for (const job of jobs) {
        await deleteDoc(doc(db, 'jobs', job.id));
      }
      // Delete Clients
      for (const client of clients) {
        await deleteDoc(doc(db, 'clients', client.id));
      }
      showToast('Base de datos purgada. Iniciando desde cero.', 'success');
      window.location.reload();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, 'jobs/clients');
    }
  };

  const syncMasterData = async () => {
    if (!window.confirm('¿Desea restablecer el Tarifario, Insumos y Categorías con los Datos Maestros del sistema? Esto eliminará cualquier personalización actual de precios y productos.')) return;
    try {
      showToast('Sincronizando con Datos Maestros...', 'info');
      // Delete old
      for (const s of services) await deleteDoc(doc(db, 'services', s.id));
      for (const c of categories) await deleteDoc(doc(db, 'categories', c.id));
      for (const r of rawMaterials) await deleteDoc(doc(db, 'rawMaterials', r.id));
      for (const p of storeProducts) await deleteDoc(doc(db, 'storeProducts', p.id));

      // Seed new
      for (const srv of INITIAL_SERVICES) await setDoc(doc(db, 'services', srv.id), srv);
      for (const prod of INITIAL_STORE_PRODUCTS) await setDoc(doc(db, 'storeProducts', prod.id), prod);
      for (const raw of INITIAL_RAW_MATERIALS) await setDoc(doc(db, 'rawMaterials', raw.id), raw);
      for (const cat of INITIAL_CATEGORIES) await setDoc(doc(db, 'categories', cat.id), cat);

      showToast('Sincronización completada con éxito', 'success');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'master_data');
      showToast('Error en la sincronización', 'error');
    }
  };

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Background Elements */}
      <div className="stars"></div>
      <div className="twinkling"></div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            key="toast-main"
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className={`fixed top-0 left-1/2 z-[200] px-6 py-3 rounded-xl border shadow-2xl flex items-center gap-3 backdrop-blur-md min-w-[300px] ${
              toast.type === 'success' ? 'bg-sw-green/20 border-sw-green text-sw-green' :
              toast.type === 'error' ? 'bg-sw-red/20 border-sw-red text-sw-red' :
              'bg-sw-blue/20 border-sw-blue text-sw-blue'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : 
             toast.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
            <span className="font-bold uppercase tracking-widest text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="h-20 panel-glass border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors lg:hidden"
          >
            <Menu size={24} />
          </button>
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setActiveTab('pos')}
            title="Ir a Inicio (POS)"
          >
            <div className="w-10 h-10 bg-sw-yellow rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,232,31,0.5)] group-hover:scale-110 transition-transform">
              <Zap size={24} className="text-black fill-black" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter sw-title-font leading-none sw-title group-hover:text-white transition-colors">STARPARKS</h1>
              <p className="text-[14px] text-sw-yellow font-bold uppercase tracking-[0.3em] mt-0.5">Carwash Pro V1</p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <SystemClock />
          
          <div className="flex items-center gap-4 border-l border-gray-800 pl-8">
            <div className="text-right">
              <div className="text-sm font-bold text-white uppercase tracking-widest">{currentUser.name}</div>
              <div className="text-[14px] text-sw-blue font-bold uppercase tracking-widest">{currentUser.role}</div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2.5 rounded-lg bg-sw-red/10 border border-sw-red/30 text-sw-red hover:bg-sw-red hover:text-white transition-all"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 ${isSidebarCollapsed ? 'w-20' : 'w-72'} panel-glass border-r border-white/10 z-[60] transform transition-all duration-300 lg:sticky lg:top-0 lg:h-full lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Collapsible Toggle Tab - Positioned outside the inner padding container to avoid clipping */}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-6 top-[80%] -translate-y-1/2 w-6 h-24 bg-sw-blue/20 border border-sw-blue/40 border-l-0 rounded-r-2xl flex items-center justify-center text-sw-blue hover:bg-sw-blue hover:text-black transition-all z-[70] group hidden lg:flex shadow-[10px_0_20px_rgba(0,168,255,0.2)] backdrop-blur-md"
            title={isSidebarCollapsed ? "Expandir Menú" : "Colapsar Menú"}
          >
            {isSidebarCollapsed ? <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" /> : <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />}
          </button>

          <div className="p-4 flex flex-col h-full overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-10 lg:hidden">
              {!isSidebarCollapsed && <span className="sw-title-font text-sw-yellow font-bold tracking-widest">MENÚ IMPERIAL</span>}
              <button onClick={() => setIsSidebarOpen(false)}><X size={24} /></button>
            </div>

            <nav className="space-y-2 flex-1">
              {navItems.map((item) => {
                const isConfigModule = ['boveda', 'tarifas', 'usuarios'].includes(item.id);
                const isSuperAdmin = currentUser?.email === 'inversioneselcactus@gmail.com' || currentUser?.email === 'daelpaso.digital@gmail.com';
                const isAllowed = isSuperAdmin || (!isConfigModule && (!item.permission || hasPermission(item.permission)));
                
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                    disabled={!isAllowed}
                    title={isSidebarCollapsed ? item.label : ''}
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start gap-4 px-4'} py-3.5 rounded-xl font-ui font-bold uppercase tracking-widest text-sm transition-all border ${
                      activeTab === item.id 
                        ? 'bg-sw-blue/10 border-sw-blue text-sw-blue shadow-[0_0_15px_rgba(0,168,255,0.1)]' 
                        : isAllowed 
                          ? 'border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300' 
                          : 'border-transparent text-gray-800 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <item.icon size={20} className="shrink-0" />
                    {!isSidebarCollapsed && <span className="text-left flex-1">{item.label}</span>}
                    {!isAllowed && !isSidebarCollapsed && <Shield size={14} className="ml-auto text-sw-red" />}
                    
                    {/* Active Indicator Bar */}
                    {activeTab === item.id && (
                      <motion.div 
                        layoutId="activeIndicator"
                        className="absolute left-0 w-1 h-8 bg-sw-blue rounded-r-full shadow-[0_0_10px_rgba(0,168,255,0.8)]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto pt-6 border-t border-gray-800 relative">
              <div className={`bg-black/40 ${isSidebarCollapsed ? 'p-2' : 'p-4'} rounded-xl border border-gray-800 transition-all`}>
                <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} mb-4`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${currentShift ? 'bg-sw-green animate-pulse' : 'bg-gray-600'} shrink-0`}></div>
                  {!isSidebarCollapsed && <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Gestión de Turno</span>}
                </div>
                
                <div className="mb-4">
                  {!isSidebarCollapsed && (
                    <div className="text-sm text-gray-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                      <Clock size={14} /> Tiempo Transcurrido
                    </div>
                  )}
                  <div className={`${isSidebarCollapsed ? 'text-[14px]' : 'text-xl'} font-mono font-black ${currentShift ? 'text-sw-green' : 'text-gray-600'} tracking-wider text-center`}>
                    {currentShift ? (isSidebarCollapsed ? formatShiftTime(shiftElapsed).split(':').slice(0,2).join(':') : formatShiftTime(shiftElapsed)) : '--:--:--'}
                  </div>
                  {!isSidebarCollapsed && currentShift && (
                    <div className="text-sm text-gray-500 font-mono mt-1 text-center">
                      Inicio: {new Date(currentShift.openedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      {currentShift.operatorName && <span className="block text-[14px] text-sw-blue mt-0.5">{currentShift.operatorName}</span>}
                    </div>
                  )}
                </div>

                <div className={`space-y-2 border-t border-gray-800 pt-4 ${isSidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
                  {currentShift ? (
                    <>
                      <button 
                        onClick={() => setShowCashMovementModal(true)}
                        title="Movimiento de Caja"
                        className={`w-full py-2.5 ${isSidebarCollapsed ? 'px-0 justify-center' : 'px-3 justify-center'} rounded-lg bg-sw-blue/10 border border-sw-blue/30 text-sw-blue text-sm font-bold uppercase tracking-widest hover:bg-sw-blue hover:text-black transition-all flex items-center gap-2`}
                      >
                        <DollarSign size={16} className="shrink-0" />
                        {!isSidebarCollapsed && "Mov. de Caja"}
                      </button>
                      <button 
                        onClick={() => setShowCloseShiftModal(true)}
                        title="Cerrar Turno"
                        className={`w-full py-2.5 ${isSidebarCollapsed ? 'px-0 justify-center' : 'px-3 justify-center'} rounded-lg bg-sw-red/10 border border-sw-red/30 text-sw-red text-sm font-bold uppercase tracking-widest hover:bg-sw-red hover:text-white transition-all flex items-center gap-2`}
                      >
                        <LogOut size={16} className="shrink-0" />
                        {!isSidebarCollapsed && "Cerrar Turno"}
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setShowOpenShiftModal(true)}
                      title="Iniciar Turno"
                      className={`w-full py-2.5 ${isSidebarCollapsed ? 'px-0 justify-center' : 'px-3 justify-center'} rounded-lg bg-sw-green/10 border border-sw-green/30 text-sw-green text-sm font-bold uppercase tracking-widest hover:bg-sw-green hover:text-black transition-all flex items-center gap-2`}
                    >
                      <CheckCircle2 size={16} className="shrink-0" />
                      {!isSidebarCollapsed && "Iniciar Turno"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-black/20 rounded-3xl p-1 shadow-[0_0_80px_rgba(0,0,0,0.3)] min-h-full"
            >
              {activeTab === 'pos' && (
                <AuthGuard currentUser={currentUser} hasPermission={hasPermission}>
                  <POSView 
                    jobs={jobs} setJobs={setJobs} 
                    clients={clients} setClients={setClients} 
                    services={services} storeProducts={storeProducts} 
                    categories={categories}
                    showToast={showToast} setActiveTab={setActiveTab} 
                    hasPermission={hasPermission}
                    currentShift={currentShift}
                    systemSettings={systemSettings}
                    setCheckoutModalJobId={setCheckoutModalJobId}
                    currentUser={currentUser}
                  />
                </AuthGuard>
              )}
              {activeTab === 'taller' && (
                <AuthGuard currentUser={currentUser} hasPermission={hasPermission}>
                  <WorkshopView 
                    jobs={jobs} clients={clients} advanceJobStatus={advanceJobStatus} 
                    setStoreModalJobId={setStoreModalJobId} setDetailModalJobId={setDetailModalJobId} 
                    addTimelineEvent={addTimelineEvent}
                    onCancelJob={(jobId: string) => {
                      setDetailModalJobId(jobId);
                      // By setting the detail modal, the user can use the delete button inside it.
                      // However, the user asked for a direct option on the card.
                      // I will implement a separate state to show a quick cancel confirmation
                      // or just leverage the detail modal's existing logic by auto-triggering the delete view?
                      // Actually, let's just make a dedicated cancel state in App.tsx.
                      setCancelJobId(jobId);
                    }}
                    isAdmin={currentUser?.role === 'Admin' || currentUser?.email === 'inversioneselcactus@gmail.com' || currentUser?.email === 'starparkiquique@gmail.com' || currentUser?.email === 'daelpaso.digital@gmail.com'}
                  />
                </AuthGuard>
              )}
              {activeTab === 'clientes' && (
                <AuthGuard currentUser={currentUser} hasPermission={hasPermission}>
                  <ClientsView 
                    clients={clients} 
                    setClients={setClients} 
                    showToast={showToast} 
                    setClientModalId={setClientModalId} 
                    resetDatabase={resetDatabase}
                    isAdmin={currentUser?.role === 'Admin'}
                    systemSettings={systemSettings}
                    categories={categories}
                    jobs={jobs}
                  />
                </AuthGuard>
              )}
              {activeTab === 'calendario' && (
                <AuthGuard currentUser={currentUser} hasPermission={hasPermission}>
                  <CalendarView jobs={jobs} setDetailModalJobId={setDetailModalJobId} />
                </AuthGuard>
              )}
              {activeTab === 'hist' && (
                <AuthGuard currentUser={currentUser} hasPermission={hasPermission}>
                  <div className="space-y-12">
                    <HistoryView jobs={jobs} shifts={shifts} showToast={showToast} setDetailModalJobId={setDetailModalJobId} />
                  </div>
                </AuthGuard>
              )}
              
              {activeTab === 'reportes' && (
                <AuthGuard currentUser={currentUser} requiredPermission="view_reports" hasPermission={hasPermission}>
                  <DailyReportView 
                    jobs={jobs} 
                    clients={clients}
                    transactions={transactions} 
                    shifts={shifts} 
                    onShowZReport={setShowZReportModal} 
                    initialSubTab="ventas"
                    currentUser={currentUser}
                    showToast={showToast}
                    services={services}
                    storeProducts={storeProducts}
                    categories={categories}
                    setServices={setServices}
                    setStoreProducts={setStoreProducts}
                    hasPermission={hasPermission}
                    setServiceModalId={setServiceModalId}
                    systemLogs={systemLogs}
                    logSystemAction={logSystemAction}
                  />
                </AuthGuard>
              )}
              {activeTab === 'config' && (
                <AuthGuard currentUser={currentUser} hasPermission={hasPermission}>
                  <ConfigView 
                    a11y={a11y} 
                    setA11y={setA11y} 
                    showToast={showToast}
                    users={users}
                    setUsers={setUsers}
                    currentUser={currentUser}
                    isAdmin={currentUser?.role === 'Admin' || currentUser?.email === 'inversioneselcactus@gmail.com' || currentUser?.email === 'starparkiquique@gmail.com' || currentUser?.email === 'daelpaso.digital@gmail.com'}
                    setUserModalId={setUserModalId}
                    setShowUserCreateModal={setShowUserCreateModal}
                    hasPermission={hasPermission}
                    impersonatedUserId={impersonatedUserId}
                    realUserEmail={firebaseUser?.email}
                    resetDatabase={resetDatabase}
                    setImpersonatedUserId={(id: string | null) => {
                      if (id) sessionStorage.setItem('impersonatedUserId', id);
                      else sessionStorage.removeItem('impersonatedUserId');
                      setImpersonatedUserId(id);
                      window.location.reload();
                    }}
                    systemSettings={systemSettings}
                    services={services}
                    setServices={setServices}
                    categories={categories}
                    syncMasterData={syncMasterData}
                    rawMaterials={rawMaterials}
                    setRawMaterials={setRawMaterials}
                    storeProducts={storeProducts}
                    setStoreProducts={setStoreProducts}
                    setInventoryModalId={setInventoryModalId}
                    jobs={jobs}
                    transactions={transactions}
                    systemLogs={systemLogs}
                    logSystemAction={logSystemAction}
                  />
                </AuthGuard>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {detailModalJobId && (
          <JobDetailModal 
            key="job-detail-modal"
            jobId={detailModalJobId} 
            jobs={jobs} 
            onClose={() => setDetailModalJobId(null)} 
            advanceJobStatus={advanceJobStatus}
            setStoreModalJobId={setStoreModalJobId}
            addTimelineEvent={addTimelineEvent}
            hasPermission={hasPermission}
            currentUser={currentUser}
            currentShift={currentShift}
          />
        )}
        
        {storeModalJobId && (
          <QuickStoreModal 
            key="quick-store-modal"
            jobId={storeModalJobId} 
            jobs={jobs} setJobs={setJobs} 
            storeProducts={storeProducts} 
            showToast={showToast} 
            onClose={() => setStoreModalJobId(null)} 
            hasPermission={hasPermission}
          />
        )}

        {checkoutModalJobId && (
          <CheckoutModal 
            key="checkout-modal"
            jobId={checkoutModalJobId} 
            jobs={jobs} setJobs={setJobs} 
            currentShift={currentShift}
            showToast={showToast} 
            onClose={() => setCheckoutModalJobId(null)} 
            hasPermission={hasPermission}
            clients={clients}
            systemSettings={systemSettings}
            currentUser={currentUser}
            logSystemAction={logSystemAction}
          />
        )}

        {cancelJobId && (
          <CancelJobModal 
            key="cancel-job-modal"
            jobId={cancelJobId}
            jobs={jobs}
            onClose={() => setCancelJobId(null)}
            onConfirm={handleConfirmCancelJob}
          />
        )}

        {confirmWashJobId && (
          <div 
            key="confirm-wash-overlay"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => { setConfirmWashJobId(null); setSelectedOperatorId(''); }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="panel-glass p-8 rounded-2xl max-w-md w-full border border-sw-yellow/40 shadow-[0_0_50px_rgba(255,232,31,0.15)]"
            >
              <div className="flex items-center gap-3 mb-6 text-sw-yellow">
                <Wrench size={32} className="animate-bounce" />
                <h3 className="sw-title-font font-bold uppercase tracking-widest text-2xl">Iniciar Lavado</h3>
              </div>
              
              <p className="text-gray-300 text-[14px] mb-8 font-bold uppercase tracking-widest bg-sw-yellow/5 p-4 rounded-xl border border-sw-yellow/20">
                Seleccione el operador responsable para la patente: <span className="text-sw-yellow text-xl block mt-1 font-mono">{jobs.find(j => j.id === confirmWashJobId)?.plate}</span>
              </p>

              <div className="space-y-4 mb-8">
                <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest block">Asignar Operador</label>
                <div className="grid grid-cols-1 gap-3">
                  {(users.filter((u: any) => u.role === 'Operario').length > 0 ? users.filter((u: any) => u.role === 'Operario') : [
                    { id: 'op1', name: 'Operador 1' },
                    { id: 'op2', name: 'Operador 2' }
                  ]).map((op: any) => (
                    <button
                      key={op.id}
                      onClick={() => setSelectedOperatorId(op.id)}
                      className={`py-4 px-6 rounded-xl border-2 transition-all flex justify-between items-center group ${
                        selectedOperatorId === op.id 
                          ? 'bg-sw-yellow/20 border-sw-yellow text-sw-yellow shadow-[0_0_20px_rgba(255,232,31,0.2)]' 
                          : 'bg-black/40 border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Users size={20} className={selectedOperatorId === op.id ? 'text-sw-yellow' : 'text-gray-600'} />
                        <span className="font-bold uppercase tracking-widest">{op.name}</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedOperatorId === op.id ? 'border-sw-yellow bg-sw-yellow text-black' : 'border-gray-800'
                      }`}>
                        {selectedOperatorId === op.id && <CheckCircle2 size={14} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => { setConfirmWashJobId(null); setSelectedOperatorId(''); }}
                  className="flex-1 py-4 rounded-xl border border-gray-700 text-gray-400 hover:bg-white/5 transition-all font-bold uppercase tracking-widest text-[14px]"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmWashStatus}
                  disabled={!selectedOperatorId}
                  className={`flex-1 py-4 rounded-xl font-bold uppercase tracking-widest text-[14px] transition-all shadow-[0_0_20px_rgba(46,204,113,0.2)] ${
                    selectedOperatorId 
                    ? 'bg-sw-green/20 border border-sw-green text-sw-green hover:bg-sw-green hover:text-black cursor-pointer' 
                    : 'bg-gray-800 border border-gray-700 text-gray-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  Iniciar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {confirmReadyJobId && (
          <div 
            key="confirm-ready-overlay"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setConfirmReadyJobId(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="panel-glass p-6 rounded-2xl max-w-sm w-full border border-sw-blue/30 shadow-[0_0_50px_rgba(0,168,255,0.15)]"
            >
              <div className="flex items-center gap-3 mb-4 text-sw-yellow">
                <AlertCircle size={24} />
                <h3 className="font-bold uppercase tracking-widest">Confirmar Estado</h3>
              </div>
              <p className="text-gray-300 text-sm mb-6">
                ¿Estás seguro de pasar este vehículo a estado <strong>LISTO</strong>?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmReadyJobId(null)}
                  className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:bg-white/5 transition-all font-bold uppercase tracking-widest text-[14px]"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmReadyStatus}
                  className="flex-1 py-2 rounded-lg bg-sw-green/20 border border-sw-green text-sw-green hover:bg-sw-green hover:text-black transition-all font-bold uppercase tracking-widest text-[14px]"
                >
                  Aprobar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {longShiftNotify && (
          <motion.div 
            key="long-shift-notification"
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-24 left-1/2 z-[250] px-6 py-5 rounded-2xl border-2 shadow-[0_20px_60px_rgba(255,232,31,0.2)] flex items-center gap-8 backdrop-blur-2xl bg-black/95 border-sw-yellow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-sw-yellow/20 rounded-full flex items-center justify-center border border-sw-yellow/50">
                <Clock size={24} className="text-sw-yellow animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="font-black uppercase tracking-[0.15em] text-sw-yellow text-sm">Alerta de Jornada</span>
                <span className="text-white text-[14px] font-bold opacity-80 uppercase tracking-widest">No olvide cerrar su turno al terminar su jornada laboral.</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setLongShiftNotify(false)}
                className="px-4 py-2 rounded-xl border border-gray-700 text-gray-400 hover:bg-white/5 transition-all font-bold uppercase tracking-widest text-[14px]"
              >
                Ignorar
              </button>
              <button 
                onClick={() => {
                  setLongShiftNotify(false);
                  setShowCloseShiftModal(true);
                }}
                className="px-6 py-2 rounded-xl bg-sw-red text-white transition-all font-black uppercase tracking-widest text-[14px] shadow-[0_0_20px_rgba(231,76,60,0.3)]"
              >
                Cerrar Turno
              </button>
            </div>
          </motion.div>
        )}

        {smsNotificationJobId && (
          <motion.div 
            key="sms-notification"
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[200] px-6 py-4 rounded-xl border shadow-2xl flex items-center gap-6 backdrop-blur-md bg-black/90 border-sw-blue"
          >
            <div>
              <div className="flex items-center gap-2 text-sw-blue mb-1">
                <Bell size={16} className="animate-pulse" />
                <span className="font-bold uppercase tracking-widest text-[14px]">Enviando SMS Automático</span>
              </div>
              <div className="text-gray-400 text-[14px] uppercase tracking-widest">
                Enviando en {smsCountdown} segundos...
              </div>
            </div>
            <button 
              onClick={() => {
                setSmsNotificationJobId(null);
                showToast('Envío de SMS cancelado', 'info');
              }}
              className="px-4 py-2 rounded-lg bg-sw-red/20 border border-sw-red text-sw-red hover:bg-sw-red hover:text-white transition-all font-bold uppercase tracking-widest text-[14px]"
            >
              Cancelar Envío
            </button>
          </motion.div>
        )}

        {/* Shift Management Modals */}
        {showOpenShiftModal && (
          <OpenShiftModal 
            key="open-shift-modal"
            currentUser={currentUser} 
            showToast={showToast} 
            onClose={() => setShowOpenShiftModal(false)} 
            handleLogout={handleLogout} 
          />
        )}
        
        {showCashMovementModal && currentShift && (
          <CashMovementModal key="cash-movement-modal" currentShift={currentShift} currentUser={currentUser} showToast={showToast} onClose={() => setShowCashMovementModal(false)} />
        )}

        {showCloseShiftModal && currentShift && (
          <CloseShiftModal key="close-shift-modal" currentShift={currentShift} showToast={showToast} onClose={() => setShowCloseShiftModal(false)} jobs={jobs} />
        )}

        {showZReportModal && (
          <HistoricalZReportModal key="z-report-modal" shift={showZReportModal} onClose={() => setShowZReportModal(null)} showToast={showToast} />
        )}

        {clientModalId && (
          <ClientDetailModal 
            key="client-detail-modal"
            clientId={clientModalId} 
            clients={clients} 
            jobs={jobs}
            onClose={() => setClientModalId(null)} 
            setDetailModalJobId={setDetailModalJobId}
            systemSettings={systemSettings}
            categories={categories}
            showToast={showToast}
          />
        )}

        {serviceModalId !== null && (
          <ServiceModal 
            key="service-modal"
            serviceId={serviceModalId === 'new' ? null : serviceModalId}
            services={services}
            jobs={jobs}
            onClose={() => setServiceModalId(null)}
            showToast={showToast}
            hasPermission={hasPermission}
            isAdmin={currentUser?.role === 'Admin' || currentUser?.email === 'inversioneselcactus@gmail.com' || currentUser?.email === 'starparkiquique@gmail.com' || currentUser?.email === 'daelpaso.digital@gmail.com'}
          />
        )}

        {userModalId && (
          <UserDetailModal 
            key="user-detail-modal"
            userId={userModalId}
            users={users}
            onClose={() => setUserModalId(null)}
            showToast={showToast}
            isSuperAdmin={currentUser?.email === 'inversioneselcactus@gmail.com' || currentUser?.email === 'daelpaso.digital@gmail.com'}
            togglePermission={async (userId: string, permission: string) => {
              const user = users.find((u: any) => u.id === userId);
              const currentPermissions = user.permissions || {};
              const newPermissions = { ...currentPermissions, [permission]: !currentPermissions[permission] };
              try {
                await updateDoc(doc(db, 'users', userId), { permissions: newPermissions });
                showToast('Permisos actualizados', 'success');
              } catch (e) {
                showToast('Error al actualizar permisos', 'error');
              }
            }}
            applyPreset={async (userId: string, role: string) => {
              let preset: any = {};
              if (role === 'Cajero') preset = { write_pos: true, manage_shifts: true };
              else if (role === 'Operario') preset = { write_workshop: true };
              else if (role === 'Visualizador') preset = { view_reports: true };
              else if (role === 'Admin') preset = { write_pos: true, write_workshop: true, manage_shifts: true, view_reports: true, edit_inventory: true, edit_pricing: true, edit_users: true };
              try {
                await updateDoc(doc(db, 'users', userId), { permissions: preset });
                showToast(`Preset de ${role} aplicado`, 'success');
              } catch (e) {
                showToast('Error al aplicar preset', 'error');
              }
            }}
            PREDEFINED_PERMISSIONS={[
              { id: 'write_pos', label: 'Crear Ventas (POS)', roles: ['Admin', 'Cajero'] },
              { id: 'write_workshop', label: 'Gestionar Taller', roles: ['Admin', 'Operario'] },
              { id: 'manage_shifts', label: 'Abrir/Cerrar Turnos', roles: ['Admin', 'Cajero'] },
              { id: 'view_reports', label: 'Ver Reportes', roles: ['Admin', 'Visualizador'] },
              { id: 'edit_inventory', label: 'Editar Inventario', roles: ['Admin'] },
              { id: 'edit_pricing', label: 'Editar Tarifas', roles: ['Admin'] },
              { id: 'edit_users', label: 'Gestionar Usuarios', roles: ['Admin'] }
            ]}
          />
        )}

        {showUserCreateModal && (
          <UserCreateModal 
            key="user-create-modal"
            onClose={() => setShowUserCreateModal(false)}
            showToast={showToast}
            currentUser={currentUser}
            hasPermission={hasPermission}
          />
        )}



        {inventoryModalId && (
          <InventoryItemModal 
            key="inventory-item-modal"
            item={inventoryModalId.id === 'new' ? null : (inventoryModalId.type === 'raw' ? rawMaterials.find((r:any)=>r.id===inventoryModalId.id) : storeProducts.find((p:any)=>p.id===inventoryModalId.id))}
            type={inventoryModalId.type}
            onClose={() => setInventoryModalId(null)}
            showToast={showToast}
            hasPermission={hasPermission}
            transactions={transactions}
            jobs={jobs}
          />
        )}

      </AnimatePresence>
    </div>
  );
}
