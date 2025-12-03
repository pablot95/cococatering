# 🔥 Configuración Firebase Firestore - Cocó Catering

## ✅ Estado de Configuración

Firebase Firestore ha sido configurado exitosamente en tu proyecto.

## 📁 Archivos Creados

### 1. `firebase-config.js`
- Configuración de Firebase con tus credenciales
- Inicialización de Firestore
- Exporta funciones necesarias para interactuar con la base de datos

### 2. `firestore-service.js`
- Servicio completo para interactuar con Firestore
- Funciones para **Órdenes**, **Productos** y **Clientes**
- Incluye operaciones CRUD (Crear, Leer, Actualizar, Eliminar)

### 3. `checkout.js` (Actualizado)
- Integrado con Firestore para guardar órdenes automáticamente
- Guarda datos de cliente y dirección de envío/facturación
- Crea registro en Firestore antes de procesar el pago

### 4. `admin-orders.html`
- Panel de administración para visualizar órdenes
- Filtros por estado (pendiente, en proceso, completada, cancelada)
- Actualización de estado de órdenes
- Eliminación de órdenes
- Exportación a CSV

## 🚀 Cómo Usar

### Para el Checkout (Ya integrado)

Cuando un cliente finaliza una compra en `checkout.html`:

1. Se completan los datos del comprador
2. Se presiona "Continuar al pago"
3. **Automáticamente se guarda en Firestore:**
   - Datos del cliente
   - Dirección de envío
   - Dirección de facturación
   - Productos del carrito
   - Totales y estado de envío
   - Timestamp de creación

### Para Ver las Órdenes

Abre el archivo `admin-orders.html` en tu navegador para acceder al panel de administración:

```
file:///C:/Users/pablo/OneDrive/Escritorio/Gokywebs.net/Cocó/admin-orders.html
```

**Funciones del Panel:**

- ✅ Ver todas las órdenes en tiempo real
- 🔍 Filtrar por estado (pendiente, procesando, completada, cancelada)
- ✏️ Actualizar estado de órdenes
- 🗑️ Eliminar órdenes
- 📥 Exportar órdenes a CSV
- 🔄 Actualizar listado

## 📊 Estructura de Datos en Firestore

### Colección: `orders`

```javascript
{
  cliente: {
    nombre: "Juan Pérez",
    dni: "12345678",
    telefono: "1123456789",
    email: "juan@example.com"
  },
  direccionEnvio: {
    calle: "Av. Corrientes",
    altura: "1234",
    piso: "5",
    depto: "A",
    ciudad: "Buenos Aires",
    provincia: "CABA",
    codigoPostal: "1043"
  },
  direccionFacturacion: {
    nombre: "Juan Pérez",
    dni: "12345678",
    // ... misma estructura
  },
  productos: [
    {
      id: "box-uno",
      nombre: "BOX UNO - Todo Frío",
      precio: 165000,
      cantidad: 2,
      imagen: "images/salados.jpg"
    }
  ],
  subtotal: 330000,
  envioGratis: true,
  total: 330000,
  status: "pending",
  paymentStatus: "pending",
  origen: "web",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Colección: `customers`

```javascript
{
  nombre: "Juan Pérez",
  dni: "12345678",
  telefono: "1123456789",
  email: "juan@example.com",
  direccion: {
    calle: "Av. Corrientes",
    altura: "1234",
    ciudad: "Buenos Aires",
    provincia: "CABA"
  },
  createdAt: Timestamp
}
```

## 🔧 Funciones Disponibles en `firestore-service.js`

### Órdenes

```javascript
import { createOrder, getAllOrders, getOrdersByStatus, updateOrderStatus, deleteOrder } from './firestore-service.js';

// Crear orden
await createOrder(orderData);

// Obtener todas las órdenes
const orders = await getAllOrders();

// Obtener órdenes por estado
const pendingOrders = await getOrdersByStatus('pending');

// Actualizar estado
await updateOrderStatus(orderId, 'completed');

