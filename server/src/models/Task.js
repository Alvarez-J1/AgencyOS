const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    id: { type: Number, required: true },
    title: { type: String, required: true },
    project: { type: String, required: true },
    assignee: { type: String, default: '' },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: { type: String, enum: ['Todo', 'In Progress', 'Completed'], default: 'Todo' },
    dueDate: { type: String, required: true },
    completedAt: { type: Date },
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

taskSchema.index({ owner: 1, id: 1 }, { unique: true });

module.exports = mongoose.model('Task', taskSchema);
