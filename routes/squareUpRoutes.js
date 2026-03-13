// routes/square.js
const express = require("express");
const { SquareClient, SquareEnvironment, SquareError } = require("square");
const keys = require("../lib/keys");
const { updateOrderStatus } = require("../lib/supabaseFunctions");

const router = express.Router();

// Initialize the Square client (v40+)
const client = new SquareClient({
  token: keys.SQUARE_ACCESS_TOKEN,                 // ← 'token' (not accessToken)
  environment: keys.IS_SANDBOX ? SquareEnvironment.Sandbox : SquareEnvironment.Production,          // or .Production
});

// ───────────────────────────────────────────────────────────────
// Create payment  POST /create-payment
// body: { amount: 5, sourceId: "cnon:...", customerId?, idempotencyKey }
// ───────────────────────────────────────────────────────────────
router.post("/create-payment", async (req, res) => {
  try {
    const { amount, sourceId, customerId, idempotencyKey, uuid } = req.body;

    const result = await client.payments.create({
      sourceId,
      customerId,
      idempotencyKey,
      amountMoney: {
        amount: BigInt(Math.round(Number(amount) * 100)),
        currency: "USD",
      },
    });

    const safeResult = JSON.parse(
      JSON.stringify(result, (_, v) => (typeof v === "bigint" ? v.toString() : v))
    );

    
    updateOrderStatus(uuid, 'completed/payment');

    res.json(safeResult);
  } catch (err) {
    if (err instanceof SquareError) {
      const errorCode = err.errors?.[0]?.code;
      const errorMessage = err.errors?.[0]?.detail || err.message;
      
      let userMessage = "Payment failed. Please try again.";
      let statusCode = 400;

      console.error("Square API Error:", err.errors);

      // Handle specific error codes
      switch (errorCode) {
        case "CARD_DECLINED":
          userMessage = "Your card was declined. Please try another payment method.";
          break;
        case "INSUFFICIENT_FUNDS":
          userMessage = "Insufficient funds. Please check your balance.";
          break;
        case "LOST_CARD":
        case "STOLEN_CARD":
          userMessage = "This card cannot be used. Please try another.";
          break;
        case "EXPIRED_CARD":
          userMessage = "Your card has expired. Please use a different card.";
          break;
        case "INVALID_EXPIRATION":
          userMessage = "Invalid card expiration date.";
          break;
        case "CVV_FAILURE":
          userMessage = "Invalid CVV. Please check and try again.";
          break;
        case "INVALID_ACCOUNT":
          userMessage = "Invalid account. Please try another payment method.";
          break;
        
          case "GENERIC_DECLINE":
          userMessage = "The card was declined. Please try another payment method.";
          break;
        case "RATE_LIMITED":
          userMessage = "Too many attempts. Please try again later.";
          statusCode = 429;
          break;
      }

      updateOrderStatus(req.body.uuid, 'failed/payment/'+errorCode);

      return res.status(statusCode).json({ 
        error: userMessage,
        code: errorCode,
        details: errorMessage 
      });
    }
    res.status(500).json({ error: "An unexpected error occurred.", details: String(err) });
  }
});


// ───────────────────────────────────────────────────────────────
// Get a payment by ID  GET /payment/:paymentId
// ───────────────────────────────────────────────────────────────
router.get("/payment/:paymentId", async (req, res) => {
  try {
    const result = await client.payments.get({ paymentId: req.params.paymentId });
    res.json(result.payment);
  } catch (err) {
    if (err instanceof SquareError) {
      return res.status(400).json({ error: err.message, details: err.errors });
    }
    res.status(500).json({ error: "Unexpected error", details: String(err) });
  }
});

// ───────────────────────────────────────────────────────────────
// List payments  GET /payments?limit=50&cursor=...&sortOrder=DESC
// ───────────────────────────────────────────────────────────────
router.get("/payments", async (req, res) => {
  try {
    const { limit, cursor, sortOrder = "DESC" } = req.query;
    const pager = await client.payments.list({
      limit: limit ? Number(limit) : undefined,
      cursor,
      sortOrder, // "ASC" | "DESC"
    });

    // The v40+ SDK returns an async pager; collect one page:
    const page = await pager.data;
    res.json(page);
  } catch (err) {
    if (err instanceof SquareError) {
      return res.status(400).json({ error: err.message, details: err.errors });
    }
    res.status(500).json({ error: "Unexpected error", details: String(err) });
  }
});

// ───────────────────────────────────────────────────────────────
// Create customer  POST /customer
// body: { givenName, familyName, emailAddress, phoneNumber }
// ───────────────────────────────────────────────────────────────
router.post("/customer", async (req, res) => {
  try {
    const { givenName, familyName, emailAddress, phoneNumber } = req.body;
    const result = await client.customers.create({
      givenName,
      familyName,
      emailAddress,
      phoneNumber,
    });
    res.json(result.customer);
  } catch (err) {
    if (err instanceof SquareError) {
      return res.status(400).json({ error: err.message, details: err.errors });
    }
    res.status(500).json({ error: "Unexpected error", details: String(err) });
  }
});

// ───────────────────────────────────────────────────────────────
// Get customer  GET /customer/:customerId
// ───────────────────────────────────────────────────────────────
router.get("/customer/:customerId", async (req, res) => {
  try {
    const result = await client.customers.get({ customerId: req.params.customerId });
    res.json(result.customer);
  } catch (err) {
    if (err instanceof SquareError) {
      return res.status(400).json({ error: err.message, details: err.errors });
    }
    res.status(500).json({ error: "Unexpected error", details: String(err) });
  }
});

router.get("/pay-webview", (req, res) => {
  res.render("square", {
    applicationId: keys.SQUARE_APPLICATION_ID,
    locationId: keys.SQUARE_LOCATION_ID,
  });
});

module.exports = router;
