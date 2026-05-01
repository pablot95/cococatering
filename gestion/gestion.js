// Admin Panel - Cocó Catering
// Sistema de gestión administrativa con login y armador de productos + Firebase

// Importar servicios de Firebase
import { getOrders, updateOrderStatus, deleteOrder } from '../js/firestore-service.js';
import { db } from '../js/firebase-config.js';

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
    // Cargar órdenes por defecto ya que productos está oculto
    loadOrders();
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
    // Si es productos, cargar productos de Firebase
    if (tabName === 'productos') {
        loadCollectionProducts(currentProductCollection);
    }
    // Si es solicitudes, cargarlas
    if (tabName === 'solicitudes') {
        loadSolicitudes();
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

    // Normalizar datos para soportar diferentes estructuras
    const customer = order.cliente || order.customer || {};
    const address = order.direccionEnvio || order.customer || {}; // En estructura vieja, dirección estaba en customer
    const items = order.productos || order.items || [];
    const totalAmount = order.total || 0;
    
    const dateStr = order.fecha || order.createdAt || order.orderDate;
    const date = dateStr ? new Date(dateStr).toLocaleString('es-AR') : 'Fecha no disponible';

    return `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <div class="order-id">Orden #${order.orderId || order.paymentId || order.id}</div>
                    <div class="order-date">${date}</div>
                </div>
                <span class="order-status ${statusClass}">${statusText}</span>
            </div>

            <div class="customer-info">
                <h3>👤 Cliente</h3>
                <p><strong>${customer.nombre || 'Sin nombre'}</strong></p>
                <p>📧 ${customer.email || 'Sin email'}</p>
                <p>📱 ${customer.telefono || 'Sin teléfono'}</p>
                <p>🆔 DNI: ${customer.dni || 'Sin DNI'}</p>
                <p>📍 ${address.calle || ''} ${address.altura || ''}${address.piso ? ', Piso ' + address.piso : ''}${address.depto ? ', Depto ' + address.depto : ''}</p>
                <p>   ${address.ciudad || ''}, ${address.provincia || ''} ${address.codigoPostal ? '(CP: ' + address.codigoPostal + ')' : ''}</p>
            </div>

            <div class="products-list">
                <h4>📋 Productos</h4>
                ${items.map(product => `
                    <div class="product-item">
                        <span class="product-name">${product.nombre || product.name || 'Producto'}</span>
                        <span class="product-qty">x${product.cantidad || product.quantity || 0}</span>
                        <span class="product-price">$${((product.precio || product.price || 0) * (product.cantidad || product.quantity || 0)).toLocaleString('es-AR')}</span>
                    </div>
                `).join('')}
            </div>

            <div class="order-total">
                <span class="total-label">Total:</span>
                <span class="total-amount">$${totalAmount.toLocaleString('es-AR')}</span>
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

// ===================================
// GESTIÓN DE PRODUCTOS FIREBASE
// ===================================

// ── Imágenes para productos SIMPLES (docId → filename) ──
const PRODUCT_IMAGES = {
    // Fingers Fríos
    'masitas-queso': 'masitas-de-queso.jpg',
    'pinchos-bocconcinos': 'pinchos-boconccinos.jpg',
    'ensaladitas-cesar': 'ensaladitas-cesar.jpg',
    'pecetitos': 'pecetito.jpg',
    'papas-rosty': 'papas-rosty.jpg',
    'picaditas-individuales': 'picadas-individuales.jpg',
    'figacita-jyq': 'figacitas-jq.jpg',
    'criollito-jyq': 'criollito-de-jamon-y-queso.jpg',
    'criollito-capresse': 'criollito-capresse.jpg',
    'scon-crudo-rucula': 'scon-de-crudo.jpg',
    'tartaleta-atun': 'tarteletas-frias-de-hummus-y-atun.jpg',
    'degustacion-queso': 'degustacion-de-quesos.jpg',
    'dip-queso-azul': 'dip-de-queso-azul.jpg',
    'lomo-morron': 'figacita-de-lomo-y-morrones-asado.jpg',
    'verduritas-asadas': 'verduritas-asadas.jpg',
    'medialunitas-jyq': 'medialunitas-jyq.jpg',
    'sconcito-salmon': 'scon-de-queso-al-romero-con-lajas-de-salmon.jpg',
    'chipacitos-morron-panceta': 'chipa-de-morron.jpg',
    // Fingers Calientes
    'empanaditas-bondiola': 'empanadas.jpg',
    'empanaditas-jyq': 'empanadas.jpg',
    'empanaditas-pollo': 'empanadas.jpg',
    'empanaditas-carne': 'empanadas.jpg',
    'empanaditas-osobuco': 'empanadas.jpg',
    'empanaditas-lomo': 'empanadas.jpg',
    'canastitas-capresse': 'capresse.jpg',
    'canastitas-queso-azul': 'capresse.jpg',
    'canastitas-panceta-ciruela': 'capresse.jpg',
    'canastitas-calabaza': 'capresse.jpg',
    'canastitas-espinaca': 'canastitas-de-espinaca.jpg',
    'pollitos-crispy': 'pinchos-de-pollo-crispy.jpg',
    'hamburguesitas-cheddar': 'hamburguesitas.jpg',
    'tacos-bondiola': 'tacos.jpg',
    'pinchos-pollo-panceta': 'pinchos-de-pollo-crispy.jpg',
    'tarteletas-espinaca': 'canastitas-de-espinaca.jpg',
    'roast-beef': 'roast-beef.jpg',
    'roll-philo-jyq': 'roll-de-masa-philo.jpg',
    'roll-philo-queso-cebolla': 'roll-de-masa-philo.jpg',
    'triangulito-bondiola': 'triangulito-de-mas-fhilo-y-y-bondiola-braseada-1.jpg',
    'tarteleta-champi': 'quiche-de-champignone.jpg',
    'brochetitas-ternera': 'brochetitas-de-ternera-2.jpg',
    'sopitas-calabaza': 'cazuela-arroz-con-verduras.jpg',
    'cazuela-ravioles': 'cazuela-de-ravioles-con-salsa-ros.jpg',
    'cazuela-ternera': 'cazuela-ternera-malbec.jpg',
    'cazuela-pollo': 'cazuela-pollo-con-champi.jpg',
    'cazuela-arroz': 'cazuela-arroz-con-verduras.jpg',
    // Tortas Clásicas
    'brownie': 'brownie.jpg',
    'carrot-cake': 'carrot-cake.jpg',
    'red-velvet': 'red-velvet.jpg',
    'banoffe': '',
    'chocotorta': 'chocotorta.jpg',
    'torta-nuez': 'torta-de-nuez-(-sin-tacc).jpg',
    'matilda': 'matilda.jpg',
    'sable-almendras': 'sable-de-almendras.jpg',
    'marquise-frutos-rojos': '',
    'rogel': 'rogel.jpg',
    'oreo-tentacion': 'oreo-tentacion.jpg',
    'cheesecake': 'cheesecake-de-frutillas.jpg',
    'lemon-pie': 'lemon-pie.jpg',
    'key-lime-pie': 'key-lime.jpg',
    // Desayunos
    'desayuno-domicilio': '',
    // Combos Dulces
    'combo-1': 'tortas.jpg',
    'combo-2': 'tortas.jpg',
    'combo-3': 'tortas.jpg',
};

// ── Sub-items para productos AGRUPADOS (docId → [{nombre, imagen}]) ──
const PRODUCT_ITEMS = {
    'shots': [
        { nombre: 'Lemon pie', imagen: 'shot-de-lemon-pie.jpg' },
        { nombre: 'Cheesecake', imagen: 'shot-de-cheesecake.jpg' },
        { nombre: 'Oreo', imagen: 'shot-de-oreo.jpg' },
        { nombre: 'Chocotorta', imagen: 'shot-de-chocotorta.jpg' },
        { nombre: 'Mousse de chocolate (opción sin TACC)', imagen: 'shot-de-mousse.jpg' },
    ],
    'pattiserie-caja-chica': [
        { nombre: 'Brownie con dulce de leche y merengue', imagen: 'brownie-con-merengue.jpg' },
        { nombre: 'Pavlovas (sin TACC)', imagen: 'pavlova-petit.jpg' },
        { nombre: 'Lemon pie', imagen: 'pavlovas.jpg' },
        { nombre: 'Rogelitos', imagen: 'rogelitos.jpg' },
        { nombre: 'Mousse de chocolate amargo', imagen: 'mousse-de-choc-amargo.jpg' },
        { nombre: 'Mousse de coco', imagen: 'mousse-de-coco.jpg' },
        { nombre: 'Cheesecake de maracuyá', imagen: 'cheesecake-de-maracuya.jpg' },
        { nombre: 'Mousse de café y caramelo', imagen: 'mousse-de-cafe-.jpg' },
        { nombre: 'Oreo', imagen: 'oreo.jpg' },
        { nombre: 'Havanette', imagen: 'havannete.jpg' },
        { nombre: 'Macarons (sin TACC)', imagen: 'macarons.jpg' },
        { nombre: 'Sablé de almendras', imagen: 'sable-de-almendras.jpg' },
        { nombre: 'Brownie, DDL, crema y frutillas', imagen: 'BROWNIE-CON-DDL-Y-FRUTILLAS.jpg' },
        { nombre: 'Chocotorta', imagen: 'frutos-rojos.jpg' },
    ],
    'pattiserie-caja-grande': [
        { nombre: 'Brownie con dulce de leche y merengue', imagen: 'brownie-con-merengue.jpg' },
        { nombre: 'Pavlovas (sin TACC)', imagen: 'pavlova-petit.jpg' },
        { nombre: 'Lemon pie', imagen: 'pavlovas.jpg' },
        { nombre: 'Rogelitos', imagen: 'rogelitos.jpg' },
        { nombre: 'Mousse de chocolate amargo', imagen: 'mousse-de-choc-amargo.jpg' },
        { nombre: 'Mousse de coco', imagen: 'mousse-de-coco.jpg' },
        { nombre: 'Cheesecake de maracuyá', imagen: 'cheesecake-de-maracuya.jpg' },
        { nombre: 'Mousse de café y caramelo', imagen: 'mousse-de-cafe-.jpg' },
        { nombre: 'Oreo', imagen: 'oreo.jpg' },
        { nombre: 'Havanette', imagen: 'havannete.jpg' },
        { nombre: 'Macarons (sin TACC)', imagen: 'macarons.jpg' },
        { nombre: 'Sablé de almendras', imagen: 'sable-de-almendras.jpg' },
        { nombre: 'Brownie, DDL, crema y frutillas', imagen: 'BROWNIE-CON-DDL-Y-FRUTILLAS.jpg' },
        { nombre: 'Chocotorta', imagen: 'frutos-rojos.jpg' },
    ],
    'box-alfajorcitos-caja-chica': [{ nombre: 'Box Alfajorcitos', imagen: 'BOX-ALFAJORCITOS.jpg' }],
    'box-alfajorcitos-caja-grande': [{ nombre: 'Box Alfajorcitos', imagen: 'BOX-ALFAJORCITOS.jpg' }],
    'box-cuadraditos-caja-chica': [{ nombre: 'Box Cuadraditos', imagen: 'BOX-CUADRADITOS.jpg' }],
    'box-cuadraditos-caja-grande': [{ nombre: 'Box Cuadraditos', imagen: 'BOX-CUADRADITOS.jpg' }],
    'box-mix-caja-chica': [{ nombre: 'Box Mix', imagen: 'BOX-MIX.jpg' }],
    'box-mix-caja-grande': [{ nombre: 'Box Mix', imagen: 'BOX-MIX.jpg' }],
    'box-uno': [
        { nombre: 'Pinchos bocconcinos', imagen: 'pinchos-boconccinos.jpg' },
        { nombre: 'Sconcito de crudo', imagen: 'scon-de-crudo.jpg' },
        { nombre: 'Pecetitos', imagen: 'pecetito.jpg' },
        { nombre: 'Papas rosty', imagen: 'papas-rosty.jpg' },
        { nombre: 'Chipacitos con morrón asado', imagen: 'chipa-de-morron.jpg' },
        { nombre: 'Dip de queso azul y nueces', imagen: 'dip-de-queso-azul-y-nueces.jpg' },
    ],
    'box-dos': [
        { nombre: 'Sconcito de crudo', imagen: 'scon-de-crudo.jpg' },
        { nombre: 'Papas rosty', imagen: 'papas-rosty.jpg' },
        { nombre: 'Criollito capresse', imagen: 'criollito-capresse.jpg' },
        { nombre: 'Pollo y panceta', imagen: 'pollo-y-panceta.jpg' },
        { nombre: 'Empanaditas de bondiola', imagen: 'bondiola.jpg' },
        { nombre: 'Triangulito de bondiola braseada', imagen: 'triangulito-de-mas-fhilo-y-y-bondiola-braseada-1.jpg' },
    ],
    'box-tres': [
        { nombre: 'Picaditas individuales', imagen: 'picadas-individuales.jpg' },
        { nombre: 'Empanadita JyQ', imagen: 'empanada-jq.jpg' },
        { nombre: 'Pinchos de pollo crispy', imagen: 'pinchos-de-pollo-crispy.jpg' },
        { nombre: 'Tacos de bondiola', imagen: 'tacos.jpg' },
        { nombre: 'Hamburguesitas', imagen: 'hamburguesitas.jpg' },
    ],
};

// ── Secciones para MENÚ EVENTOS ──
const EVENTO_SECTIONS = {
    'menu-gourmet': [
        { titulo: 'Parte Fría', items: [
            { nombre: 'Tarteletas de atún y huevo', imagen: 'tarteletas-frias-de-hummus-y-atun.jpg' },
            { nombre: 'Degustación de quesos', imagen: 'degustacion-de-quesos.jpg' },
            { nombre: 'Scon al romero con lajas de salmón', imagen: 'scon-de-queso-al-romero-con-lajas-de-salmon.jpg' },
            { nombre: 'Dip de queso azul y nueces', imagen: 'dip-de-queso-azul-y-nueces.jpg' },
            { nombre: 'Locatelli de pollo y tomate', imagen: 'locatelli-de-pollo-y-tomate.jpg' },
            { nombre: 'Figacita de lomo y morrones asados', imagen: 'figacita-de-lomo-y-morrones-asado.jpg' },
            { nombre: 'Chipacitos de crudo y brie', imagen: 'chipa-de-morron.jpg' },
        ]},
        { titulo: 'Parte Caliente', items: [
            { nombre: 'Triangulito de bondiola braseada', imagen: 'triangulito-de-mas-fhilo-y-y-bondiola-braseada-1.jpg' },
            { nombre: 'Quiché de champignones', imagen: 'quiche-de-champignone.jpg' },
            { nombre: 'Papas rosty', imagen: 'papas-rosty.jpg' },
            { nombre: 'Brochetitas de ternera al malbec', imagen: 'brochetitas-de-ternera-2.jpg' },
            { nombre: 'Hamburguesitas', imagen: 'hamburguesitas.jpg' },
            { nombre: 'Cazuela de ravioles con salsa rosa', imagen: 'cazuela-de-ravioles-con-salsa-ros.jpg' },
        ]},
        { titulo: 'Postre', items: [
            { nombre: 'Shot de cheesecake', imagen: 'shot-de-cheesecake.jpg' },
            { nombre: 'Shot de mousse de chocolate', imagen: 'shot-de-mousse.jpg' },
        ]},
    ],
    'menu-clasico': [
        { titulo: 'Parte Fría', items: [
            { nombre: 'Masitas de queso', imagen: 'masitas-de-queso.jpg' },
            { nombre: 'Pinchos bocconcinos', imagen: 'pinchos-boconccinos.jpg' },
            { nombre: 'Dip de queso azul con nueces', imagen: 'dip-de-queso-azul-y-nueces.jpg' },
            { nombre: 'Criollito capresse', imagen: 'criollito-capresse.jpg' },
            { nombre: 'Sconcito de crudo', imagen: 'scon-de-crudo.jpg' },
            { nombre: 'Locatelli de pollo y tomate', imagen: 'locatelli-de-pollo-y-tomate.jpg' },
            { nombre: 'Pecetitos', imagen: 'pecetito.jpg' },
        ]},
        { titulo: 'Parte Caliente', items: [
            { nombre: 'Pinchos de pollo crispy con honey', imagen: 'pinchos-de-pollo-crispy.jpg' },
            { nombre: 'Empanaditas de bondiola', imagen: 'empanadas.jpg' },
            { nombre: 'Canastitas de espinaca', imagen: 'canastitas-de-espinaca.jpg' },
            { nombre: 'Roll de masa philo JYQ', imagen: 'roll-de-masa-philo.jpg' },
            { nombre: 'Roast beef tiernizado', imagen: 'roast-beef.jpg' },
        ]},
        { titulo: 'Postre', items: [
            { nombre: 'Shot de lemon pie', imagen: 'shot-de-lemon-pie.jpg' },
            { nombre: 'Shot de oreo', imagen: 'shot-de-oreo.jpg' },
        ]},
    ],
    'menu-picada': [
        { titulo: 'Parte Fría', items: [
            { nombre: 'Picaditas individuales', imagen: 'picadas-individuales.jpg' },
            { nombre: 'Ensaladitas César', imagen: 'ensaladitas-cesar.jpg' },
            { nombre: 'Pecetitos', imagen: 'pecetito.jpg' },
        ]},
        { titulo: 'Parte Caliente', items: [
            { nombre: 'Papas rosty', imagen: 'papas-rosty.jpg' },
            { nombre: 'Pinchos de pollo crispy', imagen: 'pinchos-de-pollo-crispy.jpg' },
            { nombre: 'Hamburguesitas con cheddar', imagen: 'hamburguesitas.jpg' },
            { nombre: 'Tacos de bondiola', imagen: 'tacos.jpg' },
        ]},
        { titulo: 'Postre', items: [
            { nombre: 'Shot de cheesecake', imagen: 'shot-de-cheesecake.jpg' },
            { nombre: 'Shot de oreo', imagen: 'shot-de-oreo.jpg' },
        ]},
    ],
    'menu-pizza': [
        { titulo: 'Entrada', items: [
            { nombre: 'Pan de queso con oliva y provenzal', imagen: '' },
        ]},
        { titulo: 'Empanadas', items: [
            { nombre: 'Surtidas (bondiola, JyQ, pollo, criolla)', imagen: 'empanadas.jpg' },
        ]},
        { titulo: 'Canastitas', items: [
            { nombre: 'Capresse', imagen: 'capresse.jpg' },
        ]},
        { titulo: 'Pizzas', items: [
            { nombre: 'Napolitana', imagen: 'napolitana.jpg' },
            { nombre: 'Jamón y morrones', imagen: 'jamon-y-morrones.jpg' },
            { nombre: 'Rúcula y crudo', imagen: 'rucula-y-crudo.jpg' },
            { nombre: 'Calabresa', imagen: 'calabresa.jpg' },
            { nombre: 'Queso azul y cebolla caramelizada', imagen: 'queso-azul-y-cebolla-caramelizada.jpg' },
            { nombre: 'Panceta y huevo', imagen: 'panceta-y-huevo.jpg' },
            { nombre: 'Espinaca', imagen: 'espinaca.jpg' },
        ]},
        { titulo: 'Postre', items: [
            { nombre: 'Shot de cheesecake', imagen: 'shot-de-cheesecake.jpg' },
            { nombre: 'Shot de oreo', imagen: 'shot-de-oreo.jpg' },
        ]},
    ],
};

function getImageSrc(filename) {
    if (!filename) return '';
    if (filename.startsWith('/') || filename.startsWith('http')) return filename;
    return `/productos/${filename}`;
}

let currentProductCollection = 'fingersFrios';

async function loadCollectionProducts(collectionId) {
    const container = document.getElementById('firebaseProductsContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading">Cargando productos desde Firebase...</div>';

    try {
        const snapshot = await db.collection(collectionId).get();
        const products = [];
        snapshot.forEach(doc => products.push({ docId: doc.id, ...doc.data() }));

        if (products.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No hay productos en esta colección.</p><button onclick="reloadCurrentCollection()">Reintentar</button></div>';
            return;
        }
        renderFirebaseProducts(products, collectionId);
    } catch (error) {
        container.innerHTML = `<div class="error-state"><p>Error: ${error.message}</p><button onclick="reloadCurrentCollection()">Reintentar</button></div>`;
    }
}

function renderFirebaseProducts(products, collectionId) {
    const container = document.getElementById('firebaseProductsContainer');
    container.innerHTML = products.map(p => renderProductCard(p, collectionId)).join('');
}

function renderProductCard(product, collectionId) {
    const docId = product.docId;
    const sections = product.sections || EVENTO_SECTIONS[docId] || [];
    const items = product.items || PRODUCT_ITEMS[docId] || [];
    if (sections.length > 0) return renderEventoCard(product, collectionId, sections);
    if (items.length > 0) return renderGroupedCard(product, collectionId, items);
    return renderSimpleCard(product, collectionId);
}

function renderSimpleCard(product, collectionId) {
    const docId = product.docId;
    const imagenFile = product.imagen || PRODUCT_IMAGES[docId] || '';
    const imgSrc = getImageSrc(imagenFile);
    const nombre = (product.nombre || '').replace(/"/g, '&quot;');
    const unidad = product.unidad || '';
    const precio = product.precio || '';

    return `
    <div class="fb-card fb-card--simple" data-docid="${docId}" data-collection="${collectionId}" data-type="simple">
        <div class="fb-card__img" onclick="gestionPickImage(this)" title="Click para cambiar imagen">
            ${imgSrc
                ? `<img src="${imgSrc}" alt="${nombre}" onerror="this.style.opacity=0.15">`
                : '<div class="fb-no-img">Sin imagen</div>'
            }
            <div class="fb-img-overlay">✏️</div>
        </div>
        <div class="fb-card__body">
            <div class="fb-card__id">${docId}</div>
            <div class="fb-field">
                <label>Nombre</label>
                <input class="fb-input fb-nombre" type="text" value="${nombre}">
            </div>
            <div class="fb-field">
                <label>Imagen (archivo en /productos/)</label>
                <input class="fb-input fb-imagen" type="text" value="${imagenFile}" placeholder="ej: masitas-de-queso.jpg" oninput="gestionPreviewImg(this)">
            </div>
            <div class="fb-field-row">
                <div class="fb-field">
                    <label>Unidad</label>
                    <input class="fb-input fb-unidad" type="text" value="${unidad}" placeholder="ej: x12">
                </div>
                <div class="fb-field">
                    <label>Precio</label>
                    <div class="fb-price-wrap">
                        <span class="fb-price-sign">$</span>
                        <input class="fb-input fb-precio" type="number" value="${precio}" min="0">
                    </div>
                </div>
            </div>
            <button class="fb-btn-save" onclick="saveFirebaseProduct(this)">💾 Guardar</button>
        </div>
    </div>`;
}

function renderGroupedCard(product, collectionId, items) {
    const docId = product.docId;
    const nombre = (product.nombre || '').replace(/"/g, '&quot;');
    const unidad = product.unidad || '';
    const precio = product.precio || '';

    const itemsHtml = items.map(item => {
        const imgSrc = getImageSrc(item.imagen || '');
        const itemNombre = (item.nombre || '').replace(/"/g, '&quot;');
        const itemImagen = (item.imagen || '').replace(/"/g, '&quot;');
        return `
        <div class="fb-subitem">
            <div class="fb-subitem__img" onclick="gestionPickSubImg(this)" title="Click para cambiar imagen">
                ${imgSrc
                    ? `<img src="${imgSrc}" alt="${itemNombre}" onerror="this.style.opacity=0.1">`
                    : '<div class="fb-no-img fb-no-img--sm"></div>'
                }
                <div class="fb-img-overlay fb-img-overlay--sm">✏️</div>
            </div>
            <input class="fb-input fb-item-nombre" type="text" value="${itemNombre}">
            <input class="fb-input fb-item-imagen" type="text" value="${itemImagen}" placeholder="imagen.jpg" oninput="gestionPreviewSubImg(this)">
        </div>`;
    }).join('');

    return `
    <div class="fb-card fb-card--grouped" data-docid="${docId}" data-collection="${collectionId}" data-type="grouped">
        <div class="fb-card__header">
            <div class="fb-card__id">${docId}</div>
            <div class="fb-card__header-fields">
                <div class="fb-field">
                    <label>Nombre</label>
                    <input class="fb-input fb-nombre" type="text" value="${nombre}">
                </div>
                <div class="fb-field">
                    <label>Unidad</label>
                    <input class="fb-input fb-unidad" type="text" value="${unidad}" placeholder="ej: Docena">
                </div>
                <div class="fb-field">
                    <label>Precio</label>
                    <div class="fb-price-wrap">
                        <span class="fb-price-sign">$</span>
                        <input class="fb-input fb-precio" type="number" value="${precio}" min="0">
                    </div>
                </div>
                <button class="fb-btn-save" onclick="saveFirebaseProduct(this)">💾 Guardar</button>
            </div>
        </div>
        <div class="fb-subitems-grid">
            ${itemsHtml}
        </div>
    </div>`;
}

function renderEventoCard(product, collectionId, sections) {
    const docId = product.docId;
    const nombre = (product.nombre || '').replace(/"/g, '&quot;');

    const sectionsHtml = sections.map(section => {
        const titulo = section.titulo || '';
        const sectionItems = (section.items || []).map(item => {
            const imgSrc = getImageSrc(item.imagen || '');
            const itemNombre = (item.nombre || '').replace(/"/g, '&quot;');
            const itemImagen = (item.imagen || '').replace(/"/g, '&quot;');
            return `
            <div class="fb-subitem">
                <div class="fb-subitem__img" onclick="gestionPickSubImg(this)" title="Click para cambiar imagen">
                    ${imgSrc
                        ? `<img src="${imgSrc}" alt="${itemNombre}" onerror="this.style.opacity=0.1">`
                        : '<div class="fb-no-img fb-no-img--sm"></div>'
                    }
                    <div class="fb-img-overlay fb-img-overlay--sm">✏️</div>
                </div>
                <input class="fb-input fb-item-nombre" type="text" value="${itemNombre}">
                <input class="fb-input fb-item-imagen" type="text" value="${itemImagen}" placeholder="imagen.jpg" oninput="gestionPreviewSubImg(this)">
            </div>`;
        }).join('');

        return `
        <div class="fb-section" data-section-titulo="${titulo.replace(/"/g, '&quot;')}">
            <div class="fb-section__title">${titulo}</div>
            <div class="fb-subitems-grid">
                ${sectionItems}
            </div>
        </div>`;
    }).join('');

    return `
    <div class="fb-card fb-card--evento" data-docid="${docId}" data-collection="${collectionId}" data-type="evento">
        <div class="fb-card__header">
            <div class="fb-card__id">${docId}</div>
            <div class="fb-card__header-fields">
                <div class="fb-field">
                    <label>Nombre del menú</label>
                    <input class="fb-input fb-nombre" type="text" value="${nombre}">
                </div>
                <button class="fb-btn-save" onclick="saveFirebaseProduct(this)">💾 Guardar</button>
            </div>
        </div>
        <div class="fb-sections-container">
            ${sectionsHtml}
        </div>
    </div>`;
}

window.switchProductCollection = async function(collectionId) {
    currentProductCollection = collectionId;
    document.querySelectorAll('.collection-tab').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.collection-tab[data-collection="${collectionId}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    await loadCollectionProducts(collectionId);
};

window.reloadCurrentCollection = function() {
    loadCollectionProducts(currentProductCollection);
};

window.saveFirebaseProduct = async function(button) {
    const card = button.closest('.fb-card');
    const docId = card.dataset.docid;
    const collectionId = card.dataset.collection;
    const type = card.dataset.type;

    const nombre = card.querySelector('.fb-nombre').value.trim();
    if (!nombre) { alert('El nombre es requerido'); return; }

    button.disabled = true;
    button.textContent = 'Guardando...';

    try {
        let updateData = { nombre };

        if (type === 'simple') {
            const unidad = card.querySelector('.fb-unidad').value.trim();
            const precio = parseFloat(card.querySelector('.fb-precio').value) || 0;
            const imagen = card.querySelector('.fb-imagen').value.trim();
            updateData = { nombre, precio };
            if (unidad) updateData.unidad = unidad;
            if (imagen) updateData.imagen = imagen;

        } else if (type === 'grouped') {
            const unidad = card.querySelector('.fb-unidad').value.trim();
            const precio = parseFloat(card.querySelector('.fb-precio').value) || 0;
            const items = [];
            card.querySelectorAll('.fb-subitem').forEach(sub => {
                items.push({
                    nombre: sub.querySelector('.fb-item-nombre').value.trim(),
                    imagen: sub.querySelector('.fb-item-imagen').value,
                });
            });
            updateData = { nombre, precio, items };
            if (unidad) updateData.unidad = unidad;

        } else if (type === 'evento') {
            const sections = [];
            card.querySelectorAll('.fb-section').forEach(sectionEl => {
                const items = [];
                sectionEl.querySelectorAll('.fb-subitem').forEach(sub => {
                    items.push({
                        nombre: sub.querySelector('.fb-item-nombre').value.trim(),
                        imagen: sub.querySelector('.fb-item-imagen').value,
                    });
                });
                sections.push({ titulo: sectionEl.dataset.sectionTitulo, items });
            });
            updateData = { nombre, sections };
        }

        await db.collection(collectionId).doc(docId).update(updateData);

        button.textContent = '✓ Guardado';
        button.style.background = '#22c55e';
        setTimeout(() => {
            button.disabled = false;
            button.textContent = '💾 Guardar';
            button.style.background = '';
        }, 2500);

    } catch (error) {
        alert(`Error al guardar: ${error.message}`);
        button.disabled = false;
        button.textContent = '💾 Guardar';
    }
};

// ── Helpers de previsualización de imagen ──────────────────────────────────
window.gestionPreviewImg = function(input) {
    const card = input.closest('.fb-card');
    const img = card.querySelector('.fb-card__img img');
    const noImg = card.querySelector('.fb-card__img .fb-no-img');
    const val = input.value.trim();
    if (!val) return;
    const src = `/productos/${val}`;
    if (img) {
        img.src = src;
        img.style.opacity = 1;
    } else if (noImg) {
        noImg.outerHTML = `<img src="${src}" onerror="this.style.opacity=0.15">`;
    }
};

window.gestionPreviewSubImg = function(input) {
    const subitem = input.closest('.fb-subitem');
    const img = subitem.querySelector('.fb-subitem__img img');
    const noImg = subitem.querySelector('.fb-subitem__img .fb-no-img');
    const val = input.value.trim();
    if (!val) return;
    const src = `/productos/${val}`;
    if (img) {
        img.src = src;
        img.style.opacity = 1;
    } else if (noImg) {
        noImg.outerHTML = `<img src="${src}" onerror="this.style.opacity=0.1">`;
    }
};

// ── Funciones para cambiar imágenes haciendo click ────────────────────────

async function uploadImageFile(file) {
    const formData = new FormData();
    formData.append('image', file);
    // En localhost usa el endpoint de Node; en producción usa el script PHP
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const uploadUrl = isLocal ? '/api/upload-image' : '/upload-image.php';
    const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Error al subir la imagen');
    }
    return await response.json(); // { success, filename }
}

window.gestionPickImage = function(imgContainer) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async function() {
        const file = input.files[0];
        if (!file) return;
        try {
            const result = await uploadImageFile(file);
            const filename = result.filename;

            // Actualizar el input de nombre de archivo
            const card = imgContainer.closest('.fb-card');
            const imagenInput = card.querySelector('.fb-imagen');
            if (imagenInput) imagenInput.value = filename;

            // Actualizar la previsualización
            const src = `/productos/${filename}`;
            const img = imgContainer.querySelector('img');
            const noImg = imgContainer.querySelector('.fb-no-img');
            if (img) {
                img.src = src;
                img.style.opacity = 1;
            } else if (noImg) {
                noImg.outerHTML = `<img src="${src}" alt="${filename}" onerror="this.style.opacity=0.15">`;
            } else {
                imgContainer.insertAdjacentHTML('afterbegin', `<img src="${src}" alt="${filename}" onerror="this.style.opacity=0.15">`);
            }
        } catch (err) {
            alert('Error al subir la imagen: ' + err.message);
        }
    };
    input.click();
};

window.gestionPickSubImg = function(imgContainer) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async function() {
        const file = input.files[0];
        if (!file) return;
        try {
            const result = await uploadImageFile(file);
            const filename = result.filename;

            // Actualizar el input de nombre de archivo del subitem
            const subitem = imgContainer.closest('.fb-subitem');
            const imagenInput = subitem.querySelector('.fb-item-imagen');
            if (imagenInput) imagenInput.value = filename;

            // Actualizar la previsualización
            const src = `/productos/${filename}`;
            const img = imgContainer.querySelector('img');
            const noImg = imgContainer.querySelector('.fb-no-img');
            if (img) {
                img.src = src;
                img.style.opacity = 1;
            } else if (noImg) {
                noImg.outerHTML = `<img src="${src}" alt="${filename}" onerror="this.style.opacity=0.1">`;
            } else {
                imgContainer.insertAdjacentHTML('afterbegin', `<img src="${src}" alt="${filename}" onerror="this.style.opacity=0.1">`);
            }
        } catch (err) {
            alert('Error al subir la imagen: ' + err.message);
        }
    };
    input.click();
};

// ===================================
// GESTIÓN DE SOLICITUDES
// ===================================

let solicitudesFiltro = 'pending';
let todasLasSolicitudes = [];

async function loadSolicitudes() {
    const container = document.getElementById('solicitudesContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading">Cargando solicitudes...</div>';
    try {
        const snapshot = await db.collection('solicitudes').orderBy('createdAt', 'desc').get();
        todasLasSolicitudes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSolicitudes();
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><p>Error cargando solicitudes: ${err.message}</p></div>`;
    }
}

