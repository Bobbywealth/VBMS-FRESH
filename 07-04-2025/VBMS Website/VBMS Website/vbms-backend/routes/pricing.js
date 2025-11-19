const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticateToken } = require('../middleware/auth');
const { pgPool } = require('../config/database');

// In-memory storage for pricing plans (Temporary solution until DB table is created)
let pricingPlans = [
  {
    id: 'start',
    name: 'start',
    displayName: 'Start Package',
    price: 39.99,
    interval: 'month',
    status: 'active',
    description: 'Perfect for small businesses getting started with video monitoring',
    features: {
      liveMonitoring: true,
      orderManagement: true,
      phoneSupport: true,
      customDashboard: false,
      aiPhone: false,
      inventoryTracker: false,
      prioritySupport: false,
      advancedAnalytics: false,
      multiLocation: false,
      apiAccess: false,
      whiteLabel: false,
      dataExport: false,
      integrations: false,
      training: false,
      backup: false
    },
    stripeProductId: process.env.STRIPE_START_PRODUCT_ID,
    stripePriceId: process.env.STRIPE_START_PRICE_ID,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'core',
    name: 'core',
    displayName: 'VBMS Core',
    price: 699.00,
    interval: 'month',
    status: 'active',
    featured: true,
    description: 'Complete business management solution with advanced features',
    features: {
      liveMonitoring: true,
      orderManagement: true,
      phoneSupport: true,
      customDashboard: true,
      aiPhone: false,
      inventoryTracker: true,
      prioritySupport: true,
      advancedAnalytics: true,
      multiLocation: true,
      apiAccess: false,
      whiteLabel: false,
      dataExport: true,
      integrations: true,
      training: true,
      backup: true
    },
    stripeProductId: process.env.STRIPE_CORE_PRODUCT_ID,
    stripePriceId: process.env.STRIPE_CORE_PRICE_ID,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'ai_phone',
    name: 'ai_phone',
    displayName: 'AI Phone System',
    price: 99.00,
    interval: 'month',
    status: 'active',
    description: 'AI-powered phone assistant for order management',
    features: {
      liveMonitoring: false,
      orderManagement: true,
      phoneSupport: true,
      customDashboard: false,
      aiPhone: true,
      inventoryTracker: false,
      prioritySupport: false,
      advancedAnalytics: false,
      multiLocation: false,
      apiAccess: true,
      whiteLabel: false,
      dataExport: false,
      integrations: false,
      training: false,
      backup: false
    },
    stripeProductId: process.env.STRIPE_AI_PHONE_PRODUCT_ID,
    stripePriceId: process.env.STRIPE_AI_PHONE_PRICE_ID,
    perCall: 0.30,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'premium_plus',
    name: 'premium_plus',
    displayName: 'Premium Plus',
    price: 1199.00,
    interval: 'month',
    status: 'active',
    description: 'Complete enterprise solution with all features included',
    features: {
      liveMonitoring: true,
      orderManagement: true,
      phoneSupport: true,
      customDashboard: true,
      aiPhone: true,
      inventoryTracker: true,
      prioritySupport: true,
      advancedAnalytics: true,
      multiLocation: true,
      apiAccess: true,
      whiteLabel: true,
      dataExport: true,
      integrations: true,
      training: true,
      backup: true
    },
    stripeProductId: process.env.STRIPE_PREMIUM_PRODUCT_ID,
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Middleware to check if user is main admin
const requireMainAdmin = async (req, res, next) => {
  try {
    const client = await pgPool.connect();
    const result = await client.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    client.release();

    const user = result.rows[0];
    if (!user || user.role !== 'main_admin') {
      return res.status(403).json({ message: 'Main admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Authentication error', error: error.message });
  }
};

// PUBLIC ENDPOINT: Get active pricing plans for frontend (no auth required)
router.get('/public/plans', async (req, res) => {
  try {
    console.log('📦 Public API: Fetching active pricing plans for frontend...');

    // Filter only active plans and remove admin-only fields
    const publicPlans = pricingPlans
      .filter(plan => plan.status === 'active')
      .map(plan => ({
        id: plan.id,
        name: plan.name,
        displayName: plan.displayName,
        price: plan.price,
        interval: plan.interval,
        description: plan.description,
        features: plan.features,
        featured: plan.featured || false,
        stripePriceId: plan.stripePriceId, // Needed for Stripe checkout
        stripeProductId: plan.stripeProductId // Needed for Stripe checkout
      }))
      .sort((a, b) => a.price - b.price); // Sort by price ascending

    console.log(`✅ Returning ${publicPlans.length} active plans for frontend`);
    res.json(publicPlans);

  } catch (error) {
    console.error('❌ Error fetching public pricing plans:', error);
    res.status(500).json({ message: 'Failed to fetch pricing plans', error: error.message });
  }
});

// Get all pricing plans
router.get('/plans', authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    console.log('📦 Fetching all pricing plans...');

    // Sort by creation date
    const sortedPlans = pricingPlans.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json(sortedPlans);
  } catch (error) {
    console.error('❌ Error fetching pricing plans:', error);
    res.status(500).json({ message: 'Failed to fetch pricing plans', error: error.message });
  }
});

// Get single pricing plan
router.get('/plans/:id', authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    const planId = req.params.id;
    const plan = pricingPlans.find(p => p.id === planId || p._id === planId);

    if (!plan) {
      return res.status(404).json({ message: 'Pricing plan not found' });
    }

    res.json(plan);
  } catch (error) {
    console.error('❌ Error fetching pricing plan:', error);
    res.status(500).json({ message: 'Failed to fetch pricing plan', error: error.message });
  }
});

