# Configuración de MercadoPago - Cocó Catering

## 📋 Resumen de Cambios Implementados

### ✅ Carrito (carrito.html)
- **Cálculo de envío inteligente**: Gratis para compras mayores a $180.000
- **Mensaje dinámico**: Muestra cuánto falta para envío gratis
- **Botón "Continuar Compra"**: Redirige a checkout.html
- **Resumen limpio**: Sin formularios, solo totales

### ✅ Checkout (checkout.html - NUEVO)
- **3 pasos visuales**: Datos de Envío → Facturación → Pago
- **Formulario completo de datos del comprador**:
  - Nombre completo
  - DNI/CUIL
  - Teléfono
  - Email
  - Dirección detallada (calle, altura, piso, depto, ciudad, provincia, CP)

- **Formulario de facturación**:
  - Checkbox "Mismos datos que envío"
  - Formulario completo si son datos diferentes
  - Auto-completado cuando se marca el checkbox

- **Integración MercadoPago Checkout Pro**:
  - SDK configurado
  - Botón de pago dinámico
  - Redirección automática a páginas de resultado

### ✅ Páginas de Resultado
- **success.html**: Pago exitoso ✓
- **pending.html**: Pago pendiente ⏳
- **failure.html**: Pago fallido ✗

---

## 🔧 Configuración de MercadoPago

### Paso 1: Crear cuenta en MercadoPago
1. Ve a https://www.mercadopago.com.ar
2. Crea una cuenta o inicia sesión
3. Verifica tu cuenta

