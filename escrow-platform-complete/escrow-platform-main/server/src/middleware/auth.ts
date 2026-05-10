/**
 * Authentication Middleware
 * 
 * Verifies JWT token in Authorization header.
 * Extracts user info and attaches to request.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../config/jwt';
import { AuthErrors, formatErrorResponse } from '../utils/errorHandler';

/**
 * Extend Express Request with user info
 */
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Verify JWT token middleware
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json(formatErrorResponse(AuthErrors.INVALID_TOKEN()));
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyToken(token);
    
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json(formatErrorResponse(AuthErrors.INVALID_TOKEN()));
  }
};

/**
 * Verify admin role
 */
export const adminMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json(formatErrorResponse(AuthErrors.INVALID_TOKEN()));
    return;
  }

  if (req.user.userType !== 'admin') {
    res.status(403).json(
      formatErrorResponse(new Error('Admin access required'))
    );
    return;
  }

  next();
};

/**
 * Verify seller role
 */
export const sellerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json(formatErrorResponse(AuthErrors.INVALID_TOKEN()));
    return;
  }

  if (req.user.userType !== 'seller') {
    res.status(403).json(
      formatErrorResponse(new Error('Seller access required'))
    );
    return;
  }

  next();
};

/**
 * Verify buyer role
 */
export const buyerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json(formatErrorResponse(AuthErrors.INVALID_TOKEN()));
    return;
  }

  if (req.user.userType !== 'buyer') {
    res.status(403).json(
      formatErrorResponse(new Error('Buyer access required'))
    );
    return;
  }

  next();
};
