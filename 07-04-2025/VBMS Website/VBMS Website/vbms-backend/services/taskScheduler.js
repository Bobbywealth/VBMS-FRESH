const cron = require('node-cron');
const { pgPool } = require('../config/database');

class TaskScheduler {
  constructor() {
    this.jobs = new Map();
    this.init();
  }

  init() {
    // Run every hour to check for recurring tasks that need to be created
    cron.schedule('0 * * * *', async () => {
      console.log('Running recurring task check...');
      await this.processRecurringTasks();
    });

    // Run daily at midnight to clean up old completed recurring tasks
    cron.schedule('0 0 * * *', async () => {
      console.log('Running daily task maintenance...');
      await this.cleanupOldTasks();
    });

    console.log('Task scheduler initialized');
  }

  async processRecurringTasks() {
    try {
      const client = await pgPool.connect();
      // Placeholder for recurring tasks logic
      // Since we don't have the full schema, we'll just log for now
      // In a real implementation, we would query the 'tasks' table for recurring items
      console.log('Processing recurring tasks (PostgreSQL implementation pending schema)');
      client.release();
    } catch (error) {
      console.error('Error processing recurring tasks:', error);
    }
  }

  async cleanupOldTasks() {
    try {
      const client = await pgPool.connect();
      // Delete completed recurring task instances older than 30 days
      // Assuming table 'tasks' and columns 'status', 'completed_at', 'type'

      // await client.query(`
      //   DELETE FROM tasks 
      //   WHERE type = 'recurring' 
      //   AND status = 'done' 
      //   AND completed_at < NOW() - INTERVAL '30 days'
      // `);

      console.log('Cleaned up old completed recurring tasks (Placeholder)');
      client.release();
    } catch (error) {
      console.error('Error cleaning up old tasks:', error);
    }
  }

  // Method to manually trigger recurring task processing (for testing)
  async processNow() {
    await this.processRecurringTasks();
  }

  // Method to get next due tasks for a user
  async getUpcomingTasks(userId, days = 7) {
    try {
      const client = await pgPool.connect();
      const result = await client.query(`
        SELECT * FROM tasks 
        WHERE user_id = $1 
        AND status != 'done'
        AND due_date BETWEEN NOW() AND NOW() + INTERVAL '${days} days'
        ORDER BY due_date ASC
      `, [userId]);

      client.release();
      return result.rows;
    } catch (error) {
      // If table doesn't exist yet, return empty array to prevent crash
      console.error('Error fetching upcoming tasks (Table might not exist):', error.message);
      return [];
    }
  }

  // Method to get overdue tasks for a user
  async getOverdueTasks(userId) {
    try {
      const client = await pgPool.connect();
      const result = await client.query(`
        SELECT * FROM tasks 
        WHERE user_id = $1 
        AND status != 'done'
        AND due_date < NOW()
        ORDER BY due_date ASC
      `, [userId]);

      client.release();
      return result.rows;
    } catch (error) {
      console.error('Error fetching overdue tasks:', error.message);
      return [];
    }
  }
}

// Export singleton instance
module.exports = new TaskScheduler();