// Create new pricing plan
router.post('/plans', authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    const client = await pgPool.connect();
    const result = await client.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
    client.release();

    const user = result.rows[0];
    const userName = user ? `${user.first_name} ${user.last_name}` : 'Admin';

    console.log(`👑 Main admin ${userName} creating new pricing plan`);

    const {
      name,
      displayName,
      price,
      interval = 'month',
      status = 'active',
      description,
      features = {},
      featured = false
    } = req.body;

    // Validate required fields
    if (!name || !displayName || price === undefined) {
      return res.status(400).json({ message: 'Name, display name, and price are required' });
    }

    // Check if plan already exists
    const existingPlan = pricingPlans.find(p => p.name === name.toLowerCase());
    if (existingPlan) {
      return res.status(409).json({ message: 'A plan with this name already exists' });
    }

    // Create new plan
    const newPlan = {
      id: generatePlanId(),
      name: name.toLowerCase().replace(/\s+/g, '_'),
      displayName,
      price: parseFloat(price),
      interval,
      status,
      description: description || '',
      features,
      featured,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user.id
    };

    pricingPlans.push(newPlan);

    console.log('✅ Pricing plan created:', newPlan.name);
    res.status(201).json(newPlan);

  } catch (error) {
    console.error('❌ Error creating pricing plan:', error);
    res.status(500).json({ message: 'Failed to create pricing plan', error: error.message });
  }
});

// Update pricing plan
router.put('/plans/:id', authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    const planId = req.params.id;
    const planIndex = pricingPlans.findIndex(p => p.id === planId || p._id === planId);

    if (planIndex === -1) {
      return res.status(404).json({ message: 'Pricing plan not found' });
    }

    const {
      name,
      displayName,
      price,
      interval,
      status,
      description,
      features,
      featured
    } = req.body;

    // Update plan
    const updatedPlan = {
      ...pricingPlans[planIndex],
      ...(name && { name: name.toLowerCase().replace(/\s+/g, '_') }),
      ...(displayName && { displayName }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(interval && { interval }),
      ...(status && { status }),
      ...(description !== undefined && { description }),
      ...(features && { features }),
      ...(featured !== undefined && { featured }),
      updatedAt: new Date()
    };

    pricingPlans[planIndex] = updatedPlan;

    console.log('✅ Pricing plan updated:', updatedPlan.name);
    res.json(updatedPlan);

  } catch (error) {
    console.error('❌ Error updating pricing plan:', error);
    res.status(500).json({ message: 'Failed to update pricing plan', error: error.message });
  }
});

// Delete pricing plan
router.delete('/plans/:id', authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    const planId = req.params.id;
    const planIndex = pricingPlans.findIndex(p => p.id === planId || p._id === planId);

    if (planIndex === -1) {
      return res.status(404).json({ message: 'Pricing plan not found' });
    }

    const deletedPlan = pricingPlans[planIndex];

    // Don't allow deletion of plans that have Stripe products
    if (deletedPlan.stripeProductId) {
      return res.status(400).json({
        message: 'Cannot delete plan that is synced with Stripe. Archive it instead.'
      });
    }

    pricingPlans.splice(planIndex, 1);

    console.log('🗑️ Pricing plan deleted:', deletedPlan.name);
    res.json({ message: 'Pricing plan deleted successfully' });

  } catch (error) {
    console.error('❌ Error deleting pricing plan:', error);
    res.status(500).json({ message: 'Failed to delete pricing plan', error: error.message });
  }
});

