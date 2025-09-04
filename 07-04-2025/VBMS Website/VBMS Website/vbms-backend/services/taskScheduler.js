const cron = require('node-cron');

class TaskScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  // Start the task scheduler (simplified for PostgreSQL migration)
  start() {
    if (this.isRunning) {
      console.log('⏰ Task scheduler is already running');
      return;
    }

    console.log('⏰ Starting task scheduler (PostgreSQL mode - simplified)');
    this.isRunning = true;

    // Basic cleanup job - runs daily at midnight
    const cleanupJob = cron.schedule('0 0 * * *', () => {
      console.log('🧹 Running daily cleanup...');
      this.performBasicCleanup();
    }, {
      scheduled: false
    });

    this.jobs.set('daily-cleanup', cleanupJob);
    cleanupJob.start();

    console.log('✅ Task scheduler started with basic cleanup job');
  }

  // Stop the task scheduler
  stop() {
    console.log('🛑 Stopping task scheduler...');
    
    for (const [name, job] of this.jobs) {
      job.destroy();
      console.log(`🛑 Stopped job: ${name}`);
    }
    
    this.jobs.clear();
    this.isRunning = false;
    console.log('✅ Task scheduler stopped');
  }

  // Basic cleanup (no database operations during migration)
  async performBasicCleanup() {
    try {
      console.log('🧹 Performing basic system cleanup...');
      
      // Log cleanup completion
      console.log('✅ Basic cleanup completed');
      
      return {
        success: true,
        message: 'Basic cleanup completed',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      totalJobs: this.jobs.size,
      mode: 'PostgreSQL (simplified)',
      timestamp: new Date().toISOString()
    };
  }

  // Check if scheduler is running
  isActive() {
    return this.isRunning;
  }
}

module.exports = new TaskScheduler();