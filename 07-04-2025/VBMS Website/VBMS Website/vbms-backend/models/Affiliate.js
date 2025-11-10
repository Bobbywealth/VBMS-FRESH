const { query } = require('../config/database');

class Affiliate {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.email = data.email;
        this.affiliateId = data.affiliate_id;
        this.referralCode = data.referral_code;
        this.status = data.status;
        this.tier = data.tier;
        this.commissionRate = data.commission_rate;
        this.totalEarnings = data.total_earnings;
        this.totalReferrals = data.total_referrals;
        this.paymentInfo = data.payment_info;
        this.settings = data.settings;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    static async find(filter = {}) {
        let queryText = 'SELECT * FROM affiliates WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (filter.status) {
            queryText += ` AND status = $${paramIndex}`;
            params.push(filter.status);
            paramIndex++;
        }

        if (filter.tier) {
            queryText += ` AND tier = $${paramIndex}`;
            params.push(filter.tier);
            paramIndex++;
        }

        queryText += ' ORDER BY created_at DESC';

        const result = await query(queryText, params);
        return result.rows.map(row => new Affiliate(row));
    }

    static async countDocuments(filter = {}) {
        let queryText = 'SELECT COUNT(*) FROM affiliates WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (filter.status) {
            queryText += ` AND status = $${paramIndex}`;
            params.push(filter.status);
            paramIndex++;
        }

        const result = await query(queryText, params);
        return parseInt(result.rows[0].count);
    }

    static async findById(id) {
        const result = await query('SELECT * FROM affiliates WHERE id = $1', [id]);
        return result.rows.length > 0 ? new Affiliate(result.rows[0]) : null;
    }

    static async create(data) {
        const result = await query(`
            INSERT INTO affiliates (name, email, affiliate_id, referral_code, status, tier)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [data.name, data.email, data.affiliateId, data.referralCode, data.status || 'pending', data.tier || 'bronze']);
        
        return new Affiliate(result.rows[0]);
    }

    async save() {
        if (this.id) {
            const result = await query(`
                UPDATE affiliates 
                SET name = $1, email = $2, status = $3, tier = $4, updated_at = CURRENT_TIMESTAMP
                WHERE id = $5
                RETURNING *
            `, [this.name, this.email, this.status, this.tier, this.id]);
            
            Object.assign(this, new Affiliate(result.rows[0]));
        } else {
            const result = await query(`
                INSERT INTO affiliates (name, email, affiliate_id, referral_code, status, tier)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [this.name, this.email, this.affiliateId, this.referralCode, this.status, this.tier]);
            
            Object.assign(this, new Affiliate(result.rows[0]));
        }
        return this;
    }

    async remove() {
        await query('DELETE FROM affiliates WHERE id = $1', [this.id]);
        return this;
    }
}

module.exports = Affiliate;