function filtrarSolicitudes(filtro) {
    solicitudesFiltro = filtro;
    document.querySelectorAll('.solicitud-filtro').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    renderSolicitudes();
}
window.filtrarSolicitudes = filtrarSolicitudes;

function renderSolicitudes() {
    const container = document.getElementById('solicitudesContainer');
    if (!container) return;

    const lista = solicitudesFiltro === 'all'
        ? todasLasSolicitudes
        : todasLasSolicitudes.filter(s => s.status === solicitudesFiltro);

    if (lista.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No hay solicitudes en esta categoría</p></div>';
        return;
    }

    container.innerHTML = lista.map(s => {
        const fecha = s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString('es-AR') : 'N/D';
        const productos = (s.productos || []).map(p => `${p.name} x${p.quantity}`).join(', ');
        const envioText = s.costoEnvio === 'consultar' ? 'A consultar' : s.costoEnvio === 0 ? 'Gratis' : `$${(s.costoEnvio||0).toLocaleString()}`;
        const statusLabels = { pending: '🟡 Pendiente', approved: '🟢 Aprobada', rejected: '🔴 Rechazada' };
        const statusLabel = statusLabels[s.status] || s.status;

        return `
        <div class="order-card solicitud-card" id="solicitud-${s.id}">
            <div class="order-header">
                <span class="order-id">#${s.id.slice(0,8).toUpperCase()}</span>
                <span class="order-status status-${s.status}">${statusLabel}</span>
                <span class="order-date">${fecha}</span>
            </div>
            <div class="order-details" style="display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin:10px 0;">
                <div><strong>Nombre:</strong> ${s.nombre}</div>
                <div><strong>Teléfono:</strong> ${s.telefono}</div>
                <div><strong>Email:</strong> ${s.email}</div>
                <div><strong>Localidad:</strong> ${s.localidad}</div>
                <div style="grid-column:1/-1;"><strong>Dirección:</strong> ${s.direccion}</div>
                <div style="grid-column:1/-1;background:#fdf3e7;border-left:3px solid #e8962a;padding:6px 10px;border-radius:4px;">
                    <strong>📅 Fecha pedido:</strong> ${s.fecha ? new Date(s.fecha+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) : '⚠️ No especificada'}
                </div>
                ${s.nota ? `<div style="grid-column:1/-1;"><strong>Nota:</strong> ${s.nota}</div>` : ''}
            </div>
            <div style="background:#f9f5f4;border-radius:8px;padding:8px 12px;margin:8px 0;font-size:0.9rem;">
                <strong>Productos:</strong> ${productos}
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                <div>
                    <strong>Subtotal:</strong> $${(s.subtotal||0).toLocaleString()} &nbsp;|&nbsp;
                    <strong>Envío:</strong> ${envioText} &nbsp;|&nbsp;
                    <strong>Total:</strong> $${(s.total||s.subtotal||0).toLocaleString()}
                </div>
            </div>
            ${s.status === 'pending' ? `
            <div class="order-actions" style="margin-top:12px;display:flex;gap:10px;">
                <button class="btn-primary" onclick="aprobarSolicitud('${s.id}','${s.email}','${s.nombre}')">✓ Aprobar</button>
                <button class="btn-danger" onclick="rechazarSolicitud('${s.id}','${s.email}','${s.nombre}')">✗ Rechazar</button>
                <a href="https://wa.me/54${(s.telefono||'').replace(/\D/g,'')}" target="_blank" class="btn-secondary">WhatsApp</a>
            </div>` : ''}
        </div>`;
    }).join('');
}

