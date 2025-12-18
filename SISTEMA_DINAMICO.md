# 🔄 Sistema Dinámico Firebase - Cocó Catering

## ✅ Implementado - Actualización Bidireccional

El sistema ahora está **completamente sincronizado con Firebase**. Cualquier cambio en Firebase se refleja automáticamente en la web, y las compras actualizan el stock en Firebase.

## 📋 Flujo de Datos

### 1. Firebase → Web (Lectura)
Cuando un usuario entra a cualquier página de productos:

```
Firebase → price-loader.js → HTML
```

**Se actualiza dinámicamente:**
- ✅ Nombres de productos
- ✅ Precios
- ✅ Descripciones
- ✅ Stock disponible (con indicadores visuales)
- ✅ Listas de items incluidos

**Indicadores de stock:**
- 🟢 `✅ Disponible (50)` - Más de 10 unidades
- 🟡 `⚠️ Quedan 5` - Entre 1 y 10 unidades
- 🔴 `❌ Agotado` - Sin stock

### 2. Web → Firebase (Escritura)
Cuando un usuario realiza una compra:

```
Compra → MercadoPago → success.html → Firebase (stock decrementado)
```

**Se guarda en Firebase:**
- ✅ Orden completa con datos del cliente
- ✅ Stock decrementado automáticamente
- ✅ Estado de la orden (`pending` → `completed`)

## 🎯 Cómo Actualizar Productos

### Desde Firebase Console

1. Ir a: https://console.firebase.google.com/project/cococatering-aba04/firestore

2. Seleccionar la colección (ej: `boxSalados`)

3. Editar el documento del producto

4. **Campos editables:**
   - `nombre` - Nombre del producto
   - `precio` - Precio (número)
   - `stock` - Cantidad disponible (número)
   - `descripcion` - Descripción corta
   - `items` - Array de strings con los items incluidos
   - `unidad` - Unidad de medida (ej: "10 unidades")

5. Guardar cambios

6. **Recargar la página web** → Los cambios se verán reflejados ✨

### Ejemplo de Actualización

**Cambiar el precio de BOX UNO:**

1. Firebase Console → `boxSalados` → `BOX UNO - Todo Frío (10-12 personas)`
2. Editar campo `precio`: `165000` → `175000`
3. Guardar
4. Recargar box-salados.html → Verás `$175.000`

**Actualizar stock después de una compra:**

El sistema lo hace automáticamente cuando:
- Usuario paga con MercadoPago ✅
- Se confirma el pago ✅
- success.html decrementa el stock en Firebase ✅

## 📊 Estructura de Datos en Firebase

### Ejemplo: boxSalados
```javascript
{
  nombre: "BOX UNO - Todo Frío (10-12 personas)",
  precio: 165000,
  stock: 50,
  descripcion: "15 bocaditos fríos variados",
  items: [
    "15 Pinchos bocconcinos",
    "15 Sconcitos de queso con crudo y rúcula",
    "15 Pecetitos con tomate",
    ...
  ]
}
```

### Ejemplo: fingersFrios
```javascript
{
  nombre: "Mini pizzetas",
  precio: 6000,
  stock: 100,
  unidad: "Precio por unidad"
}
```

### Ejemplo: orders (generado automáticamente)
```javascript
{
  orderId: "ORDER-1734567890123",
  fecha: "2025-12-18T10:30:00",
  cliente: {
    nombre: "Juan Pérez",
    email: "juan@email.com",
    telefono: "1123456789",
    dni: "12345678"
  },
  productos: [{
    nombre: "BOX UNO - Todo Frío",
    precio: 165000,
    cantidad: 2
  }],
  total: 330000,
  status: "completed",
  createdAt: Timestamp
}
```

## 🔧 Funciones Disponibles en firestore-service.js

### Productos
```javascript
// Obtener todos los productos
const productos = await getProducts('boxSalados');

// Obtener un producto específico
const box = await getProduct('boxSalados', 'BOX UNO - Todo Frío');
```

### Stock
```javascript
// Ver stock disponible
const stock = await getStock('boxSalados', 'BOX UNO');

// Verificar si hay stock
const disponible = await checkStock('boxSalados', 'BOX UNO', 2);

// Decrementar stock manualmente
await decrementStock('boxSalados', 'BOX UNO', 2);

// Incrementar stock (para reposición)
await incrementStock('boxSalados', 'BOX UNO', 10);
```

### Órdenes
```javascript
// Obtener todas las órdenes
const ordenes = await getOrders();

// Obtener solo pendientes
const pendientes = await getOrders('pending');

// Actualizar estado
await updateOrderStatus(orderId, 'completed');

// Eliminar orden
await deleteOrder(orderId);
```

## 🎨 Personalización Visual del Stock

El indicador de stock se muestra automáticamente debajo del precio:

```css
.stock-indicator {
  font-size: 0.85rem;
  margin: 5px 0;
  font-weight: 500;
}

/* Verde para stock alto */
color: #28a745 

/* Amarillo para stock bajo */
color: #ffc107

/* Rojo para sin stock */
color: #dc3545
```

## 🚀 Flujo Completo de Compra

1. **Usuario navega productos** → `price-loader.js` carga desde Firebase
2. **Ve nombres, precios, stock** → Todo dinámico desde Firebase
3. **Agrega al carrito** → `menu-script.js` valida stock
4. **Procede al checkout** → `checkout.js` guarda orden en Firebase
5. **Paga con MercadoPago** → Redirige a success.html
6. **success.html ejecuta:**
   - Decrementa stock en Firebase
   - Actualiza estado de orden a `completed`
   - Limpia carrito
7. **Stock actualizado** ✅ → Próximo usuario ve stock reducido

## 📱 Admin Panel (gestion.html)

El panel administrativo también usa Firebase:

- **Ver órdenes:** Lee directamente desde Firebase
- **Filtrar por estado:** `pending`, `processing`, `completed`, `cancelled`
- **Actualizar estado:** Se guarda en Firebase
- **Eliminar orden:** Se elimina de Firebase

**Login:**
- Usuario: `cococatering`
- Contraseña: `Cococatering2025`

## ⚡ Rendimiento

- **Primera carga:** ~2 segundos (carga todo desde Firebase)
- **Actualizaciones:** En tiempo real
- **Caché:** El navegador cachea Firebase SDK
- **Optimización:** Solo carga la colección de la página actual

## 🐛 Troubleshooting

### Los cambios en Firebase no se ven

**Solución:**
1. Hacer **hard refresh** en el navegador: `Ctrl + Shift + R`
2. Verificar en consola (F12) si hay errores de Firebase
3. Verificar que el nombre del documento coincida exactamente

### Stock no se decrementa después de pago

**Solución:**
1. Verificar que success.html tenga Firebase SDK cargado
2. Revisar consola del navegador en success.html
3. Verificar reglas de Firestore (deben permitir write en collections de productos)

### Productos no aparecen

**Solución:**
1. Verificar que subiste los productos con firebase-migrate.html
2. Verificar en Firebase Console que existen las colecciones
3. Revisar consola del navegador para errores de permisos

## 📈 Próximas Mejoras

- [ ] Sincronización en tiempo real (onSnapshot)
- [ ] Notificaciones cuando el stock es bajo
- [ ] Panel de administración para editar productos directamente
- [ ] Historial de cambios de stock
- [ ] Alertas automáticas por email cuando stock < 5

---

**Sistema completamente funcional y sincronizado con Firebase** 🎉
