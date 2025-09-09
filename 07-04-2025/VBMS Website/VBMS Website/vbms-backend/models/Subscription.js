const { pgPool } = require('../config/database');

class Subscription {
    constructor(data) {
        this.id = data.id;
        this.customerId = data.customer_id;
        this.packageType = data.package_type;
        this.packageName = data.package_name;
        this.price = {
            monthly: data.price_monthly,
            perCall: data.price_per_call,
            setup: data.price_setup
        };
        this.status = data.status;
        this.features = {
            liveMonitoring: data.feature_live_monitoring,
            orderManagement: data.feature_order_management,
            phoneSupport: data.feature_phone_support,
            aiPhone: data.feature_ai_phone,
            inventoryTracker: data.feature_inventory_tracker,
            prioritySupport: data.feature_priority_support,
            customDashboard: data.feature_custom_dashboard,
            advancedAnalytics: data.feature_advanced_analytics
        };
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    static async create(subscriptionData) {
        const query = `
            INSERT INTO subscriptions (
                customer_id, package_type, package_name,
                price_monthly, price_per_call, price_setup,
                status, feature_live_monitoring, feature_order_management, 
                feature_phone_support, feature_ai_phone, start_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *
        `;
        
        const values = [
            subscriptionData.customerId,
            subscriptionData.packageType,
            subscriptionData.packageName,
            subscriptionData.price?.monthly || 0,
            subscriptionData.price?.perCall || 0,
            subscriptionData.price?.setup || 0,
            subscriptionData.status || 'active',
            subscriptionData.features?.liveMonitoring || false,
            subscriptionData.features?.orderManagement || false,
            subscriptionData.features?.phoneSupport || false,
            subscriptionData.features?.aiPhone || false,
            subscriptionData.startDate || new Date()
        ];

        const result = await pgPool.query(query, values);
        return new Subscription(result.rows[0]);
    }

    static async findById(id) {
        const query = 'SELECT * FROM subscriptions WHERE id = $1';
        const result = await pgPool.query(query, [id]);
        return result.rows[0] ? new Subscription(result.rows[0]) : null;
    }

    static async findByCustomerId(customerId) {
        const query = 'SELECT * FROM subscriptions WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1';
        const result = await pgPool.query(query, [customerId]);
        return result.rows[0] ? new Subscription(result.rows[0]) : null;
    }

    static async findAll(filters = {}, limit = 50, offset = 0) {
        let query = `
            SELECT s.*, u.name as customer_name, u.email as customer_email
            FROM subscriptions s
            LEFT JOIN users u ON s.customer_id = u.id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 0;

        if (filters.status) {
            paramCount++;
            query += ` AND s.status = $${paramCount}`;
            values.push(filters.status);
        }

        query += ` ORDER BY s.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
        values.push(limit, offset);

        const result = await pgPool.query(query, values);
        return result.rows.map(row => ({
            ...new Subscription(row),
            customerName: row.customer_name,
            customerEmail: row.customer_email
        }));
    }

    static async getAnalytics() {
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_subscriptions,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
                AVG(price_monthly) as average_monthly_price,
                SUM(CASE WHEN status = 'active' THEN price_monthly ELSE 0 END) as monthly_recurring_revenue
            FROM subscriptions
        `;
        
        const summaryResult = await pgPool.query(summaryQuery);
        return { summary: summaryResult.rows[0] };
    }

    static async updateStatus(id, status) {
        const query = `
            UPDATE subscriptions 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 RETURNING *
        `;
        const result = await pgPool.query(query, [status, id]);
        return result.rows[0] ? new Subscription(result.rows[0]) : null;
    }

    static async search(searchTerm, limit = 50) {
        const query = `
            SELECT s.*, u.name as customer_name, u.email as customer_email
            FROM subscriptions s
            LEFT JOIN users u ON s.customer_id = u.id
            WHERE u.name ILIKE $1 OR u.email ILIKE $1 OR s.package_name ILIKE $1
            ORDER BY s.created_at DESC LIMIT $2
        `;
        
        const result = await pgPool.query(query, [`%${searchTerm}%`, limit]);
        return result.rows.map(row => ({
            ...new Subscription(row),
            customerName: row.customer_name,
            customerEmail: row.customer_email
        }));
    }
}

module.exports = Subscription;
