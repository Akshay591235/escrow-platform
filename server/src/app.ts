/**
 * Express App Configuration
 * 
 * Sets up middleware, routes, and error handling
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { authMiddleware, adminMiddleware } from './middleware/auth';
import { handleValidationErrors } from './middleware/validation';

// Controllers
import * as authController from './controllers/authController';
import * as transactionController from './controllers/transactionController';
import * as paymentController from './controllers/paymentController';
import * as adminController from './controllers/adminController';

// Validation schemas
import {
  registerValidation,
  loginValidation,
  initiateTransactionValidation,
  shipValidation,
  createOrderValidation,
  verifyPaymentValidation,
} from './middleware/validation';

export const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================================================
// AUTH ROUTES
// ============================================================================

app.post('/api/auth/register', registerValidation, handleValidationErrors, authController.register);
app.post('/api/auth/login', loginValidation, handleValidationErrors, authController.login);
app.get('/api/auth/me', authMiddleware, authController.getCurrentUser);

// ============================================================================
// TRANSACTION ROUTES
// ============================================================================

// Initiate transaction (buyer)
app.post(
  '/api/transactions/initiate',
  authMiddleware,
  initiateTransactionValidation,
  handleValidationErrors,
  transactionController.initiateTransaction
);

// Get transaction details
app.get('/api/transactions/:id', authMiddleware, transactionController.getTransaction);

// List user's transactions
app.get('/api/transactions', authMiddleware, transactionController.listUserTransactions);

// Ship goods (seller)
app.put(
  '/api/transactions/:id/ship',
  authMiddleware,
  shipValidation,
  handleValidationErrors,
  transactionController.shipTransaction
);

// Confirm receipt (buyer)
app.put('/api/transactions/:id/confirm', authMiddleware, transactionController.confirmReceipt);

// ============================================================================
// PAYMENT ROUTES
// ============================================================================

// Create payment order
app.post(
  '/api/payment/order',
  authMiddleware,
  createOrderValidation,
  handleValidationErrors,
  paymentController.createOrder
);

// Verify payment signature
app.post(
  '/api/payment/verify',
  authMiddleware,
  verifyPaymentValidation,
  handleValidationErrors,
  paymentController.verifyPayment
);

// Execute payout to seller
app.post('/api/payment/payout', authMiddleware, paymentController.executePayout);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

// List all transactions
app.get('/api/admin/transactions', authMiddleware, adminMiddleware, adminController.listAllTransactions);

// List all disputes
app.get('/api/admin/disputes', authMiddleware, adminMiddleware, adminController.listAllDisputes);

// Resolve dispute
app.put('/api/admin/disputes/:id/resolve', authMiddleware, adminMiddleware, adminController.resolveDispute);

// Manual release
app.post('/api/admin/transactions/:id/manual-release', authMiddleware, adminMiddleware, adminController.manualRelease);

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
    },
  });
});

export default app;
