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
  { id: 'ins_1', name: 'Shampoo pH Neutro', uom: 'L', unitCost: 2500, stock: 15.0, reorderPoint: 5.0, safetyStock: 2, category: 'Químicos' },
  { id: 'ins_2', name: 'Cera Profesional', uom: 'L', unitCost: 8000, stock: 3.5, reorderPoint: 2.0, safetyStock: 2, category: 'Químicos' },
  { id: 'ins_3', name: 'Renovador Neumáticos', uom: 'L', unitCost: 3500, stock: 8.0, reorderPoint: 3.0, safetyStock: 2, category: 'Químicos' },
  { id: 'ins_4', name: 'Silicona Interior', uom: 'L', unitCost: 4200, stock: 5.0, reorderPoint: 2.0, safetyStock: 2, category: 'Químicos' },
  { id: 'ins_5', name: 'Microfibra Premium', uom: 'unidad', unitCost: 3500, stock: 12, reorderPoint: 4, safetyStock: 2, category: 'Consumibles' },
  { id: 'ins_6', name: 'Esponja Lavado', uom: 'unidad', unitCost: 1800, stock: 8, reorderPoint: 3, safetyStock: 2, category: 'Consumibles' },
  { id: 'ins_7', name: 'Pistola de Agua', uom: 'unidad', unitCost: 25000, stock: 3, reorderPoint: 1, safetyStock: 1, category: 'Herramientas' },
];

export const INITIAL_SERVICES = [
  { id: 'srv_1', name: 'Lavado Exterior Simple', basePrice: 8000, estimatedDuration: 30, recipe: [{itemId: 'ins_1', qty: 0.1}, {itemId: 'ins_3', qty: 0.05}] },
  { id: 'srv_2', name: 'Lavado Full + Cera', basePrice: 15000, estimatedDuration: 45, recipe: [{itemId: 'ins_1', qty: 0.15}, {itemId: 'ins_2', qty: 0.05}, {itemId: 'ins_3', qty: 0.08}] },
  { id: 'srv_3', name: 'Lavado de Motor', basePrice: 25000, estimatedDuration: 60, recipe: [{itemId: 'ins_1', qty: 0.2}] },
  { id: 'srv_4', name: 'Limpieza de Tapiz Full', basePrice: 45000, estimatedDuration: 90, recipe: [{itemId: 'ins_1', qty: 0.3}] },
  { id: 'srv_5', name: 'Pulido de Focos', basePrice: 12000, estimatedDuration: 30, recipe: [{itemId: 'ins_2', qty: 0.1}] },
  { id: 'srv_6', name: 'Descontaminado de Pintura', basePrice: 35000, estimatedDuration: 60, recipe: [{itemId: 'ins_2', qty: 0.2}] }
];

export const INITIAL_STORE_PRODUCTS = [
  { id: 'sp_1', name: 'Agua Mineral Cielo 500cc', price: 1000, icon: '💧', stock: 45 },
  { id: 'sp_2', name: 'Coca-Cola Lata 350ml', price: 1200, icon: '🥤', stock: 30 },
  { id: 'sp_3', name: 'Sprite Lata 350ml', price: 1200, icon: '🥤', stock: 25 },
  { id: 'sp_4', name: 'Fanta Lata 350ml', price: 1200, icon: '🥤', stock: 25 },
  { id: 'sp_5', name: 'Aromatizante Auto Sabores', price: 2500, icon: '🌲', stock: 15 },
  { id: 'sp_6', name: 'Galletas Cariocas', price: 800, icon: '🍪', stock: 20 },
  { id: 'sp_7', name: 'Toalla NOVA', price: 1700, icon: '🧻', stock: 18 },
  { id: 'sp_8', name: 'Chocolate Sahne-Nuss', price: 1500, icon: '🍫', stock: 12 },
  { id: 'sp_9', name: 'Galletas Tritón', price: 900, icon: '🍪', stock: 15 },
  { id: 'sp_10', name: 'Jugo Watts 200ml', price: 600, icon: '🧃', stock: 20 },
  { id: 'sp_11', name: 'Chicle Trident', price: 500, icon: '🫧', stock: 30 },
  { id: 'sp_12', name: 'Café Instantáneo', price: 800, icon: '☕', stock: 40 },
];

export const INITIAL_CLIENTS = [];

export const PAYMENT_METHODS = ['Efectivo', 'Tarjeta (Débito/Crédito)', 'Transferencia'];
export const DOC_TYPES = ['Boleta', 'Factura', 'Comprobante interno'];
export const STATUS_FLOW = ['Cola', 'Lavando', 'Listo', 'Entregado'];
export const RAW_MATERIAL_CATEGORIES = ['Químicos', 'Consumibles', 'Herramientas'];