### Paso 2: Obtener credenciales
1. Ve al [Panel de Desarrolladores](https://www.mercadopago.com.ar/developers/panel)
2. Ve a "Tus aplicaciones"
3. Crea una nueva aplicación o usa una existente
4. Copia tus credenciales:
   - **Public Key** (para el frontend)
   - **Access Token** (para el backend)

### Paso 3: Configurar Frontend
Edita el archivo `checkout.js` línea 7:

```javascript
const MP_PUBLIC_KEY = 'APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; // Tu Public Key aquí
```

### Paso 4: Crear Backend
Necesitas crear un servidor backend. Aquí hay ejemplos:

#### Opción A: Node.js + Express (Recomendado)

**1. Instalar dependencias:**
```bash
npm init -y
npm install express mercadopago cors body-parser
```

**2. Crear `server.js`:**
```javascript
const express = require('express');
const mercadopago = require('mercadopago');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Configuración
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Tus archivos HTML/CSS/JS

// Configurar MercadoPago
mercadopago.configure({
    access_token: 'APP_USR-xxxxxxxxxxxxxxxxxxxxxxxx' // Tu Access Token
});

// Endpoint para crear preferencia de pago
app.post('/api/create-preference', async (req, res) => {
    try {
        const preference = {
            items: req.body.items,
            payer: req.body.payer,
            shipments: req.body.shipments,
            back_urls: req.body.back_urls,
            auto_return: req.body.auto_return,
            metadata: req.body.metadata,
            notification_url: 'https://tu-dominio.com/api/webhook' // Para recibir notificaciones
        };

        const response = await mercadopago.preferences.create(preference);
        res.json({ id: response.body.id });
    } catch (error) {
        console.error('Error al crear preferencia:', error);
        res.status(500).json({ error: error.message });
    }
});

// Webhook para recibir notificaciones de pago
app.post('/api/webhook', async (req, res) => {
    try {
        const { type, data } = req.body;
        
        if (type === 'payment') {
            const paymentId = data.id;
            const payment = await mercadopago.payment.get(paymentId);
            
            // Aquí procesas el pago
            console.log('Pago recibido:', payment);
            
            // Guardar en base de datos, enviar emails, etc.
        }
        
        res.sendStatus(200);
    } catch (error) {
        console.error('Error en webhook:', error);
        res.sendStatus(500);
    }
});

// Endpoint opcional para confirmar orden
app.post('/api/confirm-order', async (req, res) => {
    try {
        const { paymentId, status, externalReference } = req.body;
        
        // Aquí guardas la orden en tu base de datos
        console.log('Orden confirmada:', { paymentId, status, externalReference });
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
```

**3. Ejecutar servidor:**
```bash
node server.js
```

#### Opción B: Python + Flask

**1. Instalar dependencias:**
```bash
pip install flask mercadopago flask-cors
```

**2. Crear `app.py`:**
```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import mercadopago

app = Flask(__name__)
CORS(app)

# Configurar MercadoPago
sdk = mercadopago.SDK("TU_ACCESS_TOKEN_AQUI")

@app.route('/api/create-preference', methods=['POST'])
def create_preference():
    try:
        data = request.json
        
        preference_data = {
            "items": data['items'],
            "payer": data['payer'],
            "shipments": data['shipments'],
            "back_urls": data['back_urls'],
            "auto_return": data['auto_return'],
            "metadata": data['metadata']
        }
        
        preference_response = sdk.preference().create(preference_data)
        preference = preference_response["response"]
        
        return jsonify({"id": preference["id"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/webhook', methods=['POST'])
def webhook():
    try:
        data = request.json
        
        if data['type'] == 'payment':
            payment_id = data['data']['id']
            payment = sdk.payment().get(payment_id)
            
            # Procesar pago
            print('Pago recibido:', payment)
        
        return '', 200
    except Exception as e:
        print('Error en webhook:', e)
        return '', 500

if __name__ == '__main__':
    app.run(debug=True, port=3000)
```

**3. Ejecutar servidor:**
```bash
python app.py
```

---

## 🌐 Deployment (Producción)

### Para hosting estático (Vercel, Netlify):
Necesitas configurar Serverless Functions:

**Vercel:**
Crea `api/create-preference.js`:
```javascript
const mercadopago = require('mercadopago');

mercadopago.configure({
    access_token: process.env.MP_ACCESS_TOKEN
});

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const preference = await mercadopago.preferences.create(req.body);
        res.json({ id: preference.body.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
```

---

## 🔒 Seguridad

### Variables de entorno
Nunca subas tus credenciales al repositorio. Usa variables de entorno:

**.env**
```
MP_PUBLIC_KEY=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MP_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxxxxxxxxxx
```

**En tu código:**
```javascript
const MP_PUBLIC_KEY = process.env.MP_PUBLIC_KEY;
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
```

---

## 📝 Testing

### Modo Sandbox (Pruebas)
1. Ve a [Test Users](https://www.mercadopago.com.ar/developers/panel/test-users)
2. Crea usuarios de prueba
3. Usa tarjetas de prueba:
   - **Aprobada**: 5031 7557 3453 0604 (CVV: 123, Exp: 11/25)
   - **Rechazada**: 5031 4332 1540 6351
   - **Pendiente**: 5031 4332 1540 6351

---

## 🚀 Checklist de Implementación

- [ ] Cuenta de MercadoPago creada y verificada
- [ ] Credenciales obtenidas (Public Key + Access Token)
- [ ] Public Key configurado en `checkout.js`
- [ ] Backend creado (Node.js, Python, o Serverless)
- [ ] Access Token configurado en backend
- [ ] Endpoints `/api/create-preference` y `/api/webhook` funcionando
- [ ] Pruebas con tarjetas de test en modo sandbox
- [ ] URLs de back_urls configuradas (success.html, pending.html, failure.html)
- [ ] Webhook URL configurada en panel de MercadoPago
- [ ] Variables de entorno configuradas
- [ ] Deployment en producción

---

## 📚 Documentación Oficial
- [MercadoPago Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/landing)
- [SDK JavaScript](https://www.mercadopago.com.ar/developers/es/docs/sdks-library/client-side/javascript)
- [API Reference](https://www.mercadopago.com.ar/developers/es/reference)
- [Webhooks](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks)

---

## ⚠️ Notas Importantes

1. **Envío gratis**: Se calcula automáticamente para compras mayores a $180.000
2. **Datos del comprador**: Se envían a MercadoPago para auto-completar formulario de pago
3. **Carrito persistente**: Los productos permanecen en localStorage hasta completar compra
4. **Success page**: Limpia el carrito automáticamente
5. **Failure page**: Mantiene los productos en el carrito para reintentar

---

## 🆘 Soporte
Si necesitas ayuda:
- [Centro de ayuda MercadoPago](https://www.mercadopago.com.ar/ayuda)
- [Comunidad de desarrolladores](https://www.mercadopago.com.ar/developers/es/community)
