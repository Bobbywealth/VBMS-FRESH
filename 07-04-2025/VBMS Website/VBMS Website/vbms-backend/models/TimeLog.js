const { pgPool } = require('../config/database');

class TimeLog {
  constructor(data) {
    this.id = data.id;
    this.employee_name = data.employee_name;
    this.action = data.action;
    this.timestamp_local = data.timestamp_local;
    this.timestamp_utc = data.timestamp_utc;
    this.created_at = data.created_at;
  }

  /**
   * Create time_logs table
   */
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS time_logs (
        id SERIAL PRIMARY KEY,
        employee_name VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL CHECK (action IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
        timestamp_local TIMESTAMP NOT NULL,
        timestamp_utc TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_time_logs_employee_name ON time_logs(employee_name);
      CREATE INDEX IF NOT EXISTS idx_time_logs_action ON time_logs(action);
      CREATE INDEX IF NOT EXISTS idx_time_logs_timestamp_local ON time_logs(timestamp_local);
      CREATE INDEX IF NOT EXISTS idx_time_logs_created_at ON time_logs(created_at);
    `;
    
    try {
      await pgPool.query(query);
      console.log('✅ Time logs table created successfully');
    } catch (error) {
      console.error('❌ Error creating time logs table:', error);
      throw error;
    }
  }

  /**
   * Create a new time log entry
   * @param {Object} timeLogData - Time log data
   * @returns {TimeLog} Created time log
   */
  static async create(timeLogData) {
    const {
      employee_name,
      action,
      timestamp_local,
      timestamp_utc
    } = timeLogData;

    // Validate action type
    const validActions = ['clock_in', 'clock_out', 'break_start', 'break_end'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid action type. Must be one of: ${validActions.join(', ')}`);
    }