// Eliminar orden
await deleteOrder(orderId);
```

### Productos

```javascript
import { addProduct, getAllProducts, updateProduct, deleteProduct } from './firestore-service.js';

// Agregar producto
await addProduct(productData);

// Obtener todos los productos
const products = await getAllProducts();

// Actualizar producto
await updateProduct(productId, { price: 200000 });

// Eliminar producto
await deleteProduct(productId);
```

### Clientes

```javascript
import { saveCustomer, getAllCustomers } from './firestore-service.js';

// Guardar cliente
await saveCustomer(customerData);

// Obtener todos los clientes
const customers = await getAllCustomers();
```

## 🔐 Configuración de Firestore (Opcional)

### Reglas de Seguridad Recomendadas

Ve a Firebase Console → Firestore Database → Rules y configura:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Órdenes: Permitir lectura/escritura desde la web
    match /orders/{orderId} {
      allow read, write: if true;
    }
    
    // Productos: Solo lectura pública
    match /products/{productId} {
      allow read: if true;
      allow write: if false; // Solo desde admin
    }
    
    // Clientes: Permitir escritura desde la web
    match /customers/{customerId} {
      allow read, write: if true;
    }
  }
}
```

### Índices (Si es necesario)

Firestore creará índices automáticamente cuando sean necesarios. Si ves errores en la consola, el mensaje incluirá un enlace directo para crear el índice requerido.

## 📱 Testing

### 1. Probar Creación de Orden

1. Ve a `menu.html`
2. Agrega productos al carrito
3. Ve a `carrito.html` y haz clic en "Finalizar compra"
4. Completa el formulario de checkout
5. Presiona "Continuar al pago"
6. ✅ La orden se guardará en Firestore automáticamente

### 2. Ver Órdenes en Panel Admin

1. Abre `admin-orders.html`
2. Deberías ver todas las órdenes creadas
3. Prueba cambiar el estado de una orden
4. Prueba exportar a CSV

### 3. Ver en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto "cococatering-aba04"
3. Ve a "Firestore Database"
4. Verás las colecciones `orders`, `customers`

## 🎨 Personalización

### Agregar Más Campos a las Órdenes

Edita `checkout.js` en la función `initMercadoPago()`:

```javascript
const orderData = {
  // ... campos existentes
  notasEspeciales: document.getElementById('notas').value,
  metodoPago: 'mercadopago',
  // etc.
};
```

### Crear Nuevas Colecciones

Usa `firestore-service.js` como referencia y crea funciones similares:

```javascript
export async function addNewCollection(data) {
  try {
    const collectionRef = collection(db, 'nueva_coleccion');
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

## 🚨 Troubleshooting

### Error: "Firebase not initialized"

- Verifica que `checkout.html` tenga `<script type="module" src="checkout.js"></script>`
- Verifica que las credenciales en `firebase-config.js` sean correctas

### Error: "Permission denied"

- Revisa las reglas de seguridad en Firebase Console
- Asegúrate de que las reglas permitan escritura/lectura según lo necesites

### Las órdenes no aparecen en el panel

- Abre la consola del navegador (F12) y verifica errores
- Verifica que estés conectado a internet
- Verifica que la configuración de Firebase sea correcta

### Error de CORS

- Si usas archivos locales (`file:///`), algunos navegadores bloquean módulos
- Solución: Usa un servidor local (Live Server en VS Code, o Python `python -m http.server`)

## 📚 Recursos

- [Documentación Firebase](https://firebase.google.com/docs/firestore)
- [Guía Firestore Web](https://firebase.google.com/docs/firestore/quickstart)
- [Consola Firebase](https://console.firebase.google.com/)

## 🎉 ¡Listo!

Firebase Firestore está completamente configurado y funcionando. Cada vez que un cliente haga una compra, se guardará automáticamente en tu base de datos.

Para ver las órdenes, simplemente abre `admin-orders.html` en tu navegador.

---

**Proyecto:** Cocó Catering  
**Firebase Project ID:** cococatering-aba04  
**Configurado:** Diciembre 2025
