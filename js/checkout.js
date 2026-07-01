// Checkout Page - Cocó Catering
// Integración con MercadoPago Checkout Pro + Firebase

// ===================================
// IMPORTS
// ===================================
import { saveOrder, updateOrder, upsertOrder, getSolicitud, loadEnvioConfig } from './firestore-service.js';

// ===================================
// CONFIGURACIÓN DE MERCADOPAGO
// ===================================
const MP_PUBLIC_KEY = 'APP_USR-eb9414cf-eadb-4da9-9d16-0bf070ad753e';
// URL del backend
// Para Hostinger (PHP), usamos el archivo relativo '../crear-preferencia.php'
// Para desarrollo local con Node.js, usamos localhost:3000
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000/api/create-preference' // Desarrollo local (Node)
    : '../crear-preferencia.php'; // Producción Hostinger (PHP)

// Variables globales
let currentStep = 1;
let datosComprador = {};
let datosFacturacion = {};
let mercadopago;
let isProcessing = false;
let orderSaved = false;
let solicitudActiva = null; // Solicitud aprobada cargada desde Firestore
let _envioZonas = null; // Config de envío cargada desde Firebase
let currentFirebaseOrderId = null;
const safeDocId = id => String(id || '').replace(/[^a-zA-Z0-9_-]/g, '_');

// ===================================
// INICIALIZACIÓN
// ===================================
console.log('🚀 CHECKOUT.JS - Script cargado');
console.log('📦 localStorage al cargar checkout.js:', localStorage.getItem('cocoCart'));
console.log('🔍 window.getCart disponible?', typeof window.getCart);
console.log('🔍 window.addToCart disponible?', typeof window.addToCart);

// Esperar a que tanto el DOM como carrito.js estén listos
async function initCheckout() {
    console.log('🚀 CHECKOUT - Inicializando...');

    // Verificar si viene de una solicitud aprobada
    const urlParams = new URLSearchParams(window.location.search);
    const solicitudId = urlParams.get('solicitudId');

    if (solicitudId) {
        await cargarSolicitudAprobada(solicitudId);
        return; // loadOrderSummary se llama desde cargarSolicitudAprobada
    }

    // Flujo normal: verificar que carrito.js esté cargado
    if (typeof window.getCart !== 'function') {
        console.warn('⚠️ carrito.js no está listo, esperando...');
        setTimeout(initCheckout, 100);
        return;
    }

    console.log('✅ carrito.js está listo, cargando resumen');
    if (!_envioZonas) _envioZonas = await loadEnvioConfig();
    loadOrderSummary();
    updateCartCount();

    const facturacionFields = document.querySelector('.facturacion-fields');
    if (facturacionFields) {
        facturacionFields.style.display = 'none';
    }

    if (MP_PUBLIC_KEY !== 'TU_PUBLIC_KEY_AQUI') {
        mercadopago = new MercadoPago(MP_PUBLIC_KEY, { locale: 'es-AR' });
    }
}

