import React, { useState, useEffect, useMemo } from 'react';
import { 
  Menu, X, LayoutDashboard, Wrench, History, Store, Users, Settings, 
  LogOut, Moon, Sun, Zap, Eye, EyeOff, AlertCircle, CheckCircle2, Info, Bell,
  Shield, DollarSign, Package, Clock, ChevronLeft, ChevronRight, Calendar,
  Accessibility, Type, ZoomIn, ZoomOut, RotateCcw, TrendingUp
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
import { PricingView, ConfigView, UsersView, ClientsView, InventoryView } from './components/AdminViews';
import { JobDetailModal, QuickStoreModal, CheckoutModal, ClientDetailModal, ServiceModal, CategoryModal, UserDetailModal, UserCreateModal } from './components/Modals';
import { OpenShiftModal, CashMovementModal, CloseShiftModal, ZReportModal, ShiftHistoryView } from './components/ShiftManagement';

// Firebase Imports
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged,
  collection, doc, setDoc, updateDoc, onSnapshot, query, getDoc,
  handleFirestoreError, OperationType
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
      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
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
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-sw-blue">Centro de Accesibilidad</h3>
              </div>

              <div className="p-4 space-y-6">
                {/* Visual Modes */}
                <div className="space-y-3">
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Modos Visuales</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setA11y({...a11y, darkMode: !a11y.darkMode})}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${a11y.darkMode ? 'bg-sw-yellow/10 border-sw-yellow text-sw-yellow' : 'bg-white/5 border-gray-800 text-gray-400'}`}
                    >
                      {a11y.darkMode ? <Moon size={18} /> : <Sun size={18} />}
                      <span className="text-[10px] font-bold uppercase tracking-tighter">{a11y.darkMode ? 'Modo Oscuro' : 'Modo Claro'}</span>
                    </button>
                    <button 
                      onClick={() => setA11y({...a11y, highContrast: !a11y.highContrast})}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${a11y.highContrast ? 'bg-sw-blue/10 border-sw-blue text-sw-blue' : 'bg-white/5 border-gray-800 text-gray-400'}`}
                    >
                      <Zap size={18} />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Alto Contraste</span>
                    </button>
                  </div>
                </div>

                {/* Font Size */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Tamaño de Texto</p>
                    <button 
                      onClick={() => setA11y({...a11y, fontSize: 'medium'})}
                      className="text-[8px] font-bold text-sw-blue uppercase tracking-widest hover:underline"
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
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Rendimiento</p>
                  <button 
                    onClick={() => setA11y({...a11y, reduceMotion: !a11y.reduceMotion})}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${a11y.reduceMotion ? 'bg-sw-red/10 border-sw-red text-sw-red' : 'bg-white/5 border-gray-800 text-gray-400'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Zap size={18} className={a11y.reduceMotion ? 'rotate-180' : ''} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Reducir Animaciones</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-all ${a11y.reduceMotion ? 'bg-sw-red' : 'bg-gray-700'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${a11y.reduceMotion ? 'left-4.5' : 'left-0.5'}`}></div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-black/60 text-center">
                <p className="text-[8px] text-gray-600 font-bold uppercase tracking-[0.2em]">StarParks Accessibility Protocol</p>
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
        <p className="text-xs text-sw-yellow font-bold uppercase tracking-[0.3em] mb-12 text-center">Carwash Pro V1</p>
        
        <button 
          onClick={onLogin}
          className="w-full btn-jedi py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 text-sm transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,168,255,0.2)]"
        >
          <Users size={20} />
          ACCESO CON GOOGLE
        </button>
        
        <p className="mt-8 text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center">
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
  const [showShiftReminder, setShowShiftReminder] = useState(false);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);

  // Auth State
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null); // The mapped user from DB
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
  
  // UI State
  const [toast, setToast] = useState<any>(null);
  const [a11y, setA11y] = useState({ darkMode: true, highContrast: false, reduceMotion: false, fontSize: 'medium' });
  const [clientModalId, setClientModalId] = useState<string | null>(null);
  const [serviceModalId, setServiceModalId] = useState<string | null>(null);
  const [userModalId, setUserModalId] = useState<string | null>(null);
  const [showUserCreateModal, setShowUserCreateModal] = useState(false);
  const [categoryModalId, setCategoryModalId] = useState<string | null>(null);

  // Shift Timer State
  const [shiftStart] = useState(() => {
    const stored = localStorage.getItem('shiftStart');
    if (stored) return parseInt(stored, 10);
    const now = Date.now();
    localStorage.setItem('shiftStart', now.toString());
    return now;
  });
  const [shiftElapsed, setShiftElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setShiftElapsed(Date.now() - shiftStart), 1000);
    return () => clearInterval(timer);
  }, [shiftStart]);

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
  const [confirmReadyJobId, setConfirmReadyJobId] = useState<string | null>(null);
  const [smsNotificationJobId, setSmsNotificationJobId] = useState<string | null>(null);
  const [smsCountdown, setSmsCountdown] = useState(10);
  
  // Shift Modals State
  const [showCashMovementModal, setShowCashMovementModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showZReportModal, setShowZReportModal] = useState<any>(null); // holds the shift object

  // Current Shift
  const currentShift = useMemo(() => shifts.find(s => s.status === 'open'), [shifts]);

  useEffect(() => {
    if (!currentShift && isAuthReady && currentUser) {
      // Show initial reminder
      setShowShiftReminder(true);
      
      const interval = setInterval(() => {
        setShowShiftReminder(true);
      }, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    } else {
      setShowShiftReminder(false);
    }
  }, [currentShift, isAuthReady, currentUser]);

  // --- Helpers ---
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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
      await setDoc(doc(db, 'jobs', jobId), { 
        ...job, 
        status: status, // Update the root status for Kanban filtering
        timeline: updatedTimeline 
      });
    } catch (e) {
      console.error(e);
    }
  };

  const hasPermission = (permissionId: string) => {
    if (!currentUser) return false;
    if (currentUser.email === 'inversioneselcactus@gmail.com') return true;
    
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

  useEffect(() => {
    let timer: any;
    if (smsNotificationJobId && smsCountdown > 0) {
      timer = setInterval(() => setSmsCountdown(prev => prev - 1), 1000);
    } else if (smsNotificationJobId && smsCountdown === 0) {
      showToast('SMS enviado automáticamente', 'success');
      setSmsNotificationJobId(null);
    }
    return () => clearInterval(timer);
  }, [smsNotificationJobId, smsCountdown]);

  // --- Effects ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Check if user exists in DB or is the default admin
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setCurrentUser({ id: user.uid, ...userDoc.data() });
        } else if (user.email === 'inversioneselcactus@gmail.com' || user.email === 'starparkiquique@gmail.com') {
          // Bootstrap default admin
          const adminData = {
            id: user.uid,
            rut: user.email === 'starparkiquique@gmail.com' ? '22222222-2' : '11111111-1',
            name: user.displayName || (user.email === 'starparkiquique@gmail.com' ? 'StarPark Iquique' : 'Admin Principal'),
            role: 'Admin',
            pin: '1234',
            active: true,
            email: user.email
          };
          await setDoc(doc(db, 'users', user.uid), adminData);
          setCurrentUser(adminData);
        } else {
          // Register new user automatically
          const newUserData = {
            id: user.uid,
            rut: '00000000-0', // Placeholder
            name: user.displayName || 'Nuevo Usuario',
            role: 'Operario', // Default role for new registrations
            pin: '0000',
            active: true,
            email: user.email
          };
          await setDoc(doc(db, 'users', user.uid), newUserData);
          setCurrentUser(newUserData);
        }
      } else {
        setCurrentUser(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !firebaseUser) return;

    // Subscriptions to Firestore
    const unsubJobs = onSnapshot(collection(db, 'jobs'), (snapshot) => {
      setJobs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'jobs'));

    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'clients'));

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    const unsubServices = onSnapshot(collection(db, 'services'), (snapshot) => {
      setServices(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'services'));

    const unsubStore = onSnapshot(collection(db, 'storeProducts'), (snapshot) => {
      setStoreProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'storeProducts'));

    const unsubRaw = onSnapshot(collection(db, 'rawMaterials'), (snapshot) => {
      setRawMaterials(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'rawMaterials'));

    const unsubShifts = onSnapshot(collection(db, 'shifts'), (snapshot) => {
      setShifts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'shifts'));

    const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'transactions'));

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'categories'));

    let unsubAudit = () => {};
    if (currentUser?.role === 'Admin') {
      unsubAudit = onSnapshot(collection(db, 'shifts_audit'), (snapshot) => {
        setShiftsAudit(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => handleFirestoreError(error, OperationType.GET, 'shifts_audit'));
    }

    return () => {
      unsubJobs(); unsubClients(); unsubUsers(); unsubServices(); unsubStore(); unsubRaw(); unsubShifts(); unsubTransactions(); unsubCategories(); unsubAudit();
    };
  }, [isAuthReady, firebaseUser]);

  // Seed initial data if empty (only Admin)
  useEffect(() => {
    const seedData = async () => {
      if (currentUser?.role === 'Admin' && services.length === 0 && storeProducts.length === 0) {
        try {
          for (const srv of INITIAL_SERVICES) await setDoc(doc(db, 'services', srv.id), srv);
          for (const prod of INITIAL_STORE_PRODUCTS) await setDoc(doc(db, 'storeProducts', prod.id), prod);
          for (const raw of INITIAL_RAW_MATERIALS) await setDoc(doc(db, 'rawMaterials', raw.id), raw);
          for (const cat of INITIAL_CATEGORIES) await setDoc(doc(db, 'categories', cat.id), cat);
          for (const cli of INITIAL_CLIENTS) await setDoc(doc(db, 'clients', cli.id), cli);
          showToast('Base de datos inicializada con datos maestros', 'success');
        } catch (e) {
          console.error("Error seeding data", e);
        }
      }
    };
    if (isAuthReady && currentUser) {
      seedData();
    }
  }, [isAuthReady, currentUser, services.length, storeProducts.length]);

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
    { id: 'pos', label: 'Punto de Venta', icon: Store, role: null },
    { id: 'taller', label: 'Taller / Kanban', icon: Wrench, role: null },
    { id: 'clientes', label: 'Clientes', icon: Users, role: null },
    { id: 'calendario', label: 'Calendario', icon: Calendar, role: null },
    { id: 'hist', label: 'Historial', icon: History, role: null },
    { id: 'ventas', label: 'Ventas', icon: TrendingUp, role: 'Admin' },
    { id: 'turnos', label: 'Turnos', icon: Clock, role: 'Admin' },
    { id: 'tarifas', label: 'Tarifas', icon: DollarSign, role: 'Admin' },
    { id: 'inventario', label: 'Inventario', icon: Package, role: 'Admin' },
    { id: 'config', label: 'Configuración', icon: Settings, role: null },
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sw-yellow rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,232,31,0.5)]">
              <Zap size={24} className="text-black fill-black" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter sw-title-font leading-none sw-title">STARPARKS</h1>
              <p className="text-[10px] text-sw-yellow font-bold uppercase tracking-[0.3em] mt-0.5">Carwash Pro V1</p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <SystemClock />
          
          <div className="flex items-center gap-4 border-l border-gray-800 pl-8">
            <div className="text-right">
              <div className="text-sm font-bold text-white uppercase tracking-widest">{currentUser.name}</div>
              <div className="text-[10px] text-sw-blue font-bold uppercase tracking-widest">{currentUser.role}</div>
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
                const isSuperAdmin = currentUser?.email === 'inversioneselcactus@gmail.com';
                const isAllowed = isSuperAdmin || (!isConfigModule && (!item.role || (currentUser && (currentUser.role === item.role || currentUser.role === 'Admin'))));
                
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                    disabled={!isAllowed}
                    title={isSidebarCollapsed ? item.label : ''}
                    className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-xl font-bold uppercase tracking-widest text-sm transition-all border ${
                      activeTab === item.id 
                        ? 'bg-sw-blue/10 border-sw-blue text-sw-blue shadow-[0_0_15px_rgba(0,168,255,0.1)]' 
                        : isAllowed 
                          ? 'border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300' 
                          : 'border-transparent text-gray-800 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <item.icon size={20} className="shrink-0" />
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                    {!isAllowed && !isSidebarCollapsed && <Shield size={14} className="ml-auto text-sw-red" />}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto pt-6 border-t border-gray-800 relative">
              <div className={`bg-black/40 ${isSidebarCollapsed ? 'p-2' : 'p-4'} rounded-xl border border-gray-800 transition-all`}>
                <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} mb-4`}>
                  <div className="w-2 h-2 rounded-full bg-sw-green animate-pulse shrink-0"></div>
                  {!isSidebarCollapsed && <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Gestión de Turno</span>}
                </div>
                
                <div className="mb-4">
                  {!isSidebarCollapsed && (
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                      <Clock size={12} /> Tiempo Transcurrido
                    </div>
                  )}
                  <div className={`${isSidebarCollapsed ? 'text-[8px]' : 'text-lg'} font-mono font-black text-sw-green tracking-wider text-center`}>
                    {isSidebarCollapsed ? formatShiftTime(shiftElapsed).split(':').slice(0,2).join(':') : formatShiftTime(shiftElapsed)}
                  </div>
                  {!isSidebarCollapsed && <div className="text-[10px] text-gray-500 font-mono mt-1 text-center">Inicio: {new Date(shiftStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>}
                </div>

                <div className={`space-y-2 border-t border-gray-800 pt-4 ${isSidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
                  <button 
                    onClick={() => setShowCashMovementModal(true)}
                    disabled={!currentShift}
                    title="Movimiento de Caja"
                    className={`w-full py-2 ${isSidebarCollapsed ? 'px-0 justify-center' : 'px-3 justify-center'} rounded-lg bg-sw-blue/10 border border-sw-blue/30 text-sw-blue text-[10px] font-bold uppercase tracking-widest hover:bg-sw-blue hover:text-black transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <DollarSign size={14} className="shrink-0" />
                    {!isSidebarCollapsed && "Movimiento de Caja"}
                  </button>
                  <button 
                    onClick={() => setShowCloseShiftModal(true)}
                    disabled={!currentShift}
                    title="Cerrar Turno"
                    className={`w-full py-2 ${isSidebarCollapsed ? 'px-0 justify-center' : 'px-3 justify-center'} rounded-lg bg-sw-red/10 border border-sw-red/30 text-sw-red text-[10px] font-bold uppercase tracking-widest hover:bg-sw-red hover:text-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <LogOut size={14} className="shrink-0" />
                    {!isSidebarCollapsed && "Cerrar Turno"}
                  </button>
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
                  />
                </AuthGuard>
              )}
              {activeTab === 'taller' && (
                <AuthGuard currentUser={currentUser} hasPermission={hasPermission}>
                  <WorkshopView 
                    jobs={jobs} advanceJobStatus={advanceJobStatus} 
                    setStoreModalJobId={setStoreModalJobId} setDetailModalJobId={setDetailModalJobId} 
                    addTimelineEvent={addTimelineEvent}
                  />
                </AuthGuard>
              )}
              {activeTab === 'clientes' && (
                <AuthGuard currentUser={currentUser} hasPermission={hasPermission}>
                  <ClientsView clients={clients} setClients={setClients} showToast={showToast} setClientModalId={setClientModalId} />
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
              
              {activeTab === 'ventas' && (
                <AuthGuard currentUser={currentUser} requiredRole="Admin" hasPermission={hasPermission}>
                  <DailyReportView 
                    jobs={jobs} 
                    transactions={transactions} 
                    shifts={shifts} 
                    onShowZReport={setShowZReportModal} 
                    initialSubTab="ventas"
                    currentUser={currentUser}
                    showToast={showToast}
                  />
                </AuthGuard>
              )}
              {activeTab === 'turnos' && (
                <AuthGuard currentUser={currentUser} requiredRole="Admin" hasPermission={hasPermission}>
                  <DailyReportView 
                    jobs={jobs} 
                    transactions={transactions} 
                    shifts={shifts} 
                    onShowZReport={setShowZReportModal} 
                    initialSubTab="turnos"
                    currentUser={currentUser}
                    showToast={showToast}
                  />
                </AuthGuard>
              )}
              {activeTab === 'tarifas' && (
                <AuthGuard currentUser={currentUser} requiredRole="Admin" hasPermission={hasPermission}>
                  <PricingView 
                    services={services} 
                    setServices={setServices} 
                    storeProducts={storeProducts} 
                    setStoreProducts={setStoreProducts} 
                    categories={categories}
                    showToast={showToast} 
                    hasPermission={hasPermission} 
                    setServiceModalId={setServiceModalId}
                    setCategoryModalId={setCategoryModalId}
                  />
                </AuthGuard>
              )}
              {activeTab === 'inventario' && (
                <AuthGuard currentUser={currentUser} requiredRole="Admin" hasPermission={hasPermission}>
                  <InventoryView 
                    rawMaterials={rawMaterials} 
                    setRawMaterials={setRawMaterials} 
                    storeProducts={storeProducts} 
                    setStoreProducts={setStoreProducts} 
                    showToast={showToast} 
                    hasPermission={hasPermission} 
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
                    setUserModalId={setUserModalId}
                    setShowUserCreateModal={setShowUserCreateModal}
                    hasPermission={hasPermission}
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
          />
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
                  className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:bg-white/5 transition-all font-bold uppercase tracking-widest text-xs"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmReadyStatus}
                  className="flex-1 py-2 rounded-lg bg-sw-green/20 border border-sw-green text-sw-green hover:bg-sw-green hover:text-black transition-all font-bold uppercase tracking-widest text-xs"
                >
                  Aprobar
                </button>
              </div>
            </motion.div>
          </div>
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
                <span className="font-bold uppercase tracking-widest text-xs">Enviando SMS Automático</span>
              </div>
              <div className="text-gray-400 text-[10px] uppercase tracking-widest">
                Enviando en {smsCountdown} segundos...
              </div>
            </div>
            <button 
              onClick={() => {
                setSmsNotificationJobId(null);
                showToast('Envío de SMS cancelado', 'info');
              }}
              className="px-4 py-2 rounded-lg bg-sw-red/20 border border-sw-red text-sw-red hover:bg-sw-red hover:text-white transition-all font-bold uppercase tracking-widest text-xs"
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

        {showShiftReminder && (
          <div 
            key="shift-reminder-overlay"
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="panel-glass p-8 rounded-2xl max-w-md w-full border border-sw-red/30 shadow-[0_0_50px_rgba(231,76,60,0.15)] text-center"
            >
              <div className="w-16 h-16 bg-sw-red/20 rounded-full flex items-center justify-center mx-auto mb-6 text-sw-red">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-white sw-title-font tracking-widest uppercase mb-2">TURNO NO INICIADO</h3>
              <p className="text-gray-400 text-sm mb-8">
                No has iniciado un turno de trabajo. Puedes visualizar la información, pero no podrás registrar nuevos vehículos o ventas.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setShowShiftReminder(false);
                    setShowOpenShiftModal(true);
                  }}
                  className="w-full py-3 rounded-xl bg-sw-green text-black font-bold uppercase tracking-widest text-sm hover:scale-105 transition-all"
                >
                  Iniciar Turno Ahora
                </button>
                <button 
                  onClick={() => setShowShiftReminder(false)}
                  className="w-full py-3 rounded-xl border border-gray-800 text-gray-500 hover:text-white hover:bg-white/5 transition-all font-bold uppercase tracking-widest text-xs"
                >
                  5 Minutos Más
                </button>
              </div>
            </motion.div>
          </div>
        )}
        
        {showCashMovementModal && currentShift && (
          <CashMovementModal key="cash-movement-modal" currentShift={currentShift} currentUser={currentUser} showToast={showToast} onClose={() => setShowCashMovementModal(false)} />
        )}

        {showCloseShiftModal && currentShift && (
          <CloseShiftModal key="close-shift-modal" currentShift={currentShift} showToast={showToast} onClose={() => setShowCloseShiftModal(false)} jobs={jobs} />
        )}

        {showZReportModal && (
          <ZReportModal key="z-report-modal" shift={showZReportModal} jobs={jobs} transactions={transactions} onClose={() => setShowZReportModal(null)} showToast={showToast} />
        )}

        {clientModalId && (
          <ClientDetailModal 
            key="client-detail-modal"
            clientId={clientModalId} 
            clients={clients} 
            onClose={() => setClientModalId(null)} 
          />
        )}

        {serviceModalId !== null && (
          <ServiceModal 
            key="service-modal"
            serviceId={serviceModalId === 'new' ? null : serviceModalId}
            services={services}
            onClose={() => setServiceModalId(null)}
            showToast={showToast}
            hasPermission={hasPermission}
          />
        )}

        {userModalId && (
          <UserDetailModal 
            key="user-detail-modal"
            userId={userModalId}
            users={users}
            onClose={() => setUserModalId(null)}
            showToast={showToast}
            isSuperAdmin={currentUser?.email === 'inversioneselcactus@gmail.com'}
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
          />
        )}

        {serviceModalId && (
          <ServiceModal 
            key="service-modal"
            serviceId={serviceModalId === 'new' ? null : serviceModalId}
            services={services}
            onClose={() => setServiceModalId(null)}
            showToast={showToast}
            hasPermission={hasPermission}
          />
        )}

        {categoryModalId && (
          <CategoryModal 
            key="category-modal"
            categoryId={categoryModalId === 'new' ? null : categoryModalId}
            categories={categories}
            onClose={() => setCategoryModalId(null)}
            showToast={showToast}
            hasPermission={hasPermission}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
