# 📧 CONFIGURACIÓN DE EMAIL PARA ÓRDENES

## Paso 1: Crear Contraseña de Aplicación en Gmail

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. En el menú izquierdo, selecciona **"Seguridad"**
3. Busca **"Verificación en dos pasos"** y actívala si no está activa
4. Una vez activada, busca **"Contraseñas de aplicaciones"**
5. Click en **"Contraseñas de aplicaciones"**
6. Selecciona:
   - **App:** Correo
   - **Dispositivo:** Otro (nombre personalizado) → Escribe "Cocó Catering Backend"
7. Click en **"Generar"**
8. **Copia la contraseña de 16 caracteres** que aparece

## Paso 2: Configurar Variables de Entorno

### En desarrollo local (.env):
```
EMAIL_USER=cococateringsanisidro@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx  (la contraseña de aplicación que copiaste)
```

### En Vercel (Production):
1. Ve al dashboard de tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega:
   - **Key:** `EMAIL_USER`
   - **Value:** `cococateringsanisidro@gmail.com`
   - **Environment:** Production ✅
   
4. Agrega:
   - **Key:** `EMAIL_PASS`
   - **Value:** `xxxx xxxx xxxx xxxx` (tu contraseña de aplicación)
   - **Environment:** Production ✅

5. Click en **"Save"**
6. **Re-deploy** el proyecto para que tome las nuevas variables

## Paso 3: Probar

Cuando un cliente complete una compra exitosa:
- Se enviará automáticamente un email a **cococateringsanisidro@gmail.com**
- El email incluirá:
  - Datos del cliente
  - Dirección de entrega
  - Lista de productos
  - Total de la orden
  - ID del pago de MercadoPago

---

## 🔒 Seguridad

- ✅ Nunca compartas la contraseña de aplicación
- ✅ Nunca subas el archivo `.env` a GitHub (ya está en .gitignore)
- ✅ Usa contraseñas de aplicación, no la contraseña principal de Gmail
- ✅ Si la contraseña se compromete, puedes revocarla desde tu cuenta de Google

---

## 🆘 Troubleshooting

### Email no se envía
1. Verifica que la verificación en dos pasos esté activa en Gmail
2. Verifica que usaste una contraseña de aplicación (no la contraseña normal)
3. Verifica que las variables `EMAIL_USER` y `EMAIL_PASS` estén configuradas en Vercel
4. Verifica los logs del servidor: `vercel logs` o en el dashboard de Vercel
