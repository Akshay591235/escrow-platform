/**
 * Authentication Controller
 * 
 * Handles user registration and login with JWT token generation
 */

import { Request, Response } from 'express';
import { User } from '../models/User';
import { generateToken } from '../config/jwt';
import { AuthErrors, formatErrorResponse } from '../utils/errorHandler';

/**
 * Register new user
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, userType } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json(formatErrorResponse(AuthErrors.USER_ALREADY_EXISTS()));
      return;
    }

    // Create new user (password auto-hashed by pre-save hook)
    const user = new User({
      name,
      email,
      password,
      phone,
      userType,
    });

    await user.save();

    // Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      userType: user.userType as 'buyer' | 'seller',
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
        userType: user.userType,
        token,
      },
    });
  } catch (error) {
    res.status(500).json(formatErrorResponse(error));
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json(formatErrorResponse(AuthErrors.INVALID_CREDENTIALS()));
      return;
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json(formatErrorResponse(AuthErrors.INVALID_CREDENTIALS()));
      return;
    }

    // Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      userType: user.userType as 'buyer' | 'seller',
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
        userType: user.userType,
        token,
      },
    });
  } catch (error) {
    res.status(500).json(formatErrorResponse(error));
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatErrorResponse(AuthErrors.INVALID_TOKEN()));
      return;
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      res.status(404).json(formatErrorResponse(AuthErrors.USER_NOT_FOUND()));
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json(formatErrorResponse(error));
  }
};
