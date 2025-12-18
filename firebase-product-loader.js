// Firebase Product Loader - Carga dinámica de productos desde Firebase
import { db } from './firebase-config.js';

/**
 * Cargar un producto individual desde Firebase
 * @param {string} collectionName - Nombre de la colección en Firebase
 * @param {string} dataId - data-id del elemento HTML
 * @param {string} docId - ID del documento en Firebase (opcional, se genera desde dataId si no se provee)
 */
async function cargarProducto(collectionName, dataId, docId = null) {
    try {
        const elemento = document.querySelector(`[data-id="${dataId}"]`);
        if (!elemento) {
            console.warn(`No se encontró elemento con data-id="${dataId}"`);
            return;
        }

        // Si se provee docId directamente, usarlo
        if (docId) {
            const doc = await db.collection(collectionName).doc(docId).get();
            if (doc.exists) {
                const producto = doc.data();
                console.log(`✅ ${producto.nombre} cargado`);
                actualizarElementoHTML(elemento, producto);
                return;
            }
        }

        // Si no, buscar por data-name del HTML
        const dataName = elemento.getAttribute('data-name');
        if (!dataName || dataName === '-') {
            console.warn(`❌ ${dataId}: No tiene data-name válido para buscar`);
            return;
        }

        // Buscar en toda la colección por nombre que contenga las palabras clave
        console.log(`🔍 Buscando en ${collectionName} por nombre similar a: "${dataName}"`);
        
        const snapshot = await db.collection(collectionName).get();
        let productoEncontrado = null;
        
        // Buscar producto que coincida
        snapshot.forEach(doc => {
            const producto = doc.data();
            const nombreCompleto = producto.unidad ? `${producto.nombre} – ${producto.unidad}` : producto.nombre;
            
            // Comparar nombres (insensible a mayúsculas y espacios extras)
            const nombreNormalizado = nombreCompleto.toLowerCase().trim();
            const busquedaNormalizada = dataName.toLowerCase().trim();
            
            if (nombreNormalizado === busquedaNormalizada) {
                productoEncontrado = producto;
                console.log(`✅ ${producto.nombre} encontrado`);
            }
        });

        if (productoEncontrado) {
            actualizarElementoHTML(elemento, productoEncontrado);
        } else {
            console.warn(`❌ No se encontró producto con nombre: "${dataName}"`);
        }

    } catch (error) {
        console.error(`Error cargando producto ${dataId}:`, error);
    }
}

/**
 * Actualizar elemento HTML con datos del producto
 */
function actualizarElementoHTML(elemento, producto) {
    // Construir nombre completo
    let nombreCompleto = producto.nombre;
    if (producto.unidad) {
        nombreCompleto += ` – ${producto.unidad}`;
    }

    // Actualizar atributos data-
    elemento.setAttribute('data-name', nombreCompleto);
    
    if (producto.precio) {
        elemento.setAttribute('data-price', producto.precio);
    }

    // Actualizar elementos visuales
    const spanNombre = elemento.querySelector('.product-name');
    const spanPrecio = elemento.querySelector('.product-price');
    const boxTitle = elemento.querySelector('.box-title');
    const boxPrice = elemento.querySelector('.box-price');

    // Para productos normales (fingers, etc)
    if (spanNombre) {
        spanNombre.textContent = nombreCompleto;
    }

    if (spanPrecio && producto.precio) {
        spanPrecio.textContent = `$${producto.precio.toLocaleString('es-AR')}`;
    }

    // Para boxes
    if (boxTitle) {
        boxTitle.textContent = nombreCompleto;
    }

    if (boxPrice && producto.precio) {
        boxPrice.textContent = `$${producto.precio.toLocaleString('es-AR')}`;
    }

    // Para shots - actualizar sabores si existen
    if (producto.sabores && Array.isArray(producto.sabores)) {
        const shotsList = elemento.querySelector('.shots-details ul');
        if (shotsList) {
            shotsList.innerHTML = producto.sabores.map(sabor => `<li>${sabor}</li>`).join('');
        }
    }

    // Para boxes - actualizar items si existen
    if (producto.items && Array.isArray(producto.items)) {
        const itemsList = elemento.querySelector('.items-list');
        if (itemsList) {
            itemsList.innerHTML = producto.items.map(item => `<li>${item}</li>`).join('');
        }
    }
}

/**
 * Cargar todos los productos de una página
 * @param {string} collectionName - Nombre de la colección en Firebase
 * @param {Array} dataIds - Array de data-ids de los productos a cargar
 */
