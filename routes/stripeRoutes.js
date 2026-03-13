const express = require('express')
const keys = require("../lib/keys");
const router = express.Router();
const stripe = require('stripe')(keys.STRIPE_KEY);

router.get("/testStripe", (req, res) => {
    return res.render("payment2", {
      stripe_key: keys.STRIPE_PUBLIC_KEY,
  
      amount: 33,
      patientId: "34343",
      phoneNo: "4832984938249",
    });
  });


router.post('/api/createStripeIntent', async (req, res) => {
    try {
      const { amount } = req.body;
      const origin = req.headers.origin; // Dynamically get the frontend origin
  
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: 'Test' },
            unit_amount: amount* 100, // Stripe expects the amount in cents
          },
          quantity: 1
        }],
        mode: 'payment',
        success_url: `${origin}/success`,
        cancel_url: `${origin}/cancel`,
      });
  
      res.json({ id: session.id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

  module.exports = router