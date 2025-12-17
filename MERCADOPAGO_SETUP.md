# 💳 Configuración de MercadoPago - Cocó Catering

## 📋 Requisitos Previos
- Node.js instalado (versión 14 o superior)
- Cuenta de MercadoPago con credenciales

## 🚀 Instalación del Backend

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar credenciales
Las credenciales ya están configuradas en `server.js`:
- **Public Key**: `APP_USR-eb9414cf-eadb-4da9-9d16-0bf070ad753e`
- **Access Token**: Configurado en el backend (seguro)

### 3. Iniciar el servidor
```bash
npm start
```

El servidor se iniciará en `http://localhost:3000`

Para desarrollo con auto-reload:
```bash
npm run dev
```

## 🔧 Configuración del Frontend

El frontend (`checkout.js`) ya está configurado para comunicarse con el backend en:
- **Desarrollo**: `http://localhost:3000`
- **Producción**: Debes cambiar la variable `BACKEND_URL` en `checkout.js`

## 📦 Endpoints Disponibles

### POST /api/create-preference
Crea una preferencia de pago en MercadoPago.

**Request Body:**
```json
{
  "items": [
    {
      "id": "product-1",
      "title": "Producto",
      "quantity": 1,
      "unit_price": 1000,
      "currency_id": "ARS"
    }
  ],
  "payer": {
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "identification": {
      "type": "DNI",
      "number": "12345678"
    }
  },
  "back_urls": {
    "success": "https://tudominio.com/success.html",
    "failure": "https://tudominio.com/failure.html",
    "pending": "https://tudominio.com/pending.html"
  }
}
```

**Response:**
```json
{
  "id": "preference-id",
  "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=...",
  "sandbox_init_point": "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=..."
}
```

### POST /api/webhook
Recibe notificaciones de MercadoPago cuando cambia el estado de un pago.

### GET /api/payment/:id
Obtiene información de un pago específico.

## 🌐 Despliegue en Producción

### Opciones de Hosting

#### 1. Vercel (Recomendado)
```bash
npm install -g vercel
vercel
```

#### 2. Heroku
```bash
heroku create coco-catering-backend
git push heroku main
```

#### 3. Railway
- Conecta tu repositorio de GitHub
- Railway detectará automáticamente Node.js
- Configura las variables de entorno

### Actualizar URL en Producción
Una vez desplegado, actualiza `BACKEND_URL` en `checkout.js`:
```javascript
const BACKEND_URL = 'https://tu-backend.vercel.app'; // URL de tu backend
```

## 🔒 Seguridad

**IMPORTANTE:**
- El Access Token NUNCA debe estar en el frontend
- Está correctamente configurado en `server.js` (backend)
- En producción, considera usar variables de entorno:
  ```javascript
  access_token: process.env.MP_ACCESS_TOKEN
  ```

## 📝 URLs de Retorno

Las URLs configuradas son:
- **Success**: `/success.html` - Pago aprobado
- **Failure**: `/failure.html` - Pago rechazado
- **Pending**: `/pending.html` - Pago pendiente

Estas páginas ya existen en tu proyecto.

## 🧪 Modo de Prueba

Para probar pagos sin dinero real, usa las [tarjetas de prueba de MercadoPago](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards):

**Tarjeta aprobada:**
- Número: `5031 7557 3453 0604`
- CVV: Cualquier 3 dígitos
- Fecha: Cualquier fecha futura

**Tarjeta rechazada:**
- Número: `5031 4332 1540 6351`

## 📞 Soporte

Si tienes problemas:
1. Verifica que el servidor backend esté corriendo
2. Revisa la consola del navegador (F12)
3. Revisa los logs del servidor
4. Consulta la [documentación de MercadoPago](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/landing)

## 🎯 Flujo Completo de Pago

1. Usuario completa formulario en `checkout.html`
2. Frontend envía datos al backend (`/api/create-preference`)
3. Backend crea preferencia en MercadoPago
4. Backend devuelve preference ID al frontend
5. Frontend muestra botón de MercadoPago
6. Usuario hace clic y es redirigido a MercadoPago
7. Usuario completa el pago
8. MercadoPago redirige a success/failure/pending
9. MercadoPago envía notificación al webhook (`/api/webhook`)
10. Backend procesa la notificación y actualiza el pedido

## ✅ Verificación

Para verificar que todo funciona:
1. Inicia el backend: `npm start`
2. Abre `checkout.html` en el navegador
3. Agrega productos al carrito
4. Completa el formulario
5. Deberías ver el botón "Pagar con MercadoPago"
6. Al hacer clic, te redirige a MercadoPago
