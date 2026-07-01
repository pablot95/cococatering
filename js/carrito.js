// Carrito de compras - Cocó Catering

const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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
                item.batchSize = item.min;  // guardar tamaño de lote antes de pisar min
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
    const imagelessPages = ['desayunos', 'combos-dulces', 'box-dulces', 'box-salados'];
    const showImage = !imagelessPages.includes(currentPage);
    
    if (existingItem) {
        console.log('  Producto existente, incrementando cantidad');
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
            step: product.step || 1,
            batchSize: product.batchSize || 1
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
        // Mostrar siempre en unidades reales
        const displayQty = esPorDocena ? item.quantity * (item.batchSize || 12) : item.quantity;
        const priceDisplay = item.price > 0
            ? `$${unitPrice.toLocaleString()} x ${esPorDocena ? `${item.batchSize || 12} u.` : 'u.'}`
            : 'Consultar';
        const totalDisplay = item.price > 0 ? `$${itemTotal.toLocaleString()}` : '';
        const qtyLabel = `×${displayQty} u.`;
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
let SHIPPING_ZONES = {
    'san-isidro':    { nombre: 'San Isidro',   costo: 6000,  freeMin: 500000 },
    'acasusso':      { nombre: 'Acasusso',      costo: 6000,  freeMin: 500000 },
    'martinez':      { nombre: 'Martínez',      costo: 6000,  freeMin: 500000 },
    'beccar':        { nombre: 'Beccar',         costo: 6000,  freeMin: 500000 },
    'villa-adelina': { nombre: 'Villa Adelina', costo: 12000, freeMin: 900000 },
    'boulogne':      { nombre: 'Boulogne',       costo: 12000, freeMin: 900000 },
    'san-fernando':  { nombre: 'San Fernando',  costo: 12000, freeMin: 900000 },
    'olivos':        { nombre: 'Olivos',         costo: 12000, freeMin: 900000 },
    'vicente-lopez': { nombre: 'Vicente López', costo: 12000, freeMin: 900000 },
    'tigre':         { nombre: 'Tigre',          costo: 12000, freeMin: 900000 },
    'nordelta':      { nombre: 'Nordelta',       costo: 20000, freeMin: 1000000 },
    'otra':          { nombre: 'Otra zona (consultar)', costo: 'consultar', freeMin: null }
};

async function loadEnvioConfig() {
    try {
        if (!window.carritoDb) return;
        const doc = await window.carritoDb.collection('admin_config').doc('envio').get();
        if (doc.exists && doc.data().zonas) {
            const zonas = doc.data().zonas;
            const converted = {};
            Object.entries(zonas).forEach(([key, z]) => {
                converted[key] = { nombre: z.nombre || key, costo: z.costo, freeMin: z.freeMin ?? null };
            });
            SHIPPING_ZONES = converted;
        }
    } catch(e) {
        console.warn('No se pudo cargar config de envío, usando valores por defecto');
    }
    // Poblar el select de localidades con los datos actuales
    const sel = document.getElementById('localidadEnvio');
    if (sel) {
        sel.innerHTML = '<option value="">Seleccioná tu localidad</option>';
        Object.entries(SHIPPING_ZONES).forEach(([key, z]) => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = z.nombre || key;
            sel.appendChild(opt);
        });
    }
    // Poblar también el select del modal de solicitud para que coincidan ambas listas
    const selAp = document.getElementById('apLocalidad');
    if (selAp) {
        const prev = selAp.value;
        selAp.innerHTML = '<option value="">Seleccioná tu localidad</option>';
        Object.entries(SHIPPING_ZONES).forEach(([key, z]) => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = z.nombre || key;
            selAp.appendChild(opt);
        });
        if (prev) selAp.value = prev;
    }
}

function calculateShipping(localidad, subtotal) {
    if (!localidad) return { costo: null, free: false, message: '' };
    const zone = SHIPPING_ZONES[localidad];
    if (!zone || zone.costo === 'consultar') return { costo: 'consultar', free: false, message: 'Costo de envío a consultar para tu zona' };
    if (subtotal >= zone.freeMin) return { costo: 0, free: true, message: '¡Envío gratis para tu zona!' };
    const resta = zone.freeMin - subtotal;
    return { costo: zone.costo, free: false, message: `Agregá $${resta.toLocaleString()} más para envío gratis en tu zona` };
}

