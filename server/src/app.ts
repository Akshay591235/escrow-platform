/**
 * Express App Configuration
 * 
 * Sets up middleware, routes, and error handling.
 * Includes all 7 trust pillars: KYC, disputes, stats, notifications.
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
import * as kycController from './controllers/kycController';
import * as disputeController from './controllers/disputeController';

// Models (for inline stats)
import Transaction from './models/Transaction';
import User from './models/User';

// Validation schemas
import {
  registerValidation,
  loginValidation,
  initiateTransactionValidation,
  shipValidation,
  createOrderValidation,
  verifyPaymentValidation,
  disputeValidation,          // we'll add this
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

app.post(
  '/api/auth/register',
  registerValidation,
  handleValidationErrors,
  authController.register
);
app.post(
  '/api/auth/login',
  loginValidation,
  handleValidationErrors,
  authController.login
);
app.get('/api/auth/me', authMiddleware, authController.getCurrentUser);

// ============================================================================
// KYC ROUTES (Trust Pillar 2)
// ============================================================================

// Upload KYC (any logged‑in user)
app.post('/api/kyc/upload', authMiddleware, kycController.uploadKYC);

// Admin: list pending KYC
app.get(
  '/api/admin/kyc',
  authMiddleware,
  adminMiddleware,
  kycController.getPendingKYC
);

// Admin: approve/reject KYC
app.put(
  '/api/admin/kyc/:id',
  authMiddleware,
  adminMiddleware,
  kycController.reviewKYC
);

// ============================================================================
// TRANSACTION ROUTES
// ============================================================================

app.post(
  '/api/transactions/initiate',
  authMiddleware,
  initiateTransactionValidation,
  handleValidationErrors,
  transactionController.initiateTransaction
);

app.get('/api/transactions/:id', authMiddleware, transactionController.getTransaction);

app.get('/api/transactions', authMiddleware, transactionController.listUserTransactions);

app.put(
  '/api/transactions/:id/ship',
  authMiddleware,
  shipValidation,
  handleValidationErrors,
  transactionController.shipTransaction
);

app.put(
  '/api/transactions/:id/confirm',
  authMiddleware,
  transactionController.confirmReceipt
);

// Raise a dispute (buyer or seller) – Trust Pillar 3
app.post(
  '/api/transactions/:id/dispute',
  authMiddleware,
  disputeValidation,
  handleValidationErrors,
  disputeController.raiseDispute
);

// ============================================================================
// DISPUTE ROUTES (Trust Pillar 3)
// ============================================================================

// Get dispute details (for any party involved)
app.get(
  '/api/disputes/:id',
  authMiddleware,
  disputeController.getDispute
);

// ============================================================================
// PAYMENT ROUTES
// ============================================================================

app.post(
  '/api/payment/order',
  authMiddleware,
  createOrderValidation,
  handleValidationErrors,
  paymentController.createOrder
);

app.post(
  '/api/payment/verify',
  authMiddleware,
  verifyPaymentValidation,
  handleValidationErrors,
  paymentController.verifyPayment
);

app.post('/api/payment/payout', authMiddleware, paymentController.executePayout);

// ============================================================================
// ADMIN ROUTES
// ============================================================================

app.get(
  '/api/admin/transactions',
  authMiddleware,
  adminMiddleware,
  adminController.listAllTransactions
);

app.get(
  '/api/admin/disputes',
  authMiddleware,
  adminMiddleware,
  adminController.listAllDisputes
);

app.put(
  '/api/admin/disputes/:id/resolve',
  authMiddleware,
  adminMiddleware,
  adminController.resolveDispute
);

app.post(
  '/api/admin/transactions/:id/manual-release',
  authMiddleware,
  adminMiddleware,
  adminController.manualRelease
);

// ============================================================================
// PUBLIC STATISTICS (Trust Pillar 4)
// ============================================================================

app.get('/api/stats', async (_req: Request, res: Response) => {
  try {
    const successfulTransactions = await Transaction.countDocuments({ status: 'completed' });
    const trustedSellers = await User.countDocuments({ trustedSeller: true });
    res.json({ successfulTransactions, trustedSellers });
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch stats' });
  }
});

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
