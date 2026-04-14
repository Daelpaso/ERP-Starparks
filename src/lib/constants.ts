export const INITIAL_USERS = [
  { id: 'u_1', rut: '11111111-1', name: 'Administrador Principal', role: 'Admin', pin: '1234', active: true },
  { id: 'u_2', rut: '22222222-2', name: 'Cajero Tienda', role: 'Cajero', pin: '0000', active: true },
  { id: 'u_3', rut: '33333333-3', name: 'Operario Taller', role: 'Operario', pin: '1111', active: true }
];

export const INITIAL_CATEGORIES = [
  { id: 'cat_1', name: 'Sedán / Citycar', factor: 1.0 },
  { id: 'cat_2', name: 'SUV / Hatchback', factor: 1.2 },
  { id: 'cat_3', name: 'Camioneta / 4x4', factor: 1.4 },
  { id: 'cat_soc_1', name: 'Convenio Empresa A', factor: 0.8 },
  { id: 'cat_soc_2', name: 'Convenio Empresa B', factor: 0.85 },
];

export const INITIAL_RAW_MATERIALS = [
  { id: 'ins_1', name: 'Shampoo pH Neutro', uom: 'L', unitCost: 2500, stock: 15.0, reorderPoint: 5.0 },
  { id: 'ins_2', name: 'Cera Profesional', uom: 'L', unitCost: 8000, stock: 3.5, reorderPoint: 2.0 },
  { id: 'ins_3', name: 'Renovador Neumáticos', uom: 'L', unitCost: 3500, stock: 8.0, reorderPoint: 3.0 },
];

export const INITIAL_SERVICES = [
  { id: 'srv_1', name: 'Lavado Exterior Simple', basePrice: 8000, recipe: [{itemId: 'ins_1', qty: 0.1}, {itemId: 'ins_3', qty: 0.05}] },
  { id: 'srv_2', name: 'Lavado Full + Cera', basePrice: 15000, recipe: [{itemId: 'ins_1', qty: 0.15}, {itemId: 'ins_2', qty: 0.05}, {itemId: 'ins_3', qty: 0.08}] },
  { id: 'srv_3', name: 'Lavado de Motor', basePrice: 25000, recipe: [{itemId: 'ins_1', qty: 0.2}] },
  { id: 'srv_4', name: 'Limpieza de Tapiz Full', basePrice: 45000, recipe: [{itemId: 'ins_1', qty: 0.3}] },
  { id: 'srv_5', name: 'Pulido de Focos', basePrice: 12000, recipe: [{itemId: 'ins_2', qty: 0.1}] },
  { id: 'srv_6', name: 'Descontaminado de Pintura', basePrice: 35000, recipe: [{itemId: 'ins_2', qty: 0.2}] }
];

export const INITIAL_STORE_PRODUCTS = [
  { id: 'sp_1', name: 'Agua Mineral 500ml', price: 1000, icon: '💧', stock: 45 },
  { id: 'sp_2', name: 'Café Espresso', price: 1500, icon: '☕', stock: 100 },
  { id: 'sp_3', name: 'Papas Fritas', price: 1500, icon: '🍟', stock: 20 },
  { id: 'sp_4', name: 'Pinito Aromatizante', price: 2000, icon: '🌲', stock: 15 },
  { id: 'sp_5', name: 'Bebida Lata 350ml', price: 1500, icon: '🥤', stock: 30 }
];

export const INITIAL_CLIENTS = [
  { id: 'cli_1', plate: 'ABCD12', name: 'Juan Pérez', phone: '+56 9 1234 5678', email: 'juan.perez@email.com', date: Date.now() - 864000000, visits: 9 },
  { id: 'cli_2', plate: 'XX9988', name: 'María Silva', phone: '+56 9 8765 4321', email: '', date: Date.now() - 432000000, visits: 4 },
];

export const PAYMENT_METHODS = ['Efectivo', 'Tarjeta (Débito/Crédito)', 'Transferencia'];
export const DOC_TYPES = ['Boleta', 'Factura', 'Comprobante interno'];
export const STATUS_FLOW = ['Cola', 'Lavando', 'Listo', 'Entregado'];
