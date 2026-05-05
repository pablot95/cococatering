// Carrito de compras - Cocó Catering

// Obtener carrito del localStorage
function getCart() {
    const raw = localStorage.getItem('cocoCart');
    if (!raw) return [];
    const items = JSON.parse(raw);
    // Migrar items viejos sin campo unit
    let migrated = false;
    items.forEach(item => {
        if (!item.unit) {
            if ((item.min || 1) >= 6) {
                // Item guardado en unidades físicas (ej. quantity=24, min=12) → convertir a docenas
                item.quantity = Math.max(1, Math.ceil(item.quantity / item.min));
                item.unit = 'doc.';
                item.min  = 1;
                item.step = 1;
            } else {
                item.unit = 'u.';
            }
            migrated = true;
        }
    });
    if (migrated) localStorage.setItem('cocoCart', JSON.stringify(items));
    return items;
}

// Guardar carrito en localStorage
function saveCart(cart) {
    localStorage.setItem('cocoCart', JSON.stringify(cart));
    updateCartCount();
}

// Agregar producto al carrito
function addToCart(product) {
    console.log('🛒 addToCart() llamado con:', product);
    const cart = getCart();
    console.log('  📦 Carrito actual:', cart);
    const existingItem = cart.find(item => item.id === product.id);
    
    // Detectar si el producto es de una categoría sin imagen
    const currentPage = window.location.pathname.split('/').pop().toLowerCase();
    const imagelessPages = ['desayunos.html', 'combos-dulces.html', 'box-dulces.html', 'box-salados.html'];
    const showImage = !imagelessPages.includes(currentPage);
    
    if (existingItem) {
        console.log('  ✏️ Producto existente, incrementando cantidad');
        existingItem.quantity += (product.quantity || 1);
        // Actualizar unit si el item viejo no lo tenía
        if (!existingItem.unit && product.unit) existingItem.unit = product.unit;
    } else {
        console.log('  ➕ Producto nuevo, agregando al carrito');
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price || 0,
            image: product.image,
            showImage: showImage,
            quantity: product.quantity || 1,
            unit: product.unit || 'u.',
            min: product.min || 1,
            step: product.step || 1
        });
    }
    
    saveCart(cart);
    console.log('  💾 Carrito guardado:', cart);
    showCartNotification('Producto agregado al carrito');
}

// Remover producto del carrito
function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    renderCart();
}

// Actualizar cantidad
function updateQuantity(productId, change) {
    const cart = getCart();
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        const step = item.step || 1;
        const min  = item.min  || 1;
        if (change > 0) {
            item.quantity += step;
        } else {
            const newQty = item.quantity - step;
            if (newQty < min) {
                removeFromCart(productId);
                return;
            }
            item.quantity = newQty;
        }
        saveCart(cart);
        renderCart();
    }
}

// Actualizar contador del carrito
function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(element => {
        element.textContent = count;
        element.style.display = count > 0 ? 'flex' : 'none';
    });
}

