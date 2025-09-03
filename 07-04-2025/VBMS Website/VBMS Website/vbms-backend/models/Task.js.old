const mongoose = require('mongoose');

const SubtaskSchema = new mongoose.Schema({
  text:       String,
  completed:  { type: Boolean, default: false }
});

const TaskSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  assignee:    { type: String, default: '' },
  due:         Date,
  project:     { type: String, default: '' },
  status:      { 
    type: String, 
    enum: ['todo', 'progress', 'review', 'done'], 
    default: 'todo' 
  },
  priority:    { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  type:        { 
    type: String, 
    enum: ['one-time', 'recurring'], 
    default: 'one-time' 
  },
  progress:    { type: Number, default: 0, min: 0, max: 100 },
  
  // Recurring task fields
  recurringFrequency: { 
    type: String, 
    enum: ['daily', 'weekly', 'monthly', 'yearly'], 
    default: null 
  },
  recurringEndType: { 
    type: String, 
    enum: ['never', 'after', 'on'], 
    default: 'never' 
  },
  recurringEndValue: { type: Number, default: null }, // Number of occurrences or timestamp
  recurringEndDate: { type: Date, default: null },
  lastCompleted: { type: Date, default: null },
  nextDue: { type: Date, default: null },
  
  subtasks:    [SubtaskSchema],
  completed:   { type: Boolean, default: false },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Admin/Customer differentiation
  isAdminTask: { type: Boolean, default: false },
  
  // Additional metadata
  tags:        [String],
  estimatedHours: { type: Number, default: 0 },
  actualHours: { type: Number, default: 0 }
}, { timestamps: true });

// Calculate next due date for recurring tasks
TaskSchema.methods.calculateNextDue = function() {
  if (this.type !== 'recurring' || !this.recurringFrequency) {
    return null;
  }
  
  const baseDate = this.lastCompleted || this.createdAt;
  const nextDue = new Date(baseDate);
  
  switch (this.recurringFrequency) {
    case 'daily':
      nextDue.setDate(nextDue.getDate() + 1);
      break;
    case 'weekly':
      nextDue.setDate(nextDue.getDate() + 7);
      break;
    case 'monthly':
      nextDue.setMonth(nextDue.getMonth() + 1);
      break;
    case 'yearly':
      nextDue.setFullYear(nextDue.getFullYear() + 1);
      break;
  }
  
  return nextDue;
};

// Check if recurring task should end
TaskSchema.methods.shouldEndRecurrence = function() {
  if (this.type !== 'recurring') return false;
  
  if (this.recurringEndType === 'never') return false;
  
  if (this.recurringEndType === 'on' && this.recurringEndDate) {
    return new Date() > this.recurringEndDate;
  }
  
  if (this.recurringEndType === 'after' && this.recurringEndValue) {
    // Count completed instances - this would need to be tracked separately
    // For now, return false
    return false;
  }
  
  return false;
};

module.exports = mongoose.model('Task', TaskSchema);