    const query = `
      INSERT INTO time_logs (employee_name, action, timestamp_local, timestamp_utc, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;

    const values = [
      employee_name,
      action,
      timestamp_local,
      timestamp_utc
    ];

    try {
      const result = await pgPool.query(query, values);
      return new TimeLog(result.rows[0]);
    } catch (error) {
      console.error('Error creating time log:', error);
      throw error;
    }
  }

  /**
   * Find time logs with filters
   * @param {Object} filter - Filter options
   * @param {Object} options - Query options
   * @returns {Array<TimeLog>} Array of time logs
   */
  static async find(filter = {}, options = {}) {
    const {
      employee_name,
      action,
      date_from,
      date_to
    } = filter;

    const {
      limit = 100,
      offset = 0,
      sort_by = 'timestamp_local',
      sort_order = 'DESC'
    } = options;

    let query = 'SELECT * FROM time_logs';
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (employee_name) {
      conditions.push(`employee_name = $${paramCount}`);
      values.push(employee_name);
      paramCount++;
    }

    if (action) {
      conditions.push(`action = $${paramCount}`);
      values.push(action);
      paramCount++;
    }

    if (date_from) {
      conditions.push(`timestamp_local >= $${paramCount}`);
      values.push(date_from);
      paramCount++;
    }

    if (date_to) {
      conditions.push(`timestamp_local <= $${paramCount}`);
      values.push(date_to);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY ${sort_by} ${sort_order}`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    try {
      const result = await pgPool.query(query, values);
      return result.rows.map(row => new TimeLog(row));
    } catch (error) {
      console.error('Error finding time logs:', error);
      throw error;
    }
  }

  /**
   * Find time logs by employee name
   * @param {string} employeeName - Employee name
   * @param {Object} options - Query options
   * @returns {Array<TimeLog>} Array of time logs
   */
  static async findByEmployee(employeeName, options = {}) {
    return this.find({ employee_name: employeeName }, options);
  }

  /**
   * Find time log by ID
   * @param {number} id - Time log ID
   * @returns {TimeLog|null} Time log or null
   */
  static async findById(id) {
    const query = 'SELECT * FROM time_logs WHERE id = $1';

    try {
      const result = await pgPool.query(query, [id]);
      if (result.rows.length === 0) return null;
      return new TimeLog(result.rows[0]);
    } catch (error) {
      console.error('Error finding time log by ID:', error);
      throw error;
    }
  }

  /**
   * Get time log statistics
   * @param {Object} filter - Filter options
   * @returns {Object} Statistics
   */
  static async getStats(filter = {}) {
    const {
      employee_name,
      date_from,
      date_to
    } = filter;

    let query = `
      SELECT 
        COUNT(*) as total_logs,
        COUNT(*) FILTER (WHERE action = 'clock_in') as clock_ins,
        COUNT(*) FILTER (WHERE action = 'clock_out') as clock_outs,
        COUNT(*) FILTER (WHERE action = 'break_start') as break_starts,
        COUNT(*) FILTER (WHERE action = 'break_end') as break_ends,
        COUNT(DISTINCT employee_name) as unique_employees,
        COUNT(*) FILTER (WHERE timestamp_local >= NOW() - INTERVAL '24 hours') as recent_logs
      FROM time_logs
    `;

    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (employee_name) {
      conditions.push(`employee_name = $${paramCount}`);
      values.push(employee_name);
      paramCount++;
    }

    if (date_from) {
      conditions.push(`timestamp_local >= $${paramCount}`);
      values.push(date_from);
      paramCount++;
    }

    if (date_to) {
      conditions.push(`timestamp_local <= $${paramCount}`);
      values.push(date_to);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    try {
      const result = await pgPool.query(query, values);
      const stats = result.rows[0];
      
      // Convert string counts to integers
      Object.keys(stats).forEach(key => {
        stats[key] = parseInt(stats[key]) || 0;
      });

      return stats;
    } catch (error) {
      console.error('Error getting time log stats:', error);
      throw error;
    }
  }

  /**
   * Get employee work hours for a date range
   * @param {string} employeeName - Employee name
   * @param {string} dateFrom - Start date
   * @param {string} dateTo - End date
   * @returns {Object} Work hours summary
   */
  static async getWorkHours(employeeName, dateFrom, dateTo) {
    const query = `
      SELECT 
        DATE(timestamp_local) as work_date,
        array_agg(
          json_build_object(
            'action', action,
            'timestamp', timestamp_local
          ) ORDER BY timestamp_local
        ) as actions
      FROM time_logs
      WHERE employee_name = $1 
        AND timestamp_local >= $2 
        AND timestamp_local <= $3
      GROUP BY DATE(timestamp_local)
      ORDER BY work_date DESC
    `;

    try {
      const result = await pgPool.query(query, [employeeName, dateFrom, dateTo]);
      
      const workHours = result.rows.map(row => {
        const actions = row.actions;
        let totalHours = 0;
        let breakHours = 0;
        let clockIn = null;
        let breakStart = null;

        actions.forEach(action => {
          switch (action.action) {
            case 'clock_in':
              clockIn = new Date(action.timestamp);
              break;
            case 'clock_out':
              if (clockIn) {
                const clockOut = new Date(action.timestamp);
                totalHours += (clockOut - clockIn) / (1000 * 60 * 60); // Convert to hours
                clockIn = null;
              }
              break;
            case 'break_start':
              breakStart = new Date(action.timestamp);
              break;
            case 'break_end':
              if (breakStart) {
                const breakEnd = new Date(action.timestamp);
                breakHours += (breakEnd - breakStart) / (1000 * 60 * 60); // Convert to hours
                breakStart = null;
              }
              break;
          }
        });

        return {
          date: row.work_date,
          total_hours: Math.round((totalHours - breakHours) * 100) / 100, // Round to 2 decimal places
          break_hours: Math.round(breakHours * 100) / 100,
          actions: actions
        };
      });

      return workHours;
    } catch (error) {
      console.error('Error calculating work hours:', error);
      throw error;
    }
  }

  /**
   * Delete time log
   * @param {number} id - Time log ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    const query = 'DELETE FROM time_logs WHERE id = $1 RETURNING *';

    try {
      const result = await pgPool.query(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting time log:', error);
      throw error;
    }
  }

  /**
   * Get all unique employee names
   * @returns {Array<string>} Array of employee names
   */
  static async getEmployeeNames() {
    const query = `
      SELECT DISTINCT employee_name 
      FROM time_logs 
      ORDER BY employee_name ASC
    `;

    try {
      const result = await pgPool.query(query);
      return result.rows.map(row => row.employee_name);
    } catch (error) {
      console.error('Error getting employee names:', error);
      throw error;
    }
  }

  /**
   * Get recent activity (last 24 hours)
   * @param {number} limit - Number of records to return
   * @returns {Array<TimeLog>} Recent time logs
   */
  static async getRecentActivity(limit = 50) {
    const query = `
      SELECT * FROM time_logs
      WHERE timestamp_local >= NOW() - INTERVAL '24 hours'
      ORDER BY timestamp_local DESC
      LIMIT $1
    `;

    try {
      const result = await pgPool.query(query, [limit]);
      return result.rows.map(row => new TimeLog(row));
    } catch (error) {
      console.error('Error getting recent activity:', error);
      throw error;
    }
  }
}

module.exports = TimeLog;
