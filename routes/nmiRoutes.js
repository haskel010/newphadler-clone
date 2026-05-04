// routes/nmiRoutes.js
const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const keys = require('../lib/keys');
const { updateOrderStatus, insertPaymentLog } = require('../lib/supabaseFunctions');
const router = express.Router();

// NMI Configuration
const NMI_CONFIG = {
  API_URL: keys.IS_SANDBOX ? 'https://sandbox.nmi.com/api/transact.php' : 'https://secure.nmi.com/api/transact.php',
  PRIVATE_KEY: keys.IS_SANDBOX ? keys.NMI.SANDBOX.PRIVATE_KEY : keys.NMI.PRODUCTION.PRIVATE_KEY,
  TOKENIZATION_KEY: keys.IS_SANDBOX ? keys.NMI.SANDBOX.TOKENIZATION_KEY : keys.NMI.PRODUCTION.TOKENIZATION_KEY,
  CHECKOUT_PUBLIC_KEY: keys.IS_SANDBOX ? keys.NMI.SANDBOX.CHECKOUT_PUBLIC_KEY : keys.NMI.PRODUCTION.CHECKOUT_PUBLIC_KEY,
};

// Validate NMI credentials
if (!NMI_CONFIG.PRIVATE_KEY || !NMI_CONFIG.TOKENIZATION_KEY) {
  console.warn('⚠️ [NMI] Missing API credentials – check your keys.js file');
}

/**
 * POST /nmi/create-payment
 * ────────────────────────────────────────────
 * Creates a direct payment transaction with NMI
 * Body: { 
 *   cardNumber, expiryDate, cvv, amount, 
 *   firstName, lastName, email, phone,
 *   address, city, state, zip, country,
 *   uuid, description
 * }
 */
