const mongoose = require('mongoose');

const generateToken = require('../utils/generateToken');
const User = require('../models/User');
const Client = require('../models/Client');
const ClientActivity = require('../models/ClientActivity');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { DEMO_USER, buildDemoWorkspace } = require('../data/demoWorkspace');

const buildAuthResponse = (user) => ({
  token: generateToken(user._id),
  user: {
    id: user._id,
    name: user.name,
    email: user.email
  }
});

const isDatabaseReady = () => mongoose.connection.readyState === 1;

const seedDemoWorkspace = async (ownerId) => {
  const [existingClients, existingProjects, existingTasks, completedTasksWithDates] = await Promise.all([
    Client.countDocuments({ owner: ownerId }),
    Project.countDocuments({ owner: ownerId }),
    Task.countDocuments({ owner: ownerId }),
    Task.countDocuments({ owner: ownerId, status: 'Completed', completedAt: { $exists: true, $ne: null } })
  ]);

  if (existingClients >= 20 && existingProjects >= 12 && existingTasks >= 35 && completedTasksWithDates >= 25) {
    return;
  }

  const withOwner = (records) => records.map((record) => ({ ...record, owner: ownerId }));
  const { clients, projects, tasks } = buildDemoWorkspace();

  await Promise.all([
    Client.deleteMany({ owner: ownerId }),
    ClientActivity.deleteMany({ owner: ownerId }),
    Project.deleteMany({ owner: ownerId }),
    Task.deleteMany({ owner: ownerId })
  ]);

  await Promise.all([
    Client.insertMany(withOwner(clients)),
    Project.insertMany(withOwner(projects)),
    Task.insertMany(withOwner(tasks))
  ]);
};

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: 'A user with this email already exists.' });
    }

    const user = await User.create({ name, email, password });

    return res.status(201).json(buildAuthResponse(user));
  } catch (_error) {
    return res.status(500).json({ message: 'Signup failed. Please try again.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.json(buildAuthResponse(user));
  } catch (_error) {
    return res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

const demoLogin = async (_req, res) => {
  if (!isDatabaseReady()) {
    return res.status(503).json({
      message: 'The demo workspace is unavailable right now. Please make sure the database is running and try again.'
    });
  }

  try {
    let user = await User.findOne({ email: DEMO_USER.email });

    if (!user) {
      user = await User.create({ ...DEMO_USER });
    }

    await seedDemoWorkspace(user._id);

    return res.json(buildAuthResponse(user));
  } catch (_error) {
    return res.status(500).json({ message: 'Unable to start the demo right now. Please try again.' });
  }
};

module.exports = { login, signup, demoLogin };
