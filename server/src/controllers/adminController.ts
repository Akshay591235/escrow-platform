/**
 * Admin Controller
 * 
 * Admin-only endpoints for:
 * - Viewing all transactions
 * - Resolving disputes
 * - Manual transaction release
 * 
 * Requires admin role (verified in middleware)
 */

import { Request, Response } from 'express';
import { Transaction } from '../models/Transaction';
import { Dispute } from '../models/Dispute';
import { formatErrorResponse } from '../utils/errorHandler';

/**
 * List all transactions (admin)
 * GET /api/admin/transactions
 */
export const listAllTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const query: any = {};
    if (status) {
      query.status = status;
    }

    const transactions = await Transaction.find(query)
      .populate('buyerId', 'name email phone')
      .populate('sellerId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json(formatErrorResponse(error));
  }
};

/**
 * List all disputes (admin)
 * GET /api/admin/disputes
 */
export const listAllDisputes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const query: any = {};
    if (status) {
      query.status = status;
    }

    const disputes = await Dispute.find(query)
      .populate('transactionId')
      .populate('raisedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Dispute.countDocuments(query);

    res.status(200).json({
      success: true,
      data: disputes,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json(formatErrorResponse(error));
  }
};

/**
 * Resolve dispute (admin)
 * PUT /api/admin/disputes/:id/resolve
 */
export const resolveDispute = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { resolution, amount, notes } = req.body;

    const dispute = await Dispute.findById(id).populate('transactionId');
    if (!dispute) {
      res.status(404).json(formatErrorResponse(new Error('Dispute not found')));
      return;
    }

    const transaction = dispute.transactionId as any;

    // Update dispute
    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.resolutionAmount = amount;
    dispute.resolutionNotes = notes;
    dispute.resolvedAt = new Date();

    await dispute.save();

    // Update transaction based on resolution
    if (resolution === 'refund') {
      transaction.status = 'refunded';
    } else if (resolution === 'payout') {
      transaction.status = 'completed';
    } else if (resolution === 'partial') {
      transaction.status = 'completed';
    }

    transaction.disputeId = dispute._id;
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Dispute resolved',
      data: dispute,
    });
  } catch (error) {
    res.status(500).json(formatErrorResponse(error));
  }
};

/**
 * Manual release (admin override)
 * POST /api/admin/transactions/:id/manual-release
 */
export const manualRelease = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'complete' | 'refund' | 'hold'

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      res.status(404).json(formatErrorResponse(new Error('Transaction not found')));
      return;
    }

    // Log action
    console.log(`
╔════════════════════════════════════════════════════════════╗
║ 🔧 ADMIN MANUAL OVERRIDE                                   ║
╚════════════════════════════════════════════════════════════╝

Transaction ID: ${transaction._id}
Action: ${action}
Notes: ${notes}
Timestamp: ${new Date().toISOString()}
    `);

    if (action === 'complete') {
      transaction.status = 'completed';
      transaction.completedAt = new Date();
    } else if (action === 'refund') {
      transaction.status = 'refunded';
    }

    await transaction.save();

    res.status(200).json({
      success: true,
      message: `Transaction manually ${action}ed`,
      data: transaction,
    });
  } catch (error) {
    res.status(500).json(formatErrorResponse(error));
  }
};
