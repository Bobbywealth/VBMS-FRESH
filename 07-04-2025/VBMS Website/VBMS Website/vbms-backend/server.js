require('dotenv').config(); // Always at the very top

// Global error handlers to catch ANY crash
process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

  const express = require('express');
  const cors = require('cors');
  const fs = require('fs');
  const jwt = require('jsonwebtoken');
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const path = require('path');
  const OpenAI = require('openai');
  
  // PostgreSQL database connection
  const { pgPool, initializeDatabase } = require('./config/database');
  
  // Security imports
  const SecurityMiddleware = require('./middleware/security');
  const ValidationMiddleware = require('./middleware/validation');
  
  // Monitoring service
  const monitoringService = require('./services/monitoringService');
  
  // Task scheduler service
  const taskScheduler = require('./services/taskScheduler');

  // Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

  const emailService = require('./services/emailService'); // Email service

  const JWT_SECRET = process.env.JWT_SECRET || 'changeme123';

  const app = express();

  // Security middleware (applied before other middleware)
  app.use(SecurityMiddleware.getHelmetConfig());
  app.use(SecurityMiddleware.getCompression());
  app.use(SecurityMiddleware.getSecurityLogger());
  app.use(SecurityMiddleware.getSecurityHealthCheck());

  // Rate limiting
  app.use('/api/auth/login', SecurityMiddleware.getAuthRateLimit());
  app.use('/api/auth/register', SecurityMiddleware.getAuthRateLimit());
  app.use('/api/settings/upload-logo', SecurityMiddleware.getFileUploadRateLimit());
  app.use('/api/settings/upload-file', SecurityMiddleware.getFileUploadRateLimit());
  app.use('/api/', SecurityMiddleware.getAPIRateLimit());
  app.use(SecurityMiddleware.getGeneralRateLimit());

  // CORS configuration with security
  app.use(cors(SecurityMiddleware.getCorsConfig()));
  app.options('*', cors(SecurityMiddleware.getCorsConfig()));

  // Body parsing with security
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Input sanitization and validation
  // REMOVED: MongoDB sanitizer - PostgreSQL only
  // app.use(SecurityMiddleware.getMongoSanitizer());
  app.use(SecurityMiddleware.getXSSProtection());
  app.use(SecurityMiddleware.getHPPProtection());

  // Initialize monitoring service
  monitoringService.initialize();
  monitoringService.setupErrorTracking();

  // Add monitoring middleware
  app.use(monitoringService.getRequestMonitoringMiddleware());
  app.use(monitoringService.createPerformanceMiddleware());

  // Serve static files from uploads directory
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  
  // Serve frontend static files from parent directory
  app.use(express.static(path.join(__dirname, '..')));

  // Import routes
  const authRoutes = require('./routes/auth');
  const adminRoutes = require('./routes/admin');
  const dashboardRoutes = require('./routes/dashboard');
  const usersRoutes = require('./routes/users');
  const taskRoutes = require('./routes/tasks');
  const settingsRoutes = require('./routes/settings');
  const uberEatsRoutes = require('./routes/uber-eats');
  const stripeRoutes = require('./routes/stripe');
  const onboardingRoutes = require('./routes/onboarding');
  // const healthRoutes = require('./routes/health'); // REMOVED: MongoDB dependent
  const vapiRoutes = require('./routes/vapi');
  const inventoryRoutes = require('./routes/inventory');
  // const reportRoutes = require('./routes/reports');
  const monitoringRoutes = require('./routes/monitoring');
  const pricingRoutes = require('./routes/pricing');
  // const aiAgentRoutes = require('./routes/ai-agent');
  // const emailRoutes = require('./routes/email'); // REMOVED: MongoDB dependent
  const emailSyncRoutes = require('./routes/email-sync');
  const emailManagementRoutes = require('./routes/email-management');
  const affiliateRoutes = require('./routes/affiliates');
  const calendarRoutes = require('./routes/calendar');
  const notificationRoutes = require('./routes/notifications');
  const paymentRoutes = require('./routes/payments');

  // Mount routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/uber-eats', uberEatsRoutes);
  app.use('/api/stripe', stripeRoutes);
  app.use('/api/onboarding', onboardingRoutes);
  app.use('/api/vapi', vapiRoutes);
  app.use('/api/inventory', inventoryRoutes);
  // app.use('/api/reports', reportRoutes);
  app.use('/api/monitoring', monitoringRoutes);
  app.use('/api/pricing', pricingRoutes);
  // app.use('/api/ai-agent', aiAgentRoutes);
  // app.use('/api/email', emailRoutes); // REMOVED: MongoDB dependent
  app.use('/api/email-sync', emailSyncRoutes);
  app.use('/api/email-management', emailManagementRoutes);
  app.use('/api/affiliates', affiliateRoutes);
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/payments', paymentRoutes);
  // app.use('/api/health', healthRoutes); // REMOVED: MongoDB dependent
  // app.use('/health', healthRoutes); // REMOVED: MongoDB dependent

  // Task scheduler endpoints
  const { authenticateToken } = require('./middleware/auth');
  
  app.get('/api/tasks/upcoming', authenticateToken, async (req, res) => {
    try {
      const days = req.query.days || 7;
      const upcomingTasks = await taskScheduler.getUpcomingTasks(req.user.id, days);
      res.json(upcomingTasks);
    } catch (error) {
      console.error('Error fetching upcoming tasks:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.get('/api/tasks/overdue', authenticateToken, async (req, res) => {
    try {
      const overdueTasks = await taskScheduler.getOverdueTasks(req.user.id);
      res.json(overdueTasks);
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  // Admin endpoint to manually trigger recurring task processing
  app.post('/api/admin/tasks/process-recurring', authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'main_admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
      }
      
      await taskScheduler.processNow();
      res.json({ message: 'Recurring tasks processed successfully' });
    } catch (error) {
      console.error('Error processing recurring tasks:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  app.use('/api', dashboardRoutes);

  const PORT = process.env.PORT || 5050;

  // --- Connect to PostgreSQL ---
  initializeDatabase()
    .then(() => {
      console.log('✅ PostgreSQL database initialized successfully');
      
      // Start server only after database is ready
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server started on port ${PORT}`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    })
    .catch((err) => {
      console.error('❌ PostgreSQL initialization error:', err);
      process.exit(1);
    });

  // --- HEALTH CHECK ---
  app.get('/', (req, res) => {
    res.send('VBMS Backend is running!');
  });

  // --- TEST ROUTE ---
  app.get('/api/test', (req, res) => {
    res.json({ message: "API connection is working! 🎉" });
  });

  // --- ONBOARDING ROUTE ---
  // DISABLED: Old registration route - use PostgreSQL /api/auth routes instead
  // app.post('/api/onboard', async (req, res) => {
  //   try {
  //     const data = req.body;
  //     // Save onboarding to MongoDB
  //     const record = await Onboarding.create(data);
  //     res.json({ message: "Onboarding received", record });
  //   } catch (e) {
  //     console.error('Onboarding save error:', e);
  //     res.status(500).json({ error: "Failed to save onboarding data." });
  //   }
  // });

// --- REGISTER ROUTE ---
// DISABLED: Old registration route - use PostgreSQL /api/auth routes instead
// app.post('/api/auth/register', 
//   ValidationMiddleware.validateUserRegistration(),
//   async (req, res) => {
//     try {
//       const { name, email, password } = req.body;

//       const exists = await User.findOne({ email });
//       if (exists)
//         return res.status(409).json({ message: 'Email already registered.' });

//       const user = new User({
//         name,
//         email,
//         password,
//         role: 'client'    // force all signups to client
//       });
//       await user.save();

//       const token = jwt.sign(
//         { id: user._id, email: user.email, name: user.name, role: user.role },
//         JWT_SECRET,
//         { expiresIn: '7d' }
//       );
//       res.status(201).json({ token, user: { name: user.name, email: user.email, role: user.role } });
//     } catch (err) {
//       console.error('Registration error:', err);
//       res.status(500).json({ message: 'Registration failed.', error: err.message });
//     }
//   }
// );

// --- LOGIN ROUTE ---
// DISABLED: Old login route - use PostgreSQL /api/auth routes instead
// app.post('/api/auth/login',
//   ValidationMiddleware.validateUserLogin(),
//   async (req, res) => {
//     try {
//       const { email, password } = req.body;

//       const user = await User.findOne({ email });
//       if (!user)
//         return res.status(401).json({ message: 'Invalid email or password.' });

//       const match = await user.comparePassword(password); // Password validation method in User model
//       if (!match)
//         return res.status(401).json({ message: 'Invalid email or password.' });

//       // Update last login time
//       user.lastLogin = new Date();
//       await user.save();

//       const token = jwt.sign(
//         { id: user._id, email: user.email, name: user.name, role: user.role }, // INCLUDE ROLE
//         JWT_SECRET,
//         { expiresIn: '7d' }
//       );

//       // Send role in user object
//       res.json({
//         token,
//         user: {
//           name: user.name,
//           email: user.email,
//           role: user.role // INCLUDE ROLE
//         }
//       });
//     } catch (err) {
//       console.error('Login error:', err);
//       res.status(500).json({ message: 'Login failed.', error: err.message });
//     }
//   }
// );

// --- STRIPE PAYMENT INTENT ROUTE ---
  app.post('/api/create-payment-intent',
    ValidationMiddleware.validatePaymentIntent(),
    async (req, res) => {
      try {
        const { amount, packageName, addOns, email, affiliateCode } = req.body;

      // Stripe metadata for reporting
      const meta = {
        packageName: packageName || '',
        addOns: addOns ? JSON.stringify(addOns) : '',
        email: email || '',
        affiliateCode: affiliateCode || '',
      };

      const paymentIntent = await stripe.paymentIntents.create({
        amount, // in cents
        currency: 'usd',
        description: `VBMS Payment${packageName ? ' - ' + packageName : ''}`,
        metadata: meta,
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error) {
      res.status(400).send({ error: { message: error.message } });
    }
  });

// --- STRIPE CHECKOUT SESSION ROUTE ---
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { email } = req.body;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'VBMS Subscription',
            },
            unit_amount: 9900, // $99.00 in cents
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: `${req.headers.origin || 'http://localhost:5501'}/wizard.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'http://localhost:5501'}/pay.html`,
    });
    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- STRIPE WEBHOOK ENDPOINT ---
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Received webhook: ${event.type}`);

  try {
    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;

      case 'invoice.created':
        await handleInvoiceCreated(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({received: true});
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({error: 'Webhook handler failed'});
  }
});

// Webhook handler functions
async function handlePaymentSucceeded(paymentIntent) {
  try {
    const payment = await Payment.create({
      email: paymentIntent.metadata?.email || '',
      amount: paymentIntent.amount,
      stripePaymentId: paymentIntent.id,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata || {},
    });
    
    console.log('Payment saved to PostgreSQL:', paymentIntent.id);

    // Send payment confirmation email if user email is available
    if (paymentIntent.metadata?.userId) {
      const user = await User.findById(paymentIntent.metadata.userId).populate('subscription');
      if (user && user.subscription) {
        await emailService.sendPaymentConfirmationEmail(user, payment, user.subscription);
      }
    }
  } catch (err) {
    console.error('Error saving payment:', err.message);
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  try {
    const subscription = await Subscription.findOne({
      'billing.stripeSubscriptionId': invoice.subscription
    });

    if (subscription) {
      // Update subscription status
      subscription.status = 'active';
      subscription.billing.lastPaymentDate = new Date(invoice.status_transitions.paid_at * 1000);
      subscription.billing.nextBillingDate = new Date(invoice.period_end * 1000);
      subscription.billing.currentPeriodStart = new Date(invoice.period_start * 1000);
      subscription.billing.currentPeriodEnd = new Date(invoice.period_end * 1000);
      
      await subscription.save();

      // Update user status
      const user = await User.findById(subscription.customerId);
      if (user) {
        user.status = 'active';
        await user.save();
        
        // Send payment confirmation email
        const payment = {
          amount: invoice.amount_paid,
          stripePaymentId: invoice.payment_intent
        };
        await emailService.sendPaymentConfirmationEmail(user, payment, subscription);
      }

      console.log(`Subscription payment succeeded for: ${subscription._id}`);
    }
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

async function handleInvoicePaymentFailed(invoice) {
  try {
    const subscription = await Subscription.findOne({
      'billing.stripeSubscriptionId': invoice.subscription
    });

    if (subscription) {
      // Update subscription status
      subscription.status = 'past_due';
      subscription.billing.paymentFailedCount = (subscription.billing.paymentFailedCount || 0) + 1;
      
      await subscription.save();

      // Send payment failed email and suspend if needed
      const user = await User.findById(subscription.customerId);
      if (user) {
        await emailService.sendPaymentFailedEmail(user, subscription, subscription.billing.paymentFailedCount);
        
        // If multiple failures, suspend user
        if (subscription.billing.paymentFailedCount >= 3) {
          user.status = 'suspended';
          await user.save();
        }
      }

      console.log(`Subscription payment failed for: ${subscription._id}`);
    }
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
}

async function handleSubscriptionCreated(stripeSubscription) {
  try {
    console.log(`Subscription created: ${stripeSubscription.id}`);
    // The subscription should already be created in our system
    // This is just for logging/confirmation
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(stripeSubscription) {
  try {
    const subscription = await Subscription.findOne({
      'billing.stripeSubscriptionId': stripeSubscription.id
    });

    if (subscription) {
      // Update subscription details
      subscription.status = stripeSubscription.status;
      subscription.billing.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      subscription.billing.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
      subscription.billing.nextBillingDate = new Date(stripeSubscription.current_period_end * 1000);
      
      await subscription.save();
      console.log(`Subscription updated: ${subscription._id}`);
    }
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionCancelled(stripeSubscription) {
  try {
    const subscription = await Subscription.findOne({
      'billing.stripeSubscriptionId': stripeSubscription.id
    });

    if (subscription) {
      subscription.status = 'cancelled';
      subscription.billing.cancelledAt = new Date();
      await subscription.save();

      // Update user status and send cancellation email
      const user = await User.findById(subscription.customerId);
      if (user) {
        user.status = 'inactive';
        await user.save();
        
        // Send cancellation email
        await emailService.sendSubscriptionCancelledEmail(user, subscription);
      }

      console.log(`Subscription cancelled: ${subscription._id}`);
    }
  } catch (error) {
    console.error('Error handling subscription cancelled:', error);
  }
}

async function handleInvoiceCreated(invoice) {
  try {
    // Log invoice creation for tracking
    console.log(`Invoice created: ${invoice.id} for ${invoice.amount_due / 100}`);
  } catch (error) {
    console.error('Error handling invoice created:', error);
  }
}

// AI Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context = "business assistant" } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemPrompt = `You are a helpful AI business assistant for VBMS (Video Business Management System). 
    You help business owners with:
    - Business strategy and operations
    - Video surveillance and monitoring advice
    - Task management and productivity
    - Customer service best practices
    - Technology integration
    - General business questions

    Keep responses helpful, professional, and concise. Focus on practical business advice.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;

    res.json({ 
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('OpenAI API Error:', error);

    // Fallback response if API fails
    const fallbackResponse = "I'm sorry, I'm experiencing technical difficulties right now. Please try again in a moment, or contact support for assistance.";

    res.json({ 
      response: fallbackResponse,
      timestamp: new Date().toISOString(),
      fallback: true
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Serve uploaded files (already defined above)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Add logging middleware for debugging
  app.use('/api/settings', (req, res, next) => {
    console.log(`Settings API: ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
  });