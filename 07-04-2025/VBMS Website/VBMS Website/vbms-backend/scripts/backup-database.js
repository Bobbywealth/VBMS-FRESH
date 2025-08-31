require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.mongoUri = process.env.MONGO_URI;
  }

  async createBackup() {
    console.log('💾 Starting database backup...');
    
    try {
      // Ensure backup directory exists
      await this.ensureBackupDirectory();
      
      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `vbms-backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, backupFileName);
      
      console.log(`📁 Backup location: ${backupPath}`);
      
      // Extract database name from MongoDB URI
      const dbName = this.extractDatabaseName();
      console.log(`🗄️ Database: ${dbName}`);
      
      // Create mongodump command
      const mongodumpCmd = this.buildMongodumpCommand(dbName, backupPath);
      console.log(`⚡ Running: ${mongodumpCmd}`);
      
      // Execute backup
      await this.executeMongodump(mongodumpCmd);
      
      // Create backup metadata
      await this.createBackupMetadata(backupPath, dbName);
      
      // Cleanup old backups (keep last 7 days)
      await this.cleanupOldBackups();
      
      console.log('✅ Database backup completed successfully!');
      
      return {
        success: true,
        backupPath,
        timestamp,
        size: await this.getDirectorySize(backupPath)
      };
      
    } catch (error) {
      console.error('❌ Database backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch (error) {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${this.backupDir}`);
    }
  }

  extractDatabaseName() {
    try {
      // Extract database name from MongoDB URI
      const url = new URL(this.mongoUri);
      const dbName = url.pathname.split('/')[1].split('?')[0];
      return dbName || 'vbms';
    } catch (error) {
      console.log('⚠️  Could not extract database name, using default: vbms');
      return 'vbms';
    }
  }

  buildMongodumpCommand(dbName, backupPath) {
    // Build mongodump command based on MongoDB URI format
    if (this.mongoUri.includes('mongodb+srv://')) {
      // MongoDB Atlas connection
      return `mongodump --uri="${this.mongoUri}" --out="${backupPath}"`;
    } else {
      // Local or regular MongoDB connection
      return `mongodump --uri="${this.mongoUri}" --db="${dbName}" --out="${backupPath}"`;
    }
  }

  executeMongodump(command) {
    return new Promise((resolve, reject) => {
      exec(command, { maxBuffer: 1024 * 1024 * 100 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Mongodump failed: ${error.message}\nStderr: ${stderr}`));
          return;
        }
        
        console.log('📤 Mongodump output:', stdout);
        if (stderr) {
          console.log('⚠️  Mongodump warnings:', stderr);
        }
        
        resolve();
      });
    });
  }

  async createBackupMetadata(backupPath, dbName) {
    const metadata = {
      timestamp: new Date().toISOString(),
      dbName,
      backupPath,
      mongoUri: this.mongoUri.replace(/\/\/.*:.*@/, '//***:***@'), // Hide credentials
      version: '1.0.0',
      collections: await this.getCollectionList(),
      nodeVersion: process.version,
      platform: process.platform
    };

    const metadataPath = path.join(backupPath, 'backup-metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    console.log('📋 Created backup metadata');
  }

  async getCollectionList() {
    // This would require MongoDB connection to get actual collection list
    // For now, return expected collections
    return [
      'users',
      'inventoryitems',
      'inventorytransactions',
      'reports',
      'vapicalls',
      'subscriptions',
      'payments',
      'onboardings'
    ];
  }

  async getDirectorySize(dirPath) {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
          totalSize += await this.getDirectorySize(filePath);
        } else {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }

      return Math.round(totalSize / 1024 / 1024 * 100) / 100; // MB with 2 decimal places
    } catch (error) {
      return 0;
    }
  }

  async cleanupOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir, { withFileTypes: true });
      const backupDirs = files.filter(file => 
        file.isDirectory() && file.name.startsWith('vbms-backup-')
      );

      // Sort by creation time (oldest first)
      backupDirs.sort((a, b) => a.name.localeCompare(b.name));

      // Keep only the last 7 backups
      const toDelete = backupDirs.slice(0, -7);

      for (const dir of toDelete) {
        const dirPath = path.join(this.backupDir, dir.name);
        await this.removeDirectory(dirPath);
        console.log(`🗑️  Removed old backup: ${dir.name}`);
      }

      if (toDelete.length > 0) {
        console.log(`🧹 Cleaned up ${toDelete.length} old backup(s)`);
      }

    } catch (error) {
      console.log('⚠️  Could not cleanup old backups:', error.message);
    }
  }

  async removeDirectory(dirPath) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      console.log(`⚠️  Could not remove ${dirPath}:`, error.message);
    }
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir, { withFileTypes: true });
      const backups = [];

      for (const file of files) {
        if (file.isDirectory() && file.name.startsWith('vbms-backup-')) {
          const backupPath = path.join(this.backupDir, file.name);
          const metadataPath = path.join(backupPath, 'backup-metadata.json');
          
          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(metadataContent);
            const size = await this.getDirectorySize(backupPath);
            
            backups.push({
              name: file.name,
              path: backupPath,
              timestamp: metadata.timestamp,
              dbName: metadata.dbName,
              size: `${size} MB`,
              collections: metadata.collections?.length || 0
            });
          } catch (error) {
            // If metadata is missing, create basic info
            const stats = await fs.stat(backupPath);
            backups.push({
              name: file.name,
              path: backupPath,
              timestamp: stats.birthtime.toISOString(),
              dbName: 'unknown',
              size: `${await this.getDirectorySize(backupPath)} MB`,
              collections: 0
            });
          }
        }
      }

      return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }
}

// CLI usage
if (require.main === module) {
  const backup = new DatabaseBackup();
  
  const command = process.argv[2];
  
  if (command === 'list') {
    backup.listBackups().then(backups => {
      console.log('📋 Available Backups:');
      console.log('=' .repeat(60));
      
      if (backups.length === 0) {
        console.log('No backups found.');
        return;
      }
      
      backups.forEach((backup, index) => {
        console.log(`${index + 1}. ${backup.name}`);
        console.log(`   Timestamp: ${backup.timestamp}`);
        console.log(`   Database: ${backup.dbName}`);
        console.log(`   Size: ${backup.size}`);
        console.log(`   Collections: ${backup.collections}`);
        console.log('');
      });
    });
  } else {
    // Default: create backup
    backup.createBackup().then(result => {
      if (result.success) {
        console.log(`\n🎉 Backup completed!`);
        console.log(`📍 Location: ${result.backupPath}`);
        console.log(`📏 Size: ${result.size} MB`);
        process.exit(0);
      } else {
        console.error(`\n💥 Backup failed: ${result.error}`);
        process.exit(1);
      }
    });
  }
}

module.exports = DatabaseBackup;