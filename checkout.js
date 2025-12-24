// Checkout Page - Cocó Catering
// Integración con MercadoPago Checkout Pro + Firebase

// ===================================
// IMPORTS
// ===================================
import { saveOrder } from './firestore-service.js';

// ===================================
// CONFIGURACIÓN DE MERCADOPAGO
// ===================================
const MP_PUBLIC_KEY = 'APP_USR-eb9414cf-eadb-4da9-9d16-0bf070ad753e';
// URL del backend
// Para Hostinger (PHP), usamos el archivo relativo 'crear-preferencia.php'
// Para desarrollo local con Node.js, usamos localhost:3000
const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000/api/create-preference' // Desarrollo local (Node)
    : 'crear-preferencia.php'; // Producción Hostinger (PHP)

// Variables globales
let currentStep = 1;
let datosComprador = {};
let datosFacturacion = {};
let mercadopago;
let isProcessing = false;
let orderSaved = false;

// ===================================
// INICIALIZACIÓN
// ===================================
console.log('🚀 CHECKOUT.JS - Script cargado');
console.log('📦 localStorage al cargar checkout.js:', localStorage.getItem('cocoCart'));
console.log('🔍 window.getCart disponible?', typeof window.getCart);
console.log('🔍 window.addToCart disponible?', typeof window.addToCart);

// Esperar a que tanto el DOM como carrito.js estén listos
function initCheckout() {
    console.log('🚀 CHECKOUT - Inicializando...');
    
    // Verificar que carrito.js esté cargado
    if (typeof window.getCart !== 'function') {
        console.warn('⚠️ carrito.js no está listo, esperando...');
        setTimeout(initCheckout, 100);
        return;
    }
    
    console.log('✅ carrito.js está listo, cargando resumen');
    loadOrderSummary();
    updateCartCount();
    
    // Ocultar formulario de facturación por defecto (checkbox está marcado)
    const facturacionFields = document.querySelector('.facturacion-fields');
    if (facturacionFields) {
        facturacionFields.style.display = 'none';
    }
    
    // Inicializar MercadoPago SDK (cuando tengas las credenciales)
    if (MP_PUBLIC_KEY !== 'TU_PUBLIC_KEY_AQUI') {
        mercadopago = new MercadoPago(MP_PUBLIC_KEY, {
            locale: 'es-AR'
        });
    }
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
        console.warn('⚠️ CHECKOUT - Carrito vacío, redirigiendo a carrito.html');
        window.location.href = 'carrito.html';
        return;
    }
    
    console.log('✅ CHECKOUT - Mostrando', cart.length, 'productos');
    
    // Renderizar items
    orderItemsContainer.innerHTML = cart.map(item => `
        <div class="order-item ${item.showImage === false ? 'no-image' : ''}">
            ${item.showImage !== false ? `<img src="${item.image}" alt="${item.name}" class="order-item-image">` : ''}
            <div class="order-item-details">
                <div class="order-item-name">${item.name}</div>
                <div class="order-item-quantity">Cantidad: ${item.quantity}</div>
            </div>
            <div class="order-item-price">$${(item.price * item.quantity).toLocaleString()}</div>
        </div>
    `).join('');
    
    // Calcular totales
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    updateOrderSummary(subtotal);
}

function updateOrderSummary(subtotal) {
    const ENVIO_GRATIS_MIN = 180000;
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
        envioMessageElement.textContent = '¡Envío gratis! 🎉';
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
    datosComprador = {
        nombre: document.getElementById('nombre').value,
        dni: document.getElementById('dni').value,
        telefono: document.getElementById('telefono').value,
        email: document.getElementById('email').value,
        calle: document.getElementById('calle').value,
        altura: document.getElementById('altura').value,
        piso: document.getElementById('piso').value,
        depto: document.getElementById('depto').value,
        ciudad: document.getElementById('ciudad').value,
        provincia: document.getElementById('provincia').value,
        codigoPostal: document.getElementById('codigoPostal').value
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
    const cart = getCart();
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const envioGratis = subtotal >= 180000;
    
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
                envioGratis: envioGratis,
                total: subtotal,
                // Estado
                status: 'pending',
                paymentStatus: 'pending'
            };
            
            // Guardar orden en localStorage (como backup)
            localStorage.setItem('lastOrderId', orderId);
            localStorage.setItem(`order_${orderId}`, JSON.stringify(orderData));
            
            // Guardar orden en Firebase
            try {
                const firebaseOrderId = await saveOrder(orderData);
                if (firebaseOrderId) {
                    console.log('✅ Orden guardada en Firebase con ID:', firebaseOrderId);
                    localStorage.setItem('firebaseOrderId', firebaseOrderId);
                    orderSaved = true; // Marcar como guardada para evitar duplicados
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
        const orderData = {
            items: cart.map(item => ({
                id: item.id,
                title: item.name,
                quantity: item.quantity,
                unit_price: item.price,
                currency_id: 'ARS'
            })),
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
            back_urls: {
                success: window.location.origin + '/success.html',
                failure: window.location.origin + '/failure.html',
                pending: window.location.origin + '/pending.html'
            },
            auto_return: 'approved',
            metadata: {
                datosFacturacion: datosFacturacion,
                firestoreOrderId: localStorage.getItem('lastOrderId')
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
        
        // Crear botón de pago
        const checkout = mercadopago.checkout({
            preference: {
                id: preference.id
            },
            render: {
                container: '#mercadopago-button',
                label: 'Pagar con MercadoPago'
            }
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

// Usar las funciones de carrito.js en lugar de redefinirlas
function getCart() {
    // Si window.getCart existe (de carrito.js), usarla
    if (typeof window.getCart === 'function') {
        console.log('✅ Usando window.getCart de carrito.js');
        return window.getCart();
    }
    // Fallback si no está cargado (no debería pasar)
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

// ===================================
// NOTA: CONFIGURACIÓN DEL BACKEND
// ===================================
/*
Para completar la integración con MercadoPago, necesitas crear un endpoint en tu backend:

POST /api/create-preference

Ejemplo con Node.js + Express:

const mercadopago = require('mercadopago');

mercadopago.configure({
    access_token: 'TU_ACCESS_TOKEN_AQUI' // Obtener de MercadoPago
});

app.post('/api/create-preference', async (req, res) => {
    try {
        const preference = {
            items: req.body.items,
            payer: req.body.payer,
            shipments: req.body.shipments,
            back_urls: req.body.back_urls,
            auto_return: req.body.auto_return,
            metadata: req.body.metadata
        };

        const response = await mercadopago.preferences.create(preference);
        res.json({ id: response.body.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

Documentación oficial: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/landing
*/

// ===================================
// EXPORTAR FUNCIONES AL ÁMBITO GLOBAL
// ===================================
// Necesario para que los eventos onclick funcionen con módulos ES6
window.toggleMobileMenu = toggleMobileMenu;
window.continuarPago = continuarPago;
window.volverFacturacion = volverFacturacion;
window.toggleFacturacion = toggleFacturacion;


