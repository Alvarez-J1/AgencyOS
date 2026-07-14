const Task = require('../models/Task');

const buildCompletionUpdate = (status, currentTask) => {
  if (status === undefined) {
    return {};
  }

  if (status === 'Completed') {
    return currentTask?.completedAt ? {} : { completedAt: new Date() };
  }

  return { completedAt: null };
};

const createTask = async (req, res) => {
  try {
    const {
      title,
      project,
      assignee = '',
      priority = 'Medium',
      status = 'Todo',
      dueDate,
      notes = ''
    } = req.body;

    if (!title || !project || !dueDate) {
      return res.status(400).json({ message: 'Task title, project, and due date are required.' });
    }

    const latestTask = await Task.findOne({ owner: req.user._id }).sort({ id: -1 }).lean();
    const nextId = latestTask ? latestTask.id + 1 : 1;

    const task = await Task.create({
      owner: req.user._id,
      id: nextId,
      title,
      project,
      assignee,
      priority,
      status,
      dueDate,
      ...buildCompletionUpdate(status),
      notes
    });

    return res.status(201).json(task);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Task could not be created.' });
  }
};

const getTasks = async (req, res) => {
  try {
    const databaseTasks = await Task.find({ owner: req.user._id }).sort({ dueDate: 1 }).lean();
    return res.json(databaseTasks);
  } catch (error) {
    return res.status(500).json({ message: 'Tasks could not be loaded.' });
  }
};

const updateTask = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Task id is invalid.' });
    }

    const allowedUpdates = ['title', 'project', 'assignee', 'priority', 'status', 'dueDate', 'notes'];
    const updates = {};

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const existingTask = await Task.findOne({ owner: req.user._id, id }).lean();

    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    Object.assign(updates, buildCompletionUpdate(updates.status, existingTask));

    const task = await Task.findOneAndUpdate({ owner: req.user._id, id }, updates, {
      new: true,
      runValidators: true
    }).lean();

    return res.json(task);
  } catch (error) {
    return res.status(400).json({ message: 'Task could not be updated.' });
  }
};

const deleteTask = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Task id is invalid.' });
    }

    const task = await Task.findOneAndDelete({ owner: req.user._id, id }).lean();

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.json({ message: 'Task deleted.' });
  } catch (error) {
    return res.status(400).json({ message: 'Task could not be deleted.' });
  }
};

module.exports = { createTask, deleteTask, getTasks, updateTask };
