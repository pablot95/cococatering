// Checkout Page - Cocó Catering
// Integración con MercadoPago Checkout Pro y Firebase Firestore

// ===================================
// IMPORTAR FIRESTORE SERVICE
// ===================================
import { createOrder, saveCustomer } from './firestore-service.js';

// ===================================
// CONFIGURACIÓN DE MERCADOPAGO
// ===================================
// TODO: Reemplazar con tus credenciales reales de MercadoPago
const MP_PUBLIC_KEY = 'TU_PUBLIC_KEY_AQUI'; // Obtener de: https://www.mercadopago.com.ar/developers/panel/credentials
// El ACCESS_TOKEN se debe configurar en el backend

// Variables globales
let currentStep = 1;
let datosComprador = {};
let datosFacturacion = {};
let mercadopago;

// ===================================
// INICIALIZACIÓN
// ===================================
document.addEventListener('DOMContentLoaded', function() {
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
});

// ===================================
// RESUMEN DEL PEDIDO
// ===================================
function loadOrderSummary() {
    const cart = getCart();
    const orderItemsContainer = document.getElementById('orderItems');
    
    if (cart.length === 0) {
        window.location.href = 'carrito.html';
        return;
    }
    
    // Renderizar items
    orderItemsContainer.innerHTML = cart.map(item => `
        <div class="order-item">
            <img src="${item.image}" alt="${item.name}" class="order-item-image">
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
    // Validar formulario de datos del comprador primero
    const formDatos = document.getElementById('datosCompradorForm');
    if (!formDatos.checkValidity()) {
        formDatos.reportValidity();
        return;
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
// INTEGRACIÓN MERCADOPAGO Y FIRESTORE
// ===================================
async function initMercadoPago() {
    // Preparar datos de la orden para Firestore
    const cart = getCart();
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const envioGratis = subtotal >= 180000;
    
    // Guardar orden en Firestore
    try {
        const orderData = {
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
            paymentStatus: 'pending',
            // Metadatos
            origen: 'web'
        };
        
        // Guardar en Firestore
        const orderId = await createOrder(orderData);
        console.log('Orden guardada en Firestore con ID:', orderId);
        
        // Guardar cliente en Firestore si no existe
        await saveCustomer({
            nombre: datosComprador.nombre,
            dni: datosComprador.dni,
            telefono: datosComprador.telefono,
            email: datosComprador.email,
            direccion: {
                calle: datosComprador.calle,
                altura: datosComprador.altura,
                ciudad: datosComprador.ciudad,
                provincia: datosComprador.provincia
            }
        });
        
        // Guardar orderId en localStorage para referencia
        localStorage.setItem('lastOrderId', orderId);
        
    } catch (error) {
        console.error('Error al guardar orden en Firestore:', error);
    }
    
    // Verificar si tenemos las credenciales de MercadoPago configuradas
    if (!mercadopago || MP_PUBLIC_KEY === 'TU_PUBLIC_KEY_AQUI') {
        console.log('MercadoPago no configurado. Orden guardada en Firestore.');
        // Mostrar mensaje temporal
        const pagoContainer = document.getElementById('mercadopago-button');
        pagoContainer.innerHTML = `
            <div style="padding: 20px; background: #f0f0f0; border-radius: 10px; text-align: center;">
                <p style="margin-bottom: 15px;">✅ Tu orden ha sido registrada exitosamente</p>
                <p style="color: #777; font-size: 14px;">En breve nos pondremos en contacto contigo</p>
                <button onclick="window.location.href='index.html'" style="margin-top: 15px; padding: 10px 20px; background: var(--bordo); color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Volver al inicio
                </button>
            </div>
        `;
        return;
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
                    number: datosComprador.dni
                },
                phone: {
                    number: datosComprador.telefono
                },
                address: {
                    street_name: datosComprador.calle,
                    street_number: datosComprador.altura,
                    zip_code: datosComprador.codigoPostal
                }
            },
            shipments: {
                receiver_address: {
                    street_name: datosComprador.calle,
                    street_number: datosComprador.altura,
                    floor: datosComprador.piso,
                    apartment: datosComprador.depto,
                    city_name: datosComprador.ciudad,
                    state_name: datosComprador.provincia,
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
        const response = await fetch('/api/create-preference', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const preference = await response.json();
        
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
        
    } catch (error) {
        console.error('Error al inicializar MercadoPago:', error);
        alert('Hubo un error al procesar el pago. Por favor, intenta nuevamente.');
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
