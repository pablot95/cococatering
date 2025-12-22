// Firestore Service - Reemplaza stock-manager.js y productos.json
import { db } from './firebase-config.js';

// ==================== PRODUCTOS ====================

/**
 * Obtener todos los productos de una colección
 * @param {string} collectionName - Nombre de la colección
 * @returns {Promise<Array>} Array de productos
 */
export async function getProducts(collectionName) {
    try {
        const snapshot = await db.collection(collectionName).get();
        const products = [];
        
        snapshot.forEach(doc => {
            products.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return products;
    } catch (error) {
        console.error(`Error obteniendo productos de ${collectionName}:`, error);
        return [];
    }
}

/**
 * Obtener un producto específico
 * @param {string} collectionName - Nombre de la colección
 * @param {string} productName - Nombre del producto (ID del documento)
 * @returns {Promise<Object|null>} Producto o null
 */
export async function getProduct(collectionName, productName) {
    try {
        const doc = await db.collection(collectionName).doc(productName).get();
        
        if (doc.exists) {
            return {
                id: doc.id,
                ...doc.data()
            };
        }
        
        return null;
    } catch (error) {
        console.error(`Error obteniendo producto ${productName}:`, error);
        return null;
    }
}

// ==================== STOCK ====================

/**
 * Obtener stock de un producto
 * @param {string} collectionName - Nombre de la colección
 * @param {string} productName - Nombre del producto
 * @returns {Promise<number>} Stock disponible
 */
export async function getStock(collectionName, productName) {
    try {
        const product = await getProduct(collectionName, productName);
        return product?.stock ?? 0;
    } catch (error) {
        console.error(`Error obteniendo stock de ${productName}:`, error);
        return 0;
    }
}

/**
 * Verificar si hay stock suficiente
 * @param {string} collectionName - Nombre de la colección
 * @param {string} productName - Nombre del producto
 * @param {number} quantity - Cantidad solicitada
 * @returns {Promise<boolean>} true si hay stock
 */
export async function checkStock(collectionName, productName, quantity) {
    const currentStock = await getStock(collectionName, productName);
    return currentStock >= quantity;
}

/**
 * Decrementar stock de un producto
 * @param {string} collectionName - Nombre de la colección
 * @param {string} productName - Nombre del producto
 * @param {number} quantity - Cantidad a decrementar
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
export async function decrementStock(collectionName, productName, quantity) {
    try {
        const docRef = db.collection(collectionName).doc(productName);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            console.error(`Producto ${productName} no existe`);
            return false;
        }
        
        const currentStock = doc.data().stock || 0;
        
        if (currentStock < quantity) {
            console.error(`Stock insuficiente para ${productName}`);
            return false;
        }
        
        await docRef.update({
            stock: currentStock - quantity
        });
        
        console.log(`✅ Stock actualizado: ${productName} = ${currentStock - quantity}`);
        return true;
        
    } catch (error) {
        console.error(`Error decrementando stock de ${productName}:`, error);
        return false;
    }
}

/**
 * Decrementar stock de todo el carrito
 * @param {Array} cartItems - Items del carrito [{collectionName, productName, quantity}, ...]
 * @returns {Promise<boolean>} true si todos se actualizaron
 */
export async function decrementCartStock(cartItems) {
    try {
        const results = [];
        
        for (const item of cartItems) {
            const success = await decrementStock(
                item.collectionName,
                item.productName,
                item.quantity
            );
            results.push(success);
        }
        
        return results.every(r => r === true);
        
    } catch (error) {
        console.error('Error decrementando stock del carrito:', error);
        return false;
    }
}

/**
 * Incrementar stock (para devoluciones o reposición)
 * @param {string} collectionName - Nombre de la colección
 * @param {string} productName - Nombre del producto
 * @param {number} quantity - Cantidad a incrementar
 * @returns {Promise<boolean>} true si se actualizó
 */
export async function incrementStock(collectionName, productName, quantity) {
    try {
        const docRef = db.collection(collectionName).doc(productName);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            console.error(`Producto ${productName} no existe`);
            return false;
        }
        
        const currentStock = doc.data().stock || 0;
        
        await docRef.update({
            stock: currentStock + quantity
        });
        
        console.log(`✅ Stock incrementado: ${productName} = ${currentStock + quantity}`);
        return true;
        
    } catch (error) {
        console.error(`Error incrementando stock de ${productName}:`, error);
        return false;
    }
}

// ==================== ORDENES ====================

/**
 * Guardar una orden en Firebase
 * @param {Object} orderData - Datos de la orden
 * @returns {Promise<string|null>} ID de la orden creada
 */
export async function saveOrder(orderData) {
    try {
        const orderRef = await db.collection('orders').add({
            ...orderData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'pending'
        });
        
        console.log('✅ Orden guardada:', orderRef.id);
        return orderRef.id;
        
    } catch (error) {
        console.error('Error guardando orden:', error);
        return null;
    }
}

/**
 * Obtener todas las órdenes
 * @param {string} status - Filtrar por estado (opcional)
 * @returns {Promise<Array>} Array de órdenes
 */
export async function getOrders(status = null) {
    try {
        let query = db.collection('orders').orderBy('createdAt', 'desc');
        
        if (status) {
            query = query.where('status', '==', status);
        }
        
        const snapshot = await query.get();
        const orders = [];
        
        snapshot.forEach(doc => {
            orders.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return orders;
        
    } catch (error) {
        console.error('Error obteniendo órdenes:', error);
        return [];
    }
}

/**
 * Obtener una orden específica
 * @param {string} orderId - ID de la orden
 * @returns {Promise<Object|null>} Orden o null
 */
export async function getOrder(orderId) {
    try {
        const doc = await db.collection('orders').doc(orderId).get();
        
        if (doc.exists) {
            return {
                id: doc.id,
                ...doc.data()
            };
        }
        
        return null;
        
    } catch (error) {
        console.error(`Error obteniendo orden ${orderId}:`, error);
        return null;
    }
}

/**
 * Actualizar estado de una orden
 * @param {string} orderId - ID de la orden
 * @param {string} newStatus - Nuevo estado
 * @returns {Promise<boolean>} true si se actualizó
 */
export async function updateOrderStatus(orderId, newStatus) {
    try {
        await db.collection('orders').doc(orderId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Orden ${orderId} actualizada a: ${newStatus}`);
        return true;
        
    } catch (error) {
        console.error(`Error actualizando orden ${orderId}:`, error);
        return false;
    }
}

/**
 * Eliminar una orden
 * @param {string} orderId - ID de la orden
 * @returns {Promise<boolean>} true si se eliminó
 */
export async function deleteOrder(orderId) {
    try {
        await db.collection('orders').doc(orderId).delete();
        console.log(`✅ Orden ${orderId} eliminada`);
        return true;
        
    } catch (error) {
        console.error(`Error eliminando orden ${orderId}:`, error);
        return false;
    }
}

// ==================== PRECIOS ====================

/**
 * Actualizar precio de un producto
 * @param {string} collectionName - Nombre de la colección
 * @param {string} productName - Nombre del producto
 * @param {number} newPrice - Nuevo precio
 * @returns {Promise<boolean>} true si se actualizó
 */
export async function updatePrice(collectionName, productName, newPrice) {
    try {
        await db.collection(collectionName).doc(productName).update({
            precio: newPrice
        });
        
        console.log(`✅ Precio actualizado: ${productName} = $${newPrice}`);
        return true;
        
    } catch (error) {
        console.error(`Error actualizando precio de ${productName}:`, error);
        return false;
    }
}

// ==================== UTILIDADES ====================

/**
 * Mapeo de páginas HTML a colecciones de Firebase
 */
export const PAGE_TO_COLLECTION = {
    'eventos.html': 'menuEventos',
    'box-salados.html': 'boxSalados',
    'fingers-frios.html': 'fingersFrios',
    'fingers-calientes.html': 'fingersCalientes',
    'box-dulces.html': 'boxDulces',
    'shots.html': 'shots',
    'tortas-clasicas.html': 'tortasClasicas',
    'combos-dulces.html': 'combosDulces',
    'desayunos.html': 'desayunos'
};

/**
 * Obtener nombre de colección desde la página actual
 * @returns {string} Nombre de la colección
 */
export function getCurrentCollection() {
    const currentPage = window.location.pathname.split('/').pop();
    return PAGE_TO_COLLECTION[currentPage] || null;
}

console.log('🔥 Firestore Service cargado');

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
