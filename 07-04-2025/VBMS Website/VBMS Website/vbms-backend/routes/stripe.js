const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticateToken } = require('../middleware/auth');
const { pgPool } = require('../config/database');

// VBMS Pricing Plans
const PRICING_PLANS = {
  start: {
    id: 'start',
    name: 'Start Plan',
    price: 497,
    currency: 'usd',
    features: ['Basic Features', 'Email Support', '10 Users'],
    stripePriceId: 'price_start_497'
  },
  grow: {
    id: 'grow',
    name: 'Grow Plan',
    price: 997,
    currency: 'usd',
    features: ['Advanced Features', 'Priority Support', '50 Users'],
    stripePriceId: 'price_grow_997'
  },
  scale: {
    id: 'scale',
    name: 'Scale Plan',
    price: 1997,
    currency: 'usd',
    features: ['Enterprise Features', '24/7 Support', 'Unlimited Users'],
    stripePriceId: 'price_scale_1997'
  }
};

// Get available pricing plans
router.get('/plans', async (req, res) => {
  try {
    res.json({
      success: true,
      plans: Object.values(PRICING_PLANS)
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pricing plans'
    });
  }
});

// Create payment intent for subscription
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  try {
    const { planId } = req.body;

    if (!PRICING_PLANS[planId]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan selected'
      });
    }

    const plan = PRICING_PLANS[planId];
    const client = await pgPool.connect();

    // Get user info
    const userResult = await client.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    if (!userResult.rows[0]) {
      client.release();
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.price * 100, // Convert to cents
      currency: plan.currency,
      metadata: {
        userId: req.user.id,
        planId: planId,
        userEmail: userResult.rows[0].email
      }
    });

    // Save payment record to PostgreSQL
    await client.query(`
      INSERT INTO payments (user_id, stripe_payment_intent_id, amount, currency, plan_id, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `, [req.user.id, paymentIntent.id, plan.price, plan.currency, planId, 'pending']);

    client.release();

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: plan.price,
      plan: plan
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent',
      details: error.message
    });
  }
});

// Confirm successful payment
router.post('/confirm-payment', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment Intent ID is required'
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'Payment not successful'
      });
    }

    const client = await pgPool.connect();

    // Update payment status in database
    await client.query(`
      UPDATE payments 
      SET status = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE stripe_payment_intent_id = $1 AND user_id = $2
    `, [paymentIntentId, req.user.id]);

    // Update user subscription status
    const planId = paymentIntent.metadata.planId;
    await client.query(`
      UPDATE users 
      SET subscription_plan = $1, subscription_status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [planId, req.user.id]);

    client.release();

    res.json({
      success: true,
      message: 'Payment confirmed and subscription activated',
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100
      }
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment',
      details: error.message
    });
  }
});

// Get user subscription status
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    const client = await pgPool.connect();
    const result = await client.query(`
      SELECT subscription_plan, subscription_status, created_at 
      FROM users 
      WHERE id = $1
    `, [req.user.id]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];
    const planDetails = user.subscription_plan ? PRICING_PLANS[user.subscription_plan] : null;

    res.json({
      success: true,
      subscription: {
        plan: planDetails,
        status: user.subscription_status || 'inactive',
        since: user.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription details',
      details: error.message
    });
  }
});

// Get payment history
router.get('/payments', authenticateToken, async (req, res) => {
  try {
    const client = await pgPool.connect();
    const result = await client.query(`
      SELECT stripe_payment_intent_id, amount, currency, plan_id, status, created_at
      FROM payments 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [req.user.id]);

    client.release();

    res.json({
      success: true,
      payments: result.rows
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment history',
      details: error.message
    });
  }
});

module.exports = router;