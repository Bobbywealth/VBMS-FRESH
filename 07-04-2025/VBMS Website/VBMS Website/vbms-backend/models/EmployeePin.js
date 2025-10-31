const { pgPool } = require('../config/database');
const bcrypt = require('bcrypt');

class EmployeePin {
  constructor(data) {
    this.id = data.id;
    this.employee_name = data.employee_name;
    this.pin_hash = data.pin_hash;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Create employee_pins table
   */
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS employee_pins (
        id SERIAL PRIMARY KEY,
        employee_name VARCHAR(255) UNIQUE NOT NULL,
        pin_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_employee_pins_name ON employee_pins(employee_name);
    `;
    
    try {
      await pgPool.query(query);
      console.log('✅ Employee pins table created successfully');
    } catch (error) {
      console.error('❌ Error creating employee pins table:', error);
      throw error;
    }
  }

  /**
   * Set PIN for an employee
   * @param {string} employeeName - Employee name
   * @param {string} pin - 4-digit PIN
   * @returns {EmployeePin} Created/updated employee pin record
   */
  static async setPin(employeeName, pin) {
    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      throw new Error('PIN must be exactly 4 digits');
    }

    const pinHash = await bcrypt.hash(pin, 10);

    const query = `
      INSERT INTO employee_pins (employee_name, pin_hash, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (employee_name) 
      DO UPDATE SET pin_hash = $2, updated_at = NOW()
      RETURNING *
    `;

    try {
      const result = await pgPool.query(query, [employeeName.trim(), pinHash]);
      return new EmployeePin(result.rows[0]);
    } catch (error) {
      console.error('Error setting employee PIN:', error);
      throw error;
    }
  }

  /**
   * Verify PIN for an employee
   * @param {string} employeeName - Employee name
   * @param {string} pin - 4-digit PIN to verify
   * @returns {boolean} True if PIN is valid
   */
  static async verifyPin(employeeName, pin) {
    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      return false;
    }

    const query = 'SELECT pin_hash FROM employee_pins WHERE employee_name = $1';

    try {
      const result = await pgPool.query(query, [employeeName.trim()]);
      
      if (result.rows.length === 0) {
        // No PIN set, use default PIN 1234
        return pin === '1234';
      }

      const pinHash = result.rows[0].pin_hash;
      return await bcrypt.compare(pin, pinHash);
    } catch (error) {
      console.error('Error verifying employee PIN:', error);
      return false;
    }
  }

  /**
   * Get all employees with PINs
   * @returns {Array<string>} Array of employee names
   */
  static async getAllEmployeesWithPins() {
    const query = 'SELECT employee_name FROM employee_pins ORDER BY employee_name ASC';

    try {
      const result = await pgPool.query(query);
      return result.rows.map(row => row.employee_name);
    } catch (error) {
      console.error('Error getting employees with PINs:', error);
      throw error;
    }
  }

  /**
   * Delete PIN for an employee
   * @param {string} employeeName - Employee name
   * @returns {boolean} True if deleted
   */
  static async deletePin(employeeName) {
    const query = 'DELETE FROM employee_pins WHERE employee_name = $1 RETURNING *';

    try {
      const result = await pgPool.query(query, [employeeName.trim()]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting employee PIN:', error);
      throw error;
    }
  }

  /**
   * Initialize default PINs for common employees
   */
  static async initializeDefaultPins() {
    const defaultEmployees = [
      'John Doe',
      'Jane Smith',
      'Mike Johnson',
      'Sarah Wilson',
      'David Brown',
      'Lisa Davis'
    ];

    const defaultPin = '1234';

    try {
      for (const employee of defaultEmployees) {
        await this.setPin(employee, defaultPin);
      }
      console.log('✅ Default employee PINs initialized');
    } catch (error) {
      console.error('Error initializing default PINs:', error);
    }
  }

  /**
   * Get PIN statistics
   * @returns {Object} PIN statistics
   */
  static async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_employees_with_pins,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as pins_created_last_30_days,
        COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '30 days') as pins_updated_last_30_days
      FROM employee_pins
    `;

    try {
      const result = await pgPool.query(query);
      const stats = result.rows[0];
      
      // Convert string counts to integers
      Object.keys(stats).forEach(key => {
        stats[key] = parseInt(stats[key]) || 0;
      });

      return stats;
    } catch (error) {
      console.error('Error getting PIN stats:', error);
      throw error;
    }
  }
}

module.exports = EmployeePin;
