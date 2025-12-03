# 🔧 Configuración de Firebase

## ⚠️ IMPORTANTE: Configuración Inicial Requerida

Este proyecto usa Firebase Firestore pero **las credenciales NO están incluidas** por seguridad.

## 📋 Pasos para Configurar

### 1. Crear archivo de configuración

Copia el archivo de ejemplo:

```bash
cp firebase-config.example.js firebase-config.js
```

O simplemente **crea un nuevo archivo** llamado `firebase-config.js` en la raíz del proyecto.

### 2. Obtener tus credenciales de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto o crea uno nuevo
3. Ve a **Configuración del proyecto** (ícono de engranaje)
4. En la sección **Tus apps**, selecciona la app web
5. Copia las credenciales que aparecen en `firebaseConfig`

### 3. Completar firebase-config.js

Abre `firebase-config.js` y reemplaza los valores de ejemplo con tus credenciales:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",              // Tu API Key
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### 4. Configurar Firestore Database

1. En Firebase Console, ve a **Firestore Database**
2. Haz clic en **Crear base de datos**
3. Selecciona **Modo de producción** (configuraremos las reglas después)
4. Elige una ubicación (recomendado: southamerica-east1)

### 5. Configurar Reglas de Seguridad

En Firebase Console → Firestore Database → Reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /orders/{orderId} {
      allow read, write: if true;
    }
    match /customers/{customerId} {
      allow read, write: if true;
    }
    match /products/{productId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

## ✅ Verificar Instalación

1. Abre `checkout.html` en tu navegador
2. Completa una compra de prueba
3. Verifica que la orden se guarde en Firestore Console
4. Abre `admin-orders.html` para ver las órdenes

## 🔒 Seguridad

- ❌ **NUNCA** hagas commit del archivo `firebase-config.js`
- ❌ **NUNCA** compartas tus credenciales
- ✅ El archivo está en `.gitignore` para protección
- ✅ Usa `firebase-config.example.js` como referencia

## 📚 Más Información

Lee `FIREBASE_README.md` para documentación completa sobre:
- Estructura de datos
- Funciones disponibles
- Panel de administración
- Troubleshooting

---

**Nota:** Si clonaste este repositorio, necesitas completar esta configuración antes de que el checkout funcione correctamente.