router.post('/create-payment', async (req, res) => {
  try {
    const {
      cardNumber,
      expiryDate, // MM/YY format
      cvv,
      amount,
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      zip,
      country,
      uuid,
      description = 'Payment via NMI',
    } = req.body;

    // Validate required fields
    if (!cardNumber || !expiryDate || !cvv || !amount) {
      await insertPaymentLog({
        gatewayName: 'nmi',
        endpoint: '/nmi/create-payment',
        amount,
        response: {
          status: 'error',
          reason: 'missing_required_payment_fields',
        },
      });

      return res.status(400).json({
        success: false,
        message: 'Missing required payment fields',
      });
    }
    

    
    // Prepare NMI request
    const params = new URLSearchParams();
    params.append('security_key', NMI_CONFIG.PRIVATE_KEY);
    params.append('type', 'sale');
    params.append('amount', (parseFloat(amount)).toString()); // Amount is already in dollars
    params.append('ccnumber', cardNumber.replace(/\s/g, ''));
    params.append('ccexp', expiryDate.replace('/', ''));
    params.append('cvv', cvv);

    // Billing information
    if (firstName) params.append('firstname', firstName);
    if (lastName) params.append('lastname', lastName);
    if (email) params.append('email', email);
    if (phone) params.append('phone', phone);
    if (address) params.append('address1', address);
    if (city) params.append('city', city);
    if (state) params.append('state', state);
    if (zip) params.append('zip', zip);
    if (country) params.append('country', country);

    // Order info
    params.append('orderid', (uuid || uuidv4()).substring(0, 50));
    params.append('orderdescription', description);

    // Make request to NMI
    const response = await axios.post(NMI_CONFIG.API_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Parse NMI response
    const responseData = parseNMIResponse(response.data);
    console.log('[NMI] Payment Response:', response.data);

    
    if (responseData.response === '1') {
      // Success
      updateOrderStatus(uuid, 'completed/payment');
      await insertPaymentLog({
        gatewayName: 'nmi',
        endpoint: '/nmi/create-payment',
        amount,
        response: {
          status: 'success',
          transactionId: responseData.transactionid,
          authCode: responseData.authcode,
          orderid: responseData.orderid,
          response: responseData.response,
          responsetext: responseData.responsetext,
        },
      });
      

      res.json({
        success: true,
        message: 'Payment successful',
        transaction: {
          transactionId: responseData.transactionid,
          authCode: responseData.authcode,
          amount: responseData.amount, // Amount is already in dollars
          orderid: responseData.orderid,
          response: responseData.response,
          responsetext: responseData.responsetext,
        },
      });
    } else if (responseData.response === '2') {
      // Declined
      await insertPaymentLog({
        gatewayName: 'nmi',
        endpoint: '/nmi/create-payment',
        amount,
        response: {
          status: 'error',
          response: responseData.response,
          responsetext: responseData.responsetext,
        },
      });

      res.status(400).json({
        success: false,
        message: 'Payment declined',
        details: responseData.responsetext,
      });
    } else {
      // Error
      await insertPaymentLog({
        gatewayName: 'nmi',
        endpoint: '/nmi/create-payment',
        amount,
        response: {
          status: 'error',
          response: responseData.response,
          responsetext: responseData.responsetext || 'Unknown error',
        },
      });

      res.status(400).json({
        success: false,
        message: 'Payment processing error',
        details: responseData.responsetext || 'Unknown error',
      });
    }
  } catch (err) {
    console.error('[NMI] Error:', err.message);
    await insertPaymentLog({
      gatewayName: 'nmi',
      endpoint: '/nmi/create-payment',
      amount: req.body?.amount,
      response: {
        status: 'error',
        message: err.message,
      },
    });

    res.status(500).json({
      success: false,
      message: 'Payment processing failed',
      error: err.message,
    });
  }
});

/**
 * POST /nmi/create-token-payment
 * ────────────────────────────────────────────
 * Creates a payment using a stored payment token
 * Body: { tokenId, amount, uuid, description }
 */
router.post('/create-token-payment', async (req, res) => {
  try {
    const { tokenId, amount, uuid, description = 'Payment via NMI' } = req.body;

    if (!tokenId || !amount) {
      await insertPaymentLog({
        gatewayName: 'nmi',
        endpoint: '/nmi/create-token-payment',
        amount,
        response: {
          status: 'error',
          reason: 'missing_required_fields',
        },
      });

      return res.status(400).json({
        success: false,
        message: 'Missing required fields: tokenId, amount',
      });
    }

    const params = new URLSearchParams();
    params.append('security_key', NMI_CONFIG.PRIVATE_KEY);
    params.append('type', 'sale');
    params.append('amount', (parseFloat(amount) * 100).toString());
    params.append('token', tokenId);
    params.append('orderid', (uuid || uuidv4()).substring(0, 50));
    params.append('orderdescription', description);

    const response = await axios.post(NMI_CONFIG.API_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const responseData = parseNMIResponse(response.data);

    if (responseData.response === '1') {
      updateOrderStatus(uuid, 'completed/payment');
      await insertPaymentLog({
        gatewayName: 'nmi',
        endpoint: '/nmi/create-token-payment',
        amount,
        response: {
          status: 'success',
          transactionId: responseData.transactionid,
          authCode: responseData.authcode,
          orderid: responseData.orderid,
          response: responseData.response,
          responsetext: responseData.responsetext,
        },
      });

      res.json({
        success: true,
        message: 'Payment successful',
        transaction: {
          transactionId: responseData.transactionid,
          authCode: responseData.authcode,
          amount: responseData.amount / 100,
          orderid: responseData.orderid,
        },
      });
    } else {
      await insertPaymentLog({
        gatewayName: 'nmi',
        endpoint: '/nmi/create-token-payment',
        amount,
        response: {
          status: 'error',
          response: responseData.response,
          responsetext: responseData.responsetext,
        },
      });

      res.status(400).json({
        success: false,
        message: 'Payment failed',
        details: responseData.responsetext,
      });
    }
  } catch (err) {
    console.error('[NMI] Token Payment Error:', err.message);
    await insertPaymentLog({
      gatewayName: 'nmi',
      endpoint: '/nmi/create-token-payment',
      amount: req.body?.amount,
      response: {
        status: 'error',
        message: err.message,
      },
    });

    res.status(500).json({
      success: false,
      message: 'Payment processing failed',
      error: err.message,
    });
  }
});

/**
 * POST /nmi/validate-card
 * ────────────────────────────────────────────
 * Validates a card without charging it
 * Body: { cardNumber, expiryDate, cvv }
 */
router.post('/validate-card', async (req, res) => {
  try {
    const { cardNumber, expiryDate, cvv } = req.body;

    if (!cardNumber || !expiryDate || !cvv) {
      return res.status(400).json({
        success: false,
        message: 'Missing required card fields',
      });
    }

    const params = new URLSearchParams();
    params.append('security_key', NMI_CONFIG.PRIVATE_KEY);
    params.append('type', 'validate');
    params.append('ccnumber', cardNumber.replace(/\s/g, ''));
    params.append('ccexp', expiryDate.replace('/', ''));
    params.append('cvv', cvv);

    const response = await axios.post(NMI_CONFIG.API_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('[NMI] Card Validation Response:', response.data,req.body);
    const responseData = parseNMIResponse(response.data);

    res.json({
      success: responseData.response === '1',
      message: responseData.responsetext,
      valid: responseData.response === '1',
    });
  } catch (err) {
    console.error('[NMI] Card Validation Error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Card validation failed',
      error: err.message,
    });
  }
});

/**
 * GET /nmi/transaction/:transactionId
 * ────────────────────────────────────────────
 * Retrieves details of a specific transaction
 */
router.get('/transaction/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required',
      });
    }

    const params = new URLSearchParams();
    params.append('security_key', NMI_CONFIG.PRIVATE_KEY);
    params.append('type', 'query');
    params.append('transactionid', transactionId);

    const response = await axios.post(NMI_CONFIG.API_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const responseData = parseNMIResponse(response.data);

    res.json({
      success: true,
      transaction: responseData,
    });
  } catch (err) {
    console.error('[NMI] Transaction Query Error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction',
      error: err.message,
    });
  }
});

