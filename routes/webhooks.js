const express = require('express');
const supabase = require('../utils/supabaseClient');


const router = express.Router();

// Webhook for Square payments
router.post('/webhooks/payment', async (req, res) => {
        try {
                const webhookData = req.body;
                
                console.log('Payment Webhook Received:', JSON.stringify(webhookData, null, 2));
                
                // Log to Supabase
                const { error } = await supabase
                        .from('logs')
                        .insert([
                                {
                                        source: 'square_payment',
                                        data: webhookData
                                }
                        ]);
                
                if (error) throw error;
                
                // Log specific payment details
                if (webhookData.data && webhookData.data.object) {
                        const payment = webhookData.data.object;
                        console.log('Payment ID:', payment.id);
                        console.log('Amount:', payment.amount_money);
                        console.log('Status:', payment.status);
                }
                
                res.json({ success: true, message: 'Webhook received' });
        } catch (error) {
                console.error('Webhook Error:', error.message);
                res.status(500).json({ error: error.message });
        }
});

// Test webhook endpoint
router.post('/webhooks/test-payment', async (req, res) => {
        try {
                const testData = req.body;
                
                console.log('Test Webhook Received:', JSON.stringify(testData, null, 2));
                console.log('Timestamp:', new Date().toISOString());
                
                // Log to Supabase
                const { error } = await supabase
                        .from('logs')
                        .insert([
                                {
                                        source: 'test_payment',
                                        data: testData
                                }
                        ]);
                
                if (error) throw error;
                
                res.json({ success: true, message: 'Test webhook received' });
        } catch (error) {
                console.error('Test Webhook Error:', error.message);
                res.status(500).json({ error: error.message });
        }
});

module.exports = router;