async function cargarSolicitudAprobada(solicitudId) {
    try {
        const solicitud = await getSolicitud(solicitudId);

        if (!solicitud) {
            mostrarErrorSolicitud('No se encontró la solicitud. Volvé al carrito.');
            return;
        }
        if (solicitud.status !== 'approved') {
            mostrarErrorSolicitud('Esta solicitud aún no fue aprobada o ya fue procesada. Revisá la sección "Mis pedidos" en el carrito.');
            return;
        }

        solicitudActiva = solicitud;

        // Mostrar banner de aprobación
        mostrarBannerAprobado(solicitud);

        // Pre-rellenar formulario con datos de la solicitud
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el && val) el.value = val;
        };
        setVal('nombre', solicitud.nombre);
        setVal('email', solicitud.email);
        setVal('telefono', solicitud.telefono);
        setVal('provincia', 'Buenos Aires');

        // Aplicar tipo de entrega guardado en la solicitud
        const esRetiroSolicitud = solicitud.tipoEntrega === 'retiro';
        const radioEntrega = document.querySelector(
            `input[name="tipoEntregaCheckout"][value="${esRetiroSolicitud ? 'retiro' : 'envio'}"]`
        );
        if (radioEntrega) radioEntrega.checked = true;

        if (!esRetiroSolicitud) {
            // Pre-rellenar ciudad con la localidad guardada
            setVal('ciudad', solicitud.localidad);

            // Intentar separar calle y altura de la dirección (ej: "Av. Corrientes 1234")
            if (solicitud.direccion) {
                const match = solicitud.direccion.match(/^(.+?)\s+(\d+[\w-]*)(.*)$/);
                if (match) {
                    setVal('calle', match[1].trim());
                    setVal('altura', match[2].trim());
                    const resto = match[3].trim();
                    if (resto) setVal('piso', resto);
                } else {
                    setVal('calle', solicitud.direccion);
                }
            }
        }

        // Aplicar visibilidad del bloque de dirección y resumen de envío
        toggleEntregaCheckout();

        // Cargar resumen con productos de la solicitud
        loadOrderSummaryFromSolicitud(solicitud);
        updateCartCount();

        const facturacionFields = document.querySelector('.facturacion-fields');
        if (facturacionFields) facturacionFields.style.display = 'none';

        if (MP_PUBLIC_KEY !== 'TU_PUBLIC_KEY_AQUI') {
            mercadopago = new MercadoPago(MP_PUBLIC_KEY, { locale: 'es-AR' });
        }

    } catch (err) {
        console.error('Error cargando solicitud:', err);
        mostrarErrorSolicitud('Error al cargar la solicitud. Intentá nuevamente.');
    }
}

function mostrarBannerAprobado(solicitud) {
    const header = document.querySelector('.checkout-header');
    if (!header) return;
    const banner = document.createElement('div');
    banner.className = 'solicitud-aprobada-banner';
    banner.innerHTML = `🟢 Pedido aprobado — completá tus datos y procedé al pago`;
    header.insertAdjacentElement('afterend', banner);
}

function mostrarErrorSolicitud(msg) {
    document.querySelector('.checkout-content').innerHTML = `
        <div class="solicitud-error-box">
            <p>${msg}</p>
            <a href="carrito" class="btn-volver-carrito">← Volver al carrito</a>
        </div>`;
}

function loadOrderSummaryFromSolicitud(solicitud) {
    const orderItemsContainer = document.getElementById('orderItems');
    if (!orderItemsContainer) return;

    const items = solicitud.productos || [];

    orderItemsContainer.innerHTML = items.map(item => {
        const esPorDocena = item.unit === 'doc.';
        const displayQty = esPorDocena ? item.quantity * (item.batchSize || 12) : item.quantity;
        const itemTotal = Math.round(item.quantity * item.price);
        const displayName = (item.name || '').replace(/\s*–\s*x\d+\s*$/, '').trim();
        return `
        <div class="order-item no-image">
            <div class="order-item-details">
                <div class="order-item-name">${displayName}</div>
                <div class="order-item-quantity">Cantidad: ${displayQty} u.</div>
            </div>
            <div class="order-item-price">${item.price > 0 ? '$' + itemTotal.toLocaleString() : 'Consultar'}</div>
        </div>`;
    }).join('');

    const costoEnvio = typeof solicitud.costoEnvio === 'number' ? solicitud.costoEnvio : 0;
    const subtotal = solicitud.subtotal || 0;
    const total = solicitud.total || subtotal;

    document.getElementById('orderSubtotal').textContent = `$${subtotal.toLocaleString()}`;
    const envioEl = document.getElementById('orderEnvio');
    const envioMsgEl = document.getElementById('orderEnvioMessage');
    if (envioEl) {
        if (solicitud.costoEnvio === 'consultar') {
            envioEl.textContent = 'A consultar';
        } else if (costoEnvio === 0) {
            envioEl.textContent = '¡Gratis! ';
            if (envioEl) envioEl.style.color = 'green';
        } else {
            envioEl.textContent = `$${costoEnvio.toLocaleString()}`;
        }
    }
    if (envioMsgEl) envioMsgEl.textContent = '';
    document.getElementById('orderTotal').textContent = `$${total.toLocaleString()}`;
}

