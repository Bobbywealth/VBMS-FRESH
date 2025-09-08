const { pgPool } = require('../config/database');

class Task {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.status = data.status;
    this.priority = data.priority;
    this.assigned_to = data.assigned_to;
    this.created_by = data.created_by;
    this.due_date = data.due_date;
    this.completed_at = data.completed_at;
    this.tags = data.tags;
    this.metadata = data.metadata;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create tasks table
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(20) DEFAULT 'medium',
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        due_date TIMESTAMP,
        completed_at TIMESTAMP,
        tags TEXT[] DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    `;
    
    try {
      await pgPool.query(query);
      console.log('✅ Tasks table created successfully');
    } catch (error) {
      console.error('❌ Error creating tasks table:', error);
      throw error;
    }
  }

  // Create a new task
  static async create(taskData) {
    const {
      title,
      description = '',
      status = 'pending',
      priority = 'medium',
      assigned_to = null,
      created_by,
      due_date = null,
      tags = [],
      metadata = {}
    } = taskData;

    const query = `
      INSERT INTO tasks (title, description, status, priority, assigned_to, created_by, due_date, tags, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      title,
      description,
      status,
      priority,
      assigned_to,
      created_by,
      due_date,
      tags,
      JSON.stringify(metadata)
    ];

    try {
      const result = await pgPool.query(query, values);
      return new Task(result.rows[0]);
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  // Find tasks with filters
  static async find(filter = {}, options = {}) {
    const {
      status,
      priority,
      assigned_to,
      created_by,
      overdue_only = false
    } = filter;

    const {
      limit = 50,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = options;

    let query = `
      SELECT t.*, 
             u1.first_name as assignee_first_name, u1.last_name as assignee_last_name,
             u2.first_name as creator_first_name, u2.last_name as creator_last_name
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
    `;

    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (status) {
      conditions.push(`t.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (priority) {
      conditions.push(`t.priority = $${paramCount}`);
      values.push(priority);
      paramCount++;
    }

    if (assigned_to) {
      conditions.push(`t.assigned_to = $${paramCount}`);
      values.push(assigned_to);
      paramCount++;
    }

    if (created_by) {
      conditions.push(`t.created_by = $${paramCount}`);
      values.push(created_by);
      paramCount++;
    }

    if (overdue_only) {
      conditions.push(`t.due_date < NOW() AND t.status != 'completed'`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY t.${sort_by} ${sort_order}`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    try {
      const result = await pgPool.query(query, values);
      return result.rows.map(row => ({
        ...new Task(row),
        assignee_name: row.assignee_first_name ? `${row.assignee_first_name} ${row.assignee_last_name}` : null,
        creator_name: row.creator_first_name ? `${row.creator_first_name} ${row.creator_last_name}` : null
      }));
    } catch (error) {
      console.error('Error finding tasks:', error);
      throw error;
    }
  }

  // Find task by ID
  static async findById(id) {
    const query = `
      SELECT t.*, 
             u1.first_name as assignee_first_name, u1.last_name as assignee_last_name,
             u2.first_name as creator_first_name, u2.last_name as creator_last_name
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      WHERE t.id = $1
    `;

    try {
      const result = await pgPool.query(query, [id]);
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        ...new Task(row),
        assignee_name: row.assignee_first_name ? `${row.assignee_first_name} ${row.assignee_last_name}` : null,
        creator_name: row.creator_first_name ? `${row.creator_first_name} ${row.creator_last_name}` : null
      };
    } catch (error) {
      console.error('Error finding task by ID:', error);
      throw error;
    }
  }

  // Update task
  static async update(id, updates) {
    const allowedFields = ['title', 'description', 'status', 'priority', 'assigned_to', 'due_date', 'tags', 'metadata'];
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.includes(field)) {
        if (field === 'metadata') {
          updateFields.push(`${field} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          updateFields.push(`${field} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Auto-set completed_at when status changes to completed
    if (updates.status === 'completed') {
      updateFields.push(`completed_at = NOW()`);
    } else if (updates.status && updates.status !== 'completed') {
      updateFields.push(`completed_at = NULL`);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE tasks 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await pgPool.query(query, values);
      if (result.rows.length === 0) return null;
      return new Task(result.rows[0]);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  // Delete task
  static async delete(id) {
    const query = 'DELETE FROM tasks WHERE id = $1 RETURNING *';
    
    try {
      const result = await pgPool.query(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // Get task statistics
  static async getStats(userId = null) {
    let query = `
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_tasks,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status != 'completed') as overdue_tasks,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority_tasks,
        COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority_tasks,
        COUNT(*) FILTER (WHERE priority = 'low') as low_priority_tasks
      FROM tasks
    `;

    const values = [];
    if (userId) {
      query += ' WHERE assigned_to = $1 OR created_by = $1';
      values.push(userId);
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
      console.error('Error getting task stats:', error);
      throw error;
    }
  }

  // Get tasks by date range
  static async getTasksByDateRange(startDate, endDate, userId = null) {
    let query = `
      SELECT DATE(created_at) as date, COUNT(*) as task_count
      FROM tasks 
      WHERE created_at >= $1 AND created_at <= $2
    `;

    const values = [startDate, endDate];
    
    if (userId) {
      query += ' AND (assigned_to = $3 OR created_by = $3)';
      values.push(userId);
    }

    query += ' GROUP BY DATE(created_at) ORDER BY date';

    try {
      const result = await pgPool.query(query, values);
      return result.rows.map(row => ({
        date: row.date,
        task_count: parseInt(row.task_count)
      }));
    } catch (error) {
      console.error('Error getting tasks by date range:', error);
      throw error;
    }
  }
}

module.exports = Task;