// Actualizar envío cuando cambia la localidad
function actualizarEnvio() {
    // Mostrar/ocultar input "otra localidad" en el resumen
    const sel = document.getElementById('localidadEnvio');
    const otraInput = document.getElementById('localidadEnvioOtra');
    if (sel && otraInput) {
        const esOtra = sel.value === 'otra';
        otraInput.style.display = esOtra ? 'block' : 'none';
        if (!esOtra) otraInput.value = '';
    }
    const cart = getCart();
    const subtotal = cart.reduce((total, item) => total + item.quantity * item.price, 0);
    updateSummary(subtotal);
}

// Toggle envío / retiro en el resumen del carrito
function actualizarTipoEntrega() {
    const esRetiro = document.querySelector('input[name="tipoEntregaResumen"]:checked')?.value === 'retiro';
    const envioDetails  = document.getElementById('envioDetails');
    const retiroDetails = document.getElementById('retiroDetails');
    if (envioDetails)  envioDetails.style.display  = esRetiro ? 'none' : '';
    if (retiroDetails) retiroDetails.style.display = esRetiro ? '' : 'none';
    // Recalcular total
    const cart = getCart();
    const subtotal = cart.reduce((t, i) => t + i.quantity * i.price, 0);
    updateSummary(subtotal);
}

// Toggle campos de dirección en el modal de solicitud
function toggleEntregaModal() {
    const esRetiro = document.querySelector('input[name="tipoEntregaResumen"]:checked')?.value === 'retiro';
    const domicilioFields = document.getElementById('apEntregaDomicilio');
    if (!domicilioFields) return;
    domicilioFields.style.display = esRetiro ? 'none' : '';
    // Quitar/poner required en los campos ocultos
    ['apDireccion', 'apLocalidad'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.required = !esRetiro;
    });
    // Cambiar el label de fecha según el tipo de entrega
    const fechaLabel = document.querySelector('label[for="apFecha"]');
    if (fechaLabel) {
        fechaLabel.textContent = esRetiro
            ? '¿Para cuándo necesitás el retiro? *'
            : '¿Para cuándo necesitás la entrega? *';
    }
}

// Actualizar resumen
function updateSummary(subtotal) {
    document.getElementById('subtotal').textContent = subtotal > 0 ? `$${subtotal.toLocaleString()}` : '$0';

    const esRetiro = document.querySelector('input[name="tipoEntregaResumen"]:checked')?.value === 'retiro';

    if (esRetiro) {
        // Retiro: envío gratis, total = subtotal
        document.getElementById('total').textContent = subtotal > 0 ? `$${subtotal.toLocaleString()}` : '$0';
        const continuarBtn = document.getElementById('continuarCompraBtn');
        if (continuarBtn) continuarBtn.disabled = subtotal === 0;
        return;
    }

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
            envioEl.textContent = 'Gratis ';
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

// Detectar si es un dispositivo móvil (Android/iOS) para abrir WhatsApp en la app nativa
function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Construye la URL para abrir WhatsApp:
// - En mobile usa el esquema whatsapp:// (abre la app directo)
// - En desktop usa wa.me (abre WhatsApp Web / app de escritorio)
function buildWhatsAppUrl(phone, text) {
    const cleanPhone = String(phone).replace(/\D/g, '');
    const encoded = text ? encodeURIComponent(text) : '';
    if (isMobileDevice()) {
        return `whatsapp://send?phone=${cleanPhone}${encoded ? '&text=' + encoded : ''}`;
    }
    return `https://wa.me/${cleanPhone}${encoded ? '?text=' + encoded : ''}`;
}

function generarCodigoPedido() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return 'COCO-' + code;
}

