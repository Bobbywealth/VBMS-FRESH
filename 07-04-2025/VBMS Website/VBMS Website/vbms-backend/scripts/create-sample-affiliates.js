const { pgPool } = require('../config/database');

async function createSampleAffiliates() {
  try {
    console.log('🚀 Creating sample affiliates...');

    // Sample affiliate data matching the frontend
    const sampleAffiliates = [
      {
        name: 'John Smith',
        email: 'john.smith@example.com',
        affiliate_id: 'AFF-001',
        referral_code: 'JOHN2024',
        status: 'active',
        tier: 'gold',
        commission_rate: 0.15,
        total_earnings: 1601.28,
        total_referrals: 45,
        payment_info: JSON.stringify({ paypal: 'john.smith@example.com' })
      },
      {
        name: 'Lori Soper',
        email: 'lori.soper@example.com',
        affiliate_id: 'AFF-002',
        referral_code: 'LORI2024',
        status: 'active',
        tier: 'silver',
        commission_rate: 0.12,
        total_earnings: 1208.09,
        total_referrals: 32,
        payment_info: JSON.stringify({ paypal: 'lori.soper@example.com' })
      },
      {
        name: 'Victor Garcia',
        email: 'victor.garcia@example.com',
        affiliate_id: 'AFF-003',
        referral_code: 'VICTOR24',
        status: 'active',
        tier: 'silver',
        commission_rate: 0.12,
        total_earnings: 759.21,
        total_referrals: 28,
        payment_info: JSON.stringify({ paypal: 'victor.garcia@example.com' })
      },
      {
        name: 'Tom Cook',
        email: 'tom.cook@example.com',
        affiliate_id: 'AFF-004',
        referral_code: 'TOMCOOK',
        status: 'active',
        tier: 'bronze',
        commission_rate: 0.10,
        total_earnings: 300.25,
        total_referrals: 15,
        payment_info: JSON.stringify({ paypal: 'tom.cook@example.com' })
      },
      {
        name: 'Natalie McRoy',
        email: 'natalie.mcroy@example.com',
        affiliate_id: 'AFF-005',
        referral_code: 'NATALIE',
        status: 'pending',
        tier: 'bronze',
        commission_rate: 0.10,
        total_earnings: 129.00,
        total_referrals: 8,
        payment_info: JSON.stringify({ paypal: 'natalie.mcroy@example.com' })
      }
    ];

    // Clear existing affiliates first
    await pgPool.query('DELETE FROM affiliates');
    console.log('✅ Cleared existing affiliates');

    // Insert sample affiliates
    for (const affiliate of sampleAffiliates) {
      const query = `
        INSERT INTO affiliates (
          name, email, affiliate_id, referral_code, status, tier,
          commission_rate, total_earnings, total_referrals, payment_info,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      `;

      const values = [
        affiliate.name,
        affiliate.email,
        affiliate.affiliate_id,
        affiliate.referral_code,
        affiliate.status,
        affiliate.tier,
        affiliate.commission_rate,
        affiliate.total_earnings,
        affiliate.total_referrals,
        affiliate.payment_info
      ];

      await pgPool.query(query, values);
      console.log(`✅ Created affiliate: ${affiliate.name}`);
    }

    console.log('🎉 Sample affiliates created successfully!');
    
    // Display summary
    const countResult = await pgPool.query('SELECT COUNT(*) as count FROM affiliates');
    const totalResult = await pgPool.query('SELECT SUM(total_earnings) as total FROM affiliates');
    
    console.log(`📊 Total affiliates: ${countResult.rows[0].count}`);
    console.log(`💰 Total earnings: $${parseFloat(totalResult.rows[0].total).toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error creating sample affiliates:', error);
  } finally {
    await pgPool.end();
  }
}

// Run if called directly
if (require.main === module) {
  createSampleAffiliates();
}

module.exports = createSampleAffiliates;
