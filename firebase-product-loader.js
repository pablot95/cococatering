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

        // Si no se provee docId, usar el mapeo o convertir automáticamente
        if (!docId) {
            docId = obtenerFirebaseId(dataId);
        }

        console.log(`🔍 Buscando: ${collectionName}/${docId}`);

        // Obtener producto de Firebase
        const doc = await db.collection(collectionName).doc(docId).get();

        if (!doc.exists) {
            console.warn(`❌ Producto no encontrado: ${docId}`);
            return;
        }

        const producto = doc.data();
        console.log(`✅ ${producto.nombre} cargado`);

        // Actualizar el elemento HTML con los datos de Firebase
        actualizarElementoHTML(elemento, producto);

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
 * @param {Array} productos - Array de objetos {dataId, docId?}
 */
async function cargarTodosLosProductos(collectionName, productos) {
    console.log(`📦 Cargando ${productos.length} productos de ${collectionName}...`);
    
    const promesas = productos.map(prod => {
        if (typeof prod === 'string') {
            return cargarProducto(collectionName, prod);
        } else {
            return cargarProducto(collectionName, prod.dataId, prod.docId);
        }
    });

    await Promise.all(promesas);
    console.log(`✅ Todos los productos de ${collectionName} cargados`);
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
 * Obtener ID de Firebase desde data-id HTML
 */
function obtenerFirebaseId(dataId) {
    return MAPEO_IDS[dataId] || dataId.toUpperCase().replace(/-/g, '_');
}

// Exportar funciones
export { cargarProducto, cargarTodosLosProductos, obtenerFirebaseId };

console.log('🔥 Firebase Product Loader cargado');
