
const { pool } = require('./database.js');

// User operations
const userQueries = {
  async getUserById(id) {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async getUserByEmail(email) {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async createUser(userData) {
    const client = await pool.connect();
    try {
      const { name, email, password, role = 'client', status = 'Active' } = userData;
      const result = await client.query(
        'INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, email, password, role, status]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async updateUser(id, userData) {
    const client = await pool.connect();
    try {
      const fields = Object.keys(userData).map((key, index) => `${key} = $${index + 2}`).join(', ');
      const values = [id, ...Object.values(userData)];
      const result = await client.query(
        `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        values
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }
};

// Order operations
const orderQueries = {
  async getOrdersByUserId(userId) {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY order_date DESC', [userId]);
      return result.rows;
    } finally {
      client.release();
    }
  },

  async createOrder(orderData) {
    const client = await pool.connect();
    try {
      const { user_id, order_number, status = 'pending', total_amount, items, notes } = orderData;
      const result = await client.query(
        'INSERT INTO orders (user_id, order_number, status, total_amount, items, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [user_id, order_number, status, total_amount, JSON.stringify(items), notes]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async updateOrderStatus(id, status) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }
};

// Task operations
const taskQueries = {
  async getTasksByUserId(userId) {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      return result.rows;
    } finally {
      client.release();
    }
  },

  async createTask(taskData) {
    const client = await pool.connect();
    try {
      const { user_id, title, description, status = 'pending', priority = 'medium', due_date } = taskData;
      const result = await client.query(
        'INSERT INTO tasks (user_id, title, description, status, priority, due_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [user_id, title, description, status, priority, due_date]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async updateTask(id, taskData) {
    const client = await pool.connect();
    try {
      const fields = Object.keys(taskData).map((key, index) => `${key} = $${index + 2}`).join(', ');
      const values = [id, ...Object.values(taskData)];
      const result = await client.query(
        `UPDATE tasks SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        values
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }
};

// Inventory operations
const inventoryQueries = {
  async getInventoryByUserId(userId) {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM inventory WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      return result.rows;
    } finally {
      client.release();
    }
  },

  async createInventoryItem(itemData) {
    const client = await pool.connect();
    try {
      const { user_id, item_name, sku, quantity = 0, price, category, status = 'active' } = itemData;
      const result = await client.query(
        'INSERT INTO inventory (user_id, item_name, sku, quantity, price, category, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [user_id, item_name, sku, quantity, price, category, status]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async updateInventoryQuantity(id, quantity) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'UPDATE inventory SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [quantity, id]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }
};

// Monitoring operations
const monitoringQueries = {
  async logEvent(userId, eventType, eventData) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO monitoring_logs (user_id, event_type, event_data) VALUES ($1, $2, $3) RETURNING *',
        [userId, eventType, JSON.stringify(eventData)]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async getLogsByUserId(userId, limit = 100) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM monitoring_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2',
        [userId, limit]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
};

module.exports = {
  userQueries,
  orderQueries,
  taskQueries,
  inventoryQueries,
  monitoringQueries
};
