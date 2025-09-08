const { pgPool } = require('../config/database');

class Affiliate {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.affiliate_id = data.affiliate_id;
    this.referral_code = data.referral_code;
    this.status = data.status;
    this.tier = data.tier;
    this.commission_rate = data.commission_rate;
    this.total_earnings = data.total_earnings;
    this.total_referrals = data.total_referrals;
    this.payment_info = data.payment_info;
    this.settings = data.settings;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new affiliate
  static async create(affiliateData) {
    const { name, email, affiliateId, referralCode, status = 'pending', tier = 'bronze' } = affiliateData;
    
    const query = `
      INSERT INTO affiliates (name, email, affiliate_id, referral_code, status, tier, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [name, email, affiliateId, referralCode, status, tier];
    
    try {
      const result = await pgPool.query(query, values);
      return new Affiliate(result.rows[0]);
    } catch (error) {
      console.error('Error creating affiliate:', error);
      throw error;
    }
  }

  // Find all affiliates
  static async find() {
    const query = 'SELECT * FROM affiliates ORDER BY created_at DESC';
    
    try {
      const result = await pgPool.query(query);
      return result.rows.map(row => new Affiliate(row));
    } catch (error) {
      console.error('Error finding affiliates:', error);
      throw error;
    }
  }

  // Find affiliate by ID
  static async findById(id) {
    const query = 'SELECT * FROM affiliates WHERE id = $1';
    
    try {
      const result = await pgPool.query(query, [id]);
      if (result.rows.length === 0) return null;
      return new Affiliate(result.rows[0]);
    } catch (error) {
      console.error('Error finding affiliate by ID:', error);
      throw error;
    }
  }

  // Update affiliate
  static async update(id, updateData) {
    const allowedFields = ['name', 'email', 'status', 'tier', 'commission_rate', 'total_earnings', 'total_referrals'];
    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE affiliates 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await pgPool.query(query, values);
      if (result.rows.length === 0) return null;
      return new Affiliate(result.rows[0]);
    } catch (error) {
      console.error('Error updating affiliate:', error);
      throw error;
    }
  }

  // Delete affiliate
  static async delete(id) {
    const query = 'DELETE FROM affiliates WHERE id = $1 RETURNING *';
    
    try {
      const result = await pgPool.query(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting affiliate:', error);
      throw error;
    }
  }

  // Count affiliates
  static async countDocuments() {
    const query = 'SELECT COUNT(*) as count FROM affiliates';
    
    try {
      const result = await pgPool.query(query);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error counting affiliates:', error);
      throw error;
    }
  }

  // Simple aggregate for stats
  static async aggregate() {
    const query = `
      SELECT 
        COUNT(*) as total_count,
        AVG(commission_rate) as avg_commission_rate,
        SUM(total_earnings) as total_earnings,
        SUM(total_referrals) as total_referrals
      FROM affiliates
    `;
    
    try {
      const result = await pgPool.query(query);
      return [result.rows[0]]; // Return as array to match mongoose aggregate format
    } catch (error) {
      console.error('Error in affiliate aggregate:', error);
      throw error;
    }
  }

  // Get affiliate analytics for admin dashboard
  static async getAnalytics(timeframe = '30d') {
    const timeCondition = this.getTimeCondition(timeframe);
    
    const query = `
      SELECT 
        COUNT(*) as total_affiliates,
        COUNT(*) FILTER (WHERE status = 'active') as active_affiliates,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_affiliates,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended_affiliates,
        SUM(total_earnings) as total_commission_paid,
        SUM(total_referrals) as total_referrals,
        AVG(commission_rate) as avg_commission_rate,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '${timeCondition}') as new_affiliates
      FROM affiliates
    `;

    try {
      const result = await pgPool.query(query);
      const stats = result.rows[0];
      
      // Convert to numbers
      Object.keys(stats).forEach(key => {
        if (key.includes('rate') || key.includes('earnings')) {
          stats[key] = parseFloat(stats[key]) || 0;
        } else {
          stats[key] = parseInt(stats[key]) || 0;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting affiliate analytics:', error);
      throw error;
    }
  }

  // Get top performing affiliates
  static async getTopPerformers(limit = 10) {
    const query = `
      SELECT 
        id, name, email, total_earnings, total_referrals, 
        commission_rate, tier, status, created_at
      FROM affiliates 
      WHERE status = 'active'
      ORDER BY total_earnings DESC 
      LIMIT $1
    `;

    try {
      const result = await pgPool.query(query, [limit]);
      return result.rows.map(row => new Affiliate(row));
    } catch (error) {
      console.error('Error getting top performers:', error);
      throw error;
    }
  }

  // Get affiliate by referral code
  static async findByReferralCode(referralCode) {
    const query = 'SELECT * FROM affiliates WHERE referral_code = $1';
    
    try {
      const result = await pgPool.query(query, [referralCode]);
      if (result.rows.length === 0) return null;
      return new Affiliate(result.rows[0]);
    } catch (error) {
      console.error('Error finding affiliate by referral code:', error);
      throw error;
    }
  }

  // Get affiliate by user email (for customer affiliate dashboard)
  static async findByEmail(email) {
    const query = 'SELECT * FROM affiliates WHERE email = $1';
    
    try {
      const result = await pgPool.query(query, [email]);
      if (result.rows.length === 0) return null;
      return new Affiliate(result.rows[0]);
    } catch (error) {
      console.error('Error finding affiliate by email:', error);
      throw error;
    }
  }

  // Update affiliate earnings and referrals (called when a sale is made)
  static async updateEarnings(affiliateId, earningsToAdd, referralsToAdd = 1) {
    const query = `
      UPDATE affiliates 
      SET 
        total_earnings = total_earnings + $2,
        total_referrals = total_referrals + $3,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await pgPool.query(query, [affiliateId, earningsToAdd, referralsToAdd]);
      if (result.rows.length === 0) return null;
      return new Affiliate(result.rows[0]);
    } catch (error) {
      console.error('Error updating affiliate earnings:', error);
      throw error;
    }
  }

  // Helper method for time conditions
  static getTimeCondition(timeframe) {
    const timeframes = {
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days',
      '1y': '1 year'
    };
    return timeframes[timeframe] || '30 days';
  }
}

module.exports = Affiliate;