function abrirFormularioAprobacion() {
    const cart = getCart();
    if (cart.length === 0) { showCartNotification('Tu carrito está vacío'); return; }
    // Pre-seleccionar la localidad que ya eligieron en el resumen
    const localidadSel = document.getElementById('localidadEnvio')?.value;
    const localidadOtraResumen = document.getElementById('localidadEnvioOtra')?.value.trim() || '';
    const apLocalidad = document.getElementById('apLocalidad');
    if (apLocalidad && localidadSel) apLocalidad.value = localidadSel;
    // Si en el resumen ya escribieron una localidad "otra", llevarla al modal
    const apLocalidadOtra = document.getElementById('apLocalidadOtra');
    if (apLocalidad && apLocalidadOtra && localidadSel === 'otra') {
        apLocalidadOtra.value = localidadOtraResumen;
        apLocalidadOtra.style.display = 'block';
        apLocalidadOtra.required = true;
    }
    // Mostrar/ocultar campo "otra localidad" al cambiar el select (registrar listener una sola vez)
    if (apLocalidad && !apLocalidad.dataset.otraListener) {
        apLocalidad.addEventListener('change', function () {
            const otraInput = document.getElementById('apLocalidadOtra');
            if (!otraInput) return;
            const esOtra = this.value === 'otra';
            otraInput.style.display = esOtra ? 'block' : 'none';
            otraInput.required = esOtra;
            if (!esOtra) otraInput.value = '';
        });
        apLocalidad.dataset.otraListener = '1';
    }
    document.getElementById('aprobacionModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    // Sincronizar visibilidad de campos según el tipo de entrega elegido en el resumen
    toggleEntregaModal();
}

function cerrarFormularioAprobacion() {
    document.getElementById('aprobacionModal').style.display = 'none';
    document.body.style.overflow = '';
}

async function enviarSolicitudAprobacion(event) {
    event.preventDefault();
    const cart = getCart();
    if (cart.length === 0) return;

    const tipoEntrega = document.querySelector('input[name="tipoEntregaResumen"]:checked')?.value || 'envio';
    const esRetiro    = tipoEntrega === 'retiro';

    const codigoPedido = generarCodigoPedido();
    const nombre    = document.getElementById('apNombre').value.trim();
    const email     = document.getElementById('apEmail').value.trim();
    const telefono  = document.getElementById('apTelefono').value.trim();
    const direccion = esRetiro ? '' : document.getElementById('apDireccion').value.trim();
    const fecha     = document.getElementById('apFecha').value || '';
    const horario   = document.getElementById('apHorario')?.value || '';
    const nota      = document.getElementById('apNota').value.trim() || '';
    const localidadSelect = esRetiro ? '' : (document.getElementById('apLocalidad')?.value || '');
    const localidadOtra   = esRetiro
        ? ''
        : (document.getElementById('apLocalidadOtra')?.value.trim()
            || document.getElementById('localidadEnvioOtra')?.value.trim()
            || '');
    // Resolver el nombre legible de la zona (ej: "san-isidro" -> "San Isidro")
    const localidadKey = !esRetiro ? (localidadSelect || document.getElementById('localidadEnvio')?.value || '') : '';
    const localidadNombre = SHIPPING_ZONES[localidadKey]?.nombre || localidadKey;
    const localidad = esRetiro ? 'Retiro en local'
        : (localidadSelect === 'otra' && localidadOtra) ? localidadOtra
        : (localidadNombre || '');

    const subtotal   = cart.reduce((t, i) => t + i.quantity * i.price, 0);
    const shipping   = esRetiro ? { costo: 0, free: true } : calculateShipping(localidadKey, subtotal);
    const costoEnvio = (shipping.costo !== 'consultar' && shipping.costo !== null) ? shipping.costo : 0;
    const total      = subtotal + costoEnvio;

    const solicitud = {
        nombre, email, telefono,
        direccion: esRetiro ? null : direccion,
        localidad: localidad || 'No especificada',
        tipoEntrega,
        fecha: fecha || null,
        horario: horario || null,
        nota: nota || null,
        productos: cart,
        subtotal,
        costoEnvio: shipping.costo,
        total,
        codigo: codigoPedido,
        status: 'pending',
        createdAt: new Date()
    };

    const btnSubmit = document.getElementById('btnEnviarSolicitud');
    const errorEl  = document.getElementById('aprobacionError');
    if (errorEl) errorEl.style.display = 'none';

    const esMobile = isMobileDevice();
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Enviando...';

    // ── Verificar si es cliente VIP por teléfono ──
    let esVip = false;
    if (window.carritoDb && telefono) {
        try {
            const normTel = telefono.replace(/\D/g, '').slice(-8);
            const vipSnap = await window.carritoDb.collection('admin_clientes_vip').get();
            esVip = vipSnap.docs.some(d => {
                const t = (d.data().telefono || '').replace(/\D/g, '').slice(-8);
                return t && t === normTel;
            });
        } catch(e) { /* VIP check silencioso */ }
    }
    solicitud.esVip = esVip;

    // ── Guardar en Firestore (operación crítica separada) ──
    let solicitudId = 'local-' + Date.now();
    try {
        if (window.carritoDb) {
            const docRef = await window.carritoDb.collection('solicitudes').add(solicitud);
            solicitudId = docRef.id;
        }
    } catch (err) {
        console.error('Error guardando solicitud en Firestore:', err);
        if (errorEl) {
            errorEl.textContent = 'No se pudo guardar el pedido. Verificá tu conexión y reintentá, o contactanos por WhatsApp directamente.';
            errorEl.style.display = 'block';
        }
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Enviar Solicitud';
        return;
    }

    // ── A partir de acá el pedido está guardado — todo lo siguiente es UI ──
    try {

        // 2. Guardar ID en localStorage para «Mis Pedidos»
        const pedidosGuardados = JSON.parse(localStorage.getItem('cocoPedidos') || '[]');
        pedidosGuardados.push({ id: solicitudId, codigo: codigoPedido, createdAt: new Date().toISOString() });
        localStorage.setItem('cocoPedidos', JSON.stringify(pedidosGuardados));

        // Abrir WhatsApp DESPUÉS de confirmar el guardado
        const waWindow = esMobile ? null : window.open('', '_blank');

        // 3. Armar mensaje de WhatsApp
        const fechaFormateada = fecha
            ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            : 'No especificada';

        const productosTexto = cart.map(i => {
            const itemTotal = i.quantity * i.price;
            const displayName = i.name.replace(/\s*–\s*x\d+\s*$/, '').trim();
            // Mostrar siempre en unidades reales
            const displayQty = i.unit === 'doc.'
                ? i.quantity * (i.batchSize || 12)
                : i.quantity;
            const qtyLabel = `×${displayQty} u.`;
            return `• ${displayName} ${qtyLabel}${itemTotal > 0 ? ' = $' + itemTotal.toLocaleString() : ''}`;
        }).join('\n');

        const envioTexto = shipping.costo === 'consultar'
            ? 'A consultar'
            : shipping.costo === 0
                ? '¡Gratis! '
                : `$${shipping.costo.toLocaleString()}`;

        const mensaje = [
            esVip ? '⭐ *CLIENTE VIP — NUEVA SOLICITUD DE PEDIDO — Cocó Catering*' : ' *NUEVA SOLICITUD DE PEDIDO — Cocó Catering*',
            '',
            `*Nombre:* ${nombre}${esVip ? ' ⭐ VIP' : ''}`,
            `*Teléfono:* ${telefono}`,
            `*Email:* ${email}`,
            esRetiro ? `*Entrega:* 🏪 Retiro en local` : `*Dirección:* ${direccion}`,
            esRetiro ? null : `*Localidad:* ${localidad || 'No especificada'}`,
            `*Fecha deseada:* ${fechaFormateada}`,
            horario ? `*Horario preferencial:* ${horario}` : null,
            nota ? `*Nota:* ${nota}` : null,
            '',
            '*PRODUCTOS:*',
            productosTexto,
            '',
            `*Subtotal:* $${subtotal.toLocaleString()}`,
            esRetiro ? `*Envío:*  Gratis (retiro en local)` : `*Envío (${localidad || '?'}):* ${envioTexto}`,
            `*TOTAL:* $${total.toLocaleString()}`,
            `*Código de pedido:* ${codigoPedido}`,
        ].filter(l => l !== null).join('\n');

        const waUrl = buildWhatsAppUrl(WHATSAPP_NUMBER, mensaje);

        // 4. Vaciar carrito
        localStorage.removeItem('cocoCart');
        updateCartCount();
        cerrarFormularioAprobacion();

        // 5. Abrir WhatsApp
        //    - En mobile: navegar a whatsapp://send (abre la app directo)
        //    - En desktop: usar la ventana abierta antes del await
        if (esMobile) {
            window.location.href = waUrl;
        } else if (waWindow && !waWindow.closed) {
            waWindow.location.href = waUrl;
        }

        // 6. Mostrar confirmación
        document.getElementById('emptyCart').style.display = 'none';
        const cartItemsEl = document.getElementById('cartItems');
        cartItemsEl.classList.add('has-items');
        cartItemsEl.innerHTML = `
            <div class="solicitud-enviada">
                <div class="solicitud-check">✓</div>
                <h2>¡Solicitud enviada!</h2>
                <div class="solicitud-codigo-box">
                    <p class="solicitud-codigo-label">Tu código de pedido:</p>
                    <span class="solicitud-codigo">${codigoPedido}</span>
                    <p class="solicitud-codigo-aviso">⚠️ <strong>Guardá este código.</strong> Lo vas a necesitar junto a tu email para consultar el estado de tu pedido desde otro dispositivo.</p>
                </div>
                <p>Se abrió WhatsApp con los detalles de tu pedido.<br>
                   Si no se abrió automáticamente, <a href="${waUrl}" target="_blank" rel="noopener">hacé clic aquí</a>.</p>
                <p class="solicitud-next">Te contactaremos a <strong>${telefono}</strong> para confirmar disponibilidad.</p>
                <a href="../" class="btn-volver-inicio">Volver al inicio</a>
            </div>`;
        document.querySelector('.carrito-summary').style.display = 'none';

        // 7. Pre-cargar pedidos en background para cuando el usuario abra "Mis pedidos"
        cargarMisPedidos();

    } catch (uiErr) {
        // Error de UI post-guardado — el pedido YA está guardado, no mostrar error al usuario
        console.warn('Error de UI post-guardado (no crítico):', uiErr);
    }
}

// ===================================
// MIS PEDIDOS
// ===================================
async function cargarMisPedidos() {
    // Solo considerar entradas con código (formato nuevo)
    const todos = JSON.parse(localStorage.getItem('cocoPedidos') || '[]');
    const pedidosGuardados = todos.filter(p => p.codigo);
    // Limpiar entradas viejas sin código para no mostrar pedidos de otros
    if (pedidosGuardados.length !== todos.length) {
        localStorage.setItem('cocoPedidos', JSON.stringify(pedidosGuardados));
    }

    const container = document.getElementById('misPedidosContainer');
    if (!container) return;

    // Si no hay pedidos con código en este dispositivo, no cargar nada
    if (pedidosGuardados.length === 0) {
        return;
    }

    container.innerHTML = '<div class="pedidos-loading">Cargando pedidos...</div>';

    try {
        let pedidos = [];

        // Cargar por IDs guardados en este dispositivo (solo los que tienen código propio)
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
        paid:     { label: 'Pagado',                  icon: '✅', cls: 'status-approved' },
        rejected: { label: 'Rechazado',               icon: '🔴', cls: 'status-rejected' }
    };

    container.innerHTML = pedidos.map(p => {
        const st    = STATUS[p.status] || STATUS.pending;
        const fecha = p.createdAt?.toDate
            ? p.createdAt.toDate().toLocaleDateString('es-AR')
            : (p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-AR') : 'Hoy');
        const prods = (p.productos || []).map(pr => {
            const n = pr.name.replace(/\s*–\s*x\d+\s*$/, '').trim();
            const displayQty = pr.unit === 'doc.' ? pr.quantity * (pr.batchSize || 12) : pr.quantity;
            const itemTotal = pr.quantity * pr.price;
            const totalStr = pr.price > 0 ? ` <span class="pedido-prod-total">= $${itemTotal.toLocaleString()}</span>` : '';
            return `<li class="pedido-prod-item">× ${escapeHtml(displayQty)} u. &nbsp;<strong>${escapeHtml(n)}</strong>${totalStr}</li>`;
        }).join('');

        const envioStr = p.costoEnvio === 0 ? 'Gratis '
            : p.costoEnvio === 'consultar' ? 'A consultar'
            : typeof p.costoEnvio === 'number' && p.costoEnvio > 0
                ? '$' + p.costoEnvio.toLocaleString()
                : '—';
        const localidadLabel = p.localidad && p.localidad !== 'No especificada' ? ` — ${escapeHtml(p.localidad)}` : '';

        return `
        <div class="pedido-card ${st.cls}">
            <div class="pedido-card-header">
                <span class="pedido-badge ${st.cls}">${st.icon} ${st.label}</span>
                <span class="pedido-fecha">${fecha}</span>
            </div>
            <ul class="pedido-prods">${prods}</ul>
            <div class="pedido-totales">
                <div class="pedido-total-line"><span>Subtotal</span><strong>$${(p.subtotal || 0).toLocaleString()}</strong></div>
                <div class="pedido-total-line"><span>Envío${localidadLabel}</span><strong>${envioStr}</strong></div>
                <div class="pedido-total-line pedido-total-grande"><span>Total</span><strong>$${(p.total || p.subtotal || 0).toLocaleString()}</strong></div>
            </div>
            ${p.status === 'approved' ? `
                <div class="pedido-msg aprobado">¡Tu pedido fue aprobado! Ya podés proceder al pago.</div>
                <button class="btn-pagar-pedido" data-checkout-id="${p.id}">💳 Ir al pago</button>` : ''}
            ${p.status === 'rejected' ? `
                <div class="pedido-msg rechazado">Este pedido fue rechazado. Si tenés dudas, contactanos por WhatsApp.</div>
                <a href="${buildWhatsAppUrl(WHATSAPP_NUMBER)}" target="_blank" rel="noopener" class="btn-consultar-wa">💬 Consultar por WhatsApp</a>` : ''}
            ${p.status === 'pending' ? `
                <div class="pedido-msg pendiente">Estamos revisando tu solicitud. Te avisaremos cuando esté aprobada.</div>` : ''}
        </div>`;
    }).join('');

    // Listeners para "Ir al pago" — evita onclick inline (bloqueado por CSP en producción)
    container.querySelectorAll('.btn-pagar-pedido[data-checkout-id]').forEach(btn => {
        btn.addEventListener('click', function() {
            // Construir URL relativa a la carpeta actual para funcionar en /web/html/ o /html/
            const base = window.location.href.replace(/carrito(\.html)?(\?.*)?$/, '');
            window.location.href = base + 'checkout?solicitudId=' + this.dataset.checkoutId;
        });
    });
}

// Mostrar notificación (usa la misma función que menu-script.js)
window.buscarPedidosPorEmailCodigo = async function() {
    const email  = (document.getElementById('inputBuscarEmail')?.value  || '').trim().toLowerCase();
    const codigo = (document.getElementById('inputBuscarCodigo')?.value || '').trim().toUpperCase();
    const container = document.getElementById('misPedidosContainer');

    if (!email || !codigo) {
        container.innerHTML = '<p class="pedidos-empty">Ingresá tu email y código de pedido para continuar.</p>';
        return;
    }
    container.innerHTML = '<div class="pedidos-loading">Buscando...</div>';

    try {
        const response = await fetch(`../buscar-pedido.php?email=${encodeURIComponent(email)}&codigo=${encodeURIComponent(codigo)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const pedidos = Array.isArray(data.pedidos) ? data.pedidos : [];

        if (pedidos.length === 0) {
            container.innerHTML = '<p class="pedidos-empty">No encontramos pedidos con ese email y código. Verificá los datos ingresados.</p>';
        } else {
            renderMisPedidos(pedidos, container);
        }
    } catch (err) {
        console.error('buscarPedidosPorEmailCodigo error:', err);
        container.innerHTML = '<p class="pedidos-empty">Error al buscar pedidos.</p>';
    }
};

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
document.addEventListener('DOMContentLoaded', async function() {
    // Si estamos en la página del carrito
    if (window.location.pathname.includes('carrito')) {
        await loadEnvioConfig();
        renderCart();
        // No auto-cargamos pedidos: el usuario debe ingresar email + código
        // (solo se carga automáticamente justo después de hacer un pedido en este dispositivo)
        localStorage.removeItem('cocoUserEmail'); // limpiar dato viejo ya no utilizado
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
window.actualizarTipoEntrega = actualizarTipoEntrega;
window.toggleEntregaModal = toggleEntregaModal;
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
