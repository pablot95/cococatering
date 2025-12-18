// Admin Panel - Cocó Catering
// Sistema de gestión administrativa con login y armador de productos + Firebase

// Importar servicios de Firebase
import { getOrders, updateOrderStatus, deleteOrder } from './firestore-service.js';

// URL del backend (solo para compatibilidad si se necesita)
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000' 
    : window.location.origin;

// ===================================
// CREDENCIALES Y AUTENTICACIÓN
// ===================================
const ADMIN_CREDENTIALS = {
    username: 'cococatering',
    password: 'Cococatering2025'
};

// Variables globales
let allOrders = [];
let allProducts = [];
let editingProductId = null;

// ===================================
// INICIALIZACIÓN
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si ya está autenticado
    const isAuthenticated = sessionStorage.getItem('adminAuth');
    if (isAuthenticated === 'true') {
        showAdminPanel();
    }

    // Configurar login
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', handleLogin);

    // Cargar productos del localStorage
    loadProducts();
});

// ===================================
// LOGIN
// ===================================
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        sessionStorage.setItem('adminAuth', 'true');
        showAdminPanel();
    } else {
        errorDiv.textContent = 'Usuario o contraseña incorrectos';
        errorDiv.style.display = 'block';
    }
}

function showAdminPanel() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    loadProducts();
}

window.logout = function() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        sessionStorage.removeItem('adminAuth');
        location.reload();
    }
};

// ===================================
// TABS NAVIGATION
// ===================================
window.switchTab = function(tabName) {
    // Desactivar todas las tabs
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Activar tab seleccionada
    event.target.classList.add('active');
    document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1)).classList.add('active');

    // Si es órdenes, cargar las órdenes
    if (tabName === 'ordenes') {
        loadOrders();
    }
};

// ===================================
// GESTIÓN DE PRODUCTOS
// ===================================
function loadProducts() {
    const savedProducts = localStorage.getItem('adminProducts');
    allProducts = savedProducts ? JSON.parse(savedProducts) : [];
    renderProducts();
}

function saveProducts() {
    localStorage.setItem('adminProducts', JSON.stringify(allProducts));
}