async function aprobarSolicitud(id, email, nombre) {
    if (!confirm(`¿Aprobar solicitud de ${nombre}?`)) return;
    try {
        await db.collection('solicitudes').doc(id).update({ status: 'approved', updatedAt: new Date() });

        // EmailJS notificación (si está configurado)
        if (typeof emailjs !== 'undefined') {
            const EMAILJS_SERVICE_ID    = 'TU_SERVICE_ID';
            const EMAILJS_PUBLIC_KEY    = 'TU_PUBLIC_KEY';
            const EMAILJS_TEMPLATE_APROBACION = 'TU_TEMPLATE_APROBACION';
            if (EMAILJS_PUBLIC_KEY !== 'TU_PUBLIC_KEY') {
                emailjs.init(EMAILJS_PUBLIC_KEY);
                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_APROBACION, { to_email: email, nombre, solicitud_id: id.slice(0,8).toUpperCase() });
            }
        }

        alert(`Solicitud de ${nombre} aprobada. Se actualizó el estado.`);
        loadSolicitudes();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}
window.aprobarSolicitud = aprobarSolicitud;

async function rechazarSolicitud(id, email, nombre) {
    if (!confirm(`¿Rechazar solicitud de ${nombre}?`)) return;
    try {
        await db.collection('solicitudes').doc(id).update({ status: 'rejected', updatedAt: new Date() });

        // EmailJS notificación (si está configurado)
        if (typeof emailjs !== 'undefined') {
            const EMAILJS_SERVICE_ID    = 'TU_SERVICE_ID';
            const EMAILJS_PUBLIC_KEY    = 'TU_PUBLIC_KEY';
            const EMAILJS_TEMPLATE_RECHAZO = 'TU_TEMPLATE_RECHAZO';
            if (EMAILJS_PUBLIC_KEY !== 'TU_PUBLIC_KEY') {
                emailjs.init(EMAILJS_PUBLIC_KEY);
                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_RECHAZO, { to_email: email, nombre, solicitud_id: id.slice(0,8).toUpperCase() });
            }
        }

        alert(`Solicitud de ${nombre} rechazada.`);
        loadSolicitudes();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}
