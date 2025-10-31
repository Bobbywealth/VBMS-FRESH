const bcrypt = require('bcrypt');
const { pgPool } = require('../config/database');

class User {
  constructor(data) {
    this.id = data.id;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.email = data.email;
    this.password_hash = data.password || data.password_hash; // Support both column names
    this.role = data.role;
    this.status = data.status;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.last_login = data.last_login;
  }

  // Create a new user
  static async create(userData) {
    const { firstName, lastName, email, password, role = 'customer' } = userData;
    
    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // Use 'password' column to match existing database schema
    const query = `
      INSERT INTO users (first_name, last_name, email, password, role, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [firstName, lastName, email, password_hash, role, 'active'];
    
    try {
      const result = await pgPool.query(query, values);
      return new User(result.rows[0]);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    // Use case-insensitive email matching
    const query = 'SELECT * FROM users WHERE LOWER(email) = LOWER($1)';
    
    try {
      const result = await pgPool.query(query, [email]);
      if (result.rows.length === 0) return null;
      return new User(result.rows[0]);
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    
    try {
      const result = await pgPool.query(query, [id]);
      if (result.rows.length === 0) return null;
      return new User(result.rows[0]);
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Find all users
  static async findAll() {
    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    
    try {
      const result = await pgPool.query(query);
      return result.rows.map(row => new User(row));
    } catch (error) {
      console.error('Error finding all users:', error);
      throw error;
    }
  }

  // Verify password
  async verifyPassword(password) {
    try {
      return await bcrypt.compare(password, this.password_hash);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  // Compare password (alias for compatibility)
  async comparePassword(password) {
    return this.verifyPassword(password);
  }

  // Update last login
  async updateLastLogin() {
    // Only update last_login if column exists (for backwards compatibility)
    try {
      const query = 'UPDATE users SET updated_at = NOW() WHERE id = $1';
      await pgPool.query(query, [this.id]);
      this.updated_at = new Date();
    } catch (error) {
      console.error('Error updating last login:', error);
      // Don't throw error - just log it, so login still works
    }
  }

  // Get full name
  getFullName() {
    return `${this.first_name || ''} ${this.last_name || ''}`.trim();
  }

  // Update user
  static async update(id, updateData) {
    const allowedFields = ['first_name', 'last_name', 'email', 'role', 'status'];
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
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await pgPool.query(query, values);
      if (result.rows.length === 0) return null;
      return new User(result.rows[0]);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user
  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
    
    try {
      const result = await pgPool.query(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

module.exports = User;