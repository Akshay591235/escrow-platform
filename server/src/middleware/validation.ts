/**
 * Request Validation Middleware
 * 
 * Validates request body, params, and query parameters
 */

import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { formatErrorResponse } from '../utils/errorHandler';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().reduce((acc, err) => {
      acc[err.param] = err.msg;
      return acc;
    }, {} as Record<string, string>);

    res.status(400).json(
      formatErrorResponse(new Error('Validation failed'))
    );
    return;
  }
  next();
};

/**
 * Auth validation
 */
export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').matches(/^[0-9]{10,}$/).withMessage('Valid phone number is required'),
  body('userType').isIn(['buyer', 'seller']).withMessage('User type must be buyer or seller'),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * Transaction validation
 */
export const initiateTransactionValidation = [
  body('itemName').trim().notEmpty().withMessage('Item name is required'),
  body('itemPrice').isFloat({ min: 1 }).withMessage('Item price must be positive'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('sellerId').isMongoId().withMessage('Valid seller ID is required'),
];

export const shipValidation = [
  param('id').isMongoId().withMessage('Valid transaction ID is required'),
  body('trackingNumber').trim().notEmpty().withMessage('Tracking number is required'),
  body('carrier').trim().notEmpty().withMessage('Carrier is required'),
];

/**
 * Payment validation
 */
export const createOrderValidation = [
  body('transactionId').isMongoId().withMessage('Valid transaction ID is required'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be positive'),
];

export const verifyPaymentValidation = [
  body('orderId').trim().notEmpty().withMessage('Order ID is required'),
  body('paymentId').trim().notEmpty().withMessage('Payment ID is required'),
  body('signature').trim().notEmpty().withMessage('Signature is required'),
  body('transactionId').isMongoId().withMessage('Valid transaction ID is required'),
];

/**
 * Dispute validation
 */
export const createDisputeValidation = [
  body('transactionId').isMongoId().withMessage('Valid transaction ID is required'),
  body('reason').trim().notEmpty().withMessage('Reason is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
];
