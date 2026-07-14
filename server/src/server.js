const dotenv = require('dotenv');

const connectDB = require('./config/db');
const { validateMongoUri } = require('./config/db');
const { validateJwtSecret } = require('./config/jwt');
const ensureResourceIndexes = require('./config/resourceIndexes');

dotenv.config();

const app = require('./app');

const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

const getAllowedOrigins = () =>
  (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const validateCorsConfig = () => {
  if (isProduction && getAllowedOrigins().length === 0) {
    throw new Error(
      'CLIENT_ORIGIN is required when NODE_ENV=production. Set one or more comma-separated frontend origins.'
    );
  }
};

validateJwtSecret();
validateCorsConfig();
validateMongoUri();

if (isProduction) {
  app.set('trust proxy', 1);
}

const startServer = async () => {
  const isDatabaseConnected = await connectDB();

  if (isDatabaseConnected) {
    await ensureResourceIndexes();
  }

  app.listen(PORT, () => {
    console.log(`AgencyOS API running on http://localhost:${PORT}`);
  });
};

startServer();
