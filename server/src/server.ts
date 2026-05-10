/**
 * Server Entry Point
 * 
 * Connects to MongoDB and starts Express server
 */

import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { app } from './app';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Start server
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 ESCROW PLATFORM SERVER STARTED                         ║
╚════════════════════════════════════════════════════════════╝

Environment: ${NODE_ENV}
Port: ${PORT}
API URL: http://localhost:${PORT}
Health Check: http://localhost:${PORT}/health

Documentation:
  - API: http://localhost:${PORT}/api/*
  - Health: http://localhost:${PORT}/health

Razorpay Test Mode Credentials:
  - Card: 4111111111111111
  - Expiry: 12/25
  - CVV: 123
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
