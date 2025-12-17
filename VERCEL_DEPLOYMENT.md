# 🚀 DEPLOYMENT EN VERCEL - GUÍA PASO A PASO

## Paso 1: Preparar Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Inicia sesión con tu cuenta de GitHub
3. Click en **"Add New Project"**

## Paso 2: Importar Repositorio

1. Busca y selecciona el repositorio `pablot95/cococatering`
2. Click en **"Import"**

## Paso 3: Configurar Variables de Entorno

**IMPORTANTE:** Antes de deployar, configura las variables de entorno:

1. En la sección **"Environment Variables"**, agrega:
   - **Name:** `MP_ACCESS_TOKEN`
   - **Value:** `APP_USR-1994671338029929-121617-616567dcc8aed895c33977bb1eb37d82-2513559413`
   - **Environment:** Production ✅

2. Click en **"Add"**

## Paso 4: Deploy

1. Click en **"Deploy"**
2. Espera 1-2 minutos mientras Vercel construye y despliega tu backend
3. Vercel te dará una URL como: `https://cococatering.vercel.app`

## Paso 5: ¡Listo! Probar en Vercel

**El frontend y backend están juntos en Vercel:**

1. Vercel te dará una URL como: `https://cococatering.vercel.app`
2. Visita esa URL → Todo funciona (HTML + API)
3. Ya está configurado para usar `window.location.origin` automáticamente

## Paso 6 (OPCIONAL): Mover Frontend a Hostinger

Si más adelante quieres el frontend en Hostinger:

1. Sube archivos HTML, CSS, JS a Hostinger
2. **NO subas:** `node_modules/`, `.env`, `server.js`, `package.json`, `vercel.json`
3. El `checkout.js` ya está preparado para funcionar en ambos lados

## Paso 7: Probar en Producción

1. Ve a tu sitio en Hostinger
2. Navega al checkout
3. Completa un pedido de prueba
4. El pago debería procesar correctamente ✅

---

## 🔧 Configuración de Webhook (Opcional)

Para recibir notificaciones de MercadoPago:

1. Ve al [Panel de MercadoPago](https://www.mercadopago.com.ar/developers/panel)
2. En tu aplicación → **Webhooks**
3. Agrega la URL: `https://TU-URL-VERCEL.vercel.app/api/webhook`

---

## 📝 Notas Importantes

- ✅ **Backend** (server.js): Corre en Vercel
- ✅ **Frontend** (HTML/CSS/JS): Corre en Hostinger
- ✅ **CORS**: Ya configurado en server.js
- ✅ **HTTPS**: Automático en Vercel y Hostinger

---

## 🆘 Troubleshooting

### Error "Failed to fetch"
- Verifica que la URL en `checkout.js` sea correcta
- Verifica que el backend esté corriendo en Vercel (https://vercel.com/dashboard)

### Error CORS
- Ya está configurado en `server.js` con `app.use(cors())`
- Si persiste, agrega tu dominio específico en server.js

### Variables de entorno no funcionan
- Verifica que agregaste `MP_ACCESS_TOKEN` en Vercel Dashboard
- Re-deploy el proyecto en Vercel