// Renderizar carrito
function renderCart() {
    const cart = getCart();
    console.log('🛒 CARRITO - renderCart() llamado, productos:', cart);
    const cartItemsContainer = document.getElementById('cartItems');
    const emptyCart = document.getElementById('emptyCart');
    
    if (cart.length === 0) {
        console.log('⚠️ CARRITO - Carrito vacío');
        cartItemsContainer.classList.remove('has-items');
        emptyCart.style.display = 'block';
        updateSummary(0);
        return;
    }
    
    console.log('✅ CARRITO - Renderizando', cart.length, 'productos');
    
    cartItemsContainer.classList.add('has-items');
    emptyCart.style.display = 'none';
    
    cartItemsContainer.innerHTML = cart.map(item => {
        // Quitar " – x12" / " – x6" etc. del nombre para mostrar limpio
        const displayName = item.name.replace(/\s*–\s*x\d+\s*$/, '').trim();
        const esPorDocena = item.unit === 'doc.';
        const unitPrice = item.price;
        const itemTotal = item.quantity * item.price;
        const priceDisplay = item.price > 0
            ? `$${unitPrice.toLocaleString()} x ${esPorDocena ? 'doc.' : 'u.'}`
            : 'Consultar';
        const totalDisplay = item.price > 0 ? `$${itemTotal.toLocaleString()}` : '';
        const qtyLabel = esPorDocena ? `×${item.quantity} doc.` : `×${item.quantity}`;
        const imgHtml = item.showImage !== false
            ? `<img src="${item.image}" alt="${displayName}" class="cart-item-image">`
            : '';
        return `
        <div class="cart-item ${item.showImage === false ? 'no-image' : ''}">
            ${imgHtml}
            <div class="cart-item-details">
                <div class="cart-item-name-row">
                    <span class="cart-item-name">${displayName}</span>
                    <button class="cart-qty-btn" onclick="updateQuantity('${item.id}', -1)">−</button>
                    <span class="cart-item-qty">${qtyLabel}</span>
                    <button class="cart-qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
                <p class="item-price">${priceDisplay}</p>
            </div>
            <div class="cart-item-right">
                ${totalDisplay ? `<span class="cart-item-total">${totalDisplay}</span>` : ''}
                <button class="remove-item" onclick="removeFromCart('${item.id}')">Eliminar</button>
            </div>
        </div>`;
    }).join('');
    
    const subtotal = cart.reduce((total, item) => total + item.quantity * item.price, 0);
    updateSummary(subtotal);
}
// ===================================
const SHIPPING_ZONES = {
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

function calculateShipping(localidad, subtotal) {
    if (!localidad) return { costo: null, free: false, message: '' };
    const zone = SHIPPING_ZONES[localidad];
    if (!zone || zone.costo === 'consultar') return { costo: 'consultar', free: false, message: 'Costo de envío a consultar para tu zona' };
    if (subtotal >= zone.freeMin) return { costo: 0, free: true, message: '¡Envío gratis para tu zona! 🎉' };
    const resta = zone.freeMin - subtotal;
    return { costo: zone.costo, free: false, message: `Agregá $${resta.toLocaleString()} más para envío gratis en tu zona` };
}

// Actualizar envío cuando cambia la localidad
function actualizarEnvio() {
    const cart = getCart();
    const subtotal = cart.reduce((total, item) => total + item.quantity * item.price, 0);
    updateSummary(subtotal);
}

// Actualizar resumen
function updateSummary(subtotal) {
    document.getElementById('subtotal').textContent = subtotal > 0 ? `$${subtotal.toLocaleString()}` : '$0';

    const localidadEl = document.getElementById('localidadEnvio');
    const localidad = localidadEl ? localidadEl.value : '';
    const shipping = calculateShipping(localidad, subtotal);

    const envioEl = document.getElementById('envio');
    const msgEl   = document.getElementById('envioMessage');

    if (envioEl) {
        if (!localidad) {
            envioEl.textContent = 'Seleccioná localidad';
            envioEl.style.color = '#777';
        } else if (shipping.costo === 'consultar') {
            envioEl.textContent = 'A consultar';
            envioEl.style.color = '#777';
        } else if (shipping.free) {
            envioEl.textContent = 'Gratis 🎉';
            envioEl.style.color = 'green';
        } else {
            envioEl.textContent = `$${shipping.costo.toLocaleString()}`;
            envioEl.style.color = '#555';
        }
    }

    if (msgEl) {
        msgEl.textContent = shipping.message;
        msgEl.style.color = shipping.free ? 'green' : 'var(--bordo)';
    }

    const costoEnvioNum = (shipping.costo && shipping.costo !== 'consultar') ? shipping.costo : 0;
    const total = subtotal + costoEnvioNum;
    document.getElementById('total').textContent = subtotal > 0 ? `$${total.toLocaleString()}` : '$0';

    const continuarBtn = document.getElementById('continuarCompraBtn');
    if (continuarBtn) continuarBtn.disabled = subtotal === 0;
}


const WHATSAPP_NUMBER = '5491128447772';

function abrirFormularioAprobacion() {
    const cart = getCart();
    if (cart.length === 0) { alert('Tu carrito está vacío'); return; }
    const localidad = document.getElementById('localidadEnvio')?.value;
    if (!localidad) { alert('Por favor seleccioná tu localidad para continuar'); return; }
    document.getElementById('aprobacionModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cerrarFormularioAprobacion() {
    document.getElementById('aprobacionModal').style.display = 'none';
    document.body.style.overflow = '';
}

async function enviarSolicitudAprobacion(event) {
    event.preventDefault();
    const cart = getCart();
    if (cart.length === 0) return;

    const nombre    = document.getElementById('apNombre').value.trim();
    const email     = document.getElementById('apEmail').value.trim();
    const telefono  = document.getElementById('apTelefono').value.trim();
    const direccion = document.getElementById('apDireccion').value.trim();
    const fecha     = document.getElementById('apFecha').value || '';
    const horario   = document.getElementById('apHorario')?.value || '';
    const nota      = document.getElementById('apNota').value.trim() || '';
    const localidad = document.getElementById('localidadEnvio')?.value || '';

    const subtotal   = cart.reduce((t, i) => t + i.quantity * i.price, 0);
    const shipping   = calculateShipping(localidad, subtotal);
    const costoEnvio = (shipping.costo !== 'consultar' && shipping.costo !== null) ? shipping.costo : 0;
    const total      = subtotal + costoEnvio;

    const solicitud = {
        nombre, email, telefono, direccion,
        localidad: localidad || 'No especificada',
        fecha: fecha || null,
        horario: horario || null,
        nota: nota || null,
        productos: cart,
        subtotal,
        costoEnvio: shipping.costo,
        total,
        status: 'pending',
        createdAt: new Date()
    };

    const btnSubmit = document.getElementById('btnEnviarSolicitud');
    const errorEl  = document.getElementById('aprobacionError');
    errorEl.style.display = 'none';

    try {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Enviando...';

        // 1. Guardar en Firestore
        let solicitudId = 'local-' + Date.now();
        if (window.carritoDb) {
            const docRef = await window.carritoDb.collection('solicitudes').add(solicitud);
            solicitudId = docRef.id;
        }

        // 2. Guardar ID en localStorage para «Mis Pedidos»
        const pedidosGuardados = JSON.parse(localStorage.getItem('cocoPedidos') || '[]');
        pedidosGuardados.push({ id: solicitudId, createdAt: new Date().toISOString() });
        localStorage.setItem('cocoPedidos', JSON.stringify(pedidosGuardados));

        // 3. Armar mensaje de WhatsApp
        const fechaFormateada = fecha
            ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            : 'No especificada';

        const productosTexto = cart.map(i => {
            const itemTotal = i.quantity * i.price;
            const displayName = i.name.replace(/\s*–\s*x\d+\s*$/, '').trim();
            const qtyLabel = i.unit === 'doc.' ? `×${i.quantity} doc.` : `×${i.quantity}`;
            return `• ${displayName} ${qtyLabel}${itemTotal > 0 ? ' = $' + itemTotal.toLocaleString() : ''}`;
        }).join('\n');

        const envioTexto = shipping.costo === 'consultar'
            ? 'A consultar'
            : shipping.costo === 0
                ? '¡Gratis! 🎉'
                : `$${shipping.costo.toLocaleString()}`;

        const mensaje = [
            '🍽️ *NUEVA SOLICITUD DE PEDIDO — Cocó Catering*',
            '',
            `*N°:* #${solicitudId.slice(0, 8).toUpperCase()}`,
            `*Nombre:* ${nombre}`,
            `*Teléfono:* ${telefono}`,
            `*Email:* ${email}`,
            `*Dirección:* ${direccion}`,
            `*Localidad:* ${localidad || 'No especificada'}`,
            `*Fecha deseada:* ${fechaFormateada}`,
            horario ? `*Horario preferencial:* ${horario}` : null,
            nota ? `*Nota:* ${nota}` : null,
            '',
            '*PRODUCTOS:*',
            productosTexto,
            '',
            `*Subtotal:* $${subtotal.toLocaleString()}`,
            `*Envío (${localidad || '?'}):* ${envioTexto}`,
            `*TOTAL:* $${total.toLocaleString()}`,
        ].filter(l => l !== null).join('\n');

        const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;

        // 4. Vaciar carrito
        localStorage.removeItem('cocoCart');
        updateCartCount();
        cerrarFormularioAprobacion();

        // 5. Abrir WhatsApp
        window.open(waUrl, '_blank');

        // 6. Mostrar confirmación
        document.getElementById('emptyCart').style.display = 'none';
        const cartItemsEl = document.getElementById('cartItems');
        cartItemsEl.classList.add('has-items');
        cartItemsEl.innerHTML = `
            <div class="solicitud-enviada">
                <div class="solicitud-check">✓</div>
                <h2>¡Solicitud enviada!</h2>
                <p>N° de solicitud: <strong>#${solicitudId.slice(0, 8).toUpperCase()}</strong></p>
                <p>Se abrió WhatsApp con los detalles de tu pedido.<br>
                   Si no se abrió automáticamente, <a href="${waUrl}" target="_blank" rel="noopener">hacé clic aquí</a>.</p>
                <p class="solicitud-next">Te contactaremos a <strong>${telefono}</strong> para confirmar disponibilidad.</p>
                <a href="../index.html" class="btn-volver-inicio">Volver al inicio</a>
            </div>`;
        document.querySelector('.carrito-summary').style.display = 'none';

        // 7. Actualizar sección Mis Pedidos
        await cargarMisPedidos();

    } catch (err) {
        console.error('Error enviando solicitud:', err);
        errorEl.textContent = 'Ocurrió un error. Contactanos por WhatsApp directamente.';
        errorEl.style.display = 'block';
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Enviar Solicitud';
    }
}

// ===================================
// MIS PEDIDOS
// ===================================
async function cargarMisPedidos() {
    const pedidosGuardados = JSON.parse(localStorage.getItem('cocoPedidos') || '[]');
    const seccion = document.getElementById('misPedidosSeccion');
    if (!seccion) return;

    if (pedidosGuardados.length === 0) {
        seccion.style.display = 'none';
        return;
    }

    seccion.style.display = 'block';
    const container = document.getElementById('misPedidosContainer');
    container.innerHTML = '<div class="pedidos-loading">Cargando pedidos...</div>';

    try {
        const pedidos = [];
        for (const p of pedidosGuardados) {
            if (!window.carritoDb || !p.id || p.id.startsWith('local-')) continue;
            try {
                const docSnap = await window.carritoDb.collection('solicitudes').doc(p.id).get();
                if (docSnap.exists) {
                    pedidos.push({ id: docSnap.id, ...docSnap.data() });
                }
            } catch (_) { /* skip */ }
        }

        if (pedidos.length === 0) {
            container.innerHTML = '<p class="pedidos-empty">No se encontraron pedidos.</p>';
            return;
        }

        renderMisPedidos(pedidos, container);
    } catch (err) {
        container.innerHTML = '<p class="pedidos-empty">Error al cargar pedidos.</p>';
    }
}

function renderMisPedidos(pedidos, container) {
    const STATUS = {
        pending:  { label: 'Pendiente de aprobación', icon: '🟡', cls: 'status-pending' },
        approved: { label: 'Aprobado',                icon: '🟢', cls: 'status-approved' },
        rejected: { label: 'Rechazado',               icon: '🔴', cls: 'status-rejected' }
    };

    container.innerHTML = pedidos.map(p => {
        const st    = STATUS[p.status] || STATUS.pending;
        const fecha = p.createdAt?.toDate
            ? p.createdAt.toDate().toLocaleDateString('es-AR')
            : (p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-AR') : 'Hoy');
        const prods = (p.productos || []).map(pr => {
            const n = pr.name.replace(/\s*–\s*x\d+\s*$/, '').trim();
            const qtyLabel = pr.unit === 'doc.' ? `×${pr.quantity} doc.` : `×${pr.quantity}`;
            return `<span class="pedido-prod-tag">${n} ${qtyLabel}</span>`;
        }).join('');

        return `
        <div class="pedido-card ${st.cls}">
            <div class="pedido-card-header">
                <span class="pedido-id">#${p.id.slice(0, 8).toUpperCase()}</span>
                <span class="pedido-badge ${st.cls}">${st.icon} ${st.label}</span>
                <span class="pedido-fecha">${fecha}</span>
            </div>
            <div class="pedido-prods">${prods}</div>
            <div class="pedido-total">Total: <strong>$${(p.total || p.subtotal || 0).toLocaleString()}</strong></div>
            ${p.status === 'approved' ? `
                <div class="pedido-msg aprobado">¡Tu pedido fue aprobado! Ya podés proceder al pago.</div>
                <a href="checkout.html?solicitudId=${p.id}" class="btn-pagar-pedido">💳 Ir al pago</a>` : ''}
            ${p.status === 'rejected' ? `
                <div class="pedido-msg rechazado">Este pedido fue rechazado. Si tenés dudas, contactanos por WhatsApp.</div>
                <a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noopener" class="btn-consultar-wa">💬 Consultar por WhatsApp</a>` : ''}
            ${p.status === 'pending' ? `
                <div class="pedido-msg pendiente">Estamos revisando tu solicitud. Te avisaremos cuando esté aprobada.</div>` : ''}
        </div>`;
    }).join('');
}

// Mostrar notificación (usa la misma función que menu-script.js)
function showCartNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 2000);
}

// Procesar checkout
document.addEventListener('DOMContentLoaded', function() {
    // Si estamos en la página del carrito
    if (window.location.pathname.includes('carrito.html')) {
        renderCart();
        cargarMisPedidos();
    }
    
    updateCartCount();
});

// Agregar estilos para animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);


// ===================================
// EXPORTAR FUNCIONES AL ÁMBITO GLOBAL
// ===================================
window.addToCart = addToCart;
window.getCart = getCart;
window.updateCartCount = updateCartCount;
window.actualizarEnvio = actualizarEnvio;
window.abrirFormularioAprobacion = abrirFormularioAprobacion;
window.cerrarFormularioAprobacion = cerrarFormularioAprobacion;
window.enviarSolicitudAprobacion = enviarSolicitudAprobacion;

console.log('✅ Carrito.js cargado. Funciones exportadas:', {
    addToCart: typeof window.addToCart,
    getCart: typeof window.getCart,
    updateCartCount: typeof window.updateCartCount
});
