# StarParks CarWash Pro - Documentación de Contexto

Este documento proporciona una visión integral de la aplicación **StarParks CarWash Pro**, diseñada para servir como referencia y contexto para el desarrollo continuo y la asistencia mediante IA (Gemini).

## 1. Visión General
**StarParks CarWash Pro** es un sistema ERP/POS especializado en la gestión integral de centros de lavado de vehículos. Combina la agilidad de un punto de venta (POS) con la organización de un tablero Kanban para taller, control de inventario de insumos (recetas) y gestión financiera de turnos de caja.

## 2. Pila Tecnológica
- **Frontend**: React 18+, Vite, TypeScript.
- **Estándar CSS**: Tailwind CSS (utilizando el protocolo de diseño galáctico Dark Mode por defecto).
- **Animaciones**: Motion (framer-motion).
- **Base de Datos y Auth**: Firebase (Firestore para datos en tiempo real, Firebase Auth para login con Google).
- **Iconografía**: Lucide-React.
- **Utilidades**: `date-fns` (fechas), `jsPDF` (facturación y reportes), `xlsx` (exportación de datos).

## 3. Módulos y Funcionalidades Principales

### A. Punto de Venta (POS)
- Venta de **Servicios** (lavado, pulido, etc.) y **Productos de Tienda** (bebidas, snacks, accesorios).
- Selección de categoría de vehículo (CITY CAR, SEDAN, CAMIONETA, etc.) con **factores multiplicadores de precio**.
- Aplicación de descuentos y selección de métodos de pago (Efectivo, Tarjeta, Transferencia).
- Generación de comprobantes en PDF.

### B. Gestión de Taller (Kanban)
- Seguimiento visual del flujo de vehículos: `Cola` -> `Lavando` -> `Listo` -> `Entregado`.
- Línea de tiempo (Timeline) detallada por trabajo, registrando quién y cuándo cambió el estado.
- Notificaciones automáticas (simuladas/UI) al terminar un lavado.

### C. Inventario y Control de Insumos
- **Insumos (Raw Materials)**: Gestión de stock de químicos, herramientas y consumibles.
- **Recetas**: Los servicios descuentan automáticamente insumos del inventario basados en una receta predefinida (ej: Lavado Simple usa 100ml de Shampoo).
- **Productos**: Venta directa de stock de tienda.

### D. Gestión de Turnos (Shift Management)
- Control de apertura y cierre de caja.
- Registro de movimientos de efectivo (Ingresos/Egresos).
- Generación de **Reporte Z** al cierre, con cuadratura de caja y auditoría para administradores.

### E. Clientes y Vehículos
- Registro de clientes con validación de patente chilena.
- Historial de visitas y frecuencia por cliente.

### F. Centro de Accesibilidad (A11y)
- Modos visuales: Modo Oscuro (predeterminado), Modo Claro, Alto Contraste.
- Ajuste dinámico de tamaño de fuente (Pequeño a Extra Grande).
- Reducción de movimiento para optimización de rendimiento.

## 4. Roles y Permisos (RBAC)
- **Admin**: Acceso total a reportes, configuración de precios, gestión de usuarios y auditoría de turnos.
- **Cajero**: Gestión de POS, clientes y apertura/cierre de turnos.
- **Operario**: Visualización del taller (Kanban) y actualización de estados de lavado.
- **Visualizador**: Acceso limitado exclusivamente a reportes y estadísticas.

## 5. Estructura de Datos (Firestore)
- `/users`: Perfiles de usuario y roles.
- `/jobs`: Órdenes de trabajo activas e históricas.
- `/clients`: Base de datos de clientes.
- `/services`: Catálogo de servicios con sus recetas.
- `/storeProducts`: Productos para venta directa.
- `/rawMaterials`: Insumos y herramientas.
- `/shifts`: Registro de turnos de caja.
- `/transactions`: Registro de todas las ventas y movimientos.
- `/calendarEvents`: Eventos, recordatorios y flujos financieros proyectados.

## 6. Flujos de Trabajo Claves
1. **Atención de Cliente**: El cajero ingresa la patente, selecciona el servicio, el sistema calcula el precio según la categoría del vehículo y crea un `job` en estado `Cola`.
2. **Lavado**: El operario ve el vehículo en el Kanban, lo mueve a `Lavando`. Al terminar, lo mueve a `Listo`.
3. **Entrega y Pago**: El cliente retira el vehículo, el cajero procesa el pago, se genera la transacción financiera y el `job` pasa a `Entregado`.
4. **Cierre de Día**: El administrador revisa el Reporte Z del turno, valida el efectivo físico contra el sistema y cierra el ciclo diario.

---
*Este documento es la fuente de verdad para el contexto operativo de StarParks CarWash Pro.*
