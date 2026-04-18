# StarParks CarWash Pro - Guía de Estilo y Convenciones (AGENTS)

Este archivo contiene las reglas persistentes y convenciones de desarrollo para el proyecto StarParks.

## 1. Estilo Visual (Galactic Design)
- **Tema**: Dominio del modo oscuro con acentos en Azul (sw-blue: #00a8ff) y Amarillo (sw-yellow: #ffe81f).
- **Tipografía**: Fuente monoespaciada para datos técnicos y reloj. Títulos con tracking negativo y peso black.
- **Componentes**: Uso extensivo de `panel-glass` (fondos oscuros semi-transparentes con desenfoque de fondo) y bordes neón sutiles.

## 2. Convenciones de Código
- **Seguridad Firestore**: Siempre utilizar el ayudante `handleFirestoreError` con `OperationType`. Las reglas de seguridad deben seguir el patrón de validación por esquema.
- **Iconografía**: Exclusivamente `lucide-react`.
- **Animaciones**: Preferir `motion` de `motion/react` para transiciones de estado y entrada de componentes.
- **Validaciones**: Las patentes chilenas siempre deben validarse con `validarPatenteChilena` de `@utils`.

## 3. Manejo de Estado
- Las suscripciones a Firestore (`onSnapshot`) deben manejarse dentro de `useEffect` en `App.tsx` y limpiarse adecuadamente.
- El estado `currentUser` es el corazón de la autorización en el frontend. Siempre verificar `hasPermission(id)` antes de permitir acciones críticas.

## 4. Estructura de Datos
- Los servicios deben incluir siempre una `recipe` (receta) para el descuento automático de insumos.
- Los turnos (`shifts`) son obligatorios para procesar transacciones en el POS.