// Sync with Stripe - Import existing products
router.post('/sync-stripe', authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    console.log('🔄 Syncing pricing plans with Stripe...');

    // Fetch all products from Stripe
    const products = await stripe.products.list({ limit: 100 });
    const prices = await stripe.prices.list({ limit: 100 });

    let syncedCount = 0;

    for (const product of products.data) {
      // Find associated price
      const productPrices = prices.data.filter(price => price.product === product.id);

      if (productPrices.length === 0) continue;

      // Use the first active price
      const price = productPrices.find(p => p.active) || productPrices[0];

      // Check if we already have this plan
      const existingPlan = pricingPlans.find(p => p.stripeProductId === product.id);

      if (!existingPlan) {
        // Create new plan from Stripe data
        const newPlan = {
          id: generatePlanId(),
          name: product.name.toLowerCase().replace(/\s+/g, '_'),
          displayName: product.name,
          price: price.unit_amount / 100, // Convert from cents
          interval: price.recurring?.interval || 'month',
          status: product.active ? 'active' : 'archived',
          description: product.description || '',
          features: parseStripeMetadata(product.metadata),
          stripeProductId: product.id,
          stripePriceId: price.id,
          createdAt: new Date(product.created * 1000),
          updatedAt: new Date(),
          syncedFromStripe: true
        };

        pricingPlans.push(newPlan);
        syncedCount++;

        console.log('📦 Synced plan from Stripe:', newPlan.displayName);
      } else {
        // Update existing plan with Stripe data
        const planIndex = pricingPlans.findIndex(p => p.stripeProductId === product.id);
        pricingPlans[planIndex] = {
          ...pricingPlans[planIndex],
          displayName: product.name,
          price: price.unit_amount / 100,
          interval: price.recurring?.interval || 'month',
          status: product.active ? 'active' : 'archived',
          description: product.description || '',
          stripePriceId: price.id,
          updatedAt: new Date()
        };

        console.log('🔄 Updated plan from Stripe:', product.name);
      }
    }

    console.log(`✅ Stripe sync completed. Synced ${syncedCount} new plans.`);
    res.json({
      message: 'Successfully synced with Stripe',
      synced: syncedCount,
      total: pricingPlans.length
    });

  } catch (error) {
    console.error('❌ Error syncing with Stripe:', error);
    res.status(500).json({ message: 'Failed to sync with Stripe', error: error.message });
  }
});

// Create plan in Stripe
router.post('/plans/:id/create-stripe', authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    const planId = req.params.id;
    const plan = pricingPlans.find(p => p.id === planId || p._id === planId);

    if (!plan) {
      return res.status(404).json({ message: 'Pricing plan not found' });
    }

    if (plan.stripeProductId) {
      return res.status(400).json({ message: 'Plan is already synced with Stripe' });
    }

    console.log('☁️ Creating plan in Stripe:', plan.displayName);

    // Create product in Stripe
    const product = await stripe.products.create({
      name: plan.displayName,
      description: plan.description,
      metadata: {
        vbms_plan_id: plan.id,
        vbms_plan_name: plan.name,
        features: JSON.stringify(plan.features)
      }
    });

    // Create price in Stripe
    const price = await stripe.prices.create({
      unit_amount: Math.round(plan.price * 100), // Convert to cents
      currency: 'usd',
      recurring: {
        interval: plan.interval
      },
      product: product.id
    });

    // Update local plan with Stripe IDs
    const planIndex = pricingPlans.findIndex(p => p.id === planId);
    pricingPlans[planIndex] = {
      ...pricingPlans[planIndex],
      stripeProductId: product.id,
      stripePriceId: price.id,
      updatedAt: new Date()
    };

    console.log('✅ Plan created in Stripe:', product.id);
    res.json({
      message: 'Plan successfully created in Stripe',
      stripeProductId: product.id,
      stripePriceId: price.id
    });

  } catch (error) {
    console.error('❌ Error creating plan in Stripe:', error);
    res.status(500).json({ message: 'Failed to create plan in Stripe', error: error.message });
  }
});

// Helper functions
function generatePlanId() {
  return 'plan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function parseStripeMetadata(metadata) {
  // Try to parse features from Stripe metadata
  try {
    if (metadata.features) {
      return JSON.parse(metadata.features);
    }
  } catch (error) {
    console.warn('Could not parse Stripe metadata features:', error);
  }

  // Return default features based on common plan patterns
  return {
    liveMonitoring: true,
    orderManagement: true,
    phoneSupport: true
  };
}

module.exports = router;