// Llamar a initCheckout cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initCheckout);

// ===================================
// RESUMEN DEL PEDIDO
// ===================================
function loadOrderSummary() {
    const cart = getCart();
    console.log('🛒 CHECKOUT - Carrito cargado desde localStorage:', cart);
    const orderItemsContainer = document.getElementById('orderItems');
    
    if (cart.length === 0) {
        // Solo redirigir si no viene de una solicitud aprobada
        const params = new URLSearchParams(window.location.search);
        if (!params.get('solicitudId')) {
            console.warn('⚠️ CHECKOUT - Carrito vacío, redirigiendo a carrito');
            window.location.href = 'carrito';
        }
        return;
    }
    
    console.log('✅ CHECKOUT - Mostrando', cart.length, 'productos');
    
    // Renderizar items
    orderItemsContainer.innerHTML = cart.map(item => {
        const esPorDocena = item.unit === 'doc.';
        const displayQty = esPorDocena ? item.quantity * (item.batchSize || 12) : item.quantity;
        const itemTotal = item.price * item.quantity;
        const displayName = (item.name || '').replace(/\s*–\s*x\d+\s*$/, '').trim();
        return `
        <div class="order-item ${item.showImage === false ? 'no-image' : ''}">
            ${item.showImage !== false ? `<img src="${item.image}" alt="${displayName}" class="order-item-image">` : ''}
            <div class="order-item-details">
                <div class="order-item-name">${displayName}</div>
                <div class="order-item-quantity">Cantidad: ${displayQty} u.</div>
            </div>
            <div class="order-item-price">${item.price > 0 ? '$' + itemTotal.toLocaleString() : 'Consultar'}</div>
        </div>`;
    }).join('');
    
    // Calcular totales
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    updateOrderSummary(subtotal);
}

function updateOrderSummary(subtotal, forceRetiro) {
    const esRetiro = forceRetiro ?? (document.querySelector('input[name="tipoEntregaCheckout"]:checked')?.value === 'retiro');

    if (esRetiro) {
        document.getElementById('orderSubtotal').textContent = `$${subtotal.toLocaleString()}`;
        const envioElement = document.getElementById('orderEnvio');
        if (envioElement) { envioElement.textContent = ' Gratis (retiro)'; envioElement.style.color = 'green'; }
        const envioMsgEl = document.getElementById('orderEnvioMessage');
        if (envioMsgEl) { envioMsgEl.textContent = 'Retirar en local, sin costo de envío.'; envioMsgEl.style.color = 'green'; }
        document.getElementById('orderTotal').textContent = `$${subtotal.toLocaleString()}`;
        return;
    }

    // Calcular mínimo para envío gratis según config Firebase (menor freeMin entre zonas numéricas)
    let ENVIO_GRATIS_MIN = 180000;
    if (_envioZonas) {
        const freeValues = Object.values(_envioZonas)
            .map(z => z.freeMin)
            .filter(v => typeof v === 'number' && v > 0);
        if (freeValues.length) ENVIO_GRATIS_MIN = Math.min(...freeValues);
    }
    const envioGratis = subtotal >= ENVIO_GRATIS_MIN;
    
    document.getElementById('orderSubtotal').textContent = `$${subtotal.toLocaleString()}`;
    
    const envioElement = document.getElementById('orderEnvio');
    if (envioGratis) {
        envioElement.textContent = 'Gratis';
        envioElement.style.color = 'green';
    } else {
        envioElement.textContent = 'A cargo del comprador';
        envioElement.style.color = '#777';
    }
    
    const envioMessageElement = document.getElementById('orderEnvioMessage');
    if (subtotal > 0 && subtotal < ENVIO_GRATIS_MIN) {
        const falta = ENVIO_GRATIS_MIN - subtotal;
        envioMessageElement.textContent = `¡Agregá $${falta.toLocaleString()} más para envío gratis!`;
        envioMessageElement.style.color = 'var(--bordo)';
    } else if (envioGratis) {
        envioMessageElement.textContent = '¡Envío gratis! ';
        envioMessageElement.style.color = 'green';
    } else {
        envioMessageElement.textContent = 'Envío gratis para compras mayores a $180.000';
    }
    
    document.getElementById('orderTotal').textContent = `$${subtotal.toLocaleString()}`;
}

// ===================================
// NAVEGACIÓN ENTRE PASOS
// ===================================
function updateSteps(step) {
    const steps = document.querySelectorAll('.step');
    steps.forEach((stepElement, index) => {
        if (index + 1 <= step) {
            stepElement.classList.add('active');
        } else {
            stepElement.classList.remove('active');
        }
    });
}

function continuarPago() {
    if (isProcessing) return;

    // Validar formulario de datos del comprador primero
    const formDatos = document.getElementById('datosCompradorForm');
    if (!formDatos.checkValidity()) {
        formDatos.reportValidity();
        return;
    }
    
    isProcessing = true;
    const btnContinuar = document.querySelector('.btn-next');
    if (btnContinuar) {
        btnContinuar.disabled = true;
        btnContinuar.textContent = 'Procesando...';
    }

    // Guardar datos del comprador
    const esRetiro = document.querySelector('input[name="tipoEntregaCheckout"]:checked')?.value === 'retiro';
    datosComprador = {
        nombre: document.getElementById('nombre').value,
        dni: document.getElementById('dni').value,
        telefono: document.getElementById('telefono').value,
        email: document.getElementById('email').value,
        tipoEntrega: esRetiro ? 'retiro' : 'envio',
        calle: esRetiro ? '' : document.getElementById('calle').value,
        altura: esRetiro ? '' : document.getElementById('altura').value,
        piso: esRetiro ? '' : document.getElementById('piso').value,
        depto: esRetiro ? '' : document.getElementById('depto').value,
        ciudad: esRetiro ? '' : document.getElementById('ciudad').value,
        provincia: esRetiro ? '' : document.getElementById('provincia').value,
        codigoPostal: esRetiro ? '' : document.getElementById('codigoPostal').value
    };
    
    const mismosDatos = document.getElementById('mismosDatos').checked;
    
    // Validar formulario de facturación si no son los mismos datos
    if (!mismosDatos) {
        const form = document.getElementById('facturacionForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        // Guardar datos de facturación
        datosFacturacion = {
            nombre: document.getElementById('nombreFacturacion').value,
            dni: document.getElementById('dniFacturacion').value,
            calle: document.getElementById('calleFacturacion').value,
            altura: document.getElementById('alturaFacturacion').value,
            piso: document.getElementById('pisoFacturacion').value,
            depto: document.getElementById('deptoFacturacion').value,
            ciudad: document.getElementById('ciudadFacturacion').value,
            provincia: document.getElementById('provinciaFacturacion').value,
            codigoPostal: document.getElementById('codigoPostalFacturacion').value
        };
    } else {
        // Usar los mismos datos del comprador
        datosFacturacion = {
            nombre: datosComprador.nombre,
            dni: datosComprador.dni,
            calle: datosComprador.calle,
            altura: datosComprador.altura,
            piso: datosComprador.piso,
            depto: datosComprador.depto,
            ciudad: datosComprador.ciudad,
            provincia: datosComprador.provincia,
            codigoPostal: datosComprador.codigoPostal
        };
    }
    
    // Cambiar a paso 3
    currentStep = 3;
    updateSteps(currentStep);
    document.getElementById('datosSection').classList.add('hidden');
    document.getElementById('pagoSection').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Inicializar MercadoPago
    initMercadoPago();
}

function volverFacturacion() {
    currentStep = 1;
    updateSteps(currentStep);
    document.getElementById('pagoSection').classList.add('hidden');
    document.getElementById('datosSection').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Resetear estados
    isProcessing = false;
    orderSaved = false;
    const btnContinuar = document.querySelector('.btn-next');
    if (btnContinuar) {
        btnContinuar.disabled = false;
        btnContinuar.textContent = 'Continuar al Pago';
    }
}

// ===================================
// FACTURACIÓN - MISMO DATOS CHECKBOX
// ===================================
function toggleFacturacion() {
    const checkbox = document.getElementById('mismosDatos');
    const facturacionFields = document.querySelector('.facturacion-fields');
    
    if (checkbox.checked) {
        facturacionFields.style.display = 'none';
    } else {
        facturacionFields.style.display = 'block';
    }
}

// Toggle campos de dirección cuando se elige retiro en el checkout
function toggleEntregaCheckout() {
    const esRetiro = document.querySelector('input[name="tipoEntregaCheckout"]:checked')?.value === 'retiro';
    const domicilioDiv = document.getElementById('checkoutEntregaDomicilio');
    if (!domicilioDiv) return;
    domicilioDiv.style.display = esRetiro ? 'none' : '';
    ['calle','altura','ciudad','provincia','codigoPostal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.required = !esRetiro;
    });
    // Actualizar resumen de envío
    let subtotal = 0;
    if (solicitudActiva) {
        subtotal = solicitudActiva.subtotal || 0;
    } else {
        const cart = typeof window.getCart === 'function' ? window.getCart() : [];
        subtotal = cart.reduce((t, i) => t + i.price * i.quantity, 0);
    }
    updateOrderSummary(subtotal, esRetiro);
}

// ===================================
// INTEGRACIÓN MERCADOPAGO
// ===================================
async function initMercadoPago() {
    // Mostrar mensaje de carga
    const loadingMsg = document.getElementById('loading-message');
    const mpButton = document.getElementById('mercadopago-button');
    
    if (loadingMsg) loadingMsg.style.display = 'block';
    if (mpButton) mpButton.innerHTML = '';

    // Preparar datos de la orden
    const cart = solicitudActiva ? solicitudActiva.productos : getCart();
    const subtotal = solicitudActiva
        ? (solicitudActiva.subtotal || 0)
        : cart.reduce((total, item) => total + (item.price * item.quantity), 0);

    // Si el usuario eligió retiro en el checkout, el envío es $0 independientemente de la solicitud
    const esRetiroCheckout = document.querySelector('input[name="tipoEntregaCheckout"]:checked')?.value === 'retiro';
    const costoEnvio = esRetiroCheckout ? 0
        : (solicitudActiva && typeof solicitudActiva.costoEnvio === 'number'
            ? solicitudActiva.costoEnvio
            : 0);
    const total = esRetiroCheckout ? subtotal
        : (solicitudActiva ? (solicitudActiva.total || subtotal) : subtotal);
    const envioGratis = !solicitudActiva && subtotal >= 180000;
    
    // Guardar orden en localStorage y Firebase
    try {
        // Solo guardar si no se ha guardado ya en esta sesión
        if (!orderSaved) {
            const orderId = 'ORDER-' + Date.now();
            const orderData = {
                orderId: orderId,
                fecha: new Date().toISOString(),
                // Datos del cliente
                cliente: {
                    nombre: datosComprador.nombre,
                    dni: datosComprador.dni,
                    telefono: datosComprador.telefono,
                    email: datosComprador.email
                },
                // Dirección de envío
                direccionEnvio: {
                    calle: datosComprador.calle,
                    altura: datosComprador.altura,
                    piso: datosComprador.piso || '',
                    depto: datosComprador.depto || '',
                    ciudad: datosComprador.ciudad,
                    provincia: datosComprador.provincia,
                    codigoPostal: datosComprador.codigoPostal
                },
                // Dirección de facturación
                direccionFacturacion: {
                    nombre: datosFacturacion.nombre,
                    dni: datosFacturacion.dni,
                    calle: datosFacturacion.calle,
                    altura: datosFacturacion.altura,
                    piso: datosFacturacion.piso || '',
                    depto: datosFacturacion.depto || '',
                    ciudad: datosFacturacion.ciudad,
                    provincia: datosFacturacion.provincia,
                    codigoPostal: datosFacturacion.codigoPostal
                },
                // Productos
                productos: cart.map(item => ({
                    id: item.id,
                    nombre: item.name,
                    precio: item.price,
                    cantidad: item.quantity,
                    imagen: item.image
                })),
                // Totales
                subtotal: subtotal,
                costoEnvio: costoEnvio,
                envioGratis: envioGratis,
                total: total,
                // Tipo de entrega y fecha (copiados de la solicitud si existe)
                tipoEntrega: esRetiroCheckout ? 'retiro' : 'envio',
                fechaEntrega: solicitudActiva?.fecha || solicitudActiva?.fechaPedido || null,
                horario:      solicitudActiva?.horario || null,
                // Referencia a la solicitud aprobada (si aplica)
                ...(solicitudActiva ? { solicitudId: solicitudActiva.id } : {}),
                ...(solicitudActiva?.serviceId ? { serviceId: solicitudActiva.serviceId } : {}),
                // Estado
                status: 'pending',
                paymentStatus: 'pending'
            };
            
            // Guardar orden en localStorage (como backup)
            localStorage.setItem('lastOrderId', orderId);
            localStorage.setItem(`order_${orderId}`, JSON.stringify(orderData));
            localStorage.setItem('cocoOrder', JSON.stringify(orderData));
            
            // Guardar orden en Firebase
            try {
                let firebaseOrderId;
                if (solicitudActiva) {
                    // Reusar siempre una orden estable por solicitud para evitar duplicados al reintentar checkout.
                    firebaseOrderId = solicitudActiva.orderId || `solicitud_${safeDocId(solicitudActiva.id)}`;
                    const updatePayload = {
                        cliente: orderData.cliente,
                        direccionEnvio: orderData.direccionEnvio,
                        direccionFacturacion: orderData.direccionFacturacion,
                        serviceId: orderData.serviceId || null,
                        status: 'pending',
                        paymentStatus: 'pending',
                        fechaEntrega: orderData.fechaEntrega || null,
                        horario: orderData.horario || null
                    };
                    const updated = await updateOrder(firebaseOrderId, updatePayload);
                    if (!updated) {
                        await upsertOrder(firebaseOrderId, {
                            ...orderData,
                            ...updatePayload
                        });
                    }
                    if (!solicitudActiva.orderId) {
                        solicitudActiva.orderId = firebaseOrderId;
                    }
                    console.log('✅ Orden existente actualizada:', firebaseOrderId);
                } else {
                    firebaseOrderId = await saveOrder(orderData);
                    console.log('✅ Orden nueva guardada en Firebase:', firebaseOrderId);
                }
                if (firebaseOrderId) {
                    currentFirebaseOrderId = firebaseOrderId;
                    localStorage.setItem('firebaseOrderId', firebaseOrderId);
                    orderData.firestoreOrderId = firebaseOrderId;
                    localStorage.setItem('cocoOrder', JSON.stringify(orderData));
                    orderSaved = true;
                }
            } catch (firebaseError) {
                console.error('❌ Error al guardar orden en Firebase:', firebaseError);
                // Continuar con el proceso aunque falle Firebase
            }
            
            console.log('Orden guardada con ID:', orderId);
        } else {
            console.log('ℹ️ La orden ya fue guardada previamente, saltando guardado.');
        }
        
    } catch (error) {
        console.error('Error al guardar orden:', error);
        if (loadingMsg) loadingMsg.style.display = 'none';
        isProcessing = false;
        return;
    }
    
    // Inicializar MercadoPago
    if (!mercadopago) {
        mercadopago = new MercadoPago(MP_PUBLIC_KEY, {
            locale: 'es-AR'
        });
    }
    
    try {
        const mpItems = cart.map(item => {
            // MercadoPago requiere quantity entero; enviamos el total por item con quantity=1
            const itemTotal = item.price > 0 ? Math.round(item.quantity * item.price) : 0;
            return {
                id: item.id,
                title: (item.name || '').replace(/\s*–\s*x\d+\s*$/, '').trim() || 'Producto',
                quantity: 1,
                unit_price: itemTotal > 0 ? itemTotal : 1,
                currency_id: 'ARS'
            };
        });

        // Agregar envío como ítem separado si tiene costo
        if (costoEnvio > 0) {
            mpItems.push({
                id: 'envio',
                title: 'Envío',
                quantity: 1,
                unit_price: costoEnvio,
                currency_id: 'ARS'
            });
        }

        const orderData = {
            items: mpItems,
            payer: {
                name: datosComprador.nombre,
                email: datosComprador.email,
                identification: {
                    type: 'DNI',
                    number: String(datosComprador.dni)
                },
                phone: {
                    number: parseInt(datosComprador.telefono.replace(/\D/g, ''))
                },
                address: {
                    street_name: datosComprador.calle,
                    street_number: parseInt(datosComprador.altura),
                    zip_code: datosComprador.codigoPostal
                }
            },
            back_urls: (() => {
                // Construir URLs relativas a la ubicación actual del checkout
                // para que funcione tanto en /html/ como en /web/html/
                const base = window.location.href.replace(/checkout(\.html)?(\?.*)?$/, '');
                return {
                    success: base + 'success',
                    failure: base + 'failure',
                    pending: base + 'pending'
                };
            })(),
            auto_return: 'approved',
            metadata: {
                datosFacturacion: datosFacturacion,
                firestoreOrderId: currentFirebaseOrderId || localStorage.getItem('firebaseOrderId') || '',
                firestore_order_id: currentFirebaseOrderId || localStorage.getItem('firebaseOrderId') || '',
                solicitudId: solicitudActiva?.id || '',
                solicitud_id: solicitudActiva?.id || '',
                serviceId: solicitudActiva?.serviceId || '',
                service_id: solicitudActiva?.serviceId || ''
            }
        };
        
        // Llamar al backend para crear la preferencia de pago
        // Si BACKEND_URL es una ruta relativa (PHP), fetch la usará directamente
        // Si es absoluta (Node local), también funcionará
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const preference = await response.json();
        
        console.log('Respuesta del backend:', preference);
        
        // Verificar si hubo error en el backend
        if (!response.ok || preference.error) {
            throw new Error(preference.error || 'Error al crear preferencia de pago');
        }

        // SDK v2: usar Wallet Brick para renderizar el botón de pago
        // (mercadopago.checkout() es v1 y no existe en v2)
        const bricksBuilder = mercadopago.bricks();
        await bricksBuilder.create('wallet', 'mercadopago-button', {
            initialization: {
                preferenceId: preference.id,
            },
            customization: {
                texts: { valueProp: 'smart_option' },
            },
        });
        
        console.log('✅ Botón de MercadoPago creado exitosamente');
        
        // Ocultar mensaje de carga
        const loadingMsg = document.getElementById('loading-message');
        if (loadingMsg) loadingMsg.style.display = 'none';
        
        // Ocultar mensaje de credenciales pendientes
        const credencialesPendientes = document.querySelector('.credenciales-pendientes');
        if (credencialesPendientes) {
            credencialesPendientes.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error detallado:', error);
        const errorMsg = error.message || 'Error desconocido';
        alert(`Error al procesar el pago: ${errorMsg}\n\nRevisa la consola para más detalles.`);
        
        const loadingMsg = document.getElementById('loading-message');
        if (loadingMsg) loadingMsg.style.display = 'none';
        isProcessing = false;
    }
}

// ===================================
// FUNCIONES AUXILIARES
// ===================================
function toggleMobileMenu() {
    const mobileMenu = document.querySelector('.mobile-nav-menu');
    const hamburger = document.querySelector('.hamburger-menu');
    mobileMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
}


function getCart() {
  
    if (typeof window.getCart === 'function') {
        console.log('✅ Usando window.getCart de carrito.js');
        return window.getCart();
    }
    
    console.warn('⚠️ window.getCart no encontrado, usando fallback');
    const cart = localStorage.getItem('cocoCart');
    return cart ? JSON.parse(cart) : [];
}

function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(element => {
        element.textContent = count;
        element.style.display = count > 0 ? 'flex' : 'none';
    });
}

window.toggleMobileMenu = toggleMobileMenu;
window.continuarPago = continuarPago;
window.volverFacturacion = volverFacturacion;
window.toggleFacturacion = toggleFacturacion;
window.toggleEntregaCheckout = toggleEntregaCheckout;


