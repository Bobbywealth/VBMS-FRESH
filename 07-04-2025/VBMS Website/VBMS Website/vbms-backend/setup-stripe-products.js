require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createStripeProducts() {
  try {
    console.log('Setting up Stripe products for VBMS...\n');

    // 1. Start Package - $39.99/month
    const startProduct = await stripe.products.create({
      name: 'VBMS Start Package',
      description: 'Essential monitoring and order management for small businesses',
    });

    const startPrice = await stripe.prices.create({
      product: startProduct.id,
      unit_amount: 3999, // $39.99 in cents
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    console.log('✅ Start Package created:');
    console.log(`   Product ID: ${startProduct.id}`);
    console.log(`   Price ID: ${startPrice.id}`);
    console.log(`   Amount: $39.99/month\n`);

    // 2. VBMS Core - $699/month
    const coreProduct = await stripe.products.create({
      name: 'VBMS Core',
      description: 'Complete business management with custom dashboard and advanced features',
    });

    const corePrice = await stripe.prices.create({
      product: coreProduct.id,
      unit_amount: 69900, // $699.00 in cents
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    console.log('✅ VBMS Core created:');
    console.log(`   Product ID: ${coreProduct.id}`);
    console.log(`   Price ID: ${corePrice.id}`);
    console.log(`   Amount: $699.00/month\n`);

    // 3. AI Phone System - $99/month
    const aiPhoneProduct = await stripe.products.create({
      name: 'VBMS AI Phone System',
      description: 'AI-powered phone system with automated call handling and lead generation',
    });

    const aiPhonePrice = await stripe.prices.create({
      product: aiPhoneProduct.id,
      unit_amount: 9900, // $99.00 in cents
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    console.log('✅ AI Phone System created:');
    console.log(`   Product ID: ${aiPhoneProduct.id}`);
    console.log(`   Price ID: ${aiPhonePrice.id}`);
    console.log(`   Amount: $99.00/month\n`);

    // 4. Premium Plus - $1,199/month
    const premiumProduct = await stripe.products.create({
      name: 'VBMS Premium Plus',
      description: 'Complete enterprise solution with all features, priority support, and advanced analytics',
    });

    const premiumPrice = await stripe.prices.create({
      product: premiumProduct.id,
      unit_amount: 119900, // $1,199.00 in cents
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    console.log('✅ Premium Plus created:');
    console.log(`   Product ID: ${premiumProduct.id}`);
    console.log(`   Price ID: ${premiumPrice.id}`);
    console.log(`   Amount: $1,199.00/month\n`);

    // Display .env variables to update
    console.log('🔧 UPDATE YOUR .env FILE WITH THESE PRICE IDs:');
    console.log('=================================================');
    console.log(`STRIPE_START_PRICE_ID=${startPrice.id}`);
    console.log(`STRIPE_CORE_PRICE_ID=${corePrice.id}`);
    console.log(`STRIPE_AI_PHONE_PRICE_ID=${aiPhonePrice.id}`);
    console.log(`STRIPE_PREMIUM_PRICE_ID=${premiumPrice.id}`);
    console.log('=================================================\n');

    console.log('✅ All Stripe products created successfully!');
    console.log('📝 Copy the price IDs above and update your .env file');
    console.log('🌐 You can view these products in your Stripe Dashboard');

  } catch (error) {
    console.error('❌ Error creating Stripe products:', error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.log('\n💡 Please check your STRIPE_SECRET_KEY in the .env file');
    }
  }
}

createStripeProducts();