const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs').promises;

class StorageService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.s3 = null;
    this.bucket = process.env.AWS_S3_BUCKET;
    this.region = process.env.AWS_REGION || 'us-east-1';
    
    if (this.isProduction && process.env.AWS_ACCESS_KEY_ID) {
      this.initS3();
    }
  }

  initS3() {
    try {
      // Configure AWS S3
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: this.region
      });

      this.s3 = new AWS.S3();
      console.log('✅ AWS S3 storage service initialized');
    } catch (error) {
      console.error('❌ S3 initialization failed:', error.message);
      console.log('📁 Falling back to local storage');
    }
  }

  // Get multer configuration for file uploads
  getMulterConfig(folder = 'general') {
    if (this.isProduction && this.s3 && this.bucket) {
      // Production: Use S3 storage
      return multer({
        storage: multerS3({
          s3: this.s3,
          bucket: this.bucket,
          acl: 'public-read',
          key: (req, file, cb) => {
            const fileName = `${folder}/${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
            cb(null, fileName);
          },
          contentType: multerS3.AUTO_CONTENT_TYPE
        }),
        limits: {
          fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
        },
        fileFilter: this.fileFilter
      });
    } else {
      // Development: Use local storage
      const storage = multer.diskStorage({
        destination: async (req, file, cb) => {
          const uploadPath = path.join(__dirname, '../uploads', folder);
          try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
          } catch (error) {
            cb(error);
          }
        },
        filename: (req, file, cb) => {
          const fileName = `${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
          cb(null, fileName);
        }
      });

      return multer({
        storage: storage,
        limits: {
          fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
        },
        fileFilter: this.fileFilter
      });
    }
  }

  // File filter for security
  fileFilter(req, file, cb) {
    // Define allowed file types
    const allowedTypes = {
      image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
    };

    const allAllowedTypes = Object.values(allowedTypes).flat();

    if (allAllowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  }

  // Get file URL (works for both local and S3)
  getFileUrl(filePath) {
    if (this.isProduction && this.s3 && this.bucket) {
      // S3 URL
      return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${filePath}`;
    } else {
      // Local URL
      return `/uploads/${filePath}`;
    }
  }

  // Upload file programmatically
  async uploadFile(fileBuffer, originalName, folder = 'general', userId = null) {
    try {
      const fileName = `${folder}/${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(originalName)}`;

      if (this.isProduction && this.s3 && this.bucket) {
        // Upload to S3
        const params = {
          Bucket: this.bucket,
          Key: fileName,
          Body: fileBuffer,
          ACL: 'public-read',
          ContentType: this.getContentType(originalName),
          Metadata: {
            uploadedBy: userId || 'system',
            uploadedAt: new Date().toISOString()
          }
        };

        const result = await this.s3.upload(params).promise();
        return {
          url: result.Location,
          key: result.Key,
          bucket: result.Bucket
        };
      } else {
        // Save locally
        const localPath = path.join(__dirname, '../uploads', fileName);
        const dir = path.dirname(localPath);
        
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(localPath, fileBuffer);
        
        return {
          url: `/uploads/${fileName}`,
          key: fileName,
          bucket: 'local'
        };
      }
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('File upload failed');
    }
  }

  // Delete file
  async deleteFile(fileKey) {
    try {
      if (this.isProduction && this.s3 && this.bucket) {
        // Delete from S3
        const params = {
          Bucket: this.bucket,
          Key: fileKey
        };
        await this.s3.deleteObject(params).promise();
        console.log(`✅ File deleted from S3: ${fileKey}`);
      } else {
        // Delete local file
        const localPath = path.join(__dirname, '../uploads', fileKey);
        await fs.unlink(localPath);
        console.log(`✅ Local file deleted: ${fileKey}`);
      }
    } catch (error) {
      console.error('File deletion error:', error);
      throw new Error('File deletion failed');
    }
  }

  // Get content type from file extension
  getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.mp4': 'video/mp4',
      '.mpeg': 'video/mpeg',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg'
    };
    return contentTypes[ext] || 'application/octet-stream';
  }

  // List files in a folder
  async listFiles(folder = '', limit = 100) {
    try {
      if (this.isProduction && this.s3 && this.bucket) {
        // List S3 objects
        const params = {
          Bucket: this.bucket,
          Prefix: folder,
          MaxKeys: limit
        };
        const result = await this.s3.listObjectsV2(params).promise();
        return result.Contents.map(obj => ({
          key: obj.Key,
          size: obj.Size,
          modified: obj.LastModified,
          url: this.getFileUrl(obj.Key)
        }));
      } else {
        // List local files
        const localPath = path.join(__dirname, '../uploads', folder);
        try {
          const files = await fs.readdir(localPath);
          const fileStats = await Promise.all(
            files.map(async (file) => {
              const filePath = path.join(localPath, file);
              const stats = await fs.stat(filePath);
              return {
                key: path.join(folder, file),
                size: stats.size,
                modified: stats.mtime,
                url: this.getFileUrl(path.join(folder, file))
              };
            })
          );
          return fileStats.slice(0, limit);
        } catch (error) {
          return []; // Directory doesn't exist or is empty
        }
      }
    } catch (error) {
      console.error('List files error:', error);
      return [];
    }
  }

  // Get storage stats
  async getStorageStats() {
    try {
      const folders = ['logos', 'documents', 'videos', 'images', 'general'];
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        folders: {}
      };

      for (const folder of folders) {
        const files = await this.listFiles(folder);
        stats.folders[folder] = {
          count: files.length,
          size: files.reduce((sum, file) => sum + file.size, 0)
        };
        stats.totalFiles += files.length;
        stats.totalSize += stats.folders[folder].size;
      }

      return stats;
    } catch (error) {
      console.error('Storage stats error:', error);
      return { totalFiles: 0, totalSize: 0, folders: {} };
    }
  }
}

module.exports = new StorageService();