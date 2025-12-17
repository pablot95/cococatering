// Backend para MercadoPago Checkout Pro - Cocó Catering
// Node.js + Express + MercadoPago SDK

const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar CORS para permitir peticiones desde tu frontend
app.use(cors());
app.use(express.json());

// Servir archivos estáticos
app.use(express.static(__dirname));

// Ruta para /gestion sin .html
app.get('/gestion', (req, res) => {
    res.sendFile(path.join(__dirname, 'gestion.html'));
});

// ===================================
// CONFIGURAR MERCADOPAGO
// ===================================
mercadopago.configure({
    access_token: process.env.MP_ACCESS_TOKEN || 'APP_USR-1994671338029929-121617-616567dcc8aed895c33977bb1eb37d82-2513559413'
});

// ===================================
// CONFIGURAR NODEMAILER
// ===================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'cococateringsanisidro@gmail.com',
        pass: process.env.EMAIL_PASS // Contraseña de aplicación de Gmail
    }
});

// Función para enviar email de orden
async function enviarEmailOrden(orderData) {
    const { customer, items, total, paymentId, orderDate } = orderData;
    
    // Construir HTML de items
    const itemsHTML = items.map(item => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toLocaleString('es-AR')}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toLocaleString('es-AR')}</td>
        </tr>
    `).join('');

    const mailOptions = {
        from: 'cococateringsanisidro@gmail.com',
        to: 'cococateringsanisidro@gmail.com',
        subject: `🛒 Nueva Orden #${paymentId} - Cocó Catering`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d4a574;">Nueva Orden de Compra</h2>
                
                <h3>Datos del Cliente:</h3>
                <p><strong>Nombre:</strong> ${customer.nombre}</p>
                <p><strong>Email:</strong> ${customer.email}</p>
                <p><strong>Teléfono:</strong> ${customer.telefono}</p>
                <p><strong>DNI:</strong> ${customer.dni}</p>
                
                <h3>Dirección de Entrega:</h3>
                <p>
                    ${customer.calle} ${customer.altura}${customer.piso ? ', Piso ' + customer.piso : ''}${customer.depto ? ', Depto ' + customer.depto : ''}<br>
                    ${customer.ciudad}, ${customer.provincia}<br>
                    CP: ${customer.codigoPostal}
                </p>
                
                <h3>Productos Ordenados:</h3>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                        <tr style="background-color: #f5f5f5;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Producto</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Cant.</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Precio Unit.</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px;">TOTAL:</td>
                            <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px; color: #d4a574;">$${total.toLocaleString('es-AR')}</td>
                        </tr>
                    </tfoot>
                </table>
                
                <p><strong>ID de Pago MercadoPago:</strong> ${paymentId}</p>
                <p><strong>Fecha:</strong> ${orderDate}</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">Este email fue generado automáticamente por el sistema de Cocó Catering.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
}

// ===================================
// ENDPOINT: Enviar email de orden
// ===================================
app.post('/api/send-order-email', async (req, res) => {
    try {
        await enviarEmailOrden(req.body);
        res.json({ success: true, message: 'Email enviado correctamente' });
    } catch (error) {
        console.error('Error al enviar email:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al enviar email',
            details: error.message 
        });
    }
});

// ===================================
// ENDPOINT: Crear preferencia de pago
// ===================================
app.post('/api/create-preference', async (req, res) => {
    try {
        const { items, payer, back_urls, auto_return, external_reference } = req.body;

        // Crear preferencia de pago
        const preference = {
            items: items,
            payer: payer,
            back_urls: back_urls,
            auto_return: auto_return || 'approved',
            external_reference: external_reference,
            notification_url: back_urls.success.replace('/success.html', '/api/webhook'),
            statement_descriptor: 'Cocó Catering',
            payment_methods: {
                installments: 12,
                default_installments: 1
            }
        };

        const response = await mercadopago.preferences.create(preference);
        
        res.json({
            id: response.body.id,
            init_point: response.body.init_point, // URL para Checkout Pro
            sandbox_init_point: response.body.sandbox_init_point
        });

    } catch (error) {
        console.error('Error al crear preferencia:', error);
        res.status(500).json({ 
            error: 'Error al crear preferencia de pago',
            details: error.message 
        });
    }
});

