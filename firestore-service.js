// Firestore Service - Funciones para interactuar con la base de datos
import { 
  db, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp
} from './firebase-config.js';

// ===================================
// ÓRDENES (ORDERS)
// ===================================

/**
 * Crear una nueva orden en Firestore
 * @param {Object} orderData - Datos de la orden
 * @returns {Promise<string>} - ID de la orden creada
 */
export async function createOrder(orderData) {
  try {
    const ordersRef = collection(db, 'orders');
    const order = {
      ...orderData,
      createdAt: serverTimestamp(),
      status: 'pending' // pending, processing, completed, cancelled
    };
    
    const docRef = await addDoc(ordersRef, order);
    console.log('Orden creada con ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error al crear orden:', error);
    throw error;
  }
}

/**
 * Obtener todas las órdenes
 * @returns {Promise<Array>} - Array de órdenes
 */
export async function getAllOrders() {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return orders;
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    throw error;
  }
}

/**
 * Obtener órdenes por estado
 * @param {string} status - Estado de la orden
 * @returns {Promise<Array>} - Array de órdenes
 */
export async function getOrdersByStatus(status) {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('status', '==', status), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const orders = [];
    querySnapshot.forEach((doc) => {
      orders.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return orders;
  } catch (error) {
    console.error('Error al obtener órdenes por estado:', error);
    throw error;
  }
}

/**
 * Actualizar estado de una orden
 * @param {string} orderId - ID de la orden
 * @param {string} newStatus - Nuevo estado
 * @returns {Promise<void>}
 */
export async function updateOrderStatus(orderId, newStatus) {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    console.log('Estado de orden actualizado:', orderId);
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    throw error;
  }
}

/**
 * Eliminar una orden
 * @param {string} orderId - ID de la orden
 * @returns {Promise<void>}
 */
export async function deleteOrder(orderId) {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await deleteDoc(orderRef);
    console.log('Orden eliminada:', orderId);
  } catch (error) {
    console.error('Error al eliminar orden:', error);
    throw error;
  }
}

// ===================================
// PRODUCTOS (PRODUCTS)
// ===================================

/**
 * Agregar un producto a Firestore
 * @param {Object} productData - Datos del producto
 * @returns {Promise<string>} - ID del producto creado
 */
export async function addProduct(productData) {
  try {
    const productsRef = collection(db, 'products');
    const product = {
      ...productData,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(productsRef, product);
    console.log('Producto agregado con ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error al agregar producto:', error);
    throw error;
  }
}

/**
 * Obtener todos los productos
 * @returns {Promise<Array>} - Array de productos
 */
export async function getAllProducts() {
  try {
    const productsRef = collection(db, 'products');
    const querySnapshot = await getDocs(productsRef);
    
    const products = [];
    querySnapshot.forEach((doc) => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return products;
  } catch (error) {
    console.error('Error al obtener productos:', error);
    throw error;
  }
}

/**
 * Actualizar un producto
 * @param {string} productId - ID del producto
 * @param {Object} updates - Datos a actualizar
 * @returns {Promise<void>}
 */
export async function updateProduct(productId, updates) {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    console.log('Producto actualizado:', productId);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    throw error;
  }
}

/**
 * Eliminar un producto
 * @param {string} productId - ID del producto
 * @returns {Promise<void>}
 */
export async function deleteProduct(productId) {
  try {
    const productRef = doc(db, 'products', productId);
    await deleteDoc(productRef);
    console.log('Producto eliminado:', productId);
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    throw error;
  }
}

// ===================================
// CLIENTES (CUSTOMERS)
// ===================================

/**
 * Guardar datos de cliente
 * @param {Object} customerData - Datos del cliente
 * @returns {Promise<string>} - ID del cliente
 */
export async function saveCustomer(customerData) {
  try {
    const customersRef = collection(db, 'customers');
    const customer = {
      ...customerData,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(customersRef, customer);
    console.log('Cliente guardado con ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error al guardar cliente:', error);
    throw error;
  }
}

/**
 * Obtener todos los clientes
 * @returns {Promise<Array>} - Array de clientes
 */
export async function getAllCustomers() {
  try {
    const customersRef = collection(db, 'customers');
    const querySnapshot = await getDocs(customersRef);
    
    const customers = [];
    querySnapshot.forEach((doc) => {
      customers.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return customers;
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    throw error;
  }
}
