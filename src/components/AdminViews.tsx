import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Package, Plus, Trash2, Edit2, Save, X, DollarSign, UserPlus, Shield, Users, Download, TrendingUp, RefreshCcw, UserCheck, UserX, MessageCircle, Gift, Sparkles, AlertTriangle, Star, Wrench, Search, ArrowUpDown, ChevronLeft, ChevronRight, Upload, HardDrive, History, FileUp, FileDown, DatabaseBackup } from 'lucide-react';
import { exportToExcel } from '../lib/utils';
import { NEW_CLIENTS_DATA } from '../lib/clientsData';
import { INITIAL_CATEGORIES } from '../lib/constants';
import { doc, updateDoc, deleteDoc, setDoc, db, handleFirestoreError, OperationType, collection, getDocs } from '../firebase';
import { DailyReportView } from './DailyReportView';
import { ExportDataModal } from './ExportDataModal';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format } from 'date-fns';

export const ManualActionsView = ({ systemLogs, showToast }: any) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = systemLogs.filter((log: any) => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.operatorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    exportToExcel('historial_acciones_manuales.xlsx', filteredLogs.map(l => ({
      Fecha: format(new Date(l.timestamp), 'dd-MM-yyyy HH:mm'),
      Accion: l.action,
      Detalle: l.details,
      Operador: l.operatorName,
      Email: l.operatorId,
      Aprobador: l.approvedBy || 'N/A'
    })));
    showToast('Historial exportado', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text"
            placeholder="Buscar por acción, detalle o usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:border-sw-blue outline-none transition-all"
          />
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-3 bg-sw-blue/10 border border-sw-blue/30 text-sw-blue rounded-xl font-bold uppercase tracking-widest text-[14px] hover:bg-sw-blue hover:text-black transition-all"
        >
          <Download size={18} /> Exportar Log
        </button>
      </div>

      <div className="panel-glass rounded-2xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-black/60 text-[12px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-800">
              <tr>
                <th className="p-4">Fecha/Hora</th>
                <th className="p-4">Acción</th>
                <th className="p-4">Detalle / Justificación</th>
                <th className="p-4">Usuario</th>
                <th className="p-4">Aprobador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filteredLogs.map((log: any) => (
                <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4 font-mono text-sm text-gray-400 whitespace-nowrap">
                    {format(new Date(log.timestamp), 'dd-MM-yyyy HH:mm')}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-sw-blue/20 text-sw-blue border border-sw-blue/30">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-300 max-w-md break-words">
                    {log.details}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white uppercase tracking-tighter">{log.operatorName}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{log.operatorId}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {log.approvedBy ? (
                      <span className="text-xs font-bold text-sw-green uppercase tracking-widest">{log.approvedBy}</span>
                    ) : (
                      <span className="text-xs text-gray-600 italic">Auto-aprobado</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-gray-600 font-bold uppercase tracking-widest">
                    No hay registros de acciones manuales detectados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


/* REDUNDANT: MIGRATED TO PRICINGVIEW */

export const TarifarioModal = ({ service, categories, onClose, showToast, jobs = [], transactions = [], isAdmin }: any) => {
  const isEdit = !!service;
  const [formData, setFormData] = useState({
    type: service?.type || 'Servicio',
    categoryId: service?.categoryId || (categories?.[0]?.id || ''),
    name: service?.name || '',
    description: service?.description || '',
    estimatedCost: service?.estimatedCost || 0,
    basePrice: service?.basePrice || 0,
    estimatedDuration: service?.estimatedDuration || 30
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.basePrice <= 0) {
      showToast('Nombre y precio son obligatorios', 'error');
      return;
    }
    try {
      const id = isEdit ? service.id : `srv_${Date.now()}`;
      await setDoc(doc(db, 'services', id), {
        id,
        ...formData,
        active: true,
        isActive: true
      });
      showToast(isEdit ? 'Servicio/Adicional actualizado' : 'Creado correctamente', 'success');
      onClose();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, 'services');
      showToast('Error al guardar', 'error');
    }
  };

  const handleDelete = async () => {
    if (!isAdmin) {
      showToast('No tiene permisos para eliminar', 'error');
      return;
    }
    if (!window.confirm(`¿Está seguro de que desea ELIMINAR PERMANENTEMENTE "${formData.name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'services', service.id));
      showToast('Registro eliminado', 'success');
      onClose();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, 'services');
      showToast('Error al eliminar', 'error');
    }
  };

  const renderChart = () => {
    if (!isEdit || !service) return null;

    // Generate last 30 days
    const data = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      data.push({
        dateStr: d.toISOString().split('T')[0],
        dateLabel: d.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' }),
        count: 0
      });
    }

    jobs.forEach((j: any) => {
      if (!j.entryDate) return;
      const jDate = new Date(j.entryDate).toISOString().split('T')[0];
      const dayData = data.find(d => d.dateStr === jDate);
      if (dayData) {
        if (service.type === 'Servicio' && j.serviceId === service.id) {
          dayData.count += 1;
        } else if (service.type === 'Adicional') {
          const addon = j.cart?.find((item: any) => item.id === service.id);
          if (addon) dayData.count += 1; // Or += addon.quantity if they have quantities
        }
      }
    });

    const totalVentas = data.reduce((acc, curr) => acc + curr.count, 0);

    return (
      <div className="mt-8 border-t border-gray-800 pt-6">
        <h3 className="text-[14px] font-bold uppercase tracking-widest text-sw-blue mb-4 flex items-center gap-2">
          <TrendingUp size={16} /> 
          Rendimiento últimos 30 días
        </h3>
        <div className="mb-4">
          <span className="text-2xl font-mono font-black text-white">{totalVentas}</span>
          <span className="text-[14px] text-gray-500 font-bold uppercase tracking-widest ml-2">Ventas en el periodo</span>
        </div>
        <div className="h-48 w-full bg-black/50 p-4 rounded-xl border border-gray-800">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00a8ff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00a8ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="dateLabel" hide={true} />
              <YAxis hide={true} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                itemStyle={{ color: '#00a8ff', fontWeight: 'bold' }}
                formatter={(v: any) => [v, 'Ventas']}
              />
              <Area type="monotone" dataKey="count" stroke="#00a8ff" fillOpacity={1} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[250] flex flex-col pt-10 px-4 pb-20 items-center justify-start overflow-y-auto backdrop-blur-sm">
      <div className="bg-black border border-sw-green rounded-2xl w-full max-w-3xl shadow-[0_0_40px_rgba(46,204,113,0.3)] relative flex flex-col">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-sw-green/5 rounded-t-2xl">
          <h2 className="text-xl font-bold uppercase tracking-widest text-sw-green flex items-center gap-2">
            <DollarSign size={24} /> {isEdit ? 'Editar' : 'Nuevo'} Registro
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[14px] font-bold uppercase text-gray-400">Tipo</label>
              <select 
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value})}
                className="w-full bg-black border border-gray-800 rounded-xl p-3 text-white focus:border-sw-green outline-none"
              >
                <option value="Servicio">Servicio Principal</option>
                <option value="Adicional">Servicio Adicional / Complementario</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-bold uppercase text-gray-400">Modelo (Categoría)</label>
              <select 
                value={formData.categoryId} 
                onChange={e => setFormData({...formData, categoryId: e.target.value})}
                className="w-full bg-black border border-gray-800 rounded-xl p-3 text-white focus:border-sw-green outline-none"
              >
                {formData.type === 'Adicional' && <option value="ALL">TODOS LOS MODELOS</option>}
                {categories?.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-bold uppercase text-gray-400">Servicio (Nombre Corto)</label>
              <input 
                type="text" required
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ej: EXPRESS"
                className="w-full bg-black border border-gray-800 rounded-xl p-3 text-white focus:border-sw-green outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-bold uppercase text-gray-400">Nombre de Servicio (Descripción)</label>
              <input 
                type="text"
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Ej: LAVADO POR FUERA"
                className="w-full bg-black border border-gray-800 rounded-xl p-3 text-white focus:border-sw-green outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-bold uppercase text-gray-400">Estimación Costo (CLP)</label>
              <input 
                type="number" min="0"
                value={formData.estimatedCost} 
                onChange={e => setFormData({...formData, estimatedCost: parseInt(e.target.value) || 0})}
                className="w-full bg-black border border-gray-800 rounded-xl p-3 text-white focus:border-sw-green outline-none font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-bold uppercase text-sw-yellow">Precio Venta (CLP)</label>
              <input 
                type="number" min="0" required
                value={formData.basePrice} 
                onChange={e => setFormData({...formData, basePrice: parseInt(e.target.value) || 0})}
                className="w-full bg-black border border-sw-yellow/50 rounded-xl p-3 text-sw-yellow focus:border-sw-yellow outline-none font-mono text-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-bold uppercase text-gray-400">Estimación Duración (Minutos)</label>
              <input 
                type="number" min="0"
                value={formData.estimatedDuration} 
                onChange={e => setFormData({...formData, estimatedDuration: parseInt(e.target.value) || 0})}
                className="w-full bg-black border border-gray-800 rounded-xl p-3 text-white focus:border-sw-green outline-none font-mono"
              />
              <p className="text-[14px] text-gray-500">Ej: 30 = 00:30 hrs</p>
            </div>
          </div>
          {renderChart()}
          <div className="mt-6 pt-6 border-t border-gray-800 flex justify-between gap-3">
            <div>
              {isEdit && isAdmin && (
                <button 
                  type="button" 
                  onClick={handleDelete}
                  className="px-6 py-3 rounded-xl border border-sw-red text-sw-red hover:bg-sw-red hover:text-white transition-all font-bold uppercase tracking-widest text-[14px] flex items-center gap-2"
                >
                  <Trash2 size={16} /> Eliminar
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl border border-gray-800 text-gray-400 hover:text-white transition-all font-bold uppercase tracking-widest text-[14px]">
                Cancelar
              </button>
              <button type="submit" className="px-6 py-3 rounded-xl bg-sw-green text-black hover:scale-105 transition-all font-bold uppercase tracking-widest text-[14px] flex items-center gap-2">
                <Save size={16} /> Guardar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export const PricingView = ({ 
  services, 
  categories, 
  showToast, 
  hasPermission, 
  rawMaterials, 
  storeProducts, 
  setInventoryModalId,
  jobs,
  transactions,
  isAdmin
}: any) => {
  const canEdit = hasPermission('edit_pricing') || hasPermission('edit_inventory');
  const [modalService, setModalService] = useState<any>(null); // null = closed, 'new' = new, object = edit
  const [localTab, setLocalTab] = useState('servicios');
  const [exportModal, setExportModal] = useState<any>(null); // { title: string, data: any[], columns: any[] } | null
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });

  // Logic for Add Stock (migrated from InventoryView)
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [selectedItemToAdd, setSelectedItemToAdd] = useState('');
  const [qtyToAdd, setQtyToAdd] = useState('');

  const handleAddStock = async () => {
    if (!selectedItemToAdd || !qtyToAdd) return;
    try {
      const item = rawMaterials.find((r: any) => r.id === selectedItemToAdd);
      const qty = parseFloat(qtyToAdd);
      if (!item || isNaN(qty) || qty <= 0) return;
      
      const newStock = item.stock + qty;
      await updateDoc(doc(db, 'rawMaterials', item.id), { stock: newStock });
      
      const historyEntry = {
        id: `INV-${Date.now()}`,
        itemId: item.id,
        itemName: item.name,
        qtyAdded: qty,
        newStock: newStock,
        date: Date.now()
      };
      await setDoc(doc(db, 'inventoryHistory', historyEntry.id), historyEntry);

      showToast(`Añadidos ${qty} ${item.uom} a ${item.name}`, 'success');
      setShowAddStockModal(false);
      setSelectedItemToAdd('');
      setQtyToAdd('');
    } catch (e) {
      showToast('Error al actualizar stock', 'error');
    }
  };

  const handleExportRaw = () => {
    exportToExcel('insumos_taller.xlsx', rawMaterials);
    showToast('Insumos exportados', 'success');
  };

  const handleExportStore = () => {
    exportToExcel('stock_tienda.xlsx', storeProducts);
    showToast('Stock exportado', 'success');
  };

  const handleDeleteService = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!isAdmin) {
      showToast('No tiene permisos para eliminar servicios', 'error');
      return;
    }
    if (!window.confirm(`¿Está seguro de que desea ELIMINAR PERMANENTEMENTE "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteDoc(doc(db, 'services', id));
      showToast('Registro eliminado permanentemente', 'success');
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, 'services');
      showToast('Error al eliminar', 'error');
    }
  };

  const handleDeleteProduct = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!isAdmin) {
      showToast('No tiene permisos para eliminar productos', 'error');
      return;
    }
    if (!window.confirm(`¿Está seguro de que desea ELIMINAR PERMANENTEMENTE el producto "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'storeProducts', id));
      showToast('Producto eliminado', 'success');
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, 'storeProducts');
      showToast('Error al eliminar', 'error');
    }
  };

  const handleDeleteMaterial = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!isAdmin) {
      showToast('No tiene permisos para eliminar insumos', 'error');
      return;
    }
    if (!window.confirm(`¿Está seguro de que desea ELIMINAR PERMANENTEMENTE el insumo "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'rawMaterials', id));
      showToast('Insumo eliminado', 'success');
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, 'rawMaterials');
      showToast('Error al eliminar', 'error');
    }
  };

  const getCatName = (id: string) => {
    if (id === 'ALL') return 'TODOS LOS MODELOS';
    return categories?.find((c: any) => c.id === id)?.name || id;
  };

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortData = (data: any[]) => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filteredServices = services.filter((srv: any) => 
    (srv.isActive !== false && srv.active !== false) &&
    (srv.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     getCatName(srv.categoryId).toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const mainServices = sortData(filteredServices.filter((srv: any) => srv.type === 'Servicio'));
  const complementaryServices = sortData(filteredServices.filter((srv: any) => srv.type === 'Adicional'));

  const filteredProducts = sortData(storeProducts.filter((prod: any) => 
    prod.name.toLowerCase().includes(searchTerm.toLowerCase())
  ));

  const filteredMaterials = sortData(rawMaterials.filter((mat: any) => 
    mat.name.toLowerCase().includes(searchTerm.toLowerCase())
  ));

  const subTabs = [
    { id: 'servicios', label: 'Principales', icon: Sparkles },
    { id: 'complementarios', label: 'Complementarios', icon: Plus },
    { id: 'productos', label: 'Productos (Tienda)', icon: Package },
    { id: 'insumos', label: 'Insumos (Costos)', icon: Wrench }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1400px] mx-auto">
      {/* Sub-Tabs Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setLocalTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-[14px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${
              localTab === tab.id 
                ? 'bg-sw-blue text-black border-sw-blue shadow-[0_0_15px_rgba(0,168,255,0.3)] scale-105' 
                : 'bg-black/40 text-gray-500 border-gray-800 hover:border-sw-blue hover:text-white'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="panel-glass p-8 rounded-2xl border-t-4 border-sw-blue overflow-hidden relative">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8 border-b border-gray-800 pb-6">
          <div>
            <h3 className="text-2xl font-bold sw-title-font text-sw-blue tracking-widest flex items-center gap-3">
              {localTab === 'servicios' && <><Sparkles size={28} /> SERVICIOS PRINCIPALES</>}
              {localTab === 'complementarios' && <><Plus size={28} /> ADICIONALES Y COMPLEMENTOS</>}
              {localTab === 'productos' && <><Package size={28} /> TARIFARIO PRODUCTOS TIENDA</>}
              {localTab === 'insumos' && <><Wrench size={28} /> COSTEO DE INSUMOS</>}
            </h3>
            <p className="text-gray-400 text-[14px] mt-2 font-bold uppercase tracking-[0.2em]">
              {localTab === 'servicios' && 'Configuración de servicios base por categoría'}
              {localTab === 'complementarios' && 'Servicios agregados al carrito POS'}
              {localTab === 'productos' && 'Precios de venta de productos en inventario'}
              {localTab === 'insumos' && 'Control de precios de compra para costeo'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
            {/* Unified Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:border-sw-blue outline-none transition-all placeholder:text-gray-600"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {localTab === 'productos' && (
                <button 
                  onClick={() => setExportModal({
                    title: 'Productos Tienda',
                    data: storeProducts,
                    columns: [
                      { header: 'Nombre', key: 'name' },
                      { header: 'Stock', key: 'stock' },
                      { header: 'Precio Venta', key: 'price' }
                    ]
                  })}
                  className="p-3 bg-black/40 border border-gray-800 rounded-xl text-sw-yellow hover:border-sw-yellow transition-all"
                  title="Exportar Stock a Excel"
                >
                  <Download size={20} />
                </button>
              )}
              {localTab === 'insumos' && (
                <>
                  <button 
                    onClick={() => setExportModal({
                      title: 'Insumos Taller',
                      data: rawMaterials,
                      columns: [
                        { header: 'Insumo', key: 'name' },
                        { header: 'Unidad', key: 'uom' },
                        { header: 'Stock', key: 'stock' },
                        { header: 'Costo Unitario', key: 'unitCost' }
                      ]
                    })}
                    className="p-3 bg-black/40 border border-gray-800 rounded-xl text-sw-blue hover:border-sw-blue transition-all"
                    title="Exportar Insumos"
                  >
                    <Download size={20} />
                  </button>
                  {canEdit && (
                    <button 
                      onClick={() => setShowAddStockModal(true)}
                      className="p-3 bg-sw-blue/20 border border-sw-blue text-sw-blue rounded-xl hover:bg-sw-blue hover:text-black transition-all"
                      title="Registrar Ingreso de Stock"
                    >
                      <Plus size={20} className="rotate-45" />
                    </button>
                  )}
                </>
              )}

              {canEdit && (localTab === 'servicios' || localTab === 'complementarios') && (
                <button 
                  onClick={() => setModalService('new')}
                  className="btn-jedi px-6 py-3 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,168,255,0.3)] hover:scale-105 transition-all text-[14px]"
                >
                  <Plus size={20} /> NUEVO REGISTRO
                </button>
              )}
              {canEdit && localTab === 'productos' && (
                <button 
                  onClick={() => setInventoryModalId({id: 'new', type: 'store'})}
                  className="btn-jedi px-6 py-3 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,168,255,0.3)] hover:scale-105 transition-all text-[14px]"
                >
                  <Plus size={20} /> NUEVO PRODUCTO
                </button>
              )}
              {canEdit && localTab === 'insumos' && (
                <button 
                  onClick={() => setInventoryModalId({id: 'new', type: 'raw'})}
                  className="btn-jedi px-6 py-3 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,168,255,0.3)] hover:scale-105 transition-all text-[14px]"
                >
                  <Plus size={20} /> NUEVO INSUMO
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          {(localTab === 'servicios' || localTab === 'complementarios') && (
            <table className="w-full text-left border-collapse min-w-[900px]">
               <thead className="bg-black/80 text-[14px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700">
                 <tr>
                   <th className="p-4 cursor-pointer hover:text-sw-blue transition-colors" onClick={() => handleSort('categoryId')}>
                    <div className="flex items-center gap-2">Modelo <ArrowUpDown size={12} /></div>
                   </th>
                   <th className="p-4 cursor-pointer hover:text-sw-blue transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-2">Servicio <ArrowUpDown size={12} /></div>
                   </th>
                   <th className="p-4">Descripción</th>
                   <th className="p-4 text-right cursor-pointer hover:text-sw-blue transition-colors" onClick={() => handleSort('estimatedCost')}>
                    <div className="flex items-center justify-end gap-2">E. Costo <ArrowUpDown size={12} /></div>
                   </th>
                   <th className="p-4 text-right cursor-pointer hover:text-sw-blue transition-colors" onClick={() => handleSort('basePrice')}>
                    <div className="flex items-center justify-end gap-2">Precio Venta <ArrowUpDown size={12} /></div>
                   </th>
                   <th className="p-4 text-center cursor-pointer hover:text-sw-blue transition-colors" onClick={() => handleSort('estimatedDuration')}>
                    <div className="flex items-center justify-center gap-2">E. Duración <ArrowUpDown size={12} /></div>
                   </th>
                   {canEdit && <th className="p-4 text-right">Acciones</th>}
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-800/50">
                 {(localTab === 'servicios' ? mainServices : complementaryServices).map((srv: any) => (
                   <tr key={srv.id} className="hover:bg-white/5 transition-colors group">
                     <td className="p-4 font-bold text-white uppercase text-[14px] tracking-wider">{getCatName(srv.categoryId)}</td>
                     <td className="p-4 font-bold text-white uppercase text-sm tracking-wider">{srv.name}</td>
                     <td className="p-4 text-[14px] text-gray-400">{srv.description || '-'}</td>
                     <td className="p-4 text-right font-mono text-gray-500">${(srv.estimatedCost || 0).toLocaleString('es-CL')}</td>
                     <td className="p-4 text-right font-mono font-black text-sw-yellow text-lg shadow-sm">${(srv.basePrice || 0).toLocaleString('es-CL')}</td>
                     <td className="p-4 text-center font-mono text-gray-400">
                       {srv.estimatedDuration ? `${Math.floor(srv.estimatedDuration / 60).toString().padStart(2, '0')}:${(srv.estimatedDuration % 60).toString().padStart(2, '0')} hrs` : '-'}
                     </td>
                     {canEdit && (
                       <td className="p-4 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => setModalService(srv)} className="p-2 bg-black/50 border border-gray-700 rounded-lg text-sw-blue hover:text-white hover:bg-sw-blue hover:shadow-[0_0_15px_rgba(0,168,255,0.4)] transition-all">
                             <Edit2 size={16} />
                           </button>
                           <button onClick={(e) => handleDeleteService(e, srv.id, srv.name)} className="p-2 bg-black/50 border border-gray-700 rounded-lg text-sw-red hover:text-white hover:bg-sw-red hover:shadow-[0_0_15px_rgba(231,76,60,0.4)] transition-all">
                             <Trash2 size={16} />
                           </button>
                         </div>
                       </td>
                     )}
                   </tr>
                 ))}
                 { (localTab === 'servicios' ? mainServices : complementaryServices).length === 0 && (
                   <tr>
                     <td colSpan={7} className="p-12 text-center text-gray-600 font-bold uppercase tracking-widest text-sm">
                        No se encontraron registros {searchTerm && `para "${searchTerm}"`}
                     </td>
                   </tr>
                 )}
               </tbody>
            </table>
          )}

          {localTab === 'productos' && (
            <table className="w-full text-left border-collapse min-w-[700px]">
               <thead className="bg-black/80 text-[14px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700">
                 <tr>
                   <th className="p-4">Icono</th>
                   <th className="p-4 cursor-pointer hover:text-sw-blue transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-2">Nombre Producto <ArrowUpDown size={12} /></div>
                   </th>
                   <th className="p-4 text-right cursor-pointer hover:text-sw-blue transition-colors" onClick={() => handleSort('stock')}>
                    <div className="flex items-center justify-end gap-2">Stock Actual <ArrowUpDown size={12} /></div>
                   </th>
                   <th className="p-4 text-right cursor-pointer hover:text-sw-blue transition-colors" onClick={() => handleSort('price')}>
                    <div className="flex items-center justify-end gap-2">Precio Venta <ArrowUpDown size={12} /></div>
                   </th>
                   {canEdit && <th className="p-4 text-right">Acciones</th>}
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-800/50">
                 {filteredProducts.map((prod: any) => (
                   <tr key={prod.id} className="hover:bg-white/5 transition-colors group">
                     <td className="p-4 text-3xl">{prod.icon}</td>
                     <td className="p-4 font-bold text-white uppercase text-sm tracking-wider">{prod.name}</td>
                     <td className="p-4 text-right">
                        <span className={`font-mono font-bold ${prod.stock < 10 ? 'text-sw-red' : 'text-sw-green'}`}>{prod.stock}</span>
                     </td>
                     <td className="p-4 text-right font-mono font-black text-sw-yellow text-lg">${(prod.price || 0).toLocaleString('es-CL')}</td>
                     {canEdit && (
                       <td className="p-4 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => setInventoryModalId({id: prod.id, type: 'store'})} className="p-2 bg-black/50 border border-gray-700 rounded-lg text-sw-blue hover:text-white hover:bg-sw-blue transition-all">
                             <Edit2 size={16} />
                           </button>
                           <button onClick={(e) => handleDeleteProduct(e, prod.id, prod.name)} className="p-2 bg-black/50 border border-gray-700 rounded-lg text-sw-red hover:text-white hover:bg-sw-red transition-all">
                             <Trash2 size={16} />
                           </button>
                         </div>
                       </td>
                     )}
                   </tr>
                 ))}
                 { filteredProducts.length === 0 && (
                   <tr>
                     <td colSpan={5} className="p-12 text-center text-gray-600 font-bold uppercase tracking-widest text-sm">
                        No se encontraron productos {searchTerm && `para "${searchTerm}"`}
                     </td>
                   </tr>
                 )}
               </tbody>
            </table>
          )}

          {localTab === 'insumos' && (
            <table className="w-full text-left border-collapse min-w-[700px]">
               <thead className="bg-black/80 text-[14px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700">
                 <tr>
                   <th className="p-4 cursor-pointer hover:text-sw-blue transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-2">Insumo <ArrowUpDown size={12} /></div>
                   </th>
                   <th className="p-4">Unidad</th>
                   <th className="p-4 text-right cursor-pointer hover:text-sw-blue transition-colors" onClick={() => handleSort('stock')}>
                    <div className="flex items-center justify-end gap-2">Stock <ArrowUpDown size={12} /></div>
                   </th>
                   <th className="p-4 text-right cursor-pointer hover:text-sw-blue transition-colors" onClick={() => handleSort('unitCost')}>
                    <div className="flex items-center justify-end gap-2">Costo Unitario <ArrowUpDown size={12} /></div>
                   </th>
                   {canEdit && <th className="p-4 text-right">Acciones</th>}
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-800/50">
                 {filteredMaterials.map((item: any) => (
                   <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                     <td className="p-4 font-bold text-white uppercase text-sm tracking-wider">{item.name}</td>
                     <td className="p-4 text-[14px] text-gray-400 uppercase font-bold">{item.uom}</td>
                     <td className="p-4 text-right">
                        <span className={`font-mono font-bold ${item.stock <= item.reorderPoint ? 'text-sw-red animate-pulse' : 'text-gray-300'}`}>{item.stock}</span>
                     </td>
                     <td className="p-4 text-right font-mono font-black text-sw-blue text-lg">${(item.unitCost || 0).toLocaleString('es-CL')}</td>
                     {canEdit && (
                       <td className="p-4 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => setInventoryModalId({id: item.id, type: 'raw'})} className="p-2 bg-black/50 border border-gray-700 rounded-lg text-sw-blue hover:text-white hover:bg-sw-blue transition-all">
                             <Edit2 size={16} />
                           </button>
                           <button onClick={(e) => handleDeleteMaterial(e, item.id, item.name)} className="p-2 bg-black/50 border border-gray-700 rounded-lg text-sw-red hover:text-white hover:bg-sw-red transition-all">
                             <Trash2 size={16} />
                           </button>
                         </div>
                       </td>
                     )}
                   </tr>
                 ))}
                 { filteredMaterials.length === 0 && (
                   <tr>
                     <td colSpan={5} className="p-12 text-center text-gray-600 font-bold uppercase tracking-widest text-sm">
                        No se encontraron insumos {searchTerm && `para "${searchTerm}"`}
                     </td>
                   </tr>
                 )}
               </tbody>
            </table>
          )}
        </div>
      </div>
      
      {modalService && (
        <TarifarioModal 
          service={modalService === 'new' ? null : modalService} 
          categories={categories}
          onClose={() => setModalService(null)}
          showToast={showToast}
          jobs={jobs}
          transactions={transactions}
        />
      )}

      {/* Modal Add Stock (Migrated) */}
      {showAddStockModal && (
        <div className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setShowAddStockModal(false)}>
          <div className="panel-glass rounded-2xl p-6 w-full max-w-md border border-sw-blue/30 shadow-[0_0_30px_rgba(0,168,255,0.15)] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-mono text-white tracking-widest uppercase">Ingresar Stock</h2>
              <button onClick={() => setShowAddStockModal(false)} className="text-gray-500 hover:text-sw-red transition-all"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">Insumo a reabastecer</label>
                <select 
                  value={selectedItemToAdd} 
                  onChange={(e) => setSelectedItemToAdd(e.target.value)}
                  className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white focus:border-sw-blue outline-none text-sm"
                >
                  <option value="">Seleccione...</option>
                  {rawMaterials.map((r: any) => <option key={r.id} value={r.id}>{r.name} ({r.uom})</option>)}
                </select>
              </div>
              {selectedItemToAdd && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">Cantidad a sumar</label>
                  <input 
                    type="number" 
                    value={qtyToAdd} 
                    onChange={(e) => setQtyToAdd(e.target.value)}
                    className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white font-mono text-xl focus:border-sw-blue outline-none"
                    placeholder="Ej: 5"
                  />
                </div>
              )}
              <button 
                onClick={handleAddStock}
                disabled={!selectedItemToAdd || !qtyToAdd}
                className="w-full py-4 mt-4 rounded-xl bg-sw-blue text-black font-bold uppercase tracking-widest disabled:opacity-50 hover:bg-sw-blue/80 transition-all shadow-[0_0_20px_rgba(0,168,255,0.2)]"
              >
                Actualizar Inventario
              </button>
            </div>
          </div>
        </div>
      )}

      {exportModal && (
        <ExportDataModal 
          title={exportModal.title}
          data={exportModal.data}
          columns={exportModal.columns}
          onClose={() => setExportModal(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
};

export const UsersView = ({ users, setUsers, showToast, currentUser, setUserModalId, setShowUserCreateModal }: any) => {
  const isSuperAdmin = currentUser?.email === 'inversioneselcactus@gmail.com' || currentUser?.email === 'daelpaso.digital@gmail.com';
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const PREDEFINED_PERMISSIONS = [
    { id: 'write_pos', label: 'Crear Ventas (POS)', roles: ['Admin', 'Cajero'] },
    { id: 'write_workshop', label: 'Gestionar Taller', roles: ['Admin', 'Operario'] },
    { id: 'manage_shifts', label: 'Abrir/Cerrar Turnos', roles: ['Admin', 'Cajero'] },
    { id: 'view_reports', label: 'Ver Reportes', roles: ['Admin', 'Visualizador'] },
    { id: 'edit_inventory', label: 'Editar Inventario', roles: ['Admin'] },
    { id: 'edit_pricing', label: 'Editar Tarifas', roles: ['Admin'] },
    { id: 'edit_users', label: 'Gestionar Usuarios', roles: ['Admin'] }
  ];

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredUsers = users.filter((u: any) => 
    (u.isActive !== false && u.active !== false) &&
    (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     u.role?.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a: any, b: any) => {
    const aValue = a[sortConfig.key] || '';
    const bValue = b[sortConfig.key] || '';
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="panel-glass p-6 rounded-xl border-t-4 border-sw-blue">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
        <div>
          <h3 className="text-2xl font-bold sw-title-font text-sw-blue tracking-widest flex items-center gap-3"><Shield size={28} /> PERSONAL DE LA ESTRELLA</h3>
          <p className="text-gray-500 text-[14px] font-bold uppercase tracking-widest mt-1">Gestión de roles y accesos al sistema</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          {/* User Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text"
              placeholder="Buscar personal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:border-sw-blue outline-none transition-all"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => setShowExportModal(true)} className="btn-jedi p-2 rounded-lg flex-1 sm:flex-none flex justify-center" title="Exportar Personal"><Download size={20} /></button>
            <button 
              onClick={() => setShowUserCreateModal(true)}
              className="btn-jedi px-4 py-2 rounded-lg font-bold uppercase tracking-widest flex items-center justify-center gap-2 flex-1 sm:flex-none"
            >
              <UserPlus size={18} /> RECLUTAR
            </button>
          </div>
        </div>
      </div>

      {showExportModal && (
        <ExportDataModal 
          title="Personal StarParks"
          data={users}
          columns={[
            { header: 'Nombre', key: 'name' },
            { header: 'Email', key: 'email' },
            { header: 'Rol', key: 'role' }
          ]}
          onClose={() => setShowExportModal(false)}
          showToast={showToast}
        />
      )}

      <div className="flex items-center gap-4 py-2 border-b border-gray-800/50 mb-6">
        <span className="text-[14px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2 px-2"><ArrowUpDown size={12}/> Ordenar por:</span>
        <button onClick={() => handleSort('name')} className={`text-[14px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${sortConfig.key === 'name' ? 'bg-sw-blue/20 border-sw-blue text-sw-blue' : 'bg-black/40 border-gray-800 text-gray-500'}`}>Nombre</button>
        <button onClick={() => handleSort('role')} className={`text-[14px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${sortConfig.key === 'role' ? 'bg-sw-blue/20 border-sw-blue text-sw-blue' : 'bg-black/40 border-gray-800 text-gray-500'}`}>Rol</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filteredUsers.map((user: any) => (
          <div 
            key={user.id} 
            onClick={() => setUserModalId(user.id)}
            className="bg-black/60 p-6 rounded-xl border border-gray-800 relative overflow-hidden group cursor-pointer hover:border-sw-blue transition-all hover:scale-[1.02]"
          >
             <div className={`absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rotate-45 ${user.role === 'Admin' ? 'bg-sw-red' : user.role === 'Cajero' ? 'bg-sw-yellow' : 'bg-sw-blue'}`}></div>
             <div className="relative z-10">
               <div className="text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-1">{user.role}</div>
               <div className="text-2xl font-black text-white mb-2 sw-title-font">{user.name}</div>
               <div className="text-[14px] text-gray-500 font-mono mb-4 truncate">{user.email}</div>
               
               <div className="flex justify-between items-center pt-4 border-t border-gray-800/50">
                 <div className="text-[14px] font-bold text-sw-blue uppercase tracking-widest">Ver Expediente</div>
                 <Shield size={16} className="text-sw-blue/40" />
               </div>
             </div>
          </div>
        ))}
        { filteredUsers.length === 0 && (
           <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-800 rounded-2xl text-gray-600 font-bold uppercase tracking-[0.2em] text-sm">
             No se encontraron usuarios {searchTerm && `para "${searchTerm}"`}
           </div>
        )}
      </div>
    </div>
  );
};



export const ClientsView = ({ clients, setClients, showToast, setClientModalId, resetDatabase, isAdmin, systemSettings, categories, jobs = [] }: any) => {
  const loyaltyConfig = systemSettings?.loyalty || { enabled: true, requiredVisits: 6, rewardDiscount: 100 };
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deletePin, setDeletePin] = useState('');

  const toggleClientSelection = (id: string) => {
    const newSelected = new Set(selectedClientIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedClientIds(newSelected);
  };

  const handleSelectAllOnPage = () => {
    const newSelected = new Set(selectedClientIds);
    const allSelected = paginatedClients.every((c: any) => selectedClientIds.has(c.id));
    
    paginatedClients.forEach((c: any) => {
      if (allSelected) {
        newSelected.delete(c.id);
      } else {
        newSelected.add(c.id);
      }
    });
    setSelectedClientIds(newSelected);
  };

  const handleBulkDelete = async () => {
    if (deletePin !== '1124') {
      showToast('PIN Incorrecto', 'error');
      return;
    }
    
    try {
      const idsToDelete = Array.from(selectedClientIds);
      showToast(`Eliminando ${idsToDelete.length} clientes...`, 'info');
      
      for (const clientId of idsToDelete) {
        if (typeof clientId === 'string') {
          await deleteDoc(doc(db, 'clients', clientId));
        }
      }
      
      showToast(`${idsToDelete.length} clientes eliminados permanentemente`, 'success');
      setSelectedClientIds(new Set());
      setIsDeleteMode(false);
      setShowBulkDeleteConfirm(false);
      setDeletePin('');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'clients');
      showToast('Error en eliminación masiva', 'error');
    }
  };

  const handleDeleteClient = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!isAdmin) {
      showToast('No tiene permisos para eliminar clientes', 'error');
      return;
    }
    if (!window.confirm(`¿Está seguro de que desea ELIMINAR PERMANENTEMENTE al cliente "${name}"? Esta acción borrará su historial local.`)) return;
    try {
      await deleteDoc(doc(db, 'clients', id));
      showToast(`Cliente "${name}" eliminado exitosamente`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'clients');
      showToast('Error al eliminar cliente', 'error');
    }
  };

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredClients = clients.filter((c: any) => 
    (c.isActive !== false && c.active !== false) &&
    (c.plate?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     c.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     c.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a: any, b: any) => {
    const aValue = a[sortConfig.key] || '';
    const bValue = b[sortConfig.key] || '';
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalItems = filteredClients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="panel-glass p-6 rounded-xl border-t-4 border-sw-yellow">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
          <h3 className="text-2xl font-bold sw-title-font text-sw-yellow tracking-widest flex items-center gap-3"><Users size={28} /> BASE DE DATOS DE CLIENTES</h3>
          <p className="text-gray-500 text-[14px] font-bold uppercase tracking-widest mt-1">Historial, frecuencia y datos de contacto</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          {/* Client Search */}
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold" size={18} />
            <input 
              type="text"
              placeholder="Buscar por Patente, Nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/50 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white font-black uppercase tracking-widest focus:border-sw-yellow outline-none transition-all placeholder:text-gray-700 shadow-lg"
            />
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <button 
                onClick={() => {
                  setIsDeleteMode(!isDeleteMode);
                  if (isDeleteMode) setSelectedClientIds(new Set());
                }} 
                className={`p-3 rounded-xl shadow-lg transition-all border ${isDeleteMode ? 'bg-sw-red text-white border-sw-red scale-110' : 'bg-black/40 border-gray-800 text-sw-red hover:border-sw-red'}`}
                title={isDeleteMode ? "Cancelar Selección" : "Eliminar Contactos (Múltiple)"}
              >
                <Trash2 size={20} />
              </button>
            )}
            <button onClick={() => setShowExportModal(true)} className="btn-gold p-3 rounded-xl shadow-lg hover:scale-105 transition-all text-[14px]" title="Exportar Clientes"><Download size={20} /></button>
          </div>
        </div>
      </div>

      {isDeleteMode && (
        <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4 p-4 rounded-2xl bg-sw-red/5 border border-sw-red/20 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-4">
            <div className="bg-sw-red/20 p-2 rounded-lg">
              <Trash2 size={24} className="text-sw-red" />
            </div>
            <div>
              <div className="text-sw-red font-black uppercase tracking-widest text-sm">Modo Eliminación Activo</div>
              <div className="text-[14px] text-gray-400 font-bold uppercase tracking-widest">
                Seleccionados <span className="text-sw-red">{selectedClientIds.size}</span> de <span className="text-white">{clients.length}</span> contactos
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setSelectedClientIds(new Set())}
              className="px-6 py-3 rounded-xl border border-gray-800 text-gray-500 font-bold uppercase tracking-widest text-[12px] hover:text-white transition-all"
            >
              Limpiar Selección
            </button>
            <button 
              onClick={() => {
                if (selectedClientIds.size === 0) {
                  showToast('Debe seleccionar al menos un contacto', 'warning');
                  return;
                }
                setShowBulkDeleteConfirm(true);
              }}
              disabled={selectedClientIds.size === 0}
              className="px-8 py-3 rounded-xl bg-sw-red text-white font-black uppercase tracking-widest text-[12px] hover:scale-105 transition-all shadow-[0_0_20px_rgba(231,76,60,0.3)] disabled:opacity-50 disabled:hover:scale-100"
            >
              ELIMINAR SELECCIONADOS ({selectedClientIds.size})
            </button>
          </div>
        </div>
      )}

      {showExportModal && (
        <ExportDataModal 
          title="Base de Clientes"
          data={[...clients]
            .sort((a: any, b: any) => (a.plate || '').localeCompare(b.plate || ''))
            .map(cli => {
              const clientJobs = jobs.filter((j: any) => j.plate === cli.plate && j.status === 'Entregado');
              const totalSales = clientJobs.reduce((sum: number, j: any) => sum + (j.total || 0), 0);
              const lastJob = [...clientJobs].sort((a: any, b: any) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())[0];
              const lastVisit = lastJob ? new Date(lastJob.entryDate).toLocaleDateString('es-CL') : 'Sin visitas';
              const modelName = categories.find((c: any) => c.id === cli.lastVehicleTypeId)?.name || 'N/A';

              return {
                ...cli,
                modelName,
                lastVisit,
                totalSalesText: `$${totalSales.toLocaleString('es-CL')}`
              };
            })
          }
          columns={[
            { header: 'Patente', key: 'plate' },
            { header: 'Modelo', key: 'modelName' },
            { header: 'Nombre del Cliente', key: 'name' },
            { header: 'Contacto', key: 'phone' },
            { header: 'Última Visita', key: 'lastVisit' },
            { header: 'Ventas Históricas', key: 'totalSalesText' }
          ]}
          onClose={() => setShowExportModal(false)}
          showToast={showToast}
        />
      )}

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className="bg-black/80 text-[14px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700">
            <tr>
              <th className="p-4 w-10 text-center">
                {isDeleteMode && (
                  <button 
                    onClick={handleSelectAllOnPage}
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${paginatedClients.every((c: any) => selectedClientIds.has(c.id)) ? 'bg-sw-red border-sw-red text-white' : 'border-gray-700 hover:border-sw-red'}`}
                    title="Seleccionar todos en esta página"
                  >
                    {paginatedClients.every((c: any) => selectedClientIds.has(c.id)) && <UserCheck size={14} />}
                  </button>
                )}
              </th>
              <th onClick={() => handleSort('plate')} className="p-4 cursor-pointer hover:text-sw-yellow transition-colors group">
                <div className="flex items-center gap-2">Patente {sortConfig.key === 'plate' && <ArrowUpDown size={12} className={sortConfig.direction === 'asc' ? '' : 'rotate-180'} />}</div>
              </th>
              <th className="p-4">Modelo Hab.</th>
              <th onClick={() => handleSort('name')} className="p-4 cursor-pointer hover:text-sw-yellow transition-colors group">
                <div className="flex items-center gap-2">Nombre / Cliente {sortConfig.key === 'name' && <ArrowUpDown size={12} className={sortConfig.direction === 'asc' ? '' : 'rotate-180'} />}</div>
              </th>
              <th className="p-4">Contacto</th>
              <th onClick={() => handleSort('visits')} className="p-4 text-center cursor-pointer hover:text-sw-yellow transition-colors group">
                <div className="flex items-center justify-center gap-2">Visitas {sortConfig.key === 'visits' && <ArrowUpDown size={12} className={sortConfig.direction === 'asc' ? '' : 'rotate-180'} />}</div>
              </th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {paginatedClients.map((cli: any) => (
              <tr 
                key={cli.id} 
                className={`hover:bg-white/5 transition-colors cursor-pointer ${selectedClientIds.has(cli.id) ? 'bg-sw-red/5 border-l-4 border-l-sw-red' : ''}`} 
                onClick={() => isDeleteMode ? toggleClientSelection(cli.id) : setClientModalId(cli.id)}
              >
                <td className="p-4 text-center">
                  {isDeleteMode ? (
                    <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${selectedClientIds.has(cli.id) ? 'bg-sw-red border-sw-red text-white shadow-[0_0_15px_rgba(231,76,60,0.3)]' : 'border-gray-800 text-transparent'}`}>
                      <Trash2 size={16} />
                    </div>
                  ) : (
                    <button 
                      onClick={async (e) => { 
                        e.stopPropagation(); 
                        try {
                          await updateDoc(doc(db, 'clients', cli.id), { isVIP: !cli.isVIP });
                          showToast(cli.isVIP ? 'Cliente removido de VIP' : '¡Cliente marcado como VIP!', 'success');
                        } catch (err: any) {
                          handleFirestoreError(err, OperationType.UPDATE, 'clients');
                        }
                      }}
                      className={`p-1.5 rounded-lg transition-all ${cli.isVIP ? 'text-sw-yellow bg-sw-yellow/20 shadow-[0_0_10px_rgba(255,232,31,0.3)]' : 'text-gray-600 hover:text-sw-yellow'}`}
                      title={cli.isVIP ? "Remover VIP" : "Marcar como VIP"}
                    >
                      <Star size={20} className={cli.isVIP ? 'fill-sw-yellow' : ''} />
                    </button>
                  )}
                </td>
                <td className="p-4 font-mono text-2xl font-black text-sw-blue py-6">{cli.plate}</td>
                <td className="p-4">
                  <div className="text-[14px] text-gray-500 font-bold uppercase mb-1">Último Modelo</div>
                  <div className="text-[14px] font-bold text-white uppercase tracking-widest">
                    {categories.find((c: any) => c.id === cli.lastVehicleTypeId)?.name || 'Sin registro'}
                  </div>
                </td>
                <td className="p-4 font-bold text-gray-300 uppercase tracking-wide text-sm">{cli.name}</td>
                <td className="p-4">
                  <div className="text-[14px] font-mono text-gray-400">{cli.phone}</div>
                  <div className="text-[14px] text-gray-600">{cli.email}</div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-sw-yellow font-mono font-black">{cli.visits} Visitas Totales</div>
                    {loyaltyConfig.enabled && (
                    <div className="inline-flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-gray-800 relative">
                      {[...Array(loyaltyConfig.requiredVisits)].map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i < (cli.visits % (loyaltyConfig.requiredVisits + 1)) ? 'bg-sw-green shadow-[0_0_8px_rgba(46,204,113,0.6)]' : 'bg-gray-700'}`}></div>
                      ))}
                      <div className={`w-5 h-5 ml-1 flex items-center justify-center rounded-full border ${cli.visits > 0 && (cli.visits % (loyaltyConfig.requiredVisits + 1)) === loyaltyConfig.requiredVisits ? 'bg-sw-yellow/20 border-sw-yellow text-sw-yellow animate-pulse shadow-[0_0_10px_rgba(255,232,31,0.5)]' : 'bg-black/50 border-gray-700 text-gray-600'}`}>
                        <Sparkles size={12} />
                      </div>
                      
                      {cli.visits >= (loyaltyConfig.requiredVisits + 1) * 2 && (
                        <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-sw-blue animate-bounce">
                          <Star size={20} className="fill-sw-blue shadow-[0_0_15px_rgba(0,168,255,0.5)]" />
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex justify-end items-center gap-3">
                    {cli.visits > 0 && (cli.visits % 7) === 6 && (
                      <span className="bg-sw-green/20 text-sw-green border border-sw-green/30 px-2 py-1 rounded-md text-[14px] font-bold uppercase tracking-widest flex items-center gap-1 animate-pulse" title="Próximo lavado gratis">
                        <Gift size={12} /> Gratis
                      </span>
                    )}
                    {cli.phone && (
                      <a href={`https://wa.me/${cli.phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-2 text-sw-green hover:bg-sw-green/20 rounded-lg transition-colors border border-transparent hover:border-sw-green/30" title="Contactar por WhatsApp">
                        <MessageCircle size={18} />
                      </a>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); setClientModalId(cli.id); }} className="p-2 text-gray-500 hover:text-sw-blue transition-colors rounded-lg hover:bg-sw-blue/10 border border-transparent hover:border-sw-blue/30" title="Editar / Ver Detalle">
                      <Edit2 size={18} />
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={(e) => handleDeleteClient(e, cli.id, cli.name)} 
                        className="p-2 text-gray-500 hover:text-sw-red transition-colors rounded-lg hover:bg-sw-red/10 border border-transparent hover:border-sw-red/30" 
                        title="Eliminar Cliente"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 panel-glass p-4 rounded-xl border border-gray-800">
          <div className="text-[14px] font-black text-gray-500 uppercase tracking-[0.3em]">
            Mostrando <span className="text-white">{startIndex}</span> - <span className="text-white">{Math.min(startIndex + itemsPerPage, totalItems)}</span> de <span className="text-sw-yellow">{totalItems}</span> contactos
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-black/40 border border-gray-800 text-gray-500 hover:text-sw-yellow disabled:opacity-30 disabled:hover:text-gray-500 transition-all font-bold"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum = i + 1;
                // Basic logic to show pages around current
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 3 + i + 1;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-[14px] font-black transition-all ${currentPage === pageNum ? 'bg-sw-yellow text-black shadow-[0_0_10px_rgba(255,232,31,0.3)]' : 'bg-black/20 text-gray-500 hover:text-white border border-gray-800'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-black/40 border border-gray-800 text-gray-500 hover:text-sw-yellow disabled:opacity-30 disabled:hover:text-gray-500 transition-all font-bold"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
      {showBulkDeleteConfirm && (
        <div key="bulk-delete-confirm-overlay" className="fixed inset-0 z-[400] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="panel-glass rounded-3xl p-8 w-full max-w-md border border-sw-red/30 shadow-[0_0_50px_rgba(231,76,60,0.2)] space-y-8"
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-sw-red/10 rounded-full flex items-center justify-center border border-sw-red/30 mx-auto">
                <AlertTriangle size={40} className="text-sw-red animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">¿Confirmar Eliminación?</h2>
              <p className="text-gray-400 text-[14px] font-bold uppercase tracking-widest leading-relaxed">
                Estás a punto de borrar <span className="text-sw-red font-black">{selectedClientIds.size}</span> contactos de la base de datos de manera PERMANENTE.
              </p>
            </div>

            <div className="max-h-40 overflow-y-auto custom-scrollbar p-4 bg-black/40 rounded-xl border border-gray-800 space-y-2">
              <p className="text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2 border-b border-gray-800 pb-2">Contactos seleccionados:</p>
              {Array.from(selectedClientIds).map(id => {
                const client = clients.find((c: any) => c.id === id);
                return (
                  <div key={id} className="flex justify-between items-center text-[12px] font-mono">
                    <span className="text-sw-blue font-black">{client?.plate}</span>
                    <span className="text-gray-400 truncate max-w-[150px]">{client?.name}</span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4 text-center">
              <label className="block text-[12px] font-black text-sw-red uppercase tracking-widest">Ingrese PIN de Administrador (1124)</label>
              <input 
                type="password" 
                maxLength={4}
                value={deletePin}
                onChange={(e) => setDeletePin(e.target.value)}
                className="w-full bg-black/60 border border-sw-red/30 rounded-2xl p-4 text-center text-3xl font-mono tracking-[0.5em] text-white outline-none focus:border-sw-red transition-all"
                placeholder="****"
              />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => { setShowBulkDeleteConfirm(false); setDeletePin(''); }}
                className="flex-1 py-4 rounded-xl border border-gray-800 text-gray-500 font-bold uppercase tracking-widest text-[14px] hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleBulkDelete}
                disabled={deletePin !== '1124'}
                className="flex-1 py-4 rounded-xl bg-sw-red text-white font-black uppercase tracking-widest text-[14px] hover:scale-105 transition-all shadow-[0_0_30px_rgba(231,76,60,0.4)] disabled:opacity-30 disabled:hover:scale-100"
              >
                BORRAR TODO
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export const ConfigView = ({ 
  a11y, setA11y, showToast, 
  users, setUsers, currentUser, 
  setUserModalId, setShowUserCreateModal,
  hasPermission,
  impersonatedUserId, setImpersonatedUserId,
  realUserEmail, resetDatabase,
  systemSettings,
  services, setServices, categories,
  syncMasterData,
  rawMaterials, setRawMaterials,
  storeProducts, setStoreProducts,
  setInventoryModalId,
  jobs, transactions, systemLogs
}: any) => {
  const [activeTab, setActiveTab] = useState('general');
  const [showAdvancedWarning, setShowAdvancedWarning] = useState(false);
  const [showAdvancedPin, setShowAdvancedPin] = useState(false);
  const [isAdvancedUnlocked, setIsAdvancedUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const ADVANCED_PIN = '314211';

  const handleAdvancedTabClick = () => {
    if (isAdvancedUnlocked) {
      setActiveTab('avanzado');
    } else {
      setShowAdvancedWarning(true);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin === ADVANCED_PIN) {
      setIsAdvancedUnlocked(true);
      setShowAdvancedPin(false);
      setActiveTab('avanzado');
      showToast('Sección Avanzada Desbloqueada', 'success');
    } else {
      showToast('PIN Incorrecto', 'error');
      setEnteredPin('');
    }
  };

  const isDeveloper = realUserEmail === 'daelpaso.digital@gmail.com';
  const isSuperAdmin = realUserEmail === 'inversioneselcactus@gmail.com' || currentUser?.email === 'inversioneselcactus@gmail.com' || isDeveloper;
  const isAdmin = currentUser?.role === 'Admin' || isSuperAdmin;
  const canEditPricing = hasPermission('edit_pricing');
  const [selectedSimUser, setSelectedSimUser] = useState(impersonatedUserId || '');

  const loyaltyConfig = systemSettings?.loyalty || { enabled: true, requiredVisits: 6, rewardDiscount: 100 };
  const handleSaveLoyalty = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin) return;
    const formData = new FormData(e.currentTarget);
    const newVal = {
      enabled: formData.get('enabled') === 'on',
      requiredVisits: parseInt(formData.get('requiredVisits') as string, 10),
      rewardDiscount: parseFloat(formData.get('rewardDiscount') as string)
    };
    
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...systemSettings,
        loyalty: newVal
      }, { merge: true });
      showToast('Configuraciones guardadas', 'success');
    } catch {
      showToast('Error al guardar configuraciones', 'error');
    }
  };


  const emailConfig = {
    notifyAdmin: true,
    adminEmail: 'inversioneselcactus@gmail.com',
    copyEmail: 'starparkschile@gmail.com'
  };

  const fontSizes = [
    { id: 'small', label: 'Pequeño' },
    { id: 'medium', label: 'Normal' },
    { id: 'large', label: 'Grande' },
    { id: 'xlarge', label: 'Extra Grande' },
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    try {
      showToast('Generando punto de restauración...', 'info');
      // Fetch all core collections except users mapping
      const collectionsToExport = ['services', 'categories', 'storeProducts', 'rawMaterials', 'settings', 'clients', 'shifts', 'jobs', 'calendarEvents', 'transactions'];
      const backupData: any = {};
      
      for (const col of collectionsToExport) {
        backupData[col] = [];
        try {
          const snapshot = await getDocs(collection(db, col));
          snapshot.forEach(docSnap => {
            backupData[col].push({ id: docSnap.id, ...docSnap.data() });
          });
        } catch (e) {
          console.warn(`Collection ${col} failed to backup`, e);
        }
      }
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `starparks_backup_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('Punto de restauración creado y descargado', 'success');
    } catch (e: any) {
      console.error(e);
      showToast('Error al crear punto de restauración', 'error');
    }
  };

  const handleRestoreClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleRestoreUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('¿ESTÁ SEGURO? Esta acción SOBRESCRIBIRÁ las bases de datos con el contenido del archivo subido. Recomendamos crear un punto de restauración antes de proceder.')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        showToast('Cargando datos de restauración...', 'info');
        
        for (const col of Object.keys(json)) {
          const docs = json[col];
          if (!Array.isArray(docs)) continue;
          
          for (const item of docs) {
            const { id, ...data } = item;
            if (id) {
              await setDoc(doc(db, col, id), data);
            }
          }
        }
        
        showToast('Restauración completada. Recargando...', 'success');
        setTimeout(() => window.location.reload(), 3000);
      } catch (err) {
        console.error(err);
        showToast('Error al leer o importar el archivo', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleWipeAndRestore = async () => {
    if (!window.confirm("¿ESTAS SEGURO? ESTO CONSOLIDARÁ LAS BASES DE DATOS MAESTROS: Limpiará turnos, trabajos, transacciones y clientes (dejando 10 de ejemplo), pero MANTENDRÁ Servicios, Productos y Usuarios con sus permisos.")) return;
    try {
      showToast('Consolidando Base de Datos (1/2)...', 'info');
      // Only transactional and transient collections
      const collectionsToWipe = ['clients', 'shifts', 'jobs', 'calendarEvents', 'transactions', 'shifts_audit'];
      
      for (const col of collectionsToWipe) {
        try {
          const querySnapshot = await getDocs(collection(db, col));
          for (const document of querySnapshot.docs) {
            await deleteDoc(doc(db, col, document.id));
          }
        } catch (err) {
          console.warn(`Error limpiando colección ${col}:`, err);
        }
      }

      showToast('Restaurando 10 Contactos de Ejemplo (2/2)...', 'info');
      const lines = NEW_CLIENTS_DATA.split('\n');
      const countToRestore = Math.min(lines.length, 12);
      for (let i = 1; i < countToRestore; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [plate, name, phone, type, description] = line.split(',');
        
        // Search in current categories to maintain linkage
        let targetCat = '';
        if (type) {
          const typeStr = type.trim().toUpperCase();
          const found = categories.find((c: any) => c.name === typeStr);
          if (found) targetCat = found.id;
        }

        const nc = { 
          id: `cli_${Date.now()}_${i}`, 
          plate: (plate || '').trim(), 
          name: (name || '').trim(), 
          phone: (phone || '').trim(), 
          email: '', 
          lastVehicleTypeId: targetCat,
          date: Date.now(), 
          visits: 0 
        };
        if (nc.plate) {
           await setDoc(doc(db, 'clients', nc.id), nc);
        }
      }

      showToast('CONSOLIDACIÓN EXITOSA', 'success');
      setTimeout(() => window.location.reload(), 2000);
    } catch (e: any) {
      console.error(e);
      showToast('Error en la consolidación', 'error');
    }
  };

  const handleImportCSVData = async () => {
    if (!window.confirm("¿ESTAS SEGURO? Se cargarán cientos de contactos maestros a la base de datos de Clientes.")) return;
    try {
      showToast('Cargando base de datos de clientes...', 'info');
      const lines = NEW_CLIENTS_DATA.split('\n');
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [plate, name, phone, type, description] = line.split(',');
        
        // Search in current categories to maintain linkage
        let targetCat = '';
        if (type) {
          const typeStr = type.trim().toUpperCase();
          const found = categories.find((c: any) => c.name === typeStr);
          if (found) targetCat = found.id;
        }

        const nc = { 
          id: `cli_${Date.now()}_${i}`, 
          plate: (plate || '').trim(), 
          name: (name || '').trim(), 
          phone: (phone || '').trim(), 
          email: '', 
          lastVehicleTypeId: targetCat,
          date: Date.now(), 
          visits: 0 
        };
        if (nc.plate) {
           await setDoc(doc(db, 'clients', nc.id), nc);
           count++;
        }
      }
      showToast(`EXITO: ${count} contactos cargados y registrados.`, 'success');
    } catch (e: any) {
      console.error(e);
      showToast('Error al cargar contactos maestos', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-gray-800">
        <button 
          onClick={() => setActiveTab('general')}
          className={`px-6 py-3 font-bold uppercase tracking-widest text-[14px] transition-all border-b-2 ${activeTab === 'general' ? 'border-sw-blue text-sw-blue bg-sw-blue/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          General y Visual
        </button>
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('usuarios')}
            className={`px-6 py-3 font-bold uppercase tracking-widest text-[14px] transition-all border-b-2 ${activeTab === 'usuarios' ? 'border-sw-yellow text-sw-yellow bg-sw-yellow/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            Gestión de Personal
          </button>
        )}
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('loyalty')}
            className={`px-6 py-3 font-bold uppercase tracking-widest text-[14px] transition-all border-b-2 ${activeTab === 'loyalty' ? 'border-sw-green text-sw-green bg-sw-green/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            Fidelización (VIP)
          </button>
        )}
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('tarifario')}
            className={`px-6 py-3 font-bold uppercase tracking-widest text-[14px] transition-all border-b-2 ${activeTab === 'tarifario' ? 'border-sw-yellow text-sw-yellow bg-sw-yellow/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            Tarifario
          </button>
        )}
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('logs')}
            className={`px-6 py-3 font-bold uppercase tracking-widest text-[14px] transition-all border-b-2 ${activeTab === 'logs' ? 'border-sw-blue text-sw-blue bg-sw-blue/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            Acciones Manuales
          </button>
        )}
        {isAdmin && (
          <button 
            onClick={handleAdvancedTabClick}
            className={`px-6 py-3 font-bold uppercase tracking-widest text-[14px] transition-all border-b-2 ${activeTab === 'avanzado' ? 'border-sw-red text-sw-red bg-sw-red/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            Mantenimiento 
          </button>
        )}
        {isDeveloper && (
          <button 
            onClick={() => setActiveTab('dev')}
            className={`px-6 py-3 font-bold uppercase tracking-widest text-[14px] transition-all border-b-2 ${activeTab === 'dev' ? 'border-sw-red text-sw-red bg-sw-red/5' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
          >
            Dev Options
          </button>
        )}
      </div>

      {activeTab === 'dev' && isDeveloper && (
        <div className="panel-glass p-8 rounded-2xl border border-sw-red/30 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 text-sw-red">
            <div className="w-12 h-12 rounded-full bg-sw-red/20 flex items-center justify-center border border-sw-red/50">
              <RefreshCcw size={28} className="animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-2xl font-black sw-title-font uppercase tracking-widest">Opciones de Desarrollador</h2>
              <p className="text-gray-500 text-[14px] font-bold uppercase tracking-[0.2em]">Simulación de Entorno y Permisos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block text-[14px] font-bold text-gray-400 uppercase tracking-widest">Seleccionar Identidad a Simular</label>
              <div className="flex gap-3">
                <select 
                  value={selectedSimUser}
                  onChange={(e) => setSelectedSimUser(e.target.value)}
                  className="flex-1 bg-black/50 border border-gray-800 rounded-xl p-4 text-white font-mono text-sm outline-none focus:border-sw-red transition-all"
                >
                  <option value="">(Usuario Real)</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
                <button 
                  onClick={() => setImpersonatedUserId(selectedSimUser || null)}
                  className={`px-6 rounded-xl font-bold uppercase tracking-widest text-[14px] flex items-center gap-2 transition-all ${selectedSimUser ? 'bg-sw-red text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                >
                  {selectedSimUser ? <UserCheck size={18} /> : <UserX size={18} />}
                  Simular
                </button>
              </div>
              <p className="text-[14px] text-gray-600 font-mono leading-relaxed">
                Al activar la simulación, la aplicación se recargará y actuará como si fueras el usuario seleccionado. 
                Los permisos y la vista se ajustarán dinámicamente.
              </p>
            </div>

            <div className="p-6 bg-sw-red/5 border border-sw-red/20 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-sw-red uppercase tracking-widest">Estado de Simulación</h3>
              <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl">
                <span className="text-[14px] text-gray-400">Usuario Activo:</span>
                <span className="text-[14px] font-mono font-bold text-white">{currentUser?.name}</span>
              </div>
              <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl">
                <span className="text-[14px] text-gray-400">Rol Detectado:</span>
                <span className={`text-[14px] font-bold uppercase px-2 py-0.5 rounded ${currentUser?.role === 'Admin' ? 'bg-sw-red/20 text-sw-red' : 'bg-sw-blue/20 text-sw-blue'}`}>
                  {currentUser?.role}
                </span>
              </div>
              {impersonatedUserId && (
                <button 
                  onClick={() => setImpersonatedUserId(null)}
                  className="w-full py-3 mt-2 bg-gray-800 hover:bg-white/10 text-white rounded-xl text-[14px] font-bold uppercase tracking-widest transition-all"
                >
                  Detener Simulación y Volver a Real
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tarifario' && isAdmin && (
        <PricingView 
          services={services} 
          setServices={setServices} 
          categories={categories} 
          showToast={showToast} 
          hasPermission={hasPermission} 
          syncMasterData={syncMasterData}
          rawMaterials={rawMaterials}
          setRawMaterials={setRawMaterials}
          storeProducts={storeProducts}
          setStoreProducts={setStoreProducts}
          setInventoryModalId={setInventoryModalId}
          jobs={jobs}
          transactions={transactions}
          isAdmin={isAdmin}
        />
      )}

      {activeTab === 'logs' && isAdmin && (
        <ManualActionsView systemLogs={systemLogs || []} showToast={showToast} />
      )}

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="panel-glass p-8 rounded-2xl border border-sw-blue/20">
            <h3 className="text-xl font-black text-sw-blue uppercase tracking-tighter mb-6 flex items-center gap-3">
              <Shield size={24} /> Accesibilidad y Visualización
            </h3>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Modo de Color</p>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setA11y({...a11y, darkMode: true})}
                    className={`p-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${a11y.darkMode ? 'bg-sw-blue/10 border-sw-blue text-sw-blue' : 'bg-black/20 border-gray-800 text-gray-500'}`}
                  >
                    Modo Oscuro
                  </button>
                  <button 
                    onClick={() => setA11y({...a11y, darkMode: false})}
                    className={`p-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${!a11y.darkMode ? 'bg-sw-yellow/10 border-sw-yellow text-sw-yellow' : 'bg-black/20 border-gray-800 text-gray-500'}`}
                  >
                    Modo Claro
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[14px] font-bold text-gray-500 uppercase tracking-widest">Tamaño de Fuente</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {fontSizes.map(f => (
                    <button 
                      key={f.id}
                      onClick={() => setA11y({...a11y, fontSize: f.id})}
                      className={`p-3 rounded-lg border text-[14px] font-bold uppercase tracking-widest transition-all ${a11y.fontSize === f.id ? 'bg-sw-green/10 border-sw-green text-sw-green' : 'bg-black/20 border-gray-800 text-gray-500'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-gray-800">
                <div>
                  <p className="text-sm font-bold text-white uppercase tracking-widest">Alto Contraste</p>
                  <p className="text-[14px] text-gray-500 uppercase tracking-widest">Mejora la legibilidad de bordes y textos</p>
                </div>
                <button 
                  onClick={() => setA11y({...a11y, highContrast: !a11y.highContrast})}
                  className={`w-12 h-6 rounded-full transition-all relative ${a11y.highContrast ? 'bg-sw-green' : 'bg-gray-800'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${a11y.highContrast ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>
            </div>
          </div>

          <div className="panel-glass p-8 rounded-2xl border border-sw-yellow/20">
            <h3 className="text-xl font-black text-sw-yellow uppercase tracking-tighter mb-6 flex items-center gap-3">
              <Package size={24} /> Notificaciones y Sistema
            </h3>

            <div className="space-y-6">
              <div className="p-4 bg-black/20 rounded-xl border border-gray-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white uppercase tracking-widest">Notificaciones por Correo</p>
                    <p className="text-[14px] text-gray-500 uppercase tracking-widest">Envío automático de Reporte Z al cerrar turno</p>
                  </div>
                  <button 
                    className={`w-12 h-6 rounded-full transition-all relative ${emailConfig.notifyAdmin ? 'bg-sw-green' : 'bg-gray-800'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${emailConfig.notifyAdmin ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-gray-800">
                  <div>
                    <label className="text-[14px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Email Administrador</label>
                    <input 
                      type="email" 
                      value={emailConfig.adminEmail}
                      readOnly
                      className="w-full bg-black/40 border border-gray-800 rounded-lg p-2 text-[14px] text-gray-400 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'loyalty' && isAdmin && (
        <div className="panel-glass p-8 rounded-2xl border border-sw-green/30 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-4">
            <h2 className="text-xl font-bold uppercase tracking-widest text-sw-green flex items-center gap-3">
              <Sparkles size={24} /> Configuración de Fidelización y VIP
            </h2>
          </div>
          
          <form onSubmit={handleSaveLoyalty} className="space-y-6 max-w-2xl">
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Configure la estrategia de retención de clientes. Esto controla cuántas visitas se necesitan para que el cliente reciba un beneficio y qué porcentaje de descuento recibe en su premio.
            </p>

            <div className="flex items-center gap-4 bg-black/40 p-4 rounded-xl border border-gray-800">
              <input 
                type="checkbox" 
                name="enabled" 
                id="loyalty_enabled" 
                defaultChecked={loyaltyConfig.enabled}
                className="w-5 h-5 accent-sw-green"
              />
              <label htmlFor="loyalty_enabled" className="text-white font-bold uppercase tracking-widest">Activar Programa de Fidelización</label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">Visitas Requeridas</label>
                <input 
                  type="number" 
                  name="requiredVisits"
                  defaultValue={loyaltyConfig.requiredVisits}
                  min="1"
                  step="1"
                  required
                  className="w-full bg-transparent border-b-2 border-gray-700 p-2 text-2xl font-mono text-white focus:border-sw-green outline-none transition-all"
                />
                <p className="text-[14px] text-gray-500 mt-2">Visitas pagadas necesarias antes de obtener la recompensa. Ej: 6 (El "7mo" lavado será con beneficio).</p>
              </div>

              <div className="bg-black/40 p-4 rounded-xl border border-gray-800">
                <label className="block text-[14px] font-bold text-gray-500 uppercase tracking-widest mb-2">Descuento del Premio (%)</label>
                <input 
                  type="number" 
                  name="rewardDiscount"
                  defaultValue={loyaltyConfig.rewardDiscount}
                  min="1"
                  max="100"
                  step="1"
                  required
                  className="w-full bg-transparent border-b-2 border-gray-700 p-2 text-2xl font-mono text-sw-yellow focus:border-sw-green outline-none transition-all"
                />
                <p className="text-[14px] text-gray-500 mt-2">100% = Servicio Gratis. Valores menores crearán un servicio "A mitad de precio" o con descuento al cumplir la meta.</p>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-800">
              <button type="submit" className="flex items-center gap-2 bg-sw-green text-black px-8 py-3 rounded-xl font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(46,204,113,0.3)] hover:scale-105 transition-all">
                <Save size={20} /> Guardar Configuración
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'usuarios' && isAdmin && (
        <UsersView 
          users={users} 
          setUsers={setUsers} 
          showToast={showToast} 
          currentUser={currentUser} 
          setUserModalId={setUserModalId} 
          setShowUserCreateModal={setShowUserCreateModal}
        />
      )}

      {activeTab === 'avanzado' && isAdmin && (
        <div className="panel-glass p-8 rounded-2xl border border-sw-red/30 animate-in fade-in max-w-4xl space-y-12">
          <div className="border-b border-gray-800 pb-6">
            <h3 className="text-2xl font-black text-sw-red uppercase tracking-widest mb-4 flex items-center gap-3">
              <Wrench size={32} /> Mantenimiento del Sistema
            </h3>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest italic">
              Centro de control global de la base de datos. Administre respaldos, consolide información y limpie registros.
            </p>
          </div>

          {/* Respaldo y Restauración */}
          <div className="space-y-6">
            <h4 className="text-xl font-bold text-sw-blue uppercase tracking-widest flex items-center gap-2 border-l-4 border-sw-blue pl-4">
              <DatabaseBackup size={24} /> Respaldo y Restauración
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4">
              <div className="space-y-4 p-6 bg-sw-blue/5 border border-sw-blue/20 rounded-xl hover:border-sw-blue/50 transition-all">
                <div className="flex items-center gap-3 text-sw-blue">
                  <Download size={24} />
                  <h5 className="font-bold uppercase tracking-tighter">Crear Punto de Restauración</h5>
                </div>
                <p className="text-[13px] text-gray-500 uppercase font-bold leading-relaxed">
                  Descarga un archivo JSON con la totalidad de los datos estructurados (Clientes, Trx, Turnos, Servicios) para recuperación.
                </p>
                <button 
                  onClick={handleBackup}
                  className="w-full py-4 bg-sw-blue/10 border border-sw-blue/50 text-sw-blue font-black uppercase tracking-[0.2em] text-[14px] rounded-xl hover:bg-sw-blue hover:text-black transition-all"
                >
                  DESCARGAR BACKUP
                </button>
              </div>

              <div className="space-y-4 p-6 bg-sw-yellow/5 border border-sw-yellow/20 rounded-xl hover:border-sw-yellow/50 transition-all">
                <div className="flex items-center gap-3 text-sw-yellow">
                  <Upload size={24} />
                  <h5 className="font-bold uppercase tracking-tighter">Restaurar Punto de Restauración</h5>
                </div>
                <p className="text-[13px] text-gray-500 uppercase font-bold leading-relaxed">
                  Sube un archivo JSON de respaldo para sobrescribir y recuperar el estado anterior del sistema al punto guardado.
                </p>
                <button 
                  onClick={handleRestoreClick}
                  className="w-full py-4 bg-sw-yellow/10 border border-sw-yellow/50 text-sw-yellow font-black uppercase tracking-[0.2em] text-[14px] rounded-xl hover:bg-sw-yellow hover:text-black transition-all"
                >
                  CARGAR ARCHIVO JSON
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleRestoreUpload} 
                  accept="application/json" 
                  className="hidden" 
                />
              </div>
            </div>
          </div>

          {/* Acciones Críticas */}
          <div className="space-y-6">
            <h4 className="text-xl font-bold text-sw-red uppercase tracking-widest flex items-center gap-2 border-l-4 border-sw-red pl-4">
              <AlertTriangle size={24} /> Operaciones Críticas (Irreversibles)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-4">
              <div className="space-y-4 p-6 bg-red-900/10 border border-sw-red/30 rounded-xl">
                <h5 className="font-bold text-white uppercase tracking-tighter">Reestablecer Aplicación por Completo</h5>
                <p className="text-[12px] text-gray-500 leading-relaxed uppercase font-bold">
                  Limpia toda la información de transacciones, turnos, clientes y consolida en blanco, manteniendo datos maestros y admins.
                </p>
                <button 
                  onClick={handleWipeAndRestore}
                  className="w-full py-3 bg-sw-red/20 border border-sw-red text-sw-red font-black uppercase tracking-widest text-[12px] rounded-xl hover:bg-sw-red hover:text-white transition-all shadow-[0_0_15px_rgba(231,76,60,0.2)]"
                >
                  CONSOLIDAR MÁSTER Y LIMPIAR
                </button>
              </div>

              <div className="space-y-4 p-6 bg-sw-blue/10 border border-sw-blue/30 rounded-xl">
                <h5 className="font-bold text-white uppercase tracking-tighter">Cargar Contactos CSV Maestra</h5>
                <p className="text-[12px] text-gray-500 leading-relaxed uppercase font-bold">
                  Importa 200+ clientes predefinidos al sistema actual, enlazándolos con las categorías vehiculares base.
                </p>
                <button 
                  onClick={handleImportCSVData}
                  className="w-full py-3 mt-auto bg-sw-blue/20 border border-sw-blue text-sw-blue font-black uppercase tracking-widest text-[12px] rounded-xl hover:bg-sw-blue hover:text-white transition-all shadow-[0_0_15px_rgba(0,168,255,0.2)]"
                >
                  CARGAR CONTACTOS MÁSTER
                </button>
              </div>

              <div className="space-y-4 p-6 bg-red-900/10 border border-sw-red/30 rounded-xl">
                <h5 className="font-bold text-white uppercase tracking-tighter">Eliminar Base de Datos Clientes</h5>
                <p className="text-[12px] text-gray-500 leading-relaxed uppercase font-bold">
                  Elimina todos los clientes y vehículos. Las transacciones y turnos se mantienen, pero perderán referencia nominal.
                </p>
                <button 
                  onClick={resetDatabase}
                  className="w-full py-3 bg-sw-red/20 border border-sw-red text-sw-red font-black uppercase tracking-widest text-[12px] rounded-xl hover:bg-sw-red hover:text-white transition-all shadow-[0_0_15px_rgba(231,76,60,0.2)]"
                >
                  VACIAR LISTA DE CONTACTOS
                </button>
              </div>

              <div className="space-y-4 p-6 bg-red-900/10 border border-sw-red/30 rounded-xl">
                <h5 className="font-bold text-white uppercase tracking-tighter">Sincronizar Tarifarios Maestros</h5>
                <p className="text-[12px] text-gray-500 leading-relaxed uppercase font-bold">
                  Restablece únicamente servicios, categorías e insumos a valores definidos por defecto.
                </p>
                <button 
                  onClick={syncMasterData}
                  className="w-full mt-auto py-3 bg-sw-red/20 border border-sw-red text-sw-red font-black uppercase tracking-widest text-[12px] rounded-xl hover:bg-sw-red hover:text-white transition-all shadow-[0_0_15px_rgba(231,76,60,0.2)]"
                >
                  FORZAR SINCRONIZACIÓN MÁSTER
                </button>
              </div>
            </div>
          </div>

          {/* Historial de Cambios / Changelog */}
          <div className="space-y-6 pt-4">
            <h4 className="text-xl font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 border-l-4 border-gray-600 pl-4">
              <History size={24} /> Notas de Versión / Historial de Desarrollador
            </h4>
            <div className="pl-4">
              <div className="bg-black/40 border border-gray-800 rounded-xl p-6 space-y-4 custom-scrollbar max-h-64 overflow-y-auto">
                
                <div className="border-b border-gray-800 pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sw-green font-bold uppercase tracking-widest text-sm">v1.2.0 - Consolidación Máster</span>
                    <span className="text-gray-500 font-mono text-xs">11 Mayo 2026</span>
                  </div>
                  <ul className="list-disc list-inside text-gray-400 text-[13px] font-mono space-y-1">
                    <li>Agregadas herramientas de Punto de Restauración (Backup a JSON)</li>
                    <li>Nuevo menú unificado de Mantenimiento / Opciones Avanzadas</li>
                    <li>Añadida función de Borrado Múltiple para la base de contactos</li>
                  </ul>
                </div>

                <div className="border-b border-gray-800 pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sw-blue font-bold uppercase tracking-widest text-sm">v1.1.5 - Fixes & Pos Updates</span>
                    <span className="text-gray-500 font-mono text-xs">08 Mayo 2026</span>
                  </div>
                  <ul className="list-disc list-inside text-gray-400 text-[13px] font-mono space-y-1">
                    <li>Actualización del sistema POS para selección de clientes más robusta</li>
                    <li>Soporte VIP loyalty dinámico</li>
                  </ul>
                </div>
                
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showAdvancedWarning && (
        <div className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="panel-glass rounded-3xl p-8 w-full max-w-md border border-sw-red/30 shadow-[0_0_50px_rgba(231,76,60,0.2)] flex flex-col text-center">
            <div className="w-20 h-20 bg-sw-red/20 rounded-full flex items-center justify-center border border-sw-red/50 mx-auto mb-6">
              <AlertTriangle size={40} className="text-sw-red animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">ACCESO RESTRINGIDO</h2>
            <p className="text-sm text-gray-400 mb-8 uppercase font-bold leading-relaxed">
              Modificar la información en esta sección puede afectar críticamente el funcionamiento de la aplicación. ¿Desea continuar bajo su propia responsabilidad?
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => setShowAdvancedWarning(false)}
                className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all text-sm"
              >
                SALIR
              </button>
              <button 
                onClick={() => {
                  setShowAdvancedWarning(false);
                  setShowAdvancedPin(true);
                }}
                className="w-full py-4 bg-transparent border border-sw-red/50 text-sw-red font-black uppercase tracking-widest rounded-xl hover:bg-sw-red/10 transition-all text-sm"
              >
                ACCEDER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Modal */}
      {showAdvancedPin && (
        <div className="fixed inset-0 z-[301] bg-black/95 flex items-center justify-center p-4 backdrop-blur-2xl animate-in scale-in duration-300">
          <div className="panel-glass rounded-3xl p-8 w-full max-w-md border border-sw-blue/30 shadow-[0_0_50px_rgba(0,168,255,0.2)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white uppercase tracking-widest">INGRESAR PIN</h2>
              <button onClick={() => setShowAdvancedPin(false)} className="text-gray-500 hover:text-sw-red"><X size={24} /></button>
            </div>
            <form onSubmit={handlePinSubmit} className="space-y-6">
              <div className="relative">
                <input 
                  type="password" 
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  autoFocus
                  required
                  placeholder="******"
                  className="w-full bg-black/60 border-2 border-gray-800 rounded-2xl p-6 text-center text-4xl font-mono tracking-[0.5em] text-sw-blue focus:border-sw-blue outline-none transition-all"
                />
                <p className="text-center text-[14px] text-gray-500 uppercase tracking-widest mt-4 font-bold">
                  Nota: Teléfono fijo de la casa
                </p>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-sw-blue/20 border border-sw-blue text-sw-blue font-black uppercase tracking-widest rounded-xl hover:bg-sw-blue hover:text-black transition-all"
              >
                VERIFICAR IDENTIDAD
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
