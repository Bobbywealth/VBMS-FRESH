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
}

module.exports = Affiliate;