async function cargarTodosLosProductos(collectionName, dataIds) {
    try {
        console.log(`📦 Cargando ${dataIds.length} productos de ${collectionName}...`);
        
        // Obtener TODOS los productos de la colección de una vez
        const snapshot = await db.collection(collectionName).get();
        const productosFirebase = {};
        
        snapshot.forEach(doc => {
            productosFirebase[doc.id] = doc.data();
        });
        
        console.log(`🔥 Obtenidos ${snapshot.size} productos de Firebase`);
        
        // Ahora actualizar cada elemento HTML
        let actualizados = 0;
        for (const dataId of dataIds) {
            const elemento = document.querySelector(`[data-id="${dataId}"]`);
            if (!elemento) {
                console.warn(`⚠️ No se encontró elemento con data-id="${dataId}"`);
                continue;
            }
            
            // Intentar encontrar el producto correspondiente
            const docId = limpiarNombre(dataId);
            let producto = productosFirebase[docId];
            
            // Si no se encuentra directamente, buscar por coincidencia flexible
            if (!producto) {
                const dataIdUpper = dataId.toUpperCase().replace(/-/g, '_');
                const palabrasDataId = dataIdUpper.split('_').filter(p => p.length > 0);
                
                for (const [id, prod] of Object.entries(productosFirebase)) {
                    const palabrasFirebase = id.split('_').filter(p => p.length > 0);
                    
                    // Verificar si todas las palabras del data-id están en el Firebase ID
                    const todasPresentes = palabrasDataId.every(palabra => 
                        palabrasFirebase.some(fb => fb.includes(palabra) || palabra.includes(fb))
                    );
                    
                    if (todasPresentes) {
                        producto = prod;
                        break;
                    }
                }
            }
            
            if (producto) {
                actualizarElementoHTML(elemento, producto);
                actualizados++;
            } else {
                console.warn(`❌ No se encontró producto para: ${dataId}`);
            }
        }
        
        console.log(`✅ ${actualizados}/${dataIds.length} productos actualizados`);
        
    } catch (error) {
        console.error(`Error cargando productos de ${collectionName}:`, error);
    }
}

/**
 * Mapeo de data-id HTML a ID de documento Firebase
 * Usado cuando el data-id no coincide directamente con el ID en Firebase
 */
const MAPEO_IDS = {
    // fingersCalientes
    'empanaditas-bondiola': 'EMPANADITAS_DE_BONDIOLA',
    'empanaditas-jyq': 'EMPANADITAS_DE_J_Y_Q',
    'empanaditas-pollo': 'EMPANADITAS_DE_POLLO',
    'empanaditas-carne': 'EMPANADITAS_DE_CARNE',
    'empanaditas-osobuco': 'EMPANADITAS_DE_OSOBUCO',
    'empanaditas-lomo': 'EMPANADITAS_DE_LOMO',
    'canastitas-capresse': 'CANASTITAS_DE_CAPRESSE',
    'canastitas-queso-azul': 'CANASTITAS_QUESO_AZUL_Y_CEBOLLA_CARAMELIZADA',
    'canastitas-panceta-ciruela': 'CANASTITAS_PANCETA_Y_CIRUELA',
    'canastitas-calabaza': 'CANASTITAS_CALABAZA',
    'canastitas-espinaca': 'CANASTITAS_ESPINACA',
    'pollitos-crispy': 'POLLITOS_CRISPY_CON_SALSA_HONEY',
    'hamburguesitas-cheddar': 'HAMBURGUESITAS_CON_CHEDDAR',
    'tacos-bondiola': 'TACOS_DE_BONDIOLA',
    'pinchos-pollo-panceta': 'PINCHOS_DE_POLLO_Y_PANCETA_CON_SALSA_MANZANA',
    'tarteletas-espinaca': 'TARTELETAS_ESPINACA',
    'roast-beef': 'ROAST_BEEF',
    'roll-philo-jyq': 'ROLL_DE_MASA_PHILO_CON_J_Y_Q',
    'triangulito-bondiola': 'TRIANGULITO_DE_BONDIOLA',
    'tarteleta-champi': 'TARTELETA_DE_CHAMPI',
    'brochetitas-ternera': 'BROCHETITAS_DE_TERNERA_CON_SALSA_MALBEC',
    'papas-rosti': 'PAPAS_ROSTI',
    'ravioles-rosa': 'RAVIOLES_CON_SALSA_ROSA',
    'conitos-figacita-roast': 'CONITOS_FIGACITA_ROAST',
    'figacitas-bondiola': 'FIGACITAS_BONDIOLA'
};

/**
 * Limpiar nombre para generar ID de Firebase (misma lógica que subir-productos.html)
 */
function limpiarNombre(nombre) {
    return nombre
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '_')
        .replace(/[^A-Z0-9_-]/g, '');
}

/**
 * Obtener ID de Firebase desde data-id HTML
 */
function obtenerFirebaseId(dataId) {
    // Si hay mapeo manual, usarlo
    if (MAPEO_IDS[dataId]) {
        return MAPEO_IDS[dataId];
    }
    
    // Si no, limpiar el dataId con la misma lógica que cuando se subió
    return limpiarNombre(dataId);
}

// Exportar funciones
export { cargarProducto, cargarTodosLosProductos, obtenerFirebaseId };

console.log('🔥 Firebase Product Loader cargado');
