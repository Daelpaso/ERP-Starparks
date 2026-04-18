import React, { useState } from 'react';
import { Package, Plus, Trash2, Edit2, Save, X, DollarSign, UserPlus, Shield, Users, Download, TrendingUp, RefreshCcw, UserCheck, UserX, MessageCircle, Gift, Sparkles, AlertTriangle } from 'lucide-react';
import { exportToExcel } from '../lib/utils';
import { doc, updateDoc, deleteDoc, setDoc, db, handleFirestoreError, OperationType } from '../firebase';
import { DailyReportView } from './DailyReportView';

export const InventoryView = ({ rawMaterials, setRawMaterials, storeProducts, setStoreProducts, showToast, hasPermission, setInventoryModalId }: any) => {
  const handleExportRaw = () => {
    exportToExcel('insumos_taller.xlsx', rawMaterials);
    showToast('Insumos exportados', 'success');
  };

  const handleExportStore = () => {
    exportToExcel('stock_tienda.xlsx', storeProducts);
    showToast('Stock exportado', 'success');
  };

  const canEdit = hasPermission('edit_inventory');
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
      
      // Add to inventory tracking history collection 
      const historyEntry = {
        id: `INV-${Date.now()}`,
        itemId: item.id,
        itemName: item.name,
        qtyAdded: qty,
        newStock: newStock,
        date: Date.now()
      };
      // We assume an internal collection or just toast for now since there's no dedicated hist view yet, but we fulfill "Habilitar botón con historial" by adding logic to record.
      await setDoc(doc(db, 'inventoryHistory', historyEntry.id), historyEntry);

      showToast(`Añadidos ${qty} ${item.uom} a ${item.name}`, 'success');
      setShowAddStockModal(false);
      setSelectedItemToAdd('');
      setQtyToAdd('');
    } catch (e) {
      showToast('Error al actualizar stock', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="panel-glass p-6 rounded-xl border-t-4 border-sw-blue">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-xl font-bold sw-title-font text-sw-blue tracking-widest flex items-center gap-2"><Package size={24} /> INSUMOS TALLER</h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={handleExportRaw} className="btn-jedi p-2 rounded-lg flex-1 sm:flex-none flex justify-center" title="Exportar Excel"><Download size={20} /></button>
            {canEdit && <button onClick={() => setInventoryModalId({id: 'new', type: 'raw'})} className="btn-jedi p-2 rounded-lg flex-1 sm:flex-none flex justify-center" title="Nuevo Insumo"><Plus size={20} /></button>}
            {canEdit && <button onClick={() => setShowAddStockModal(true)} className="btn-jedi p-2 rounded-lg flex-1 sm:flex-none flex justify-center" title="Registrar Ingreso de Stock"><Plus size={20} className="rotate-45" /></button>}
          </div>
        </div>
        <div className="space-y-4">
          {rawMaterials.map((item: any) => (
            <div 
              key={item.id} 
              onClick={() => canEdit && setInventoryModalId({id: item.id, type: 'raw'})}
              className={`flex justify-between items-center bg-black/50 p-4 rounded-lg border border-gray-800 transition-all ${canEdit ? 'hover:border-sw-blue cursor-pointer group' : ''}`}
            >
              <div>
                <div className="font-bold text-white uppercase tracking-wide">{item.name}</div>
                <div className="text-xs text-gray-500 font-mono">Costo: ${item.unitCost}/{item.uom}</div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-mono font-black flex items-center justify-end gap-2 ${item.stock <= item.reorderPoint ? 'text-sw-red animate-pulse' : 'text-sw-green'}`}>
                  {item.stock <= item.reorderPoint && <AlertTriangle size={16} title="Stock de Seguridad Crítico" />}
                  {item.stock} {item.uom}
                </div>
                <div className="text-xxs text-gray-600 font-bold uppercase">Mín: {item.reorderPoint}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-glass p-6 rounded-xl border-t-4 border-sw-yellow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-xl font-bold sw-title-font text-sw-yellow tracking-widest flex items-center gap-2"><Package size={24} /> STOCK TIENDA</h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={handleExportStore} className="btn-gold p-2 rounded-lg flex-1 sm:flex-none flex justify-center" title="Exportar Excel"><Download size={20} /></button>
            {canEdit && <button onClick={() => setInventoryModalId({id: 'new', type: 'store'})} className="btn-gold p-2 rounded-lg flex-1 sm:flex-none flex justify-center" title="Nuevo Producto"><Plus size={20} /></button>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {storeProducts.map((prod: any) => (
            <div 
              key={prod.id} 
              onClick={() => canEdit && setInventoryModalId({id: prod.id, type: 'store'})}
              className={`bg-black/50 p-4 rounded-lg border border-gray-800 flex items-center gap-4 transition-all ${canEdit ? 'hover:border-sw-yellow cursor-pointer group' : ''}`}
            >
              <div className="text-3xl">{prod.icon}</div>
              <div className="flex-1">
                <div className="font-bold text-white text-sm uppercase tracking-wide truncate">{prod.name}</div>
                <div className="flex justify-between items-end">
                  <span className="text-xs font-mono text-sw-yellow">${prod.price}</span>
                  <span className={`text-sm font-mono font-bold ${prod.stock < 10 ? 'text-sw-red' : 'text-sw-green'}`}>STK: {prod.stock}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Add Stock */}
      {showAddStockModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setShowAddStockModal(false)}>
          <div className="panel-glass rounded-2xl p-6 w-full max-w-md border border-sw-blue/30 shadow-[0_0_30px_rgba(0,168,255,0.15)] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-mono text-white tracking-widest">INGRESAR STOCK</h2>
              <button onClick={() => setShowAddStockModal(false)} className="text-gray-500 hover:text-sw-red transition-all"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Insumo a reabastecer</label>
                <select 
                  value={selectedItemToAdd} 
                  onChange={(e) => setSelectedItemToAdd(e.target.value)}
                  className="w-full bg-black/50 border border-gray-800 rounded-xl p-3 text-white focus:border-sw-blue outline-none"
                >
                  <option value="">Seleccione Insumo...</option>
                  {rawMaterials.map((r: any) => <option key={r.id} value={r.id}>{r.name} ({r.uom})</option>)}
                </select>
              </div>
              {selectedItemToAdd && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Cantidad a sumar</label>
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
                className="w-full py-3 mt-4 rounded-xl bg-sw-blue/20 border border-sw-blue text-sw-blue font-bold uppercase tracking-widest disabled:opacity-50 hover:bg-sw-blue hover:text-black transition-all"
              >
                Registrar Ingreso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const CategoriesView = ({ categories, showToast, hasPermission, setCategoryModalId }: any) => {
  const canEdit = hasPermission('edit_pricing');

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar la categoría "${name}"?`)) return;
    try {
      await updateDoc(doc(db, 'categories', id), { isActive: false, active: false });
      showToast('Categoría eliminada', 'success');
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, 'categories');
      showToast('Error al eliminar categoría', 'error');
    }
  };

  return (
    <div className="panel-glass p-6 rounded-xl border-t-4 border-sw-blue mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h3 className="text-2xl font-bold sw-title-font text-sw-blue tracking-widest flex items-center gap-3"><Users size={28} /> CATEGORÍAS Y SOCIEDADES</h3>
        {canEdit && (
          <button 
            onClick={() => setCategoryModalId('new')}
            className="btn-jedi px-4 py-2 rounded-lg font-bold uppercase tracking-widest flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus size={18} /> NUEVA CATEGORÍA
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.filter((cat: any) => cat.isActive !== false && cat.active !== false).map((cat: any) => (
          <div 
            key={cat.id} 
            onClick={() => setCategoryModalId(cat.id)}
            className="bg-black/60 p-5 rounded-xl border border-gray-800 hover:border-sw-blue transition-all group cursor-pointer active:scale-[0.98]"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="text-lg font-bold text-white uppercase tracking-widest group-hover:text-sw-blue transition-colors">{cat.name}</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Factor de Multiplicación</div>
              </div>
              <div className="text-3xl font-mono font-black text-sw-blue">x{cat.factor}</div>
            </div>
            {canEdit && (
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-800">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(cat.id, cat.name); }}
                  className="p-2 text-gray-500 hover:text-sw-red transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const PricingView = ({ services, setServices, storeProducts, setStoreProducts, categories, showToast, hasPermission, setServiceModalId, setCategoryModalId }: any) => {
  const canEdit = hasPermission('edit_pricing');

  const handleDeleteService = async (id: string, name: string) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar el servicio "${name}"?`)) return;
    try {
      await updateDoc(doc(db, 'services', id), { isActive: false, active: false });
      showToast('Servicio eliminado', 'success');
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, 'services');
      showToast('Error al eliminar servicio', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="panel-glass p-6 rounded-xl border-t-4 border-sw-green">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h3 className="text-2xl font-bold sw-title-font text-sw-green tracking-widest flex items-center gap-3"><DollarSign size={28} /> TARIFARIO IMPERIAL</h3>
          {canEdit && (
            <button 
              onClick={() => setServiceModalId('new')}
              className="btn-yoda px-4 py-2 rounded-lg font-bold uppercase tracking-widest flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Plus size={18} /> NUEVO SERVICIO
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.filter((srv: any) => srv.isActive !== false && srv.active !== false).map((srv: any) => (
            <div 
              key={srv.id} 
              onClick={() => setServiceModalId(srv.id)}
              className="bg-black/60 p-5 rounded-xl border border-gray-800 hover:border-sw-green transition-all group cursor-pointer active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="text-lg font-bold text-white uppercase tracking-widest group-hover:text-sw-green transition-colors">{srv.name}</div>
                <div className="text-2xl font-mono font-black text-sw-green">${srv.basePrice.toLocaleString('es-CL')}</div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Receta de Insumos:</div>
                {srv.recipe?.map((r: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs font-mono text-gray-400 bg-black/40 px-2 py-1 rounded">
                    <span>{r.itemId}</span>
                    <span className="text-sw-blue">{r.qty} L</span>
                  </div>
                ))}
              </div>
              {canEdit && (
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-800">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteService(srv.id, srv.name); }}
                    className="p-2 text-gray-500 hover:text-sw-red transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <CategoriesView categories={categories} showToast={showToast} hasPermission={hasPermission} setCategoryModalId={setCategoryModalId} />
    </div>
  );
};

export const UsersView = ({ users, setUsers, showToast, currentUser, setUserModalId, setShowUserCreateModal }: any) => {
  const isSuperAdmin = currentUser?.email === 'inversioneselcactus@gmail.com' || currentUser?.email === 'daelpaso.digital@gmail.com';

  const handleExport = () => {
    exportToExcel('usuarios.xlsx', users);
    showToast('Usuarios exportados', 'success');
  };

  const PREDEFINED_PERMISSIONS = [
    { id: 'write_pos', label: 'Crear Ventas (POS)', roles: ['Admin', 'Cajero'] },
    { id: 'write_workshop', label: 'Gestionar Taller', roles: ['Admin', 'Operario'] },
    { id: 'manage_shifts', label: 'Abrir/Cerrar Turnos', roles: ['Admin', 'Cajero'] },
    { id: 'view_reports', label: 'Ver Reportes', roles: ['Admin', 'Visualizador'] },
    { id: 'edit_inventory', label: 'Editar Inventario', roles: ['Admin'] },
    { id: 'edit_pricing', label: 'Editar Tarifas', roles: ['Admin'] },
    { id: 'edit_users', label: 'Gestionar Usuarios', roles: ['Admin'] }
  ];

  return (
    <div className="panel-glass p-6 rounded-xl border-t-4 border-sw-blue">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h3 className="text-2xl font-bold sw-title-font text-sw-blue tracking-widest flex items-center gap-3"><Shield size={28} /> PERSONAL DE LA ESTRELLA</h3>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={handleExport} className="btn-jedi p-2 rounded-lg flex-1 sm:flex-none flex justify-center" title="Exportar Excel"><Download size={20} /></button>
          <button 
            onClick={() => setShowUserCreateModal(true)}
            className="btn-jedi px-4 py-2 rounded-lg font-bold uppercase tracking-widest flex items-center justify-center gap-2 flex-1 sm:flex-none"
          >
            <UserPlus size={18} /> RECLUTAR
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {users.filter((user: any) => user.isActive !== false && user.active !== false).map((user: any) => (
          <div 
            key={user.id} 
            onClick={() => setUserModalId(user.id)}
            className="bg-black/60 p-6 rounded-xl border border-gray-800 relative overflow-hidden group cursor-pointer hover:border-sw-blue transition-all hover:scale-[1.02]"
          >
             <div className={`absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rotate-45 ${user.role === 'Admin' ? 'bg-sw-red' : user.role === 'Cajero' ? 'bg-sw-yellow' : 'bg-sw-blue'}`}></div>
             <div className="relative z-10">
               <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{user.role}</div>
               <div className="text-2xl font-black text-white mb-2 sw-title-font">{user.name}</div>
               <div className="text-[10px] text-gray-500 font-mono mb-4 truncate">{user.email}</div>
               
               <div className="flex justify-between items-center pt-4 border-t border-gray-800/50">
                 <div className="text-[10px] font-bold text-sw-blue uppercase tracking-widest">Ver Expediente</div>
                 <Shield size={16} className="text-sw-blue/40" />
               </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};



export const ClientsView = ({ clients, setClients, showToast, setClientModalId, resetDatabase, isAdmin }: any) => {
  const handleExport = () => {
    const data = clients.map((c: any) => ({
      ID: c.id,
      Patente: c.plate,
      Nombre: c.name,
      Telefono: c.phone,
      Email: c.email,
      Visitas: c.visits,
      Registro: new Date(c.date).toLocaleDateString('es-CL')
    }));
    exportToExcel('clientes.xlsx', data);
    showToast('Clientes exportados', 'success');
  };

  const handleDeleteClient = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`¿Está seguro de archivar/eliminar al cliente "${name}"? Su historial se mantendrá oculto.`)) return;
    try {
      await updateDoc(doc(db, 'clients', id), {
        isActive: false,
        active: false,
        archivedAt: Date.now()
      });
      showToast(`Cliente "${name}" archivado exitosamente`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'clients');
      showToast('Error al archivar cliente', 'error');
    }
  };

  return (
    <div className="panel-glass p-6 rounded-xl border-t-4 border-sw-yellow">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h3 className="text-2xl font-bold sw-title-font text-sw-yellow tracking-widest flex items-center gap-3"><Users size={28} /> BASE DE DATOS DE CLIENTES</h3>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-black/50 px-3 py-1 rounded border border-gray-800">{clients.length} REGISTROS</div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="btn-gold p-2 rounded-lg" title="Exportar Excel"><Download size={20} /></button>
            {isAdmin && clients.length > 0 && (
              <button 
                onClick={resetDatabase} 
                className="p-2 rounded-lg bg-sw-red/10 border border-sw-red/30 text-sw-red hover:bg-sw-red hover:text-white transition-all" 
                title="Purgar Base de Datos (Solo Admin)"
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead className="bg-black/80 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-700">
            <tr>
              <th className="p-4">Patente</th>
              <th className="p-4">Nombre</th>
              <th className="p-4">Contacto</th>
              <th className="p-4 text-center">Visitas</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {clients.filter((cli: any) => cli.isActive !== false && cli.active !== false).map((cli: any) => (
              <tr key={cli.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setClientModalId(cli.id)}>
                <td className="p-4 font-mono text-xl font-black text-sw-blue">{cli.plate}</td>
                <td className="p-4 font-bold text-white uppercase tracking-wide">{cli.name}</td>
                <td className="p-4">
                  <div className="text-xs font-mono text-gray-300">{cli.phone}</div>
                  <div className="text-[10px] text-gray-500">{cli.email}</div>
                </td>
                <td className="p-4 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-sw-yellow font-mono font-black">{cli.visits} Visitas Totales</div>
                    <div className="inline-flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-gray-800">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i < (cli.visits % 7) ? 'bg-sw-green shadow-[0_0_8px_rgba(46,204,113,0.6)]' : 'bg-gray-700'}`}></div>
                      ))}
                      <div className={`w-5 h-5 ml-1 flex items-center justify-center rounded-full border ${cli.visits > 0 && (cli.visits % 7) === 0 ? 'bg-sw-yellow/20 border-sw-yellow text-sw-yellow animate-pulse shadow-[0_0_10px_rgba(255,232,31,0.5)]' : 'bg-black/50 border-gray-700 text-gray-600'}`}>
                        <Sparkles size={12} />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex justify-end items-center gap-3">
                    {cli.visits > 0 && (cli.visits % 7) === 6 && (
                      <span className="bg-sw-green/20 text-sw-green border border-sw-green/30 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 animate-pulse" title="Próximo lavado gratis">
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
    </div>
  );
};

export const ConfigView = ({ 
  a11y, setA11y, showToast, 
  users, setUsers, currentUser, 
  setUserModalId, setShowUserCreateModal,
  hasPermission,
  impersonatedUserId, setImpersonatedUserId,
  realUserEmail, resetDatabase
}: any) => {
  const [activeTab, setActiveTab] = useState('general');
  const isDeveloper = realUserEmail === 'daelpaso.digital@gmail.com';
  const isSuperAdmin = realUserEmail === 'inversioneselcactus@gmail.com' || currentUser?.email === 'inversioneselcactus@gmail.com' || isDeveloper;
  const isAdmin = currentUser?.role === 'Admin' || isSuperAdmin;
  const [selectedSimUser, setSelectedSimUser] = useState(impersonatedUserId || '');


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

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-gray-800">
        <button 
          onClick={() => setActiveTab('general')}
          className={`px-6 py-3 font-bold uppercase tracking-widest text-xs transition-all border-b-2 ${activeTab === 'general' ? 'border-sw-blue text-sw-blue bg-sw-blue/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          General y Visual
        </button>
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('usuarios')}
            className={`px-6 py-3 font-bold uppercase tracking-widest text-xs transition-all border-b-2 ${activeTab === 'usuarios' ? 'border-sw-yellow text-sw-yellow bg-sw-yellow/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            Gestión de Personal
          </button>
        )}
        {isDeveloper && (
          <button 
            onClick={() => setActiveTab('dev')}
            className={`px-6 py-3 font-bold uppercase tracking-widest text-xs transition-all border-b-2 ${activeTab === 'dev' ? 'border-sw-red text-sw-red bg-sw-red/5' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
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
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">Simulación de Entorno y Permisos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Seleccionar Identidad a Simular</label>
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
                  className={`px-6 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-all ${selectedSimUser ? 'bg-sw-red text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                >
                  {selectedSimUser ? <UserCheck size={18} /> : <UserX size={18} />}
                  Simular
                </button>
              </div>
              <p className="text-[9px] text-gray-600 font-mono leading-relaxed">
                Al activar la simulación, la aplicación se recargará y actuará como si fueras el usuario seleccionado. 
                Los permisos y la vista se ajustarán dinámicamente.
              </p>
            </div>

            <div className="p-6 bg-sw-red/5 border border-sw-red/20 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-sw-red uppercase tracking-widest">Estado de Simulación</h3>
              <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl">
                <span className="text-xs text-gray-400">Usuario Activo:</span>
                <span className="text-xs font-mono font-bold text-white">{currentUser?.name}</span>
              </div>
              <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl">
                <span className="text-xs text-gray-400">Rol Detectado:</span>
                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${currentUser?.role === 'Admin' ? 'bg-sw-red/20 text-sw-red' : 'bg-sw-blue/20 text-sw-blue'}`}>
                  {currentUser?.role}
                </span>
              </div>
              {impersonatedUserId && (
                <button 
                  onClick={() => setImpersonatedUserId(null)}
                  className="w-full py-3 mt-2 bg-gray-800 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  Detener Simulación y Volver a Real
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="panel-glass p-8 rounded-2xl border border-sw-blue/20">
            <h3 className="text-xl font-black text-sw-blue uppercase tracking-tighter mb-6 flex items-center gap-3">
              <Shield size={24} /> Accesibilidad y Visualización
            </h3>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Modo de Color</p>
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
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tamaño de Fuente</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {fontSizes.map(f => (
                    <button 
                      key={f.id}
                      onClick={() => setA11y({...a11y, fontSize: f.id})}
                      className={`p-3 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all ${a11y.fontSize === f.id ? 'bg-sw-green/10 border-sw-green text-sw-green' : 'bg-black/20 border-gray-800 text-gray-500'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-gray-800">
                <div>
                  <p className="text-sm font-bold text-white uppercase tracking-widest">Alto Contraste</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Mejora la legibilidad de bordes y textos</p>
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
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Envío automático de Reporte Z al cerrar turno</p>
                  </div>
                  <button 
                    className={`w-12 h-6 rounded-full transition-all relative ${emailConfig.notifyAdmin ? 'bg-sw-green' : 'bg-gray-800'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${emailConfig.notifyAdmin ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-gray-800">
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Email Administrador</label>
                    <input 
                      type="email" 
                      value={emailConfig.adminEmail}
                      readOnly
                      className="w-full bg-black/40 border border-gray-800 rounded-lg p-2 text-xs text-gray-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              {isSuperAdmin && (
                <div className="p-6 bg-sw-red/5 border border-sw-red/20 rounded-xl space-y-4">
                  <div className="flex items-center gap-3 text-sw-red mb-2">
                    <AlertTriangle size={20} />
                    <h4 className="text-xs font-bold uppercase tracking-widest">Zona de Peligro</h4>
                  </div>
                  <p className="text-[10px] text-gray-400 uppercase leading-relaxed">
                    Estas acciones eliminan datos permanentes. Úselas solo si desea limpiar la base de datos para comenzar una nueva vigencia.
                  </p>
                  <button 
                    onClick={resetDatabase}
                    className="w-full py-4 bg-sw-red/20 border border-sw-red text-sw-red font-black uppercase tracking-[0.2em] text-[10px] rounded-xl hover:bg-sw-red hover:text-white transition-all shadow-[0_0_20px_rgba(231,76,60,0.2)]"
                  >
                    Reseteo de Fábrica (Clientes y Vehículos)
                  </button>
                </div>
              )}
            </div>
          </div>
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
    </div>
  );
};