window.rechazarSolicitud = rechazarSolicitud;
window.loadSolicitudes = loadSolicitudes;

// ===================================
// AGREGAR NUEVO PRODUCTO A FIREBASE
// ===================================

// Colecciones que usan el tipo "grouped" (tienen items[])
const GROUPED_COLLECTIONS = ['boxSalados', 'boxDulces', 'combosDulces', 'desayunos'];

window.openNewProductModal = function() {
    const modal = document.getElementById('newFirebaseProductModal');
    if (!modal) return;
    // Limpiar formulario
    document.getElementById('newFirebaseProductForm').reset();
    document.getElementById('nfp-items-list').innerHTML = '';
    // Mostrar/ocultar sección de ítems según la colección actual
    const isGrouped = GROUPED_COLLECTIONS.includes(currentProductCollection);
    document.getElementById('nfp-items-section').style.display = isGrouped ? 'block' : 'none';
    if (isGrouped) addNewProductItem(); // Empezar con una fila vacía
    modal.classList.add('active');
};

window.closeNewProductModal = function() {
    document.getElementById('newFirebaseProductModal').classList.remove('active');
};

window.addNewProductItem = function() {
    const list = document.getElementById('nfp-items-list');
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;';
    row.innerHTML = `
        <input type="text" placeholder="Nombre del ítem" class="fb-input nfp-item-nombre" style="flex:2;padding:8px;border:1px solid #ddd;border-radius:6px;">
        <input type="text" placeholder="imagen.jpg" class="fb-input nfp-item-imagen" style="flex:2;padding:8px;border:1px solid #ddd;border-radius:6px;">
        <button type="button" class="btn-secondary" style="padding:6px 10px;flex-shrink:0;" onclick="this.closest('.ingredient-row').remove()">✕</button>
    `;
    list.appendChild(row);
};

