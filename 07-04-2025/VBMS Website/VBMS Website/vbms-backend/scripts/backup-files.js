require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');

class FileBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.sourceDirectories = [
      './uploads',
      './logs',
      './.env',
      './package.json',
      './package-lock.json'
    ];
  }

  async createBackup() {
    console.log('📁 Starting file backup...');
    
    try {
      // Ensure backup directory exists
      await this.ensureBackupDirectory();
      
      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `vbms-files-backup-${timestamp}.tar.gz`;
      const backupPath = path.join(this.backupDir, backupFileName);
      
      console.log(`📁 Backup location: ${backupPath}`);
      
      // Check which sources exist
      const existingSources = await this.checkExistingSources();
      
      if (existingSources.length === 0) {
        console.log('⚠️  No source files/directories found to backup');
        return {
          success: false,
          error: 'No source files found'
        };
      }
      
      console.log(`📦 Backing up ${existingSources.length} items:`, existingSources);
      
      // Create tar.gz archive
      await this.createTarArchive(existingSources, backupPath);
      
      // Create backup metadata
      await this.createBackupMetadata(backupPath, existingSources);
      
      // Cleanup old backups (keep last 7 days)
      await this.cleanupOldBackups();
      
      console.log('✅ File backup completed successfully!');
      
      return {
        success: true,
        backupPath,
        timestamp,
        size: await this.getFileSize(backupPath),
        itemsBackedUp: existingSources.length
      };
      
    } catch (error) {
      console.error('❌ File backup failed:', error);
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

  async checkExistingSources() {
    const existingSources = [];
    
    for (const source of this.sourceDirectories) {
      try {
        await fs.access(source);
        existingSources.push(source);
        console.log(`✅ Found: ${source}`);
      } catch (error) {
        console.log(`⚠️  Not found: ${source}`);
      }
    }
    
    return existingSources;
  }

  createTarArchive(sources, backupPath) {
    return new Promise((resolve, reject) => {
      // Build tar command
      const sourcesStr = sources.map(s => `"${s}"`).join(' ');
      const command = `tar -czf "${backupPath}" ${sourcesStr}`;
      
      console.log(`⚡ Running: ${command}`);
      
      exec(command, { maxBuffer: 1024 * 1024 * 100 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Tar command failed: ${error.message}\nStderr: ${stderr}`));
          return;
        }
        
        if (stdout) {
          console.log('📦 Tar output:', stdout);
        }
        if (stderr) {
          console.log('⚠️  Tar warnings:', stderr);
        }
        
        resolve();
      });
    });
  }

  async createBackupMetadata(backupPath, sources) {
    const metadata = {
      type: 'files',
      timestamp: new Date().toISOString(),
      backupPath,
      sources,
      version: '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      size: await this.getFileSize(backupPath)
    };

    const metadataPath = backupPath.replace('.tar.gz', '-metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    console.log('📋 Created backup metadata');
  }

  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return Math.round(stats.size / 1024 / 1024 * 100) / 100; // MB with 2 decimal places
    } catch (error) {
      return 0;
    }
  }

  async cleanupOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => 
        file.startsWith('vbms-files-backup-') && file.endsWith('.tar.gz')
      );

      // Sort by creation time (oldest first)
      backupFiles.sort();

      // Keep only the last 7 backups
      const toDelete = backupFiles.slice(0, -7);

      for (const file of toDelete) {
        const filePath = path.join(this.backupDir, file);
        const metadataPath = filePath.replace('.tar.gz', '-metadata.json');
        
        try {
          await fs.unlink(filePath);
          await fs.unlink(metadataPath);
          console.log(`🗑️  Removed old backup: ${file}`);
        } catch (error) {
          console.log(`⚠️  Could not remove ${file}:`, error.message);
        }
      }

      if (toDelete.length > 0) {
        console.log(`🧹 Cleaned up ${toDelete.length} old file backup(s)`);
      }

    } catch (error) {
      console.log('⚠️  Could not cleanup old backups:', error.message);
    }
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (file.startsWith('vbms-files-backup-') && file.endsWith('.tar.gz')) {
          const backupPath = path.join(this.backupDir, file);
          const metadataPath = backupPath.replace('.tar.gz', '-metadata.json');
          
          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(metadataContent);
            
            backups.push({
              name: file,
              path: backupPath,
              timestamp: metadata.timestamp,
              size: `${metadata.size} MB`,
              sources: metadata.sources?.length || 0,
              sourcesList: metadata.sources || []
            });
          } catch (error) {
            // If metadata is missing, create basic info
            const stats = await fs.stat(backupPath);
            const size = await this.getFileSize(backupPath);
            
            backups.push({
              name: file,
              path: backupPath,
              timestamp: stats.birthtime.toISOString(),
              size: `${size} MB`,
              sources: 0,
              sourcesList: []
            });
          }
        }
      }

      return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Error listing file backups:', error);
      return [];
    }
  }

  async restoreBackup(backupName) {
    console.log(`🔄 Restoring file backup: ${backupName}`);
    
    try {
      const backupPath = path.join(this.backupDir, backupName);
      
      // Check if backup exists
      await fs.access(backupPath);
      
      // Create restore command
      const command = `tar -xzf "${backupPath}" -C .`;
      
      console.log(`⚡ Running: ${command}`);
      
      await new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`Restore failed: ${error.message}\nStderr: ${stderr}`));
            return;
          }
          
          if (stdout) {
            console.log('📦 Restore output:', stdout);
          }
          if (stderr) {
            console.log('⚠️  Restore warnings:', stderr);
          }
          
          resolve();
        });
      });
      
      console.log('✅ File backup restored successfully!');
      
      return {
        success: true,
        backupName,
        restoredTo: process.cwd()
      };
      
    } catch (error) {
      console.error('❌ File restore failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// CLI usage
if (require.main === module) {
  const backup = new FileBackup();
  
  const command = process.argv[2];
  const argument = process.argv[3];
  
  if (command === 'list') {
    backup.listBackups().then(backups => {
      console.log('📋 Available File Backups:');
      console.log('=' .repeat(60));
      
      if (backups.length === 0) {
        console.log('No file backups found.');
        return;
      }
      
      backups.forEach((backup, index) => {
        console.log(`${index + 1}. ${backup.name}`);
        console.log(`   Timestamp: ${backup.timestamp}`);
        console.log(`   Size: ${backup.size}`);
        console.log(`   Sources: ${backup.sources} items`);
        if (backup.sourcesList.length > 0) {
          console.log(`   Items: ${backup.sourcesList.join(', ')}`);
        }
        console.log('');
      });
    });
  } else if (command === 'restore' && argument) {
    backup.restoreBackup(argument).then(result => {
      if (result.success) {
        console.log(`\n🎉 Restore completed!`);
        console.log(`📍 Restored to: ${result.restoredTo}`);
        process.exit(0);
      } else {
        console.error(`\n💥 Restore failed: ${result.error}`);
        process.exit(1);
      }
    });
  } else {
    // Default: create backup
    backup.createBackup().then(result => {
      if (result.success) {
        console.log(`\n🎉 File backup completed!`);
        console.log(`📍 Location: ${result.backupPath}`);
        console.log(`📏 Size: ${result.size} MB`);
        console.log(`📦 Items backed up: ${result.itemsBackedUp}`);
        process.exit(0);
      } else {
        console.error(`\n💥 File backup failed: ${result.error}`);
        process.exit(1);
      }
    });
  }
}

module.exports = FileBackup;