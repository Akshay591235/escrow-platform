/**
 * Error Handler Utilities
 * 
 * Standardized error responses for all API endpoints
 */

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message);
  }
}

/**
 * Escrow-specific errors
 */
export const EscrowErrors = {
  INVALID_STATE_TRANSITION: (current: string, target: string) =>
    new AppError(
      'INVALID_STATE_TRANSITION',
      `Cannot transition from ${current} to ${target}`,
      400,
      { currentState: current, targetState: target }
    ),

  ALREADY_PAID: () =>
    new AppError('ALREADY_PAID', 'Transaction already paid', 400),

  NOT_PAID: () =>
    new AppError('NOT_PAID', 'Transaction not yet paid', 400),

  NOT_SHIPPED: () =>
    new AppError('NOT_SHIPPED', 'Goods not yet shipped', 400),

  ALREADY_CONFIRMED: () =>
    new AppError('ALREADY_CONFIRMED', 'Receipt already confirmed', 400),

  PAYOUT_FAILED: (reason: string) =>
    new AppError('PAYOUT_FAILED', `Payout failed: ${reason}`, 500, { reason }),

  DISPUTE_ACTIVE: () =>
    new AppError('DISPUTE_ACTIVE', 'Cannot modify transaction with active dispute', 409),

  UNAUTHORIZED_ACTION: (action: string) =>
    new AppError('UNAUTHORIZED_ACTION', `Not authorized to ${action}`, 403, { action }),
};

/**
 * Payment errors
 */
export const PaymentErrors = {
  INVALID_SIGNATURE: () =>
    new AppError('INVALID_SIGNATURE', 'Payment signature verification failed', 401),

  ORDER_NOT_FOUND: () =>
    new AppError('ORDER_NOT_FOUND', 'Razorpay order not found', 404),

  PAYMENT_FAILED: (reason: string) =>
    new AppError('PAYMENT_FAILED', `Payment failed: ${reason}`, 402, { reason }),
};

/**
 * Auth errors
 */
export const AuthErrors = {
  INVALID_CREDENTIALS: () =>
    new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401),

  USER_ALREADY_EXISTS: () =>
    new AppError('USER_ALREADY_EXISTS', 'User with this email already exists', 409),

  INVALID_TOKEN: () =>
    new AppError('INVALID_TOKEN', 'Invalid or expired authentication token', 401),

  USER_NOT_FOUND: () =>
    new AppError('USER_NOT_FOUND', 'User not found', 404),
};

/**
 * Transaction errors
 */
export const TransactionErrors = {
  NOT_FOUND: () =>
    new AppError('TRANSACTION_NOT_FOUND', 'Transaction not found', 404),

  SELLER_NOT_FOUND: () =>
    new AppError('SELLER_NOT_FOUND', 'Seller not found', 404),

  INVALID_AMOUNT: () =>
    new AppError('INVALID_AMOUNT', 'Invalid transaction amount', 400),
};

/**
 * Validation errors
 */
export const ValidationErrors = {
  MISSING_FIELD: (field: string) =>
    new AppError('MISSING_FIELD', `Missing required field: ${field}`, 400, { field }),

  INVALID_FORMAT: (field: string, format: string) =>
    new AppError('INVALID_FORMAT', `Invalid ${field} format. Expected: ${format}`, 400, {
      field,
      format,
    }),

  INVALID_EMAIL: () =>
    new AppError('INVALID_EMAIL', 'Invalid email format', 400),

  INVALID_PHONE: () =>
    new AppError('INVALID_PHONE', 'Invalid phone number format', 400),
};

/**
 * Format error response
 */
export const formatErrorResponse = (error: any): ErrorResponse => {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error : undefined,
    },
  };
};