window.submitNewFirebaseProduct = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('nfp-submit-btn');
    const docId  = document.getElementById('nfp-docid').value.trim();
    const nombre = document.getElementById('nfp-nombre').value.trim();
    const precio = parseFloat(document.getElementById('nfp-precio').value) || 0;
    const unidad = document.getElementById('nfp-unidad').value.trim();
    const imagen = document.getElementById('nfp-imagen').value.trim();

    if (!docId || !nombre) { alert('ID y Nombre son requeridos'); return; }

    // Verificar que el doc no exista ya
    try {
        const existing = await db.collection(currentProductCollection).doc(docId).get();
        if (existing.exists) {
            alert(`Ya existe un producto con ID "${docId}" en esta colección. Usá otro ID.`);
            return;
        }
    } catch (err) {
        // Continuar si hay error al verificar
    }

    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const isGrouped = GROUPED_COLLECTIONS.includes(currentProductCollection);
        let data = { nombre };
        if (precio) data.precio = precio;
        if (unidad) data.unidad = unidad;
        if (imagen) data.imagen = imagen;

        if (isGrouped) {
            const items = [];
            document.querySelectorAll('#nfp-items-list .ingredient-row').forEach(row => {
                const n = row.querySelector('.nfp-item-nombre').value.trim();
                const img = row.querySelector('.nfp-item-imagen').value.trim();
                if (n) items.push({ nombre: n, imagen: img });
            });
            data.items = items;
        }

        await db.collection(currentProductCollection).doc(docId).set(data);

        btn.textContent = '✓ Guardado';
        btn.style.background = '#22c55e';
        setTimeout(() => {
            btn.disabled = false;
            btn.textContent = 'Guardar en Firebase';
            btn.style.background = '';
            closeNewProductModal();
            loadCollectionProducts(currentProductCollection);
        }, 1500);

    } catch (err) {
        alert('Error al guardar: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Guardar en Firebase';
    }
};
