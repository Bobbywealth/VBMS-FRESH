const cron = require('node-cron');
const Task = require('../models/Task');

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
      const now = new Date();
      
      // Find recurring tasks that are due for next occurrence
      const recurringTasks = await Task.find({
        type: 'recurring',
        nextDue: { $lte: now },
        $or: [
          { recurringEndType: 'never' },
          { 
            recurringEndType: 'on', 
            recurringEndDate: { $gt: now } 
          },
          {
            recurringEndType: 'after'
            // TODO: Implement occurrence counting
          }
        ]
      });

      console.log(`Found ${recurringTasks.length} recurring tasks to process`);

      for (const task of recurringTasks) {
        await this.createNextRecurrence(task);
      }
    } catch (error) {
      console.error('Error processing recurring tasks:', error);
    }
  }

  async createNextRecurrence(originalTask) {
    try {
      // Check if task should end recurrence
      if (originalTask.shouldEndRecurrence()) {
        console.log(`Ending recurrence for task: ${originalTask.title}`);
        return;
      }

      // Create new task instance for next occurrence
      const nextTask = new Task({
        title: originalTask.title,
        description: originalTask.description,
        assignee: originalTask.assignee,
        project: originalTask.project,
        priority: originalTask.priority,
        type: 'recurring',
        recurringFrequency: originalTask.recurringFrequency,
        recurringEndType: originalTask.recurringEndType,
        recurringEndValue: originalTask.recurringEndValue,
        recurringEndDate: originalTask.recurringEndDate,
        owner: originalTask.owner,
        isAdminTask: originalTask.isAdminTask,
        tags: originalTask.tags,
        estimatedHours: originalTask.estimatedHours,
        due: originalTask.nextDue,
        status: 'todo',
        progress: 0,
        completed: false
      });

      // Calculate next due date
      nextTask.nextDue = nextTask.calculateNextDue();

      await nextTask.save();

      // Update original task's next due date
      originalTask.lastCompleted = new Date();
      originalTask.nextDue = originalTask.calculateNextDue();
      await originalTask.save();

      console.log(`Created next recurrence for task: ${originalTask.title}`);
    } catch (error) {
      console.error(`Error creating next recurrence for task ${originalTask.title}:`, error);
    }
  }

  async cleanupOldTasks() {
    try {
      // Delete completed recurring task instances older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await Task.deleteMany({
        type: 'recurring',
        status: 'done',
        completedAt: { $lt: thirtyDaysAgo }
      });

      console.log(`Cleaned up ${result.deletedCount} old completed recurring tasks`);
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
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const upcomingTasks = await Task.find({
        owner: userId,
        status: { $ne: 'done' },
        $or: [
          { due: { $gte: new Date(), $lte: endDate } },
          { nextDue: { $gte: new Date(), $lte: endDate } }
        ]
      }).sort({ due: 1, nextDue: 1 });

      return upcomingTasks;
    } catch (error) {
      console.error('Error fetching upcoming tasks:', error);
      return [];
    }
  }

  // Method to get overdue tasks for a user
  async getOverdueTasks(userId) {
    try {
      const now = new Date();
      const overdueTasks = await Task.find({
        owner: userId,
        status: { $ne: 'done' },
        $or: [
          { due: { $lt: now } },
          { nextDue: { $lt: now } }
        ]
      }).sort({ due: 1, nextDue: 1 });

      return overdueTasks;
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      return [];
    }
  }

  // Method to update task progress and handle completion
  async completeTask(taskId, userId) {
    try {
      const task = await Task.findOne({ _id: taskId, owner: userId });
      
      if (!task) {
        throw new Error('Task not found');
      }

      task.status = 'done';
      task.completed = true;
      task.progress = 100;
      task.completedAt = new Date();

      // For recurring tasks, handle next occurrence
      if (task.type === 'recurring') {
        task.lastCompleted = new Date();
        
        if (!task.shouldEndRecurrence()) {
          // Create next occurrence
          await this.createNextRecurrence(task);
        }
      }

      await task.save();
      return task;
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new TaskScheduler();