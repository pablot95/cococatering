# 🔥 Guía de Migración a Firebase - Cocó Catering

## 📋 Pasos para Completar la Migración

### 1️⃣ Subir Productos a Firebase

1. Abre en tu navegador: `firebase-migrate.html`
2. Haz clic en "📤 Subir Productos a Firebase"
3. Espera a que termine la carga (verás el log con todos los productos)
4. Verifica en Firebase Console que las colecciones se crearon correctamente

### 2️⃣ Agregar Firebase SDK a tus páginas HTML

Necesitas agregar estas líneas **ANTES** del cierre de `</body>` en cada página HTML:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>

<!-- Firebase Config y Services -->
<script type="module" src="./firebase-config.js"></script>
<script type="module" src="./firestore-service.js"></script>
<script type="module" src="./price-loader.js"></script>
```

Páginas a actualizar:
- ✅ eventos.html
- ✅ box-salados.html
- ✅ box-dulces.html
- ✅ fingers-frios.html
- ✅ fingers-calientes.html
- ✅ shots.html
- ✅ tortas-clasicas.html
- ✅ combos-dulces.html
- ✅ desayunos.html
- ✅ checkout.html
- ✅ success.html
- ✅ gestion.html

### 3️⃣ Estructura de Firebase

**Colecciones creadas:**
- `menuEventos` - Menús para eventos
- `boxSalados` - Boxes salados
- `fingersFrios` - Fingers fríos
- `fingersCalientes` - Fingers calientes (actualmente vacío en productos.json)
- `boxDulces` - Boxes dulces
- `shots` - Shots
- `tortasClasicas` - Tortas clásicas
- `combosDulces` - Combos dulces
- `desayunos` - Desayunos (actualmente vacío en productos.json)
- `orders` - Órdenes de compra (se crea automáticamente al recibir pedidos)

**Formato de documentos:**
- ID del documento = `nombre` del producto
- Campos: `precio`, `stock`, `items`, `unidad`, `descripcion`, etc.

### 4️⃣ Archivos Nuevos Creados

| Archivo | Propósito |
|---------|-----------|
| `firebase-config.js` | Configuración de Firebase |
| `firestore-service.js` | Servicio con funciones para productos, stock y órdenes |
| `firebase-migrate.html` | Herramienta para subir productos.json a Firebase |
| `firebase-upload.js` | Script de migración |
| `price-loader.js` | Reescrito para cargar desde Firebase |

### 5️⃣ Archivos a Modificar

**Próximos pasos:**
- [ ] Actualizar `menu-script.js` - Eliminar stockManager, usar firestore-service
- [ ] Actualizar `checkout.js` - Guardar órdenes en Firebase
- [ ] Actualizar `success.html` - Decrementar stock en Firebase
- [ ] Actualizar `gestion.js` - Leer órdenes desde Firebase
- [ ] Actualizar todas las páginas HTML - Agregar Firebase SDK

### 6️⃣ Archivos a Eliminar (después de migración completa)

- ❌ `stock-manager.js` - Reemplazado por firestore-service.js
- ❌ `productos.json` - Datos ahora en Firebase
- ❌ `orders.json` - Órdenes ahora en Firebase

### 7️⃣ Funciones Disponibles en firestore-service.js

**Productos:**
- `getProducts(collectionName)` - Obtener todos los productos de una colección
- `getProduct(collectionName, productName)` - Obtener un producto específico

**Stock:**
- `getStock(collectionName, productName)` - Obtener stock disponible
- `checkStock(collectionName, productName, quantity)` - Verificar si hay stock
- `decrementStock(collectionName, productName, quantity)` - Decrementar stock
- `decrementCartStock(cartItems)` - Decrementar stock de todo el carrito
- `incrementStock(collectionName, productName, quantity)` - Incrementar stock

**Órdenes:**
- `saveOrder(orderData)` - Guardar una orden
- `getOrders(status)` - Obtener todas las órdenes (con filtro opcional)
- `getOrder(orderId)` - Obtener una orden específica
- `updateOrderStatus(orderId, newStatus)` - Actualizar estado de orden
- `deleteOrder(orderId)` - Eliminar una orden

**Precios:**
- `updatePrice(collectionName, productName, newPrice)` - Actualizar precio

**Utilidades:**
- `getCurrentCollection()` - Obtener colección de la página actual
- `PAGE_TO_COLLECTION` - Mapeo de páginas a colecciones

### 8️⃣ Ejemplo de Uso

```javascript
import { getProducts, checkStock, decrementStock } from './firestore-service.js';

// Cargar productos
const boxesSalados = await getProducts('boxSalados');
console.log(boxesSalados);

// Verificar stock
const hayStock = await checkStock('boxSalados', 'BOX UNO - Todo Frío', 2);
if (hayStock) {
    // Decrementar stock
    await decrementStock('boxSalados', 'BOX UNO - Todo Frío', 2);
}

// Guardar orden
import { saveOrder } from './firestore-service.js';
const orderId = await saveOrder({
    cliente: {
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        telefono: '1234567890'
    },
    items: [...],
    total: 15000,
    fechaEntrega: '2025-06-15'
});
```

### 9️⃣ Verificación

Después de subir los productos, verifica en Firebase Console:
1. Ve a https://console.firebase.google.com/
2. Selecciona tu proyecto: cococatering-aba04
3. Ve a Firestore Database
4. Deberías ver todas las colecciones con sus productos

### 🔟 Soporte

Si algo no funciona:
1. Abre la consola del navegador (F12)
2. Busca errores en rojo
3. Verifica que Firebase SDK se haya cargado correctamente
4. Verifica las reglas de Firestore en Firebase Console

---

## 🚀 ¡Listo para empezar!

Una vez completados estos pasos, tu sistema estará funcionando completamente con Firebase.
