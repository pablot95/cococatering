// Backend para MercadoPago Checkout Pro - Cocó Catering
// Node.js + Express + MercadoPago SDK

const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar CORS para permitir peticiones desde tu frontend
app.use(cors());
app.use(express.json());

// ===================================
// CONFIGURAR MERCADOPAGO
// ===================================
mercadopago.configure({
    access_token: process.env.MP_ACCESS_TOKEN || 'APP_USR-1994671338029929-121617-616567dcc8aed895c33977bb1eb37d82-2513559413'
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
// SERVIDOR
// ===================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📦 Endpoints disponibles:`);
    console.log(`   POST /api/create-preference - Crear preferencia de pago`);
    console.log(`   POST /api/webhook - Recibir notificaciones de MercadoPago`);
    console.log(`   GET  /api/payment/:id - Obtener información de pago`);
});
