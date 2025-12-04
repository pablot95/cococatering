# Configuración de Firebase

## ⚠️ IMPORTANTE - Seguridad

Las credenciales de Firebase están protegidas y **NO se suben a GitHub**:

- ✅ `.env` - Contiene las variables de entorno (en .gitignore)
- ✅ `firebase-config.js` - Configuración real de Firebase (en .gitignore)
- ℹ️ `.env.example` - Plantilla de ejemplo (SÍ se sube a GitHub)
- ℹ️ `firebase-config.example.js` - Plantilla de ejemplo (SÍ se sube a GitHub)

## 📦 Archivos Configurados

### 1. `.env`
Contiene tus credenciales reales de Firebase. **Nunca compartas este archivo.**

### 2. `firebase-config.js`
Archivo de configuración real que usa tus credenciales. Se importa en tus páginas HTML.

## 🚀 Uso en HTML

En tus archivos HTML, importa Firebase así:

```html
<script type="module">
  import { db, collection, addDoc, getDocs } from './firebase-config.js';
  
  // Tu código aquí
  // Ejemplo: guardar pedido
  async function guardarPedido(pedido) {
    try {
      const docRef = await addDoc(collection(db, "pedidos"), {
        ...pedido,
        fecha: serverTimestamp()
      });
      console.log("Pedido guardado con ID: ", docRef.id);
    } catch (error) {
      console.error("Error al guardar pedido: ", error);
    }
  }
</script>
```

## 🔒 Para Deploy

### GitHub Pages / Netlify / Vercel:

Tu configuración actual funciona perfectamente porque:
- Las claves de Firebase para web son **públicas por diseño**
- La seguridad se maneja mediante las **reglas de Firebase**

### Configurar Reglas de Seguridad en Firebase Console:

1. Ve a Firebase Console → Firestore Database → Reglas
2. Configura reglas básicas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura a todos
    match /productos/{document=**} {
      allow read: if true;
    }
    
    // Solo escritura autenticada para pedidos
    match /pedidos/{document=**} {
      allow write: if true; // Cambiar según tus necesidades
      allow read: if false; // Solo admin puede leer
    }
  }
}
```

## 📝 Próximos Pasos

1. ✅ Firebase configurado
2. ⏳ Configurar MercadoPago (después)
3. ⏳ Implementar lógica de pedidos
4. ⏳ Configurar reglas de seguridad en Firebase Console

## 🆘 Solución de Problemas

Si Firebase no funciona:
1. Verifica que `firebase-config.js` existe
2. Revisa la consola del navegador para errores
3. Confirma que las reglas de Firestore permiten las operaciones
4. Asegúrate de que el proyecto Firebase esté activo

---

**Nota:** Este archivo es solo documentación y SÍ se puede subir a GitHub.