/**
 * POST /nmi/refund
 * ────────────────────────────────────────────
 * Refunds a transaction (full or partial)
 * Body: { transactionId, amount (optional for full refund) }
 */
router.post('/refund', async (req, res) => {
  try {
    const { transactionId, amount } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required',
      });
    }

    const params = new URLSearchParams();
    params.append('security_key', NMI_CONFIG.PRIVATE_KEY);
    params.append('type', 'refund');
    params.append('transactionid', transactionId);

    if (amount) {
      params.append('amount', (parseFloat(amount) * 100).toString());
    }

    const response = await axios.post(NMI_CONFIG.API_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const responseData = parseNMIResponse(response.data);

    if (responseData.response === '1') {
      res.json({
        success: true,
        message: 'Refund successful',
        refund: {
          refundId: responseData.transactionid,
          originalTransactionId: transactionId,
          amount: responseData.amount / 100,
          responsetext: responseData.responsetext,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Refund failed',
        details: responseData.responsetext,
      });
    }
  } catch (err) {
    console.error('[NMI] Refund Error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Refund processing failed',
      error: err.message,
    });
  }
});

/**
 * POST /nmi/void
 * ────────────────────────────────────────────
 * Voids a transaction
 * Body: { transactionId }
 */
router.post('/void', async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required',
      });
    }

    const params = new URLSearchParams();
    params.append('security_key', NMI_CONFIG.PRIVATE_KEY);
    params.append('type', 'void');
    params.append('transactionid', transactionId);

    const response = await axios.post(NMI_CONFIG.API_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const responseData = parseNMIResponse(response.data);

    if (responseData.response === '1') {
      res.json({
        success: true,
        message: 'Transaction voided successfully',
        void: {
          transactionId,
          responsetext: responseData.responsetext,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Void failed',
        details: responseData.responsetext,
      });
    }
  } catch (err) {
    console.error('[NMI] Void Error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Void processing failed',
      error: err.message,
    });
  }
});

/**
 * POST /nmi/capture
 * ────────────────────────────────────────────
 * Captures a previously authorized transaction
 * Body: { transactionId, amount (optional) }
 */
router.post('/capture', async (req, res) => {
  try {
    const { transactionId, amount } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required',
      });
    }

    const params = new URLSearchParams();
    params.append('security_key', NMI_CONFIG.PRIVATE_KEY);
    params.append('type', 'capture');
    params.append('transactionid', transactionId);

    if (amount) {
      params.append('amount', (parseFloat(amount) * 100).toString());
    }

    const response = await axios.post(NMI_CONFIG.API_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const responseData = parseNMIResponse(response.data);

    if (responseData.response === '1') {
      res.json({
        success: true,
        message: 'Capture successful',
        capture: {
          transactionId: responseData.transactionid,
          amount: responseData.amount / 100,
          responsetext: responseData.responsetext,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Capture failed',
        details: responseData.responsetext,
      });
    }
  } catch (err) {
    console.error('[NMI] Capture Error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Capture processing failed',
      error: err.message,
    });
  }
});

/**
 * Helper function to parse NMI response
 * NMI returns URL-encoded format
 */
function parseNMIResponse(responseData) {
  const parsed = {};
  const pairs = responseData.split('&');

  pairs.forEach((pair) => {
    const [key, value = ''] = pair.split('=');
    if (key) {
      parsed[key] = decodeURIComponent(value);
    }
  });

  return parsed;
}

module.exports = router;
