const { pgPool, query } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
    constructor(userData) {
        this.id = userData.id;
        this.email = userData.email;
        this.password = userData.password;
        this.firstName = userData.first_name;
        this.lastName = userData.last_name;
        this.role = userData.role || 'customer';
        this.isActive = userData.is_active !== undefined ? userData.is_active : true;
        this.emailVerified = userData.email_verified || false;
        this.phone = userData.phone;
        this.avatarUrl = userData.avatar_url;
        this.stripeCustomerId = userData.stripe_customer_id;
        this.lastLogin = userData.last_login;
        this.createdAt = userData.created_at;
        this.updatedAt = userData.updated_at;
    }

    // Create a new user
    static async create(userData) {
        try {
            // Hash password
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

            const result = await query(`
                INSERT INTO users (email, password, first_name, last_name, role, phone)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [
                userData.email,
                hashedPassword,
                userData.firstName || userData.first_name,
                userData.lastName || userData.last_name,
                userData.role || 'customer',
                userData.phone
            ]);

            return new User(result.rows[0]);
        } catch (error) {
            throw new Error(`Failed to create user: ${error.message}`);
        }
    }

    // Find user by email
    static async findByEmail(email) {
        try {
            const result = await query('SELECT * FROM users WHERE email = $1', [email]);
            
            if (result.rows.length === 0) {
                return null;
            }

            return new User(result.rows[0]);
        } catch (error) {
            throw new Error(`Failed to find user: ${error.message}`);
        }
    }

    // Find user by ID
    static async findById(id) {
        try {
            const result = await query('SELECT * FROM users WHERE id = $1', [id]);
            
            if (result.rows.length === 0) {
                return null;
            }

            return new User(result.rows[0]);
        } catch (error) {
            throw new Error(`Failed to find user: ${error.message}`);
        }
    }

    // Find all users with pagination
    static async findAll(options = {}) {
        try {
            const { limit = 50, offset = 0, role = null, isActive = null } = options;
            
            let queryText = 'SELECT * FROM users WHERE 1=1';
            const params = [];
            let paramIndex = 1;

            if (role) {
                queryText += ` AND role = $${paramIndex}`;
                params.push(role);
                paramIndex++;
            }

            if (isActive !== null) {
                queryText += ` AND is_active = $${paramIndex}`;
                params.push(isActive);
                paramIndex++;
            }

            queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);

            const result = await query(queryText, params);
            
            return result.rows.map(row => new User(row));
        } catch (error) {
            throw new Error(`Failed to find users: ${error.message}`);
        }
    }

    // Update user
    async update(updateData) {
        try {
            const fields = [];
            const values = [];
            let paramIndex = 1;

            // Build dynamic update query
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined && key !== 'id') {
                    const dbField = this.camelToSnake(key);
                    fields.push(`${dbField} = $${paramIndex}`);
                    values.push(updateData[key]);
                    paramIndex++;
                }
            });

            if (fields.length === 0) {
                throw new Error('No fields to update');
            }

            fields.push(`updated_at = CURRENT_TIMESTAMP`);

            const queryText = `
                UPDATE users 
                SET ${fields.join(', ')} 
                WHERE id = $${paramIndex}
                RETURNING *
            `;
            values.push(this.id);

            const result = await query(queryText, values);
            
            if (result.rows.length === 0) {
                throw new Error('User not found');
            }

            // Update current instance
            const updatedUser = new User(result.rows[0]);
            Object.assign(this, updatedUser);
            
            return this;
        } catch (error) {
            throw new Error(`Failed to update user: ${error.message}`);
        }
    }

    // Delete user (soft delete)
    async delete() {
        try {
            await query('UPDATE users SET is_active = false WHERE id = $1', [this.id]);
            this.isActive = false;
            return true;
        } catch (error) {
            throw new Error(`Failed to delete user: ${error.message}`);
        }
    }

    // Hard delete user
    async hardDelete() {
        try {
            await query('DELETE FROM users WHERE id = $1', [this.id]);
            return true;
        } catch (error) {
            throw new Error(`Failed to hard delete user: ${error.message}`);
        }
    }

    // Verify password
    async verifyPassword(password) {
        try {
            return await bcrypt.compare(password, this.password);
        } catch (error) {
            throw new Error(`Failed to verify password: ${error.message}`);
        }
    }

    // Update password
    async updatePassword(newPassword) {
        try {
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
            
            await this.update({ password: hashedPassword });
            return true;
        } catch (error) {
            throw new Error(`Failed to update password: ${error.message}`);
        }
    }

    // Update last login
    async updateLastLogin() {
        try {
            await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [this.id]);
            this.lastLogin = new Date();
            return true;
        } catch (error) {
            throw new Error(`Failed to update last login: ${error.message}`);
        }
    }

    // Get user's full name
    getFullName() {
        return `${this.firstName || ''} ${this.lastName || ''}`.trim();
    }

    // Get name property for compatibility
    get name() {
        return this.getFullName();
    }

    // Update Stripe customer ID
    async updateStripeCustomerId(stripeCustomerId) {
        try {
            const result = await query(
                'UPDATE users SET stripe_customer_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
                [stripeCustomerId, this.id]
            );
            this.stripeCustomerId = stripeCustomerId;
            return true;
        } catch (error) {
            console.error('Error updating Stripe customer ID:', error);
            throw error;
        }
    }

    // Convert to JSON (exclude sensitive data)
    toJSON() {
        const { password, ...userWithoutPassword } = this;
        return {
            id: this.id,
            email: this.email,
            name: this.getFullName(),
            firstName: this.firstName,
            lastName: this.lastName,
            fullName: this.getFullName(),
            role: this.role,
            isActive: this.isActive,
            emailVerified: this.emailVerified,
            phone: this.phone,
            avatarUrl: this.avatarUrl,
            stripeCustomerId: this.stripeCustomerId,
            lastLogin: this.lastLogin,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    // Helper method to convert camelCase to snake_case
    camelToSnake(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }

    // Static method to get user count
    static async getCount(filters = {}) {
        try {
            let queryText = 'SELECT COUNT(*) FROM users WHERE 1=1';
            const params = [];
            let paramIndex = 1;

            if (filters.role) {
                queryText += ` AND role = $${paramIndex}`;
                params.push(filters.role);
                paramIndex++;
            }

            if (filters.isActive !== undefined) {
                queryText += ` AND is_active = $${paramIndex}`;
                params.push(filters.isActive);
                paramIndex++;
            }

            const result = await query(queryText, params);
            return parseInt(result.rows[0].count);
        } catch (error) {
            throw new Error(`Failed to get user count: ${error.message}`);
        }
    }

    // Check if email exists
    static async emailExists(email, excludeId = null) {
        try {
            let queryText = 'SELECT id FROM users WHERE email = $1';
            const params = [email];

            if (excludeId) {
                queryText += ' AND id != $2';
                params.push(excludeId);
            }

            const result = await query(queryText, params);
            return result.rows.length > 0;
        } catch (error) {
            throw new Error(`Failed to check email existence: ${error.message}`);
        }
    }
}

module.exports = User;