function renderProducts() {
    const container = document.getElementById('productsListContainer');
    
    if (allProducts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No hay productos creados aún</p>
                <p class="empty-subtitle">Haz clic en "Agregar Producto" para comenzar</p>
            </div>
        `;
        return;
    }

    container.innerHTML = allProducts.map(product => `
        <div class="product-card">
            <div class="product-card-header">
                <h3 class="product-card-title">${product.name}</h3>
                <div class="product-card-actions">
                    <button class="btn-icon btn-edit" onclick="editProduct('${product.id}')">✏️</button>
                    <button class="btn-icon btn-delete" onclick="deleteProduct('${product.id}')">🗑️</button>
                </div>
            </div>
            ${product.description ? `<p class="product-description">${product.description}</p>` : ''}
            <div class="product-ingredients">
                <h4>Ingredientes:</h4>
                ${product.ingredients.map(ing => `
                    <div class="ingredient-item">
                        <span class="ingredient-name">${ing.name}</span>
                        <span class="ingredient-amount">${ing.quantity} ${ing.unit} - $${ing.cost.toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>
            <div class="product-pricing">
                <div class="pricing-item">
                    <div class="pricing-label">Costo</div>
                    <div class="pricing-value">$${product.totalCost.toLocaleString()}</div>
                </div>
                <div class="pricing-item">
                    <div class="pricing-label">Margen</div>
                    <div class="pricing-value">${product.profitMargin}%</div>
                </div>
                <div class="pricing-item">
                    <div class="pricing-label">Precio Final</div>
                    <div class="pricing-value">$${product.finalPrice.toLocaleString()}</div>
                </div>
            </div>
        </div>
    `).join('');
}

// ===================================
// MODAL DE PRODUCTO
// ===================================
window.openProductModal = function() {
    editingProductId = null;
    document.getElementById('modalTitle').textContent = 'Nuevo Producto';
    document.getElementById('productForm').reset();
    document.getElementById('ingredientsList').innerHTML = '';
    document.getElementById('totalCost').textContent = '$0';
    document.getElementById('finalPrice').textContent = '$0';
    document.getElementById('productModal').classList.add('active');
    
    // Agregar primera fila de ingrediente
    addIngredientRow();
};

window.closeProductModal = function() {
    document.getElementById('productModal').classList.remove('active');
    editingProductId = null;
};

window.editProduct = function(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    editingProductId = productId;
    document.getElementById('modalTitle').textContent = 'Editar Producto';
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('profitMargin').value = product.profitMargin;

    // Limpiar ingredientes
    document.getElementById('ingredientsList').innerHTML = '';

    // Agregar ingredientes existentes
    product.ingredients.forEach(ing => {
        addIngredientRow(ing);
    });

    calculateTotalCost();
    document.getElementById('productModal').classList.add('active');
};

window.deleteProduct = function(productId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;

    allProducts = allProducts.filter(p => p.id !== productId);
    saveProducts();
    renderProducts();
};

// ===================================
// INGREDIENTES
// ===================================
window.addIngredientRow = function(ingredient = null) {
    const ingredientsList = document.getElementById('ingredientsList');
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    row.innerHTML = `
        <input type="text" placeholder="Nombre del ingrediente" class="ingredient-name-input" value="${ingredient?.name || ''}" required>
        <input type="number" placeholder="Cantidad" class="ingredient-quantity-input" value="${ingredient?.quantity || ''}" step="0.01" min="0" oninput="calculateTotalCost()" required>
        <select class="ingredient-unit-input">
            <option value="g" ${ingredient?.unit === 'g' ? 'selected' : ''}>Gramos (g)</option>
            <option value="kg" ${ingredient?.unit === 'kg' ? 'selected' : ''}>Kilogramos (kg)</option>
            <option value="ml" ${ingredient?.unit === 'ml' ? 'selected' : ''}>Mililitros (ml)</option>
            <option value="l" ${ingredient?.unit === 'l' ? 'selected' : ''}>Litros (l)</option>
            <option value="unidad" ${ingredient?.unit === 'unidad' ? 'selected' : ''}>Unidad</option>
        </select>
        <input type="number" placeholder="Costo $" class="ingredient-cost-input" value="${ingredient?.cost || ''}" step="0.01" min="0" oninput="calculateTotalCost()" required>
        <button type="button" class="btn-remove-ingredient" onclick="removeIngredientRow(this)">✕</button>
    `;
    ingredientsList.appendChild(row);
};

window.removeIngredientRow = function(button) {
    button.closest('.ingredient-row').remove();
    calculateTotalCost();
};

window.calculateTotalCost = function() {
    const rows = document.querySelectorAll('.ingredient-row');
    let totalCost = 0;

    rows.forEach(row => {
        const cost = parseFloat(row.querySelector('.ingredient-cost-input').value) || 0;
        totalCost += cost;
    });

    document.getElementById('totalCost').textContent = '$' + totalCost.toLocaleString();
    calculateFinalPrice();
};

window.calculateFinalPrice = function() {
    const totalCostText = document.getElementById('totalCost').textContent.replace('$', '').replace(',', '');
    const totalCost = parseFloat(totalCostText) || 0;
    const profitMargin = parseFloat(document.getElementById('profitMargin').value) || 0;
    
    const finalPrice = totalCost * (1 + profitMargin / 100);
    document.getElementById('finalPrice').textContent = '$' + Math.round(finalPrice).toLocaleString();
};

// ===================================
// GUARDAR PRODUCTO
// ===================================
document.getElementById('productForm')?.addEventListener('submit', function(e) {
    e.preventDefault();

    const name = document.getElementById('productName').value;
    const description = document.getElementById('productDescription').value;
    const profitMargin = parseFloat(document.getElementById('profitMargin').value);

    // Obtener ingredientes
    const ingredientRows = document.querySelectorAll('.ingredient-row');
    const ingredients = [];
    
    ingredientRows.forEach(row => {
        const ingredient = {
            name: row.querySelector('.ingredient-name-input').value,
            quantity: parseFloat(row.querySelector('.ingredient-quantity-input').value),
            unit: row.querySelector('.ingredient-unit-input').value,
            cost: parseFloat(row.querySelector('.ingredient-cost-input').value)
        };
        ingredients.push(ingredient);
    });

    // Calcular totales
    const totalCost = ingredients.reduce((sum, ing) => sum + ing.cost, 0);
    const finalPrice = Math.round(totalCost * (1 + profitMargin / 100));

    const product = {
        id: editingProductId || 'prod_' + Date.now(),
        name,
        description,
        ingredients,
        totalCost,
        profitMargin,
        finalPrice,
        createdAt: editingProductId ? allProducts.find(p => p.id === editingProductId).createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (editingProductId) {
        // Actualizar producto existente
        const index = allProducts.findIndex(p => p.id === editingProductId);
        allProducts[index] = product;
    } else {
        // Agregar nuevo producto
        allProducts.push(product);
    }

    saveProducts();
    renderProducts();
    closeProductModal();
});

// ===================================
// GESTIÓN DE ÓRDENES
// ===================================
window.loadOrders = async function() {
    const container = document.getElementById('ordersContainer');
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';

    try {
        container.innerHTML = '<div class="loading">🔥 Cargando órdenes desde Firebase...</div>';

        // Obtener órdenes desde Firebase
        const filterStatus = statusFilter !== 'all' ? statusFilter : null;
        allOrders = await getOrders(filterStatus);

        if (allOrders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>📦 No hay órdenes ${statusFilter === 'all' ? 'disponibles' : 'con este estado'}</p>
                    <p class="empty-subtitle">Las órdenes de los clientes aparecerán aquí</p>
                </div>
            `;
            return;
        }

        // Convertir timestamps de Firebase a fechas
        allOrders = allOrders.map(order => ({
            ...order,
            orderDate: order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString('es-AR') : order.fecha || 'Fecha no disponible',
            customer: order.cliente || order.customer || {},
            items: order.productos || order.items || []
        }));

        const ordersHTML = allOrders.map(order => renderOrderCard(order)).join('');
        container.innerHTML = ordersHTML;

    } catch (error) {
        console.error('Error al cargar órdenes desde Firebase:', error);
        container.innerHTML = `
            <div class="error-state">
                <p>❌ Error al cargar las órdenes</p>
                <p class="error-details">${error.message}</p>
                <button onclick="loadOrders()">🔄 Reintentar</button>
            </div>
        `;
    }
};

function renderOrderCard(order) {
    const statusClass = `status-${order.status}`;
    const statusText = {
        pending: 'Pendiente',
        processing: 'En proceso',
        completed: 'Completada',
        cancelled: 'Cancelada'
    }[order.status] || order.status;

    const date = order.createdAt ? new Date(order.createdAt).toLocaleString('es-AR') : order.orderDate || 'Fecha no disponible';

    return `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <div class="order-id">Orden #${order.paymentId || order.id}</div>
                    <div class="order-date">${date}</div>
                </div>
                <span class="order-status ${statusClass}">${statusText}</span>
            </div>

            <div class="customer-info">
                <h3>👤 Cliente</h3>
                <p><strong>${order.customer.nombre}</strong></p>
                <p>📧 ${order.customer.email}</p>
                <p>📱 ${order.customer.telefono}</p>
                <p>🆔 DNI: ${order.customer.dni}</p>
                <p>📍 ${order.customer.calle} ${order.customer.altura}${order.customer.piso ? ', Piso ' + order.customer.piso : ''}${order.customer.depto ? ', Depto ' + order.customer.depto : ''}</p>
                <p>   ${order.customer.ciudad}, ${order.customer.provincia} (CP: ${order.customer.codigoPostal})</p>
            </div>

            <div class="products-list">
                <h4>📋 Productos</h4>
                ${order.items.map(product => `
                    <div class="product-item">
                        <span class="product-name">${product.name}</span>
                        <span class="product-qty">x${product.quantity}</span>
                        <span class="product-price">$${(product.price * product.quantity).toLocaleString('es-AR')}</span>
                    </div>
                `).join('')}
            </div>

            <div class="order-total">
                <span class="total-label">Total:</span>
                <span class="total-amount">$${order.total.toLocaleString('es-AR')}</span>
            </div>

            <div class="order-actions">
                <select onchange="updateOrderStatusHandler('${order.id}', this.value)">
                    <option value="">Cambiar estado...</option>
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>En proceso</option>
                    <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completada</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelada</option>
                </select>
                <button onclick="deleteOrderHandler('${order.id}')">🗑️ Eliminar</button>
            </div>
        </div>
    `;
}

window.updateOrderStatusHandler = async function(orderId, newStatus) {
    if (!newStatus) return;

    try {
        const success = await updateOrderStatus(orderId, newStatus);
        
        if (success) {
            alert('✅ Estado actualizado exitosamente en Firebase');
            loadOrders();
        } else {
            throw new Error('No se pudo actualizar en Firebase');
        }
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        alert('❌ Error al actualizar el estado');
    }
};

window.deleteOrderHandler = async function(orderId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta orden?')) {
        return;
    }

    try {
        const success = await deleteOrder(orderId);
        
        if (success) {
            alert('✅ Orden eliminada exitosamente de Firebase');
            loadOrders();
        } else {
            throw new Error('No se pudo eliminar de Firebase');
        }
    } catch (error) {
        console.error('Error al eliminar orden:', error);
        alert('❌ Error al eliminar la orden');
    }
};

window.exportOrders = function() {
    if (allOrders.length === 0) {
        alert('No hay órdenes para exportar');
        return;
    }

    const csv = convertToCSV(allOrders);
    downloadCSV(csv, 'ordenes-coco-catering.csv');
};

function convertToCSV(orders) {
    const headers = ['ID Pago', 'Fecha', 'Cliente', 'Email', 'Teléfono', 'DNI', 'Dirección', 'Ciudad', 'Provincia', 'Total', 'Estado'];
    const rows = orders.map(order => [
        order.paymentId || order.id,
        order.createdAt ? new Date(order.createdAt).toLocaleString('es-AR') : order.orderDate,
        order.customer.nombre,
        order.customer.email,
        order.customer.telefono,
        order.customer.dni,
        `${order.customer.calle} ${order.customer.altura}`,
        order.customer.ciudad,
        order.customer.provincia,
        order.total,
        order.status
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
