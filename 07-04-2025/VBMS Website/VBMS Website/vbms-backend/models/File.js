const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileKey: {
    type: String,
    required: true,
    unique: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['logos', 'documents', 'images', 'videos', 'audio', 'general'],
    default: 'general'
  },
  storage: {
    type: String,
    enum: ['local', 's3'],
    default: 'local'
  },
  metadata: {
    width: Number,
    height: Number,
    duration: Number, // For video/audio files
    description: String,
    tags: [String]
  },
  accessLevel: {
    type: String,
    enum: ['public', 'private', 'restricted'],
    default: 'private'
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
fileSchema.index({ userId: 1, category: 1 });
fileSchema.index({ fileKey: 1 }, { unique: true });
fileSchema.index({ createdAt: -1 });

// Virtual for formatted file size
fileSchema.virtual('formattedSize').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Method to increment download count
fileSchema.methods.incrementDownload = async function() {
  this.downloadCount += 1;
  this.lastAccessed = new Date();
  return await this.save();
};

module.exports = mongoose.model('File', fileSchema);