const { pgPool } = require('../config/database');

class Payment {
    constructor(data) {
        this.id = data.id;
        this.userId = data.user_id;
        this.email = data.email;
        this.amount = data.amount;
        this.stripePaymentId = data.stripe_payment_id;
        this.status = data.status;
        this.metadata = data.metadata;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    static async create(paymentData) {
        const query = `
            INSERT INTO payments (user_id, email, amount, stripe_payment_id, status, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [
            paymentData.userId || null,
            paymentData.email,
            paymentData.amount,
            paymentData.stripePaymentId,
            paymentData.status,
            JSON.stringify(paymentData.metadata || {})
        ];

        const result = await pgPool.query(query, values);
        return new Payment(result.rows[0]);
    }

    static async findById(id) {
        const query = 'SELECT * FROM payments WHERE id = $1';
        const result = await pgPool.query(query, [id]);
        return result.rows[0] ? new Payment(result.rows[0]) : null;
    }

    static async findByUserId(userId, limit = 50, offset = 0) {
        const query = `
            SELECT p.*, u.name as user_name, u.email as user_email
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.user_id = $1
            ORDER BY p.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const result = await pgPool.query(query, [userId, limit, offset]);
        return result.rows.map(row => ({
            ...new Payment(row),
            userName: row.user_name,
            userEmail: row.user_email
        }));
    }

    static async findAll(filters = {}, limit = 50, offset = 0) {
        let query = `
            SELECT p.*, u.name as user_name, u.email as user_email
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 0;

        if (filters.status) {
            paramCount++;
            query += ` AND p.status = $${paramCount}`;
            values.push(filters.status);
        }

        if (filters.email) {
            paramCount++;
            query += ` AND p.email ILIKE $${paramCount}`;
            values.push(`%${filters.email}%`);
        }

        query += ` ORDER BY p.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
        values.push(limit, offset);

        const result = await pgPool.query(query, values);
        return result.rows.map(row => ({
            ...new Payment(row),
            userName: row.user_name,
            userEmail: row.user_email
        }));
    }

    static async getAnalytics(timeframe = '30 days') {
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_payments,
                SUM(amount) as total_revenue,
                AVG(amount) as average_payment,
                COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful_payments,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments
            FROM payments 
            WHERE created_at >= NOW() - INTERVAL '${timeframe}'
        `;
        
        const summaryResult = await pgPool.query(summaryQuery);
        return { summary: summaryResult.rows[0] };
    }

    static async getRecentTransactions(limit = 20) {
        const query = `
            SELECT p.*, u.name as user_name, u.email as user_email
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT $1
        `;
        
        const result = await pgPool.query(query, [limit]);
        return result.rows.map(row => ({
            ...new Payment(row),
            userName: row.user_name,
            userEmail: row.user_email
        }));
    }

    static async search(searchTerm, limit = 50) {
        const query = `
            SELECT p.*, u.name as user_name, u.email as user_email
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE 
                p.email ILIKE $1 OR
                u.name ILIKE $1 OR
                p.stripe_payment_id ILIKE $1
            ORDER BY p.created_at DESC
            LIMIT $2
        `;
        
        const result = await pgPool.query(query, [`%${searchTerm}%`, limit]);
        return result.rows.map(row => ({
            ...new Payment(row),
            userName: row.user_name,
            userEmail: row.user_email
        }));
    }

    static async updateStatus(id, status) {
        const query = `
            UPDATE payments 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        const result = await pgPool.query(query, [status, id]);
        return result.rows[0] ? new Payment(result.rows[0]) : null;
    }

    static async getTopCustomers(limit = 10) {
        const query = `
            SELECT 
                u.id, u.name, u.email,
                COUNT(p.id) as payment_count,
                SUM(p.amount) as total_spent,
                AVG(p.amount) as average_payment
            FROM users u
            INNER JOIN payments p ON u.id = p.user_id
            WHERE p.status = 'succeeded'
            GROUP BY u.id, u.name, u.email
            ORDER BY total_spent DESC
            LIMIT $1
        `;
        
        const result = await pgPool.query(query, [limit]);
        return result.rows;
    }
}

module.exports = Payment;