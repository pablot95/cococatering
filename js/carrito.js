// Carrito de compras - Cocó Catering

// Obtener carrito del localStorage
function getCart() {
    const cart = localStorage.getItem('cocoCart');
    return cart ? JSON.parse(cart) : [];
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
    } else {
        console.log('  ➕ Producto nuevo, agregando al carrito');
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price || 0,
            image: product.image,
            showImage: showImage,
            quantity: product.quantity || 1,
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
        const min = item.min || 1;
        const unitPrice = Math.round(item.price / min);
        const itemTotal = Math.round((item.quantity / min) * item.price);
        const priceDisplay = item.price > 0 ? `$${unitPrice.toLocaleString()}` : 'Consultar';
        const totalDisplay = item.price > 0 ? `$${itemTotal.toLocaleString()}` : '';
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
                    <span class="cart-item-qty">×${item.quantity}</span>
                    <button class="cart-qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
                <p class="item-price">${priceDisplay} c/u</p>
            </div>
            <div class="cart-item-right">
                ${totalDisplay ? `<span class="cart-item-total">${totalDisplay}</span>` : ''}
                <button class="remove-item" onclick="removeFromCart('${item.id}')">Eliminar</button>
            </div>
        </div>`;
    }).join('');
    
    const subtotal = cart.reduce((total, item) => {
        const min = item.min || 1;
        return total + Math.round((item.quantity / min) * item.price);
    }, 0);
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
    const subtotal = cart.reduce((total, item) => {
        const min = item.min || 1;
        return total + Math.round((item.quantity / min) * item.price);
    }, 0);
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


const EMAILJS_PUBLIC_KEY    = 'TU_PUBLIC_KEY';
const EMAILJS_SERVICE_ID    = 'TU_SERVICE_ID';
const EMAILJS_TEMPLATE_ADMIN   = 'TU_TEMPLATE_ADMIN';  
const EMAILJS_TEMPLATE_CLIENTE = 'TU_TEMPLATE_CLIENTE'; 

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
    const nota      = document.getElementById('apNota').value.trim() || '';
    const localidad = document.getElementById('localidadEnvio')?.value || '';

    const subtotal   = cart.reduce((t, i) => t + i.price * i.quantity, 0);
    const shipping   = calculateShipping(localidad, subtotal);
    const costoEnvio = (shipping.costo !== 'consultar' && shipping.costo !== null) ? shipping.costo : 0;
    const total      = subtotal + costoEnvio;

    const solicitud = {
        nombre, email, telefono, direccion,
        localidad: localidad || 'No especificada',
        fecha: fecha || null,
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
        let solicitudId = 'PENDIENTE';
        if (window.carritoDb) {
            const docRef = await window.carritoDb.collection('solicitudes').add(solicitud);
            solicitudId = docRef.id;
        }

        // 2. Enviar emails con EmailJS (si está configurado)
        if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'TU_PUBLIC_KEY') {
            emailjs.init(EMAILJS_PUBLIC_KEY);
            const productosTexto = cart.map(i =>
                `${i.name} x${i.quantity} = $${(i.price * i.quantity).toLocaleString()}`
            ).join('\n');

            const fechaFormateada = fecha
                ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                : 'No especificada';
            const params = {
                solicitud_id: solicitudId.slice(0, 8).toUpperCase(),
                nombre, email, telefono, direccion,
                localidad: localidad || 'No especificada',
                fecha: fechaFormateada,
                nota: nota || 'Sin notas',
                productos: productosTexto,
                subtotal: `$${subtotal.toLocaleString()}`,
                costo_envio: shipping.costo === 'consultar' ? 'A consultar' : `$${costoEnvio.toLocaleString()}`,
                total: `$${total.toLocaleString()}`
            };

            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ADMIN,   { ...params, to_email: 'cococateringsanisidro@gmail.com' });
            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_CLIENTE, { ...params, to_email: email });
        }

        // 3. Vaciar carrito y mostrar éxito
        localStorage.removeItem('cocoCart');
        updateCartCount();
        cerrarFormularioAprobacion();

        document.getElementById('emptyCart').style.display = 'none';
        const cartItemsEl = document.getElementById('cartItems');
        cartItemsEl.classList.add('has-items');
        cartItemsEl.innerHTML = `
            <div style="text-align:center;padding:40px 20px;">
                <h2 style="color:var(--bordo);font-family:'Cormorant Garamond',serif;font-size:2rem;margin-bottom:15px;">¡Solicitud enviada! ✓</h2>
                <p style="color:#555;margin-bottom:10px;">Nº de solicitud: <strong>${solicitudId.slice(0, 8).toUpperCase()}</strong></p>
                <p style="color:#555;margin-bottom:20px;">Nos contactaremos a <strong>${telefono}</strong> para confirmar disponibilidad y coordinar el pago.</p>
                <a href="../index.html" style="display:inline-block;background:var(--bordo);color:white;padding:10px 25px;border-radius:25px;text-decoration:none;font-family:'Cormorant Garamond',serif;font-size:1.2rem;">Volver al inicio</a>
            </div>`;
        document.querySelector('.carrito-summary').style.display = 'none';

    } catch (err) {
        console.error('Error enviando solicitud:', err);
        errorEl.textContent = 'Ocurrió un error. Contactanos por WhatsApp.';
        errorEl.style.display = 'block';
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Enviar Solicitud';
    }
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
