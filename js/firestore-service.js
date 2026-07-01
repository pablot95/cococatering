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

export async function updateOrder(orderId, data) {
    try {
        await db.collection('orders').doc(orderId).update({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error actualizando orden:', error);
        return false;
    }
}

export async function upsertOrder(orderId, data) {
    try {
        await db.collection('orders').doc(orderId).set({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return true;
    } catch (error) {
        console.error('Error guardando/actualizando orden:', error);
        return false;
    }
}

export async function loadEnvioConfig() {
    const DEFAULT_ZONES = {
        'san-isidro':    { costo: 6000,  freeMin: 500000 },
        'acasusso':      { costo: 6000,  freeMin: 500000 },
        'martinez':      { costo: 6000,  freeMin: 500000 },
        'beccar':        { costo: 6000,  freeMin: 500000 },
        'villa-adelina': { costo: 12000, freeMin: 900000 },
        'boulogne':      { costo: 12000, freeMin: 900000 },
        'san-fernando':  { costo: 12000, freeMin: 900000 },
        'olivos':        { costo: 12000, freeMin: 900000 },
        'vicente-lopez': { costo: 12000, freeMin: 900000 },
        'tigre':         { costo: 12000, freeMin: 900000 },
        'nordelta':      { costo: 20000, freeMin: 1000000 },
        'otra':          { costo: 'consultar', freeMin: null }
    };
    try {
        const doc = await db.collection('admin_config').doc('envio').get();
        if (doc.exists && doc.data().zonas) {
            const zonas = doc.data().zonas;
            const result = {};
            Object.entries(zonas).forEach(([key, z]) => {
                result[key] = { costo: z.costo, freeMin: z.freeMin ?? null };
            });
            return result;
        }
    } catch(e) { /* fallback */ }
    return DEFAULT_ZONES;
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

// ==================== SOLICITUDES ====================

/**
 * Obtener una solicitud de pedido por ID
 * @param {string} solicitudId
 * @returns {Promise<Object|null>}
 */
export async function getSolicitud(solicitudId) {
    try {
        const doc = await db.collection('solicitudes').doc(solicitudId).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (error) {
        console.error(`Error obteniendo solicitud ${solicitudId}:`, error);
        return null;
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
    'eventos': 'menuEventos',
    'box-salados': 'boxSalados',
    'fingers-frios': 'fingersFrios',
    'fingers-calientes': 'fingersCalientes',
    'box-dulces': 'boxDulces',
    'shots': 'shots',
    'tortas-clasicas': 'tortasClasicas',
    'combos-dulces': 'combosDulces',
    'desayunos': 'desayunos'
};

/**
 * Obtener nombre de colección desde la página actual
 * @returns {string} Nombre de la colección
 */
export function getCurrentCollection() {
    const currentPage = window.location.pathname.split('/').pop();
    return PAGE_TO_COLLECTION[currentPage] || null;
}

/**
 * Registrar pago aprobado: actualiza la orden y la solicitud en Firestore,
 * dejando todo listo para que el calendario del admin lo muestre.
 *
 * @param {string} firebaseOrderId - ID del doc en colección 'orders'
 * @param {string} solicitudId     - ID del doc en colección 'solicitudes'
 * @param {string} paymentId       - ID de pago de MercadoPago
 */
export async function registrarPagoAprobado(firebaseOrderId, solicitudId, paymentId, extra = {}) {
    try {
        const now = firebase.firestore.FieldValue.serverTimestamp();
        const orderData = extra.orderData || null;

        // Leer datos de la solicitud para trasladarlos a la orden
        let solicitudData = null;
        if (solicitudId) {
            const solDoc = await db.collection('solicitudes').doc(solicitudId).get();
            if (solDoc.exists) solicitudData = solDoc.data();
        }

        // Si no tenemos firebaseOrderId, intentar encontrar la orden por solicitudId
        if (!firebaseOrderId && solicitudId) {
            const orderSnap = await db.collection('orders')
                .where('solicitudId', '==', solicitudId)
                .limit(1)
                .get();
            if (!orderSnap.empty) {
                firebaseOrderId = orderSnap.docs[0].id;
                console.log('✅ Orden encontrada por solicitudId:', firebaseOrderId);
            }
        }

        // Actualizar la orden con status 'paid' y datos de entrega
        if (firebaseOrderId) {
            const updatePayload = {
                status: 'paid',
                paymentStatus: 'approved',
                paymentId: paymentId || null,
                updatedAt: now
            };
            if (solicitudData) {
                // fechaEntrega para el calendario — usa la fecha elegida o la fecha de hoy
                const fechaEntrega = solicitudData.fecha || new Date().toISOString().slice(0, 10);
                updatePayload.fechaEntrega = fechaEntrega;
                if (solicitudData.horario)  updatePayload.horario       = solicitudData.horario;
                if (solicitudData.localidad) updatePayload.localidad    = solicitudData.localidad;
                if (solicitudData.direccion) updatePayload.direccion    = solicitudData.direccion;
                if (solicitudData.codigo)    updatePayload.codigoPedido  = solicitudData.codigo;
                if (solicitudData.serviceId) updatePayload.serviceId = solicitudData.serviceId;
                // Completar datos del cliente con lo de la solicitud por si falta algo
                if (solicitudData.nombre && solicitudData.email) {
                    updatePayload.cliente = {
                        nombre:   solicitudData.nombre,
                        email:    solicitudData.email,
                        telefono: solicitudData.telefono || ''
                    };
                }
            }
            if (extra.serviceId || orderData?.serviceId) updatePayload.serviceId = extra.serviceId || orderData.serviceId;
            await db.collection('orders').doc(firebaseOrderId).update(updatePayload);
        }

        const serviceId = extra.serviceId || orderData?.serviceId || solicitudData?.serviceId || null;
        const monto = Math.round(
            Number(extra.monto || orderData?.total || solicitudData?.total || solicitudData?.subtotal || 0)
        );

        if (serviceId && monto > 0) {
            const pagoId = paymentId ? `mp_${String(paymentId).replace(/[^a-zA-Z0-9_-]/g, '_')}` : `mp_${firebaseOrderId || Date.now()}`;
            await db.collection('admin_pagos').doc(pagoId).set({
                servicioId: serviceId,
                servicioNumero: extra.servicioNumero || null,
                orderId: firebaseOrderId || null,
                solicitudId: solicitudId || null,
                paymentId: paymentId || null,
                fecha: new Date().toISOString().slice(0, 10),
                monto,
                medioPago: 'MercadoPago',
                notas: 'Pago registrado automáticamente desde checkout',
                origen: 'mercadopago',
                creadoEn: now
            }, { merge: true });

            await db.collection('admin_servicios').doc(serviceId).update({
                estadoPago: 'completo',
                montoPagado: monto,
                paymentStatus: 'approved',
                paymentId: paymentId || null,
                orderId: firebaseOrderId || null,
                solicitudId: solicitudId || null,
                actualizadoEn: now
            });
        }

        // Marcar la solicitud como pagada
        if (solicitudId) {
            await db.collection('solicitudes').doc(solicitudId).update({
                status: 'paid',
                paymentId: paymentId || null,
                serviceId: serviceId || solicitudData?.serviceId || null,
                paymentDate: now,
                updatedAt: now
            });
        }

        console.log('✅ Pago registrado: order', firebaseOrderId, '| solicitud', solicitudId);
        return true;
    } catch (error) {
        console.error('Error registrando pago aprobado:', error);
        return false;
    }
}

console.log('🔥 Firestore Service cargado');


