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
        this.billing = {
            stripeSubscriptionId: data.stripe_subscription_id,
            stripeCustomerId: data.stripe_customer_id,
            currentPeriodStart: data.current_period_start,
            currentPeriodEnd: data.current_period_end,
            nextBillingDate: data.next_billing_date,
            lastPaymentDate: data.last_payment_date,
            paymentFailedCount: data.payment_failed_count,
            cancelledAt: data.cancelled_at,
            trialEnd: data.trial_end
        };
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
        this.usage = {
            monthlyHours: data.usage_monthly_hours,
            callsCount: data.usage_calls_count,
            lastReset: data.usage_last_reset
        };
        this.startDate = data.start_date;
        this.endDate = data.end_date;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    // Create a new subscription
    static async create(subscriptionData) {
        const query = `
            INSERT INTO subscriptions (
                customer_id, package_type, package_name,
                price_monthly, price_per_call, price_setup,
                status, stripe_subscription_id, stripe_customer_id,
                feature_live_monitoring, feature_order_management, feature_phone_support,
                feature_ai_phone, feature_inventory_tracker, feature_priority_support,
                feature_custom_dashboard, feature_advanced_analytics,
                start_date
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
            ) RETURNING *
        `;
        
        const values = [
            subscriptionData.customerId,
            subscriptionData.packageType,
            subscriptionData.packageName,
            subscriptionData.price?.monthly || 0,
            subscriptionData.price?.perCall || 0,
            subscriptionData.price?.setup || 0,
            subscriptionData.status || 'active',
            subscriptionData.billing?.stripeSubscriptionId || null,
            subscriptionData.billing?.stripeCustomerId || null,
            subscriptionData.features?.liveMonitoring || false,
            subscriptionData.features?.orderManagement || false,
            subscriptionData.features?.phoneSupport || false,
            subscriptionData.features?.aiPhone || false,
            subscriptionData.features?.inventoryTracker || false,
            subscriptionData.features?.prioritySupport || false,
            subscriptionData.features?.customDashboard || false,
            subscriptionData.features?.advancedAnalytics || false,
            subscriptionData.startDate || new Date()
        ];

        const result = await pgPool.query(query, values);
        return new Subscription(result.rows[0]);
    }

    // Find subscription by ID
    static async findById(id) {
        const query = 'SELECT * FROM subscriptions WHERE id = $1';
        const result = await pgPool.query(query, [id]);
        return result.rows[0] ? new Subscription(result.rows[0]) : null;
    }

    // Find subscription by customer ID
    static async findByCustomerId(customerId) {
        const query = 'SELECT * FROM subscriptions WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1';
        const result = await pgPool.query(query, [customerId]);
        return result.rows[0] ? new Subscription(result.rows[0]) : null;
    }

    // Get all subscriptions with user details
    static async findAll(filters = {}, limit = 50, offset = 0) {
        let query = `
            SELECT 
                s.*,
                u.name as customer_name,
                u.email as customer_email,
                u.phone as customer_phone
            FROM subscriptions s
            LEFT JOIN users u ON s.customer_id = u.id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 0;

        // Apply filters
        if (filters.status) {
            paramCount++;
            query += ` AND s.status = $${paramCount}`;
            values.push(filters.status);
        }

        if (filters.packageType) {
            paramCount++;
            query += ` AND s.package_type = $${paramCount}`;
            values.push(filters.packageType);
        }

        query += ` ORDER BY s.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
        values.push(limit, offset);

        const result = await pgPool.query(query, values);
        return result.rows.map(row => ({
            ...new Subscription(row),
            customerName: row.customer_name,
            customerEmail: row.customer_email,
            customerPhone: row.customer_phone
        }));
    }

    // Get subscription analytics
    static async getAnalytics() {
        const summaryQuery = `
            SELECT 
                COUNT(*) as total_subscriptions,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_subscriptions,
                COUNT(CASE WHEN status = 'past_due' THEN 1 END) as past_due_subscriptions,
                AVG(price_monthly) as average_monthly_price,
                SUM(CASE WHEN status = 'active' THEN price_monthly ELSE 0 END) as monthly_recurring_revenue
            FROM subscriptions
        `;
        
        const summaryResult = await pgPool.query(summaryQuery);
        
        const packageQuery = `
            SELECT 
                package_type,
                COUNT(*) as package_count,
                AVG(price_monthly) as avg_price
            FROM subscriptions
            GROUP BY package_type
        `;
        
        const packageResult = await pgPool.query(packageQuery);
        
        return {
            summary: summaryResult.rows[0],
            by_package: packageResult.rows
        };
    }

    // Update subscription status
    static async updateStatus(id, status) {
        const query = `
            UPDATE subscriptions 
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        const result = await pgPool.query(query, [status, id]);
        return result.rows[0] ? new Subscription(result.rows[0]) : null;
    }

    // Cancel subscription
    static async cancel(id) {
        const query = `
            UPDATE subscriptions 
            SET 
                status = 'cancelled',
                cancelled_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        
        const result = await pgPool.query(query, [id]);
        return result.rows[0] ? new Subscription(result.rows[0]) : null;
    }

    // Search subscriptions
    static async search(searchTerm, limit = 50) {
        const query = `
            SELECT 
                s.*,
                u.name as customer_name,
                u.email as customer_email
            FROM subscriptions s
            LEFT JOIN users u ON s.customer_id = u.id
            WHERE 
                u.name ILIKE $1 OR
                u.email ILIKE $1 OR
                s.package_name ILIKE $1 OR
                s.package_type ILIKE $1
            ORDER BY s.created_at DESC
            LIMIT $2
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

