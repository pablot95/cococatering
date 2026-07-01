// Admin Panel - Cocó Catering
// Sistema de gestión administrativa - usa Firebase compat SDK global (window.db)

// Variables globales
let allOrders = [];
let allProducts = [];
let editingProductId = null;

// ===================================
// SECCIÓN GESTIÓN (integrada en admin SPA)
// ===================================
const Gestion = {
  _modalsReady: false,

  render() {
    document.getElementById('mainContent').innerHTML = `
      <div class="gestion-wrapper">
        <nav class="gestion-tabs">
          <button class="tab-btn active" data-tab="solicitudes" onclick="switchTab('solicitudes')">📋 Solicitudes</button>
          <button class="tab-btn" data-tab="productos" onclick="switchTab('productos')">🛍️ Productos</button>
        </nav>

        <div class="tab-content active" id="tabSolicitudes">
          <div class="tab-header">
            <h2>Solicitudes</h2>
            <button class="btn-secondary" onclick="loadSolicitudes()">↺ Actualizar</button>
          </div>
          <div class="solicitudes-filtros" style="margin-bottom:15px;display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn-secondary solicitud-filtro" onclick="filtrarSolicitudes('pending', event)">Pendientes</button>
            <button class="btn-secondary solicitud-filtro" onclick="filtrarSolicitudes('approved', event)">Aprobadas</button>
            <button class="btn-secondary solicitud-filtro" onclick="filtrarSolicitudes('rejected', event)">Rechazadas</button>
            <button class="btn-secondary solicitud-filtro active" onclick="filtrarSolicitudes('all', event)">Todas</button>
          </div>
          <div id="solicitudesContainer" class="orders-grid">
            <div class="loading">Cargando solicitudes...</div>
          </div>
        </div>

        <div class="tab-content" id="tabProductos">
          <div class="tab-header">
            <h2>Gestión de Productos</h2>
            <button class="btn-secondary" onclick="reloadCurrentCollection()">↺ Actualizar</button>
          </div>
          <div class="collection-tabs">
            <button class="collection-tab" data-collection="menuEventos" onclick="switchProductCollection('menuEventos')">Menú Eventos</button>
            <button class="collection-tab" data-collection="boxSalados" onclick="switchProductCollection('boxSalados')">Box Salados</button>
            <button class="collection-tab active" data-collection="fingersFrios" onclick="switchProductCollection('fingersFrios')">Fingers Fríos</button>
            <button class="collection-tab" data-collection="fingersCalientes" onclick="switchProductCollection('fingersCalientes')">Fingers Calientes</button>
            <button class="collection-tab" data-collection="boxDulces" onclick="switchProductCollection('boxDulces')">Box Dulces</button>
            <button class="collection-tab" data-collection="shots" onclick="switchProductCollection('shots')">Shots</button>
            <button class="collection-tab" data-collection="tortasClasicas" onclick="switchProductCollection('tortasClasicas')">Tortas Clásicas</button>
            <button class="collection-tab" data-collection="tortasDecoradas" onclick="switchProductCollection('tortasDecoradas')">Tortas Decoradas</button>
            <button class="collection-tab" data-collection="combosDulces" onclick="switchProductCollection('combosDulces')">Combos Dulces</button>
            <button class="collection-tab" data-collection="desayunos" onclick="switchProductCollection('desayunos')">Desayunos</button>
            <button class="collection-tab" data-collection="__envio__" onclick="switchProductCollection('__envio__')">🚚 Envíos</button>
          </div>
          <div id="firebaseProductsContainer" class="firebase-products-grid">
            <div class="empty-state"><p>Selecciona una colección para ver los productos</p></div>
          </div>
        </div>
      </div>
    `;

    if (!this._modalsReady) {
      this._addModals();
      this._modalsReady = true;
    }

    loadSolicitudes();
  },

  _addModals() {
    document.body.insertAdjacentHTML('beforeend', `
      <!-- Modal: Armador de Productos (local) -->
      <div id="productModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="modalTitle">Nuevo Producto</h2>
            <button class="btn-close" onclick="closeProductModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="productForm">
              <div class="form-group">
                <label for="productName">Nombre del Producto *</label>
                <input type="text" id="productName" required placeholder="Ej: Tarta de Jamón y Queso">
              </div>
              <div class="form-group">
                <label for="productDescription">Descripción</label>
                <textarea id="productDescription" rows="3" placeholder="Descripción breve del producto"></textarea>
              </div>
              <div class="ingredients-section">
                <div class="ingredients-header">
                  <h3>Ingredientes</h3>
                  <button type="button" class="btn-add-ingredient" onclick="addIngredientRow()">Agregar Ingrediente</button>
                </div>
                <div id="ingredientsList" class="ingredients-list"></div>
              </div>
              <div class="product-summary">
                <div class="summary-item">
                  <span>Costo Total:</span>
                  <strong id="totalCost">$0</strong>
                </div>
                <div class="summary-item">
                  <label for="profitMargin">Margen de Ganancia (%):</label>
                  <input type="number" id="profitMargin" value="30" min="0" max="100" onchange="calculateFinalPrice()">
                </div>
                <div class="summary-item highlight">
                  <span>Precio Final:</span>
                  <strong id="finalPrice">$0</strong>
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeProductModal()">Cancelar</button>
                <button type="submit" class="btn-primary">Guardar Producto</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Modal: Nuevo Producto Firebase -->
      <div id="newFirebaseProductModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Agregar Producto a Firebase</h2>
            <button class="btn-close" onclick="closeNewProductModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="newFirebaseProductForm" onsubmit="submitNewFirebaseProduct(event)">
              <div class="form-group">
                <label for="nfp-docid">ID del documento *<small style="font-weight:400;color:#888;"> (sin espacios, ej: masitas-queso)</small></label>
                <input type="text" id="nfp-docid" required placeholder="ej: masitas-queso" pattern="[a-z0-9\\-_]+" title="Solo letras minúsculas, números y guiones">
              </div>
              <div class="form-group">
                <label for="nfp-nombre">Nombre *</label>
                <input type="text" id="nfp-nombre" required placeholder="ej: Masitas de queso">
              </div>
              <div class="fb-field-row" style="display:flex;gap:12px;">
                <div class="form-group" style="flex:1">
                  <label for="nfp-precio">Precio</label>
                  <input type="number" id="nfp-precio" min="0" placeholder="0">
                </div>
                <div class="form-group" style="flex:1">
                  <label for="nfp-unidad">Unidad</label>
                  <input type="text" id="nfp-unidad" placeholder="ej: x12">
                </div>
              </div>
              <div class="form-group">
                <label for="nfp-imagen">Imagen <small style="font-weight:400;color:#888;">(archivo en /productos/)</small></label>
                <input type="text" id="nfp-imagen" placeholder="ej: masitas-de-queso.jpg">
              </div>
              <div id="nfp-items-section" style="display:none;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin:16px 0 8px;">
                  <label style="font-weight:600;">Ítems del producto</label>
                  <button type="button" class="btn-secondary" style="padding:4px 10px;font-size:0.85rem;" onclick="addNewProductItem()">Agregar ítem</button>
                </div>
                <div id="nfp-items-list"></div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeNewProductModal()">Cancelar</button>
                <button type="submit" class="btn-primary" id="nfp-submit-btn">Guardar en Firebase</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `);

    // Re-bind productForm submit since it was registered before the modal existed
    const form = document.getElementById('productForm');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('productName').value;
        const description = document.getElementById('productDescription').value;
        const profitMargin = parseFloat(document.getElementById('profitMargin').value);
        const ingredientRows = document.querySelectorAll('.ingredient-row');
        const ingredients = [];
        ingredientRows.forEach(row => {
          ingredients.push({
            name: row.querySelector('.ingredient-name-input').value,
            quantity: parseFloat(row.querySelector('.ingredient-quantity-input').value),
            unit: row.querySelector('.ingredient-unit-input').value,
            cost: parseFloat(row.querySelector('.ingredient-cost-input').value)
          });
        });
        const totalCost = ingredients.reduce((sum, ing) => sum + ing.cost, 0);
        const finalPrice = Math.round(totalCost * (1 + profitMargin / 100));
        const product = {
          id: editingProductId || 'prod_' + Date.now(),
          name, description, ingredients, totalCost, profitMargin, finalPrice,
          createdAt: editingProductId ? allProducts.find(p => p.id === editingProductId).createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        if (editingProductId) {
          allProducts[allProducts.findIndex(p => p.id === editingProductId)] = product;
        } else {
          allProducts.push(product);
        }
        saveProducts();
        renderProducts();
        closeProductModal();
      });
    }
  }
};


// ===================================
// TABS NAVIGATION
// ===================================
window.switchTab = function(tabName) {
    const wrapper = document.getElementById('mainContent');
    if (!wrapper) return;
    wrapper.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    wrapper.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Activar tab seleccionada — buscar por data-tab para evitar problemas con event.target al hacer click en el emoji
    const activeBtn = wrapper.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    const activeContent = document.getElementById('tab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
    if (activeContent) activeContent.classList.add('active');

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
            <option value="ml" ${ingredient?.unit === 'ml' ? 'selected' : ''}>Mililitros (ml)</option>
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
        let query = db.collection('orders').orderBy('createdAt', 'desc');
        if (statusFilter !== 'all') query = query.where('status', '==', statusFilter);
        const snapshot = await query.get();
        allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
        pending:    'Pendiente',
        approved:   'Aprobada',
        processing: 'En proceso',
        completed:  'Completada',
        cancelled:  'Cancelada'
    }[order.status] || order.status;

    // Soportar órdenes desde solicitudes (campo 'cliente') y desde MercadoPago (campo 'customer')
    const customer    = order.cliente || order.customer || {};
    const items       = order.productos || order.items || [];
    const totalAmount = order.total || 0;

    const dateStr = order.createdAt?.toDate ? order.createdAt.toDate() : order.createdAt || order.orderDate;
    const date = dateStr ? new Date(dateStr).toLocaleString('es-AR') : 'Fecha no disponible';

    // Dirección: solicitudes usan string directo, MercadoPago usa campos separados
    const direccion = customer.direccion
        || [customer.calle, customer.altura].filter(Boolean).join(' ')
        + (customer.piso   ? `, Piso ${customer.piso}`   : '')
        + (customer.depto  ? `, Depto ${customer.depto}` : '');
    const localidad = customer.localidad || customer.ciudad || '';
    const provincia = customer.provincia
        ? `${customer.provincia}${customer.codigoPostal ? ` (CP: ${customer.codigoPostal})` : ''}`
        : '';
    const domicilioCompleto = [direccion, localidad, provincia].filter(Boolean).join(' — ');

    // Fecha del evento (de solicitudes)
    const fechaEvento = order.fechaPedido
        ? new Date(order.fechaPedido + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : null;

    // Horario (si viene de solicitud)
    const horario = order.horario || null;

    // Migrar ítems viejos guardados en unidades físicas (sin campo unit, min >= 6)
    const migratedItems = items.map(p => {
        const storedUnit = p.unit || '';
        const storedMin  = p.min  || 1;
        if (storedUnit !== 'doc.' && storedMin >= 6) {
            const rawQty = p.quantity || p.cantidad || 0;
            const docenas = rawQty / storedMin;
            if (docenas > 0 && Number.isInteger(docenas)) {
                return { ...p, quantity: docenas, unit: 'doc.', min: 1, step: 1 };
            }
        }
        return p;
    });

    // Productos
    const productosHTML = migratedItems.map(p => {
        const pName   = (p.name || p.nombre || 'Producto').replace(/\s*[–-]\s*x\d+\s*$/i, '').trim();
        const qty     = p.quantity || p.cantidad || 0;
        const price   = p.price   || p.precio   || 0;
        const subtot  = qty * price;
        const qtyLabel   = `×${p.unit === 'doc.' ? qty * (p.batchSize || 12) : qty} u.`;
        const priceLabel = price > 0
            ? (p.unit === 'doc.' ? `$${price.toLocaleString('es-AR')} x ${p.batchSize || 12} u.` : `$${price.toLocaleString('es-AR')} c/u`)
            : '—';
        return `
        <div class="product-item">
            <span class="product-name">${pName}</span>
            <span class="product-qty">${qtyLabel}</span>
            <span class="product-price">${price > 0 ? '$' + subtot.toLocaleString('es-AR') : '—'}</span>
        </div>`;
    }).join('');

    // Recalcular totales desde ítems migrados
    const recalcSubtotal = migratedItems.reduce((sum, p) => {
        return sum + (p.quantity || 0) * (p.price || p.precio || 0);
    }, 0);
    const envioNum = (!order.costoEnvio || order.costoEnvio === 0) ? 0
        : order.costoEnvio === 'consultar' ? 0
        : Number(order.costoEnvio);
    const recalcTotal = recalcSubtotal + envioNum;

    const envioText = order.costoEnvio === 'consultar' ? 'A consultar'
        : (!order.costoEnvio) ? 'Gratis'
        : `$${Number(order.costoEnvio).toLocaleString('es-AR')}`;

    const origenTag = order.solicitudId
        ? `<span style="font-size:.72rem;background:#e8f4e8;color:#2d6a2d;padding:2px 7px;border-radius:10px;margin-left:8px;">📝 Sol. #${order.solicitudId.slice(0,8).toUpperCase()}</span>`
        : '';

    return `
        <div class="order-card">
            <div class="order-header">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                    <div class="order-id">Orden #${(order.orderId || order.paymentId || order.id || '').slice(0,8).toUpperCase()}</div>
                    ${origenTag}
                </div>
                <span class="order-status ${statusClass}">${statusText}</span>
                <span class="order-date">${date}</span>
            </div>

            <div class="customer-info">
                <h3>👤 Cliente</h3>
                <p><strong>${customer.nombre || 'Sin nombre'}</strong></p>
                ${customer.email    ? `<p>📧 ${customer.email}</p>`    : ''}
                ${customer.telefono ? `<p>📱 ${customer.telefono}</p>` : ''}
                ${customer.dni      ? `<p>🆔 DNI: ${customer.dni}</p>` : ''}
                ${domicilioCompleto ? `<p>📍 ${domicilioCompleto}</p>` : ''}
                ${fechaEvento       ? `<p style="background:#fdf3e7;border-left:3px solid #e8962a;padding:5px 10px;border-radius:4px;margin-top:8px;">📅 <strong>Fecha del evento:</strong> ${fechaEvento}</p>` : ''}
                ${horario           ? `<p>🕐 <strong>Horario:</strong> ${horario}</p>` : ''}
                ${order.nota        ? `<p>📝 <strong>Nota:</strong> ${order.nota}</p>` : ''}
            </div>

            <div class="products-list">
                <h4>📋 Productos</h4>
                ${productosHTML}
            </div>

            <div class="order-total">
                <div style="display:flex;flex-direction:column;gap:4px;font-size:.9rem;">
                    <span>Subtotal: <strong>$${recalcSubtotal.toLocaleString('es-AR')}</strong></span>
                    <span>Envío: <strong>${envioText}</strong></span>
                </div>
                <div>
                    <span class="total-label">Total:</span>
                    <span class="total-amount">$${recalcTotal.toLocaleString('es-AR')}</span>
                </div>
            </div>

            <div class="order-actions">
                <select onchange="updateOrderStatusHandler('${order.id}', this.value)">
                    <option value="">Cambiar estado…</option>
                    <option value="pending"    ${order.status === 'pending'    ? 'selected' : ''}>Pendiente</option>
                    <option value="approved"   ${order.status === 'approved'   ? 'selected' : ''}>Aprobada</option>
                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>En proceso</option>
                    <option value="completed"  ${order.status === 'completed'  ? 'selected' : ''}>Completada</option>
                    <option value="cancelled"  ${order.status === 'cancelled'  ? 'selected' : ''}>Cancelada</option>
                </select>
                ${customer.telefono ? `<a href="https://wa.me/54${customer.telefono.replace(/\D/g,'')}" target="_blank" class="btn-secondary">💬 WhatsApp</a>` : ''}
                <button onclick="deleteOrderHandler('${order.id}')" class="btn-danger">🗑️ Eliminar</button>
            </div>
        </div>
    `;
}

window.updateOrderStatusHandler = async function(orderId, newStatus) {
    if (!newStatus) return;
    try {
        await db.collection('orders').doc(orderId).update({ status: newStatus, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        alert('Estado actualizado');
        loadOrders();
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        alert('Error al actualizar');
    }
};

window.deleteOrderHandler = async function(orderId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta orden?')) {
        return;
    }
    try {
        await db.collection('orders').doc(orderId).delete();
        alert('Orden eliminada');
        loadOrders();
    } catch (error) {
        console.error('Error al eliminar orden:', error);
        alert('Error al eliminar');
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
    'box-alfajorcitos-caja-chica': [
        { nombre: 'Alfajorcitos de maizena', imagen: '' },
        { nombre: 'Alfajorcitos de manteca', imagen: '' },
        { nombre: 'Alfajorcitos de almendras', imagen: '' },
        { nombre: 'Alfajorcitos de chocolate', imagen: '' },
        { nombre: 'Alfajorcitos de pistacho', imagen: '' },
        { nombre: 'Alfacookies de chocolate negro', imagen: '' },
        { nombre: 'Alfajorcitos de coco', imagen: '' },
    ],
    'box-alfajorcitos-caja-grande': [
        { nombre: 'Alfajorcitos de maizena', imagen: '' },
        { nombre: 'Alfajorcitos de manteca', imagen: '' },
        { nombre: 'Alfajorcitos de almendras', imagen: '' },
        { nombre: 'Alfajorcitos de chocolate', imagen: '' },
        { nombre: 'Alfajorcitos de pistacho', imagen: '' },
        { nombre: 'Alfacookies de chocolate negro', imagen: '' },
        { nombre: 'Alfajorcitos de coco', imagen: '' },
    ],
    'box-cuadraditos-caja-chica': [
        { nombre: 'Crumble de manzana', imagen: '' },
        { nombre: 'Cuadradito de brownie', imagen: '' },
        { nombre: 'Lemonies', imagen: '' },
        { nombre: 'Pastafrola', imagen: '' },
        { nombre: 'Cuadradito de coco con DDL', imagen: '' },
        { nombre: 'Crumble de frambuesas', imagen: '' },
        { nombre: 'Cuadradito de nuez', imagen: '' },
    ],
    'box-cuadraditos-caja-grande': [
        { nombre: 'Crumble de manzana', imagen: '' },
        { nombre: 'Cuadradito de brownie', imagen: '' },
        { nombre: 'Lemonies', imagen: '' },
        { nombre: 'Pastafrola', imagen: '' },
        { nombre: 'Cuadradito de coco con DDL', imagen: '' },
        { nombre: 'Crumble de frambuesas', imagen: '' },
        { nombre: 'Cuadradito de nuez', imagen: '' },
    ],
    'box-mix-caja-chica': [
        { nombre: 'Conitos de chocolate y DDL', imagen: '' },
        { nombre: 'Trufas de coco / brigadeiros', imagen: '' },
        { nombre: 'Trufas de chocolate con brownie', imagen: '' },
        { nombre: 'Danesas', imagen: '' },
        { nombre: 'Cookies red velvet', imagen: '' },
        { nombre: 'Lunetts', imagen: '' },
    ],
    'box-mix-caja-grande': [
        { nombre: 'Conitos de chocolate y DDL', imagen: '' },
        { nombre: 'Trufas de coco / brigadeiros', imagen: '' },
        { nombre: 'Trufas de chocolate con brownie', imagen: '' },
        { nombre: 'Danesas', imagen: '' },
        { nombre: 'Cookies red velvet', imagen: '' },
        { nombre: 'Lunetts', imagen: '' },
    ],
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
    'combo-1': [
        { nombre: '6 Cookies decoradas', imagen: '' },
        { nombre: '6 Cakepops', imagen: '' },
        { nombre: '6 Oreos decoradas', imagen: '' },
        { nombre: '4 Paletas', imagen: '' },
    ],
    'combo-2': [
        { nombre: '6 Cookies decoradas', imagen: '' },
        { nombre: '6 Cakepops', imagen: '' },
        { nombre: '6 Oreos decoradas', imagen: '' },
        { nombre: '6 Paletas', imagen: '' },
        { nombre: '6 Cupcakes', imagen: '' },
    ],
    'combo-3': [
        { nombre: '12 Cookies decoradas', imagen: '' },
        { nombre: '12 Cakepops', imagen: '' },
        { nombre: '12 Oreos decoradas', imagen: '' },
        { nombre: '6 Paletas', imagen: '' },
        { nombre: '12 Cupcakes', imagen: '' },
        { nombre: '12 Chocolates', imagen: '' },
    ],
    'desayuno-domicilio': [
        { nombre: 'Taza', imagen: '' },
        { nombre: 'Box de desayunitos', imagen: '' },
        { nombre: '4 cuadraditos dulces', imagen: '' },
        { nombre: '4 patisserie', imagen: '' },
        { nombre: '2 medialunitas con JYQ', imagen: '' },
        { nombre: 'Chipacitos', imagen: '' },
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
            { nombre: 'Criollito capresse', imagen: 'criollito-capresse.jpg' },
            { nombre: 'Sconcito de crudo y rúcula', imagen: 'scon-de-crudo.jpg' },
            { nombre: 'Figacita de peceto, lechuga y tomate', imagen: 'pecetito.jpg' },
        ]},
        { titulo: 'Parte Caliente', items: [
            { nombre: 'Pinchos de pollo y panceta', imagen: 'pinchos-de-pollo-crispy.jpg' },
            { nombre: 'Figacita de bondiola, queso fresco y salsa malbec', imagen: 'empanadas.jpg' },
            { nombre: 'Canastitas de espinaca', imagen: 'canastitas-de-espinaca.jpg' },
            { nombre: 'Roll de masa philo con jamón y queso', imagen: 'roll-de-masa-philo.jpg' },
            { nombre: 'Figacita de roast beef tiernizado, cheddar y cebolla caramelizada', imagen: 'roast-beef.jpg' },
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
    if (filename.startsWith('http')) return filename;
    if (filename.startsWith('/')) return filename;
    return `../productos/${filename}`;
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
    let items = product.items || PRODUCT_ITEMS[docId] || [];
    // Si en Firebase quedó guardado un único ítem "placeholder" (ej: el mismo
    // nombre del producto) pero tenemos el listado real completo, mostramos
    // ese listado completo para poder editarlo. Al guardar se persiste en Firebase.
    const fallbackItems = PRODUCT_ITEMS[docId];
    if (items.length <= 1 && fallbackItems && fallbackItems.length > items.length) {
        items = fallbackItems;
    }
    if (sections.length > 0) return renderEventoCard(product, collectionId, sections);
    // Las colecciones "compuestas" siempre se editan como grouped, aunque
    // todavía no tengan ítems cargados (permite agregar el primero desde cero).
    if (items.length > 0 || GROUPED_COLLECTIONS.includes(collectionId)) return renderGroupedCard(product, collectionId, items);
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

// Markup de un sub-ítem (nombre + imagen) editable, usado en cards grouped/evento
// y al agregar nuevos ítems dinámicamente.
function fbSubitemHtml(item = {}) {
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
            <div class="fb-subitem__fields">
                <input class="fb-input fb-item-nombre" type="text" value="${itemNombre}" placeholder="Nombre del ítem">
                <input class="fb-input fb-item-imagen" type="text" value="${itemImagen}" placeholder="imagen.jpg" oninput="gestionPreviewSubImg(this)">
            </div>
            <button type="button" class="fb-subitem__remove" onclick="gestionRemoveSubitem(this)" title="Eliminar ítem">🗑️</button>
        </div>`;
}

// Agrega un nuevo sub-ítem vacío y editable a la grilla más cercana
window.gestionAddSubitem = function(button) {
    const grid = button.previousElementSibling;
    if (!grid || !grid.classList.contains('fb-subitems-grid')) return;
    grid.insertAdjacentHTML('beforeend', fbSubitemHtml());
    const newInput = grid.lastElementChild.querySelector('.fb-item-nombre');
    if (newInput) newInput.focus();
};

// Quita un sub-ítem de la grilla (no persiste hasta tocar "Guardar")
window.gestionRemoveSubitem = function(button) {
    button.closest('.fb-subitem')?.remove();
};

function renderGroupedCard(product, collectionId, items) {
    const docId = product.docId;
    const nombre = (product.nombre || '').replace(/"/g, '&quot;');
    const unidad = product.unidad || '';
    const precio = product.precio || '';

    const itemsHtml = items.map(item => fbSubitemHtml(item)).join('');

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
        <button type="button" class="fb-btn-add-item" onclick="gestionAddSubitem(this)">+ Agregar ítem</button>
    </div>`;
}

function renderEventoCard(product, collectionId, sections) {
    const docId = product.docId;
    const nombre = (product.nombre || '').replace(/"/g, '&quot;');

    const sectionsHtml = sections.map(section => {
        const titulo = section.titulo || '';
        const sectionItems = (section.items || []).map(item => fbSubitemHtml(item)).join('');

        return `
        <div class="fb-section" data-section-titulo="${titulo.replace(/"/g, '&quot;')}">
            <div class="fb-section__title">${titulo}</div>
            <div class="fb-subitems-grid">
                ${sectionItems}
            </div>
            <button type="button" class="fb-btn-add-item" onclick="gestionAddSubitem(this)">+ Agregar ítem</button>
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

    if (collectionId === '__envio__') {
        await loadEnvioPanel();
        return;
    }
    await loadCollectionProducts(collectionId);
};

window.loadEnvioPanel = async function() {
    const container = document.getElementById('firebaseProductsContainer');
    container.innerHTML = '<div class="loading">Cargando precios de envío...</div>';

    const DEFAULTS = {
        'san-isidro':    { nombre: 'San Isidro',    costo: 6000,  freeMin: 500000 },
        'acasusso':      { nombre: 'Acasusso',       costo: 6000,  freeMin: 500000 },
        'martinez':      { nombre: 'Martínez',       costo: 6000,  freeMin: 500000 },
        'beccar':        { nombre: 'Beccar',          costo: 6000,  freeMin: 500000 },
        'villa-adelina': { nombre: 'Villa Adelina',  costo: 12000, freeMin: 900000 },
        'boulogne':      { nombre: 'Boulogne',        costo: 12000, freeMin: 900000 },
        'san-fernando':  { nombre: 'San Fernando',   costo: 12000, freeMin: 900000 },
        'olivos':        { nombre: 'Olivos',          costo: 12000, freeMin: 900000 },
        'vicente-lopez': { nombre: 'Vicente López',  costo: 12000, freeMin: 900000 },
        'tigre':         { nombre: 'Tigre',           costo: 12000, freeMin: 900000 },
        'nordelta':      { nombre: 'Nordelta',        costo: 20000, freeMin: 1000000 },
        'otra':          { nombre: 'Otra zona',       costo: 'consultar', freeMin: null }
    };

    let zonas = { ...DEFAULTS };
    try {
        const doc = await db.collection('admin_config').doc('envio').get();
        if (doc.exists && doc.data().zonas) zonas = doc.data().zonas;
    } catch(e) { /* usa defaults */ }

    const buildRow = (key, z) => {
        const esConsultar = z.costo === 'consultar';
        return `
        <tr data-key="${key}">
          <td style="padding:8px">
            <input type="text" class="genvio-nombre" data-key="${key}" value="${z.nombre || key}"
              style="width:150px;padding:6px 8px;border:1px solid var(--gris-medio);border-radius:8px;font-size:14px">
          </td>
          <td style="padding:6px 8px">
            ${esConsultar
              ? `<label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                   <input type="checkbox" class="genvio-consultar" data-key="${key}" checked> A consultar
                 </label>`
              : `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                   <span>$</span>
                   <input type="number" class="genvio-costo" data-key="${key}" value="${z.costo}" min="0" step="100"
                     style="width:100px;padding:6px 8px;border:1px solid var(--gris-medio);border-radius:8px;font-size:14px">
                   <label style="display:flex;align-items:center;gap:4px;font-size:13px;color:#888;white-space:nowrap">
                     <input type="checkbox" class="genvio-consultar" data-key="${key}"> A consultar
                   </label>
                 </div>`}
          </td>
          <td style="padding:6px 8px">
            ${esConsultar
              ? `<span style="color:#aaa">—</span>`
              : `<div style="display:flex;align-items:center;gap:4px">
                   <span>$</span>
                   <input type="number" class="genvio-freemin" data-key="${key}" value="${z.freeMin ?? ''}" min="0" step="1000"
                     style="width:120px;padding:6px 8px;border:1px solid var(--gris-medio);border-radius:8px;font-size:14px">
                 </div>`}
          </td>
          <td style="padding:6px 8px;text-align:center">
            <button onclick="genvioEliminar('${key}')" style="background:#c0392b;color:#fff;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:14px">🗑️</button>
          </td>
        </tr>`;
    };

    window._genvioZonas = zonas;

    const renderTabla = () => {
        const rows = Object.entries(window._genvioZonas)
            .sort(([,a],[,b]) => {
                const ca = a.costo === 'consultar' ? Infinity : Number(a.costo);
                const cb = b.costo === 'consultar' ? Infinity : Number(b.costo);
                return ca - cb;
            })
            .map(([k,z]) => buildRow(k,z)).join('');
        container.innerHTML = `
          <div style="padding:8px 0 24px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <h3 style="margin:0">Precios de envío</h3>
              <button class="btn-primary" onclick="genvioMostrarFormNuevo()">+ Agregar localidad</button>
            </div>
            <p style="color:#888;font-size:14px;margin-bottom:16px">Modificá el costo y el mínimo para envío gratis por zona.</p>
            <div id="genvioNuevoForm" style="display:none;background:#f8f4f0;border:1px solid var(--gris-medio);border-radius:12px;padding:16px;margin-bottom:20px">
              <h4 style="margin:0 0 12px">Nueva localidad</h4>
              <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end">
                <div style="display:flex;flex-direction:column;gap:4px">
                  <label style="font-size:13px;color:#666">Nombre</label>
                  <input type="text" id="genvioNlNombre" placeholder="ej: San Isidro"
                    style="padding:8px 10px;border:1px solid var(--gris-medio);border-radius:8px;font-size:14px;width:160px">
                </div>
                <div style="display:flex;flex-direction:column;gap:4px">
                  <label style="font-size:13px;color:#666">Costo ($)</label>
                  <input type="number" id="genvioNlCosto" placeholder="ej: 8000" min="0" step="100"
                    style="padding:8px 10px;border:1px solid var(--gris-medio);border-radius:8px;font-size:14px;width:110px">
                </div>
                <div style="display:flex;flex-direction:column;gap:4px">
                  <label style="font-size:13px;color:#666">Mínimo gratis ($)</label>
                  <input type="number" id="genvioNlFreeMin" placeholder="ej: 500000" min="0" step="1000"
                    style="padding:8px 10px;border:1px solid var(--gris-medio);border-radius:8px;font-size:14px;width:130px">
                </div>
                <div style="display:flex;gap:8px">
                  <button class="btn-primary" onclick="genvioConfirmarNuevo()">Agregar</button>
                  <button class="btn-secondary" onclick="document.getElementById('genvioNuevoForm').style.display='none'">Cancelar</button>
                </div>
              </div>
            </div>
            <div style="overflow-x:auto">
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <thead>
                  <tr style="background:#f8f4f0;border-bottom:2px solid var(--gris-medio)">
                    <th style="text-align:left;padding:10px 8px;color:#888;font-weight:600">Localidad</th>
                    <th style="text-align:left;padding:10px 8px;color:#888;font-weight:600">Costo de envío</th>
                    <th style="text-align:left;padding:10px 8px;color:#888;font-weight:600">Mínimo envío gratis</th>
                    <th style="text-align:center;padding:10px 8px;color:#888;font-weight:600">Eliminar</th>
                  </tr>
                </thead>
                <tbody id="genvioBody">${rows}</tbody>
              </table>
            </div>
            <div style="margin-top:24px;display:flex;align-items:center;gap:12px">
              <button class="btn-primary" onclick="genvioGuardar()">Guardar cambios</button>
              <span id="genvioMsg" style="font-size:14px;color:green;display:none">✓ Guardado correctamente</span>
            </div>
          </div>`;

        // checkboxes re-render
        document.querySelectorAll('.genvio-consultar').forEach(chk => {
            chk.onchange = () => { renderTabla(); };
        });
    };

    window.genvioMostrarFormNuevo = () => {
        document.getElementById('genvioNuevoForm').style.display = 'block';
    };

    window.genvioConfirmarNuevo = () => {
        const nombre = document.getElementById('genvioNlNombre').value.trim();
        if (!nombre) { alert('Ingresá el nombre de la localidad'); return; }
        const key = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
        if (window._genvioZonas[key]) { alert('Ya existe una localidad con ese nombre'); return; }
        const costo = Number(document.getElementById('genvioNlCosto').value) || 0;
        const freeMin = Number(document.getElementById('genvioNlFreeMin').value) || 0;
        window._genvioZonas[key] = { nombre, costo, freeMin };
        renderTabla();
    };

    window.genvioEliminar = (key) => {
        if (!confirm(`¿Eliminar "${window._genvioZonas[key]?.nombre || key}"?`)) return;
        delete window._genvioZonas[key];
        renderTabla();
    };

    window.genvioGuardar = async () => {
        // Leer valores actuales
        document.querySelectorAll('.genvio-nombre').forEach(el => {
            const k = el.dataset.key;
            if (window._genvioZonas[k]) window._genvioZonas[k].nombre = el.value.trim() || k;
        });
        document.querySelectorAll('.genvio-costo').forEach(el => {
            const k = el.dataset.key;
            if (window._genvioZonas[k]) window._genvioZonas[k].costo = Number(el.value) || 0;
        });
        document.querySelectorAll('.genvio-freemin').forEach(el => {
            const k = el.dataset.key;
            if (window._genvioZonas[k]) window._genvioZonas[k].freeMin = Number(el.value) || 0;
        });
        document.querySelectorAll('.genvio-consultar:checked').forEach(chk => {
            const k = chk.dataset.key;
            if (window._genvioZonas[k]) {
                window._genvioZonas[k].costo = 'consultar';
                window._genvioZonas[k].freeMin = null;
            }
        });

        const btn = document.querySelector('[onclick="genvioGuardar()"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
        try {
            await db.collection('admin_config').doc('envio').set({ zonas: window._genvioZonas });
            const msg = document.getElementById('genvioMsg');
            if (msg) { msg.style.display = 'inline'; setTimeout(() => msg.style.display = 'none', 3000); }
        } catch(e) {
            alert('Error al guardar: ' + e.message);
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Guardar cambios'; }
    };

    renderTabla();
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
                const itemNombre = sub.querySelector('.fb-item-nombre').value.trim();
                const itemImagen = sub.querySelector('.fb-item-imagen').value.trim();
                if (!itemNombre && !itemImagen) return; // descarta filas vacías sin guardar
                items.push({ nombre: itemNombre, imagen: itemImagen });
            });
            updateData = { nombre, precio, items };
            if (unidad) updateData.unidad = unidad;

        } else if (type === 'evento') {
            const sections = [];
            card.querySelectorAll('.fb-section').forEach(sectionEl => {
                const items = [];
                sectionEl.querySelectorAll('.fb-subitem').forEach(sub => {
                    const itemNombre = sub.querySelector('.fb-item-nombre').value.trim();
                    const itemImagen = sub.querySelector('.fb-item-imagen').value.trim();
                    if (!itemNombre && !itemImagen) return; // descarta filas vacías sin guardar
                    items.push({ nombre: itemNombre, imagen: itemImagen });
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
    const uploadUrl = '/upload-image.php';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
        const user = firebase.auth().currentUser;
        if (!user) throw new Error('Sesion de admin no iniciada');
        const token = await user.getIdToken();
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
            signal: controller.signal
        });
        clearTimeout(timer);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Error al subir la imagen');
        }
        return await response.json(); // { success, filename }
    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') throw new Error('Tiempo de espera agotado al subir la imagen (30 s)');
        throw err;
    }
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

let solicitudesFiltro = 'all';
let todasLasSolicitudes = [];
let clientesVipSolicitudes = [];
const solicitudesAprobando = new Set();

const _normTel = t => (t || '').replace(/\D/g, '').slice(-8);
const _isVip   = tel => tel && clientesVipSolicitudes.some(v => _normTel(v.telefono) && _normTel(v.telefono) === _normTel(tel));
const safeDocId = id => String(id || '').replace(/[^a-zA-Z0-9_-]/g, '_');
const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

async function loadSolicitudes() {
    const container = document.getElementById('solicitudesContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading">Cargando solicitudes...</div>';
    try {
        const [snapSol, snapVip] = await Promise.all([
            db.collection('solicitudes').orderBy('createdAt', 'desc').get(),
            db.collection('admin_clientes_vip').get().catch(() => ({ docs: [] }))
        ]);
        todasLasSolicitudes    = snapSol.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        clientesVipSolicitudes = snapVip.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        await sincronizarServiciosSolicitudesAprobadas();
        await sincronizarPagosPedidosAnteriores();
        renderSolicitudes();
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><p>Error cargando solicitudes: ${err.message}</p></div>`;
    }
}

async function obtenerProximoNumeroServicio() {
    const snap = await db.collection('admin_servicios').get();
    const numeros = snap.docs.map(doc => Number(doc.data().numero || 0));
    return numeros.length ? Math.max(...numeros) + 1 : 1;
}

async function cargarProductosAdminParaVinculos() {
    const snap = await db.collection('admin_productos').get().catch(() => ({ docs: [] }));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function resolverProductoAdminDesdeWeb(productoWeb, productosAdmin) {
    const webId = productoWeb.id || productoWeb.docId || productoWeb.productId || '';
    const webCollection = productoWeb.collectionName || productoWeb.collection || productoWeb.collectionId || productoWeb.coleccion || '';
    if (!webId) return null;

    return productosAdmin.find(prod => {
        const vinculo = prod.webVinculo || prod.productoGestionVinculo || prod.gestionVinculo;
        if (!vinculo) return false;
        const sameDoc = vinculo.docId === webId || vinculo.id === webId || vinculo.productId === webId;
        const sameCollection = !webCollection || !vinculo.collection || vinculo.collection === webCollection;
        return sameDoc && sameCollection;
    }) || null;
}

async function armarItemsServicioDesdeProductos(productos) {
    const productosAdmin = await cargarProductosAdminParaVinculos();
    return (productos || []).map(p => {
        const cantidad = Number(p.quantity || p.cantidad || 0);
        const precio = Number(p.price || p.precio || 0);
        const unidades = p.unit === 'doc.' ? cantidad * (p.batchSize || 12) : cantidad;
        const subtotal = Math.round(cantidad * precio);
        const adminProducto = resolverProductoAdminDesdeWeb(p, productosAdmin);
        const costoUnitario = adminProducto
            ? Math.round((adminProducto.precioCoste || 0) / (adminProducto.personas || 1))
            : 0;
        const webCollection = p.collectionName || p.collection || p.collectionId || p.coleccion || '';
        return {
            tipo: 'producto',
            id: adminProducto?.id || p.id || '',
            nombre: adminProducto?.nombre || (p.name || p.nombre || 'Producto').replace(/\s*[–-]\s*x\d+\s*$/i, '').trim(),
            cantidad: unidades,
            bocados: unidades,
            bocadosUnitarios: 1,
            precioUnitario: unidades > 0 ? Math.round(subtotal / unidades) : precio,
            subtotal,
            costoAjustado: Math.round(costoUnitario * unidades),
            curso: 'Otro',
            unit: p.unit || 'u.',
            batchSize: p.batchSize || 1,
            webProductoId: p.id || p.docId || null,
            webCollection,
            webVinculo: adminProducto?.webVinculo || null,
            productoVinculado: !!adminProducto
        };
    });
}

async function crearServicioDesdeSolicitud(solicitud, orderId) {
    if (!solicitud || !solicitud.id) throw new Error('Solicitud inválida');
    if (solicitud.serviceId) return solicitud.serviceId;

    const serviceRef = db.collection('admin_servicios').doc(`solicitud_${safeDocId(solicitud.id)}`);
    const serviceDoc = await serviceRef.get();
    if (serviceDoc.exists) {
        const serviceId = serviceDoc.id;
        if (orderId) await db.collection('orders').doc(orderId).update({ serviceId, actualizadoEn: firebase.firestore.FieldValue.serverTimestamp() });
        await db.collection('solicitudes').doc(solicitud.id).update({ serviceId, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        solicitud.serviceId = serviceId;
        return serviceId;
    }

    const existente = await db.collection('admin_servicios')
        .where('solicitudId', '==', solicitud.id)
        .limit(1)
        .get();

    if (!existente.empty) {
        const serviceId = existente.docs[0].id;
        if (orderId) await db.collection('orders').doc(orderId).update({ serviceId, actualizadoEn: firebase.firestore.FieldValue.serverTimestamp() });
        await db.collection('solicitudes').doc(solicitud.id).update({ serviceId, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        solicitud.serviceId = serviceId;
        return serviceId;
    }

    const items = await armarItemsServicioDesdeProductos(solicitud.productos || []);
    const subtotal = solicitud.subtotal || items.reduce((acc, item) => acc + (item.subtotal || 0), 0);
    const costoProductos = items.reduce((acc, item) => acc + (item.costoAjustado || 0), 0);
    const costoEnvio = solicitud.costoEnvio === 'consultar' ? 0 : Number(solicitud.costoEnvio || 0);
    const total = solicitud.total || subtotal + costoEnvio;
    const numero = await obtenerProximoNumeroServicio();
    const serviceData = {
        numero,
        fecha: new Date().toISOString().slice(0, 10),
        estado: 'confirmado',
        estadoPago: 'sin_pago',
        tipoServicio: 'pedido',
        tipoPedido: 'Pedido',
        tipoEvento: solicitud.tipoEntrega === 'retiro' ? 'Retiro' : 'Entrega',
        fechaEvento: solicitud.fecha || null,
        horaEvento: solicitud.horario || null,
        personas: 0,
        sabor: null,
        solicitudId: solicitud.id,
        orderId: orderId || solicitud.orderId || null,
        codigoPedido: solicitud.codigo || null,
        total: Math.round(total || 0),
        subtotal: Math.round(subtotal || 0),
        costoEnvio: solicitud.costoEnvio ?? 0,
        costo: Math.round(costoProductos),
        costoEstimado: Math.round(costoProductos),
        costoInsumos: Math.round(costoProductos),
        insumos: [],
        items,
        productos: solicitud.productos || [],
        notas: solicitud.nota || '',
        cliente: {
            nombre: solicitud.nombre || '',
            telefono: solicitud.telefono || '',
            email: solicitud.email || '',
            direccion: solicitud.direccion || '',
            localidad: solicitud.localidad || '',
            esVip: solicitud.esVip || _isVip(solicitud.telefono)
        },
        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
    };

    await serviceRef.set(serviceData, { merge: false });
    const serviceId = serviceRef.id;

    const updates = {
        serviceId,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('solicitudes').doc(solicitud.id).update(updates);
    if (orderId) {
        await db.collection('orders').doc(orderId).update({
            serviceId,
            fechaEntrega: solicitud.fecha || null,
            horario: solicitud.horario || null,
            actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    solicitud.serviceId = serviceId;
    return serviceId;
}

async function sincronizarServiciosSolicitudesAprobadas() {
    const aprobadasSinServicio = todasLasSolicitudes.filter(s =>
        ['approved', 'paid'].includes(s.status) && !s.serviceId
    );
    for (const solicitud of aprobadasSinServicio) {
        try {
            await crearServicioDesdeSolicitud(solicitud, solicitud.orderId || null);
        } catch (err) {
            console.warn('No se pudo crear servicio para solicitud', solicitud.id, err);
        }
    }
}

function esOrdenPagada(order) {
    const status = String(order.status || '').toLowerCase();
    const paymentStatus = String(order.paymentStatus || '').toLowerCase();
    return ['paid', 'pagado', 'approved', 'aprobado'].includes(status)
        || ['approved', 'paid', 'pagado', 'aprobado'].includes(paymentStatus);
}

async function crearServicioDesdeOrden(order) {
    if (!order || !order.id) throw new Error('Orden inválida');
    if (order.serviceId) return order.serviceId;

    const existente = await db.collection('admin_servicios')
        .where('orderId', '==', order.id)
        .limit(1)
        .get();

    if (!existente.empty) {
        const serviceId = existente.docs[0].id;
        await db.collection('orders').doc(order.id).update({
            serviceId,
            actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        });
        return serviceId;
    }

    const productos = order.productos || order.items || [];
    const solicitudLike = {
        id: order.solicitudId || order.id,
        nombre: order.cliente?.nombre || order.customer?.nombre || order.customer?.name || 'Cliente',
        email: order.cliente?.email || order.customer?.email || '',
        telefono: order.cliente?.telefono || order.customer?.telefono || order.customer?.phone || '',
        direccion: order.direccion || order.direccionEnvio?.calle || order.cliente?.direccion || '',
        localidad: order.localidad || order.direccionEnvio?.ciudad || order.cliente?.localidad || '',
        tipoEntrega: order.tipoEntrega || 'envio',
        fecha: order.fechaEntrega || order.fechaPedido || (order.fecha ? String(order.fecha).slice(0, 10) : new Date().toISOString().slice(0, 10)),
        horario: order.horario || null,
        nota: order.nota || '',
        productos: productos.map(p => ({
            id: p.id || '',
            name: p.name || p.nombre || p.title || 'Producto',
            price: p.price || p.precio || p.unit_price || 0,
            quantity: p.quantity || p.cantidad || 1,
            unit: p.unit || 'u.',
            batchSize: p.batchSize || 1
        })),
        subtotal: order.subtotal || 0,
        costoEnvio: order.costoEnvio ?? 0,
        total: order.total || order.subtotal || 0,
        codigo: order.codigoPedido || order.orderId || order.id,
        esVip: false
    };

    if (order.solicitudId) {
        const solicitud = todasLasSolicitudes.find(s => s.id === order.solicitudId);
        if (solicitud) return crearServicioDesdeSolicitud(solicitud, order.id);
    }

    return crearServicioDesdeSolicitud(solicitudLike, order.id);
}

async function registrarPagoAnteriorDesdeOrden(order, serviceId) {
    if (!serviceId || !esOrdenPagada(order)) return;

    const paymentId = order.paymentId || order.payment_id || order.preferenceId || order.id;
    const pagoId = paymentId
        ? `mp_${String(paymentId).replace(/[^a-zA-Z0-9_-]/g, '_')}`
        : `order_${order.id}`;

    const pagoDoc = await db.collection('admin_pagos').doc(pagoId).get();
    if (pagoDoc.exists) return;

    const total = Math.round(Number(order.total || order.subtotal || 0));
    if (!total) return;

    await db.collection('admin_pagos').doc(pagoId).set({
        servicioId,
        servicioNumero: null,
        orderId: order.id,
        solicitudId: order.solicitudId || null,
        paymentId: paymentId || null,
        fecha: new Date().toISOString().slice(0, 10),
        monto: total,
        medioPago: 'MercadoPago',
        notas: 'Pago migrado automáticamente desde orden anterior',
        origen: 'mercadopago',
        creadoEn: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await db.collection('admin_servicios').doc(serviceId).update({
        estadoPago: 'completo',
        montoPagado: total,
        paymentStatus: 'approved',
        paymentId: paymentId || null,
        orderId: order.id,
        solicitudId: order.solicitudId || null,
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
}

async function sincronizarPagosPedidosAnteriores() {
    try {
        const snap = await db.collection('orders').get();
        for (const doc of snap.docs) {
            const order = { id: doc.id, ...doc.data() };
            if (!order.solicitudId && !esOrdenPagada(order)) continue;

            let serviceId = order.serviceId || null;
            if (!serviceId) {
                serviceId = await crearServicioDesdeOrden(order);
            }

            if (esOrdenPagada(order)) {
                await registrarPagoAnteriorDesdeOrden(order, serviceId);
            }
        }
    } catch (err) {
        console.warn('No se pudieron sincronizar pagos/pedidos anteriores', err);
    }
}

function filtrarSolicitudes(filtro, ev) {
    solicitudesFiltro = filtro;
    document.querySelectorAll('.solicitud-filtro').forEach(b => b.classList.remove('active'));
    if (ev?.target) ev.target.classList.add('active');
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
        const statusSeguro = ['pending', 'approved', 'paid', 'rejected'].includes(s.status) ? s.status : 'pending';
        // Recalcular total desde productos por si quedó guardado en $0
        const recalcSubtotal = (s.productos || []).reduce((acc, p) => acc + (p.quantity || 0) * (p.price || 0), 0);
        const envioNum = (!s.costoEnvio || s.costoEnvio === 'consultar') ? 0 : Number(s.costoEnvio);
        const totalMostrar = (s.total && s.total > 0) ? s.total : (recalcSubtotal + envioNum) || recalcSubtotal;
        const subtotalMostrar = (s.subtotal && s.subtotal > 0) ? s.subtotal : recalcSubtotal;
        const productosHTML = (s.productos || []).map(p => {
            const displayName = (p.name || '').replace(/\s*[–-]\s*x\d+\s*$/i, '').trim();
            const unitPrice = p.price || 0;
            const itemTotal = p.quantity * unitPrice;
            const realUnits = p.unit === 'doc.' ? p.quantity * (p.batchSize || 12) : p.quantity;
            const qtyLabel = `×${realUnits} u.`;
            const priceLabel = unitPrice > 0
                ? (p.unit === 'doc.' ? `$${unitPrice.toLocaleString()} x ${p.batchSize || 12} u.` : `$${unitPrice.toLocaleString()} c/u`)
                : '—';
            return `<tr>
                <td class="col-left">${escapeHtml(displayName)}</td>
                <td class="col-center">${escapeHtml(qtyLabel)}</td>
                <td class="col-right" style="font-weight:600">$${itemTotal.toLocaleString()}</td>
            </tr>`;
        }).join('');
        const envioText = s.costoEnvio === 'consultar' ? 'A consultar' : s.costoEnvio === 0 ? 'Gratis' : `$${(s.costoEnvio||0).toLocaleString()}`;
        const statusLabels = { pending: 'Pendiente', approved: 'Aprobada', paid: 'Pagada', rejected: 'Rechazada' };
        const statusLabel = statusLabels[statusSeguro] || statusSeguro;

        const esVip = s.esVip || _isVip(s.telefono);
        return `
        <div class="order-card solicitud-card${esVip ? ' solicitud-vip' : ''}" id="solicitud-${s.id}">

          <div class="order-header">
            <span class="order-status status-${statusSeguro}">${escapeHtml(statusLabel)}</span>
            ${esVip ? `<span class="sol-vip-badge">⭐ Cliente VIP</span>` : ''}
            <span class="order-date">${fecha}</span>
          </div>

          <div class="sol-section sol-grid">
            <div class="sol-field"><span class="sol-label">Nombre</span><span class="sol-val">${escapeHtml(s.nombre || '—')}${esVip ? ' <span class="sol-vip-inline">⭐</span>' : ''}</span></div>
            <div class="sol-field"><span class="sol-label">Teléfono</span><span class="sol-val">${escapeHtml(s.telefono || '—')}</span></div>
            <div class="sol-field"><span class="sol-label">Email</span><span class="sol-val sol-val--break">${escapeHtml(s.email || '—')}</span></div>
            <div class="sol-field"><span class="sol-label">Localidad</span><span class="sol-val">${escapeHtml(s.localidad || '—')}</span></div>
            <div class="sol-field sol-field--full"><span class="sol-label">Dirección</span><span class="sol-val">${escapeHtml(s.direccion || '—')}</span></div>
          </div>

          <div class="sol-section sol-grid">
            <div class="sol-field">
              <span class="sol-label">📅 Fecha del evento</span>
              <span class="sol-val">${s.fecha ? new Date(s.fecha+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) : '⚠️ No especificada'}</span>
            </div>
            ${s.horario ? `<div class="sol-field"><span class="sol-label">🕐 Horario</span><span class="sol-val">${escapeHtml(s.horario)}</span></div>` : '<div></div>'}
            ${s.nota ? `<div class="sol-field sol-field--full"><span class="sol-label">📝 Nota</span><span class="sol-val">${escapeHtml(s.nota)}</span></div>` : ''}
          </div>

          <div class="sol-section">
            <span class="sol-label">Productos</span>
            <table class="sol-table">
              <thead>
                <tr>
                  <th class="col-left">Producto</th>
                  <th class="col-center">Cantidad</th>
                  <th class="col-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>${productosHTML}</tbody>
            </table>
          </div>

          <div class="sol-totals">
            <span class="sol-total-item">
              <span class="sol-label">Subtotal</span>
              <strong>$${subtotalMostrar.toLocaleString('es-AR')}</strong>
            </span>
            <span class="sol-total-item">
              <span class="sol-label">Envío</span>
              <strong>${envioText}</strong>
            </span>
            <span class="sol-total-item sol-total-item--highlight">
              <span class="sol-label">Total</span>
              <strong>$${totalMostrar.toLocaleString('es-AR')}</strong>
            </span>
          </div>

          ${statusSeguro === 'pending' ? `
          <div class="sol-actions">
            <a href="https://wa.me/54${(s.telefono||'').replace(/\D/g,'')}" target="_blank" class="btn-secondary sol-btn-wa">💬 WhatsApp</a>
            <button class="btn-rechazar" onclick="rechazarSolicitud('${s.id}')">Rechazar</button>
            <button class="btn-aprobar" onclick="aprobarSolicitud('${s.id}')">✓ Aprobar</button>
          </div>` : ''}

        </div>`;
    }).join('');
}

async function aprobarSolicitud(id, email, nombre) {
    if (solicitudesAprobando.has(id)) return;
    const solicitudLocal = todasLasSolicitudes.find(s => s.id === id);
    nombre = nombre || solicitudLocal?.nombre || 'este cliente';
    if (!confirm(`¿Aprobar solicitud de ${nombre}?`)) return;

    solicitudesAprobando.add(id);
    const card = document.getElementById(`solicitud-${id}`);
    const btnAprobar = card?.querySelector('.btn-aprobar');
    if (btnAprobar) {
        btnAprobar.disabled = true;
        btnAprobar.textContent = 'Aprobando...';
    }

    try {
        const solicitudRef = db.collection('solicitudes').doc(id);
        const defaultOrderRef = db.collection('orders').doc(`solicitud_${safeDocId(id)}`);
        let solicitud = null;
        let orderId = null;
        let yaEstabaAprobada = false;

        await db.runTransaction(async transaction => {
            const solicitudSnap = await transaction.get(solicitudRef);
            if (!solicitudSnap.exists) throw new Error('Solicitud no encontrada');

            solicitud = { id, ...solicitudSnap.data() };
            nombre = solicitud.nombre || nombre;
            const statusActual = String(solicitud.status || '').toLowerCase();
            orderId = solicitud.orderId || defaultOrderRef.id;
            yaEstabaAprobada = ['approved', 'paid'].includes(statusActual) && !!solicitud.orderId;

            if (yaEstabaAprobada) return;

            const orderRef = db.collection('orders').doc(orderId);

            const orden = {
                solicitudId: id,
                cliente: {
                    nombre:    solicitud.nombre    || '',
                    email:     solicitud.email     || '',
                    telefono:  solicitud.telefono  || '',
                    direccion: solicitud.direccion || '',
                    localidad: solicitud.localidad || ''
                },
                fechaPedido:  solicitud.fecha      || null,
                fechaEntrega: solicitud.fecha      || null,
                horario:      solicitud.horario    || null,
                nota:         solicitud.nota       || null,
                productos:    solicitud.productos  || [],
                subtotal:     solicitud.subtotal   || 0,
                costoEnvio:   solicitud.costoEnvio ?? 0,
                total:        solicitud.total      || solicitud.subtotal || 0,
                status:       'approved',
                createdAt:    firebase.firestore.FieldValue.serverTimestamp(),
                actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
            };

            transaction.set(orderRef, orden, { merge: true });
            transaction.update(solicitudRef, {
                status: 'approved',
                orderId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        const serviceId = await crearServicioDesdeSolicitud(solicitud, orderId);

        await solicitudRef.update({
            serviceId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Notificar al cliente por WhatsApp solo cuando esta acción hizo la aprobación.
        const tel = (solicitud.telefono || '').replace(/\D/g, '');
        if (tel && !yaEstabaAprobada) {
            const productosList = (solicitud.productos || []).map(p => {
                const realQty = p.unit === 'doc.' ? p.quantity * (p.batchSize || 12) : p.quantity;
                return `- ${(p.name||'').replace(/\s*[–-]\s*x\d+\s*$/i,'').trim()}: ×${realQty} u.`;
            }).join('\n');
            const carritoUrl = `https://cococatering.com.ar/html/carrito`;
            const codigoPedido = solicitud.codigo || `#${id.slice(0,8).toUpperCase()}`;
            const msg = [
                ` *PEDIDO APROBADO — Cocó Catering*`,
                ``,
                `¡Hola ${nombre}! Tu solicitud fue *aprobada* `,
                ``,
                productosList,
                ``,
                `*Código de pedido:* ${codigoPedido}`,
                ``,
                `Para continuar con la compra, ingresá al carrito y tocá *"Ver mis pedidos"*. Vas a necesitar tu *email* y el *código de pedido* de arriba.`,
                `🛒 ${carritoUrl}`,
                ``,
                `¡Gracias por elegirnos! `,
            ].join('\n');
            const waUrl = `https://wa.me/54${tel}?text=${encodeURIComponent(msg)}`;
            window.open(waUrl, '_blank');
        }

        alert(yaEstabaAprobada ? `La solicitud de ${nombre} ya estaba aprobada.` : `Solicitud de ${nombre} aprobada.`);
        loadSolicitudes();
    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        solicitudesAprobando.delete(id);
        if (btnAprobar) {
            btnAprobar.disabled = false;
            btnAprobar.textContent = '✓ Aprobar';
        }
    }
}
window.aprobarSolicitud = aprobarSolicitud;

async function rechazarSolicitud(id, email, nombre) {
    const solicitudLocal = todasLasSolicitudes.find(s => s.id === id);
    nombre = nombre || solicitudLocal?.nombre || 'este cliente';
    if (!confirm(`¿Rechazar solicitud de ${nombre}?`)) return;
    try {
        await db.collection('solicitudes').doc(id).update({ status: 'rejected', updatedAt: new Date() });

        // Notificar al cliente por WhatsApp
        const solicitud = todasLasSolicitudes.find(s => s.id === id);
        const tel = (solicitud?.telefono || '').replace(/\D/g, '');
        if (tel) {
            const msg = [
                `🔴 *PEDIDO NO DISPONIBLE — Cocó Catering*`,
                ``,
                `¡Hola ${nombre}! Lamentablemente no podemos confirmar tu solicitud *#${id.slice(0,8).toUpperCase()}* en esta oportunidad.`,
                ``,
                `Comunicate con nosotros por este medio para más información o para coordinar una alternativa.`,
                ``,
                `¡Muchas gracias por contactarte! 🍽️`,
            ].join('\n');
            const waUrl = `https://wa.me/54${tel}?text=${encodeURIComponent(msg)}`;
            window.open(waUrl, '_blank');
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
