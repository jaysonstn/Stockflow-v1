require('dotenv').config();
const app = require('./app');
const { pool } = require('./database/db');
const seed = require('./database/seed');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3001;
const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 2000;

async function waitForDatabase() {
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      logger.info('Database connection established');
      return;
    } catch (err) {
      logger.warn(`Database not ready (attempt ${i}/${MAX_RETRIES}): ${err.message}`);
      if (i === MAX_RETRIES) throw new Error('Database never became ready');
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

async function start() {
  try {
    logger.info('Waiting for database...');
    await waitForDatabase();

    logger.info('Running seed...');
    await seed();

    const server = app.listen(PORT, () => {
      logger.info(`StockFlow API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
      logger.info('Login: admin@stockflow.com / Admin@123');
    });

    const shutdown = () => {
      logger.info('Shutting down...');
      server.close(() => {
        pool.end();
        process.exit(0);
      });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (err) {
    logger.error('Startup failed: ' + err.message);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection: ' + reason);
  process.exit(1);
});

start();
