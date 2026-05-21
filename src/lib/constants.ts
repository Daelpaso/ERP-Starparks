export const INITIAL_USERS = [
  { id: 'u_1', rut: '11111111-1', name: 'Inversiones El Cactus', email: 'inversioneselcactus@gmail.com', role: 'Admin', pin: '1234', active: true },
  { id: 'u_2', rut: '22222222-2', name: 'Da El Paso Digital', email: 'daelpaso.digital@gmail.com', role: 'Admin', pin: '0000', active: true },
];

export const INITIAL_CATEGORIES = [
  { id: 'cat_city', name: 'CITY CAR', factor: 1.0 },
  { id: 'cat_sedan', name: 'SEDAN', factor: 1.0 },
  { id: 'cat_wagon', name: 'STATIOWAGON', factor: 1.0 },
  { id: 'cat_truck', name: 'CAMIONETA', factor: 1.0 },
  { id: 'cat_van', name: 'FURGON O MAYOR', factor: 1.0 },
];

export const INITIAL_RAW_MATERIALS: any[] = [];

export const INITIAL_SERVICES = [
  // CITY CAR
  { id: 'srv_city_exp', type: 'Servicio', categoryId: 'cat_city', name: 'EXPRESS', description: '', basePrice: 10000, estimatedDuration: 20, active: true, isActive: true },
  { id: 'srv_city_full', type: 'Servicio', categoryId: 'cat_city', name: 'FULL', description: '', basePrice: 13000, estimatedDuration: 40, active: true, isActive: true },
  { id: 'srv_city_extra', type: 'Servicio', categoryId: 'cat_city', name: 'EXTRA SUCIO', description: '', basePrice: 16000, estimatedDuration: 60, active: true, isActive: true },
  // SEDAN
  { id: 'srv_sedan_exp', type: 'Servicio', categoryId: 'cat_sedan', name: 'EXPRESS', description: '', basePrice: 12000, estimatedDuration: 20, active: true, isActive: true },
  { id: 'srv_sedan_full', type: 'Servicio', categoryId: 'cat_sedan', name: 'FULL', description: '', basePrice: 14000, estimatedDuration: 40, active: true, isActive: true },
  { id: 'srv_sedan_extra', type: 'Servicio', categoryId: 'cat_sedan', name: 'EXTRA SUCIO', description: '', basePrice: 17000, estimatedDuration: 60, active: true, isActive: true },
  // STATIOWAGON
  { id: 'srv_wagon_exp', type: 'Servicio', categoryId: 'cat_wagon', name: 'EXPRESS', description: '', basePrice: 13000, estimatedDuration: 25, active: true, isActive: true },
  { id: 'srv_wagon_full', type: 'Servicio', categoryId: 'cat_wagon', name: 'FULL', description: '', basePrice: 16000, estimatedDuration: 45, active: true, isActive: true },
  { id: 'srv_wagon_extra', type: 'Servicio', categoryId: 'cat_wagon', name: 'EXTRA SUCIO', description: '', basePrice: 18000, estimatedDuration: 65, active: true, isActive: true },
  // CAMIONETA
  { id: 'srv_truck_exp', type: 'Servicio', categoryId: 'cat_truck', name: 'EXPRESS', description: '', basePrice: 16000, estimatedDuration: 30, active: true, isActive: true },
  { id: 'srv_truck_full', type: 'Servicio', categoryId: 'cat_truck', name: 'FULL', description: '', basePrice: 20000, estimatedDuration: 50, active: true, isActive: true },
  { id: 'srv_truck_extra', type: 'Servicio', categoryId: 'cat_truck', name: 'EXTRA SUCIO', description: '', basePrice: 25000, estimatedDuration: 70, active: true, isActive: true },
  // FURGON O MAYOR
  { id: 'srv_van_exp', type: 'Servicio', categoryId: 'cat_van', name: 'EXPRESS', description: '', basePrice: 20000, estimatedDuration: 40, active: true, isActive: true },
  { id: 'srv_van_full', type: 'Servicio', categoryId: 'cat_van', name: 'FULL', description: '', basePrice: 25000, estimatedDuration: 60, active: true, isActive: true },
  { id: 'srv_van_extra', type: 'Servicio', categoryId: 'cat_van', name: 'EXTRA SUCIO', description: '', basePrice: 30000, estimatedDuration: 80, active: true, isActive: true },

  // SERVICIOS COMPLEMENTARIOS (ADICIONALES)
  { id: 'srv_motor', type: 'Adicional', categoryId: 'ALL', name: 'LAVADO DE MOTOR', description: '', basePrice: 25000, estimatedDuration: 60, active: true, isActive: true },
  { id: 'srv_tapiz_full', type: 'Adicional', categoryId: 'ALL', name: 'LIMPIEZA DE TAPIZ FULL', description: '', basePrice: 45000, estimatedDuration: 90, active: true, isActive: true },
  { id: 'srv_focos', type: 'Adicional', categoryId: 'ALL', name: 'PULIDO DE FOCOS', description: '', basePrice: 12000, estimatedDuration: 30, active: true, isActive: true },
  { id: 'srv_pulido_full', type: 'Adicional', categoryId: 'ALL', name: 'PULIDO CARROCERÍA FULL', description: '', basePrice: 85000, estimatedDuration: 180, active: true, isActive: true },
  { id: 'srv_ozono', type: 'Adicional', categoryId: 'ALL', name: 'TRATAMIENTO DE OZONO', description: '', basePrice: 15000, estimatedDuration: 40, active: true, isActive: true },
  { id: 'srv_aire', type: 'Adicional', categoryId: 'ALL', name: 'RECARGA AIRE ACONDICIONADO', description: '', basePrice: 35000, estimatedDuration: 60, active: true, isActive: true },
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
