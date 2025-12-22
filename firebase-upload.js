// Script para subir productos.json a Firebase
// Ejecutar una sola vez para migrar datos

import { db } from './firebase-config.js';

// Cargar productos.json
async function uploadProductsToFirebase() {
    try {
        const response = await fetch('./productos.json');
        const data = await response.json();
        
        console.log('📦 Iniciando carga de productos a Firebase...');
        
        // Mapeo de nombres de JSON a colecciones de Firebase
        const collections = {
            'menuEventos': 'menuEventos',
            'boxSalados': 'boxSalados',
            'fingersFrios': 'fingersFrios',
            'fingersCalientes': 'fingersCalientes',
            'boxDulces': 'boxDulces',
            'shots': 'shots',
            'tortasClasicas': 'tortasClasicas',
            'combosDulces': 'combosDulces',
            'desayunos': 'desayunos'
        };
        
        // Recorrer cada categoría
        for (const [jsonKey, collectionName] of Object.entries(collections)) {
            const items = data[jsonKey] || [];
            
            if (items.length === 0) {
                console.log(`⚠️ ${collectionName}: vacío`);
                continue;
            }
            
            console.log(`\n📁 Procesando ${collectionName}...`);
            
            // Subir cada producto
            for (const item of items) {
                const docId = item.nombre; // Usar nombre como ID del documento
                
                try {
                    await db.collection(collectionName).doc(docId).set(item);
                    console.log(`  ✅ ${docId}`);
                } catch (error) {
                    console.error(`  ❌ Error en ${docId}:`, error);
                }
            }
        }
        
        console.log('\n🎉 ¡Carga completada!');
        
    } catch (error) {
        console.error('❌ Error general:', error);
    }
}

// Ejecutar al cargar la página
window.uploadToFirebase = uploadProductsToFirebase;

console.log('🔥 Script de migración cargado.');
console.log('Para subir los productos, ejecuta: uploadToFirebase()');

// ===================================
// Protección contra inspección y copia
// ===================================
// Deshabilitar click derecho
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
});

// Deshabilitar teclas de desarrollo (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
document.addEventListener('keydown', (e) => {
    if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) || 
        (e.ctrlKey && e.key === 'U')
    ) {
        e.preventDefault();
        return false;
    }
});
