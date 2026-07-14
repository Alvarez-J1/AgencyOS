const cors = require('cors');
const express = require('express');
const helmet = require('helmet');

const { apiLimiter } = require('./config/rateLimiters');
const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const projectRoutes = require('./routes/projectRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT?.trim() || '100kb';
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

const getAllowedOrigins = () =>
  (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const createCorsOrigin = () => {
  const allowedOrigins = new Set(getAllowedOrigins());

  return (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    if (!isProduction && localhostOriginPattern.test(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  };
};

app.use(helmet());
app.use(cors({ origin: createCorsOrigin() }));
app.use(express.json({ limit: requestBodyLimit }));

app.head('/api/health', (_req, res) => {
  res.status(200).end();
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/tasks', taskRoutes);

module.exports = app;