// ===================================
// ENDPOINT: Webhook para notificaciones de MercadoPago
// ===================================
app.post('/api/webhook', async (req, res) => {
    try {
        const { type, data } = req.body;

        console.log('Webhook recibido:', { type, data });

        // Si es una notificación de pago
        if (type === 'payment') {
            const paymentId = data.id;
            
            // Obtener información del pago
            const payment = await mercadopago.payment.findById(paymentId);
            
            console.log('Pago:', {
                id: payment.body.id,
                status: payment.body.status,
                external_reference: payment.body.external_reference,
                transaction_amount: payment.body.transaction_amount
            });

            // Aquí puedes:
            // - Actualizar el estado del pedido en tu base de datos
            // - Enviar email de confirmación al cliente
            // - Actualizar stock, etc.
            
            // Ejemplo: guardar en base de datos
            // await database.updateOrderStatus(payment.body.external_reference, payment.body.status);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Error en webhook:', error);
        res.status(500).send('Error');
    }
});

// ===================================
// ENDPOINT: Obtener información de pago
// ===================================
app.get('/api/payment/:id', async (req, res) => {
    try {
        const paymentId = req.params.id;
        const payment = await mercadopago.payment.findById(paymentId);
        
        res.json({
            status: payment.body.status,
            status_detail: payment.body.status_detail,
            transaction_amount: payment.body.transaction_amount,
            external_reference: payment.body.external_reference
        });
    } catch (error) {
        console.error('Error al obtener pago:', error);
        res.status(500).json({ error: 'Error al obtener información del pago' });
    }
});

// ===================================
// GESTIÓN DE ÓRDENES (reemplaza Firebase)
// ===================================
const fs = require('fs');
const path = require('path');
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// Inicializar archivo de órdenes si no existe
if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
}

// Leer órdenes
function readOrders() {
    try {
        const data = fs.readFileSync(ORDERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error leyendo órdenes:', error);
        return [];
    }
}

// Guardar órdenes
function saveOrders(orders) {
    try {
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
        return true;
    } catch (error) {
        console.error('Error guardando órdenes:', error);
        return false;
    }
}

// ENDPOINT: Guardar nueva orden
app.post('/api/orders', (req, res) => {
    try {
        const orders = readOrders();
        const newOrder = {
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date().toISOString(),
            status: 'pending'
        };
        orders.push(newOrder);
        saveOrders(orders);
        res.json({ success: true, order: newOrder });
    } catch (error) {
        console.error('Error guardando orden:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ENDPOINT: Obtener todas las órdenes
app.get('/api/orders', (req, res) => {
    try {
        const orders = readOrders();
        const status = req.query.status;
        
        if (status && status !== 'all') {
            const filtered = orders.filter(order => order.status === status);
            res.json(filtered);
        } else {
            res.json(orders);
        }
    } catch (error) {
        console.error('Error obteniendo órdenes:', error);
        res.status(500).json({ error: error.message });
    }
});

// ENDPOINT: Actualizar estado de orden
app.patch('/api/orders/:id', (req, res) => {
    try {
        const orders = readOrders();
        const orderIndex = orders.findIndex(o => o.id === req.params.id);
        
        if (orderIndex === -1) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }
        
        orders[orderIndex] = { ...orders[orderIndex], ...req.body };
        saveOrders(orders);
        res.json({ success: true, order: orders[orderIndex] });
    } catch (error) {
        console.error('Error actualizando orden:', error);
        res.status(500).json({ error: error.message });
    }
});

// ENDPOINT: Eliminar orden
app.delete('/api/orders/:id', (req, res) => {
    try {
        const orders = readOrders();
        const filtered = orders.filter(o => o.id !== req.params.id);
        saveOrders(filtered);
        res.json({ success: true });
    } catch (error) {
        console.error('Error eliminando orden:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===================================
// SERVIDOR
// ===================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📦 Endpoints disponibles:`);
    console.log(`   POST /api/create-preference - Crear preferencia de pago`);
    console.log(`   POST /api/send-order-email - Enviar email de orden`);
    console.log(`   POST /api/orders - Guardar nueva orden`);
    console.log(`   GET  /api/orders - Obtener órdenes`);
    console.log(`   PATCH /api/orders/:id - Actualizar orden`);
    console.log(`   DELETE /api/orders/:id - Eliminar orden`);
    console.log(`   POST /api/webhook - Recibir notificaciones de MercadoPago`);
    console.log(`   GET  /api/payment/:id - Obtener información de pago`);
});
