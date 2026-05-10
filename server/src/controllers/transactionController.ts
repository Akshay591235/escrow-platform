/**
 * Transaction Controller
 * 
 * Handles transaction lifecycle:
 * - Initiate (buyer creates)
 * - Ship (seller adds tracking)
 * - Confirm (buyer confirms receipt)
 */

import { Request, Response } from 'express';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { Dispute } from '../models/Dispute';
import { calculateFees, validateFeeCalculation } from '../utils/feeCalculator';
import { validateTransition } from '../utils/escrowStateMachine';
import { EscrowErrors, TransactionErrors, formatErrorResponse } from '../utils/errorHandler';

/**
 * Initiate transaction
 * POST /api/transactions/initiate
 * 
 * Buyer creates a new transaction with seller
 */
export const initiateTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatErrorResponse(new Error('Unauthorized')));
      return;
    }

    const { itemName, itemPrice, description, sellerId } = req.body;

    // Verify seller exists
    const seller = await User.findById(sellerId);
    if (!seller || seller.userType !== 'seller') {
      res.status(404).json(formatErrorResponse(TransactionErrors.SELLER_NOT_FOUND()));
      return;
    }

    // Calculate and validate fees
    const fees = calculateFees(itemPrice);
    validateFeeCalculation(fees);

    // Create transaction
    const transaction = new Transaction({
      buyerId: req.user.userId,
      sellerId,
      itemName,
      itemPrice,
      description,
      platformFeeFromBuyer: 5,
      platformFeeFromSeller: 5,
      totalPlatformFee: 10,
      status: 'initiated',
    });

    await transaction.save();
    await transaction.populate(['buyerId', 'sellerId']);

    res.status(201).json({
      success: true,
      message: 'Transaction initiated',
      data: transaction,
    });
  } catch (error) {
    res.status(500).json(formatErrorResponse(error));
  }
};

/**
 * Get transaction details
 * GET /api/transactions/:id
 */
export const getTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findById(id)
      .populate('buyerId', 'name email phone')
      .populate('sellerId', 'name email phone');

    if (!transaction) {
      res.status(404).json(formatErrorResponse(TransactionErrors.NOT_FOUND()));
      return;
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    res.status(500).json(formatErrorResponse(error));
  }
};

/**
 * List user's transactions
 * GET /api/transactions
 */
export const listUserTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatErrorResponse(new Error('Unauthorized')));
      return;
    }

    const { role = 'buyer', status, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const query: any = {};

    if (role === 'buyer') {
      query.buyerId = req.user.userId;
    } else if (role === 'seller') {
      query.sellerId = req.user.userId;
    }

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
 * Ship transaction (seller adds tracking)
 * PUT /api/transactions/:id/ship
 */
export const shipTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatErrorResponse(new Error('Unauthorized')));
      return;
    }

    const { id } = req.params;
    const { trackingNumber, carrier } = req.body;

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      res.status(404).json(formatErrorResponse(TransactionErrors.NOT_FOUND()));
      return;
    }

    // Verify seller is the one updating
    if (transaction.sellerId.toString() !== req.user.userId) {
      res.status(403).json(
        formatErrorResponse(EscrowErrors.UNAUTHORIZED_ACTION('update this transaction'))
      );
      return;
    }

    // Validate state transition: paid → shipped
    validateTransition(transaction.status, 'shipped', 'ship goods');

    // Check if dispute is active
    if (transaction.disputeId) {
      const dispute = await Dispute.findById(transaction.disputeId);
      if (dispute && dispute.status === 'open') {
        res.status(409).json(formatErrorResponse(EscrowErrors.DISPUTE_ACTIVE()));
        return;
      }
    }

    // Update transaction
    transaction.status = 'shipped';
    transaction.trackingNumber = trackingNumber;
    transaction.carrier = carrier;
    transaction.shippedAt = new Date();

    await transaction.save();
    await transaction.populate(['buyerId', 'sellerId']);

    res.status(200).json({
      success: true,
      message: 'Goods shipped successfully',
      data: transaction,
    });
  } catch (error) {
    res.status(500).json(formatErrorResponse(error));
  }
};

/**
 * Confirm receipt (buyer confirms delivery)
 * PUT /api/transactions/:id/confirm
 * 
 * This triggers the payout to seller (handled in paymentController)
 */
export const confirmReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatErrorResponse(new Error('Unauthorized')));
      return;
    }

    const { id } = req.params;
    const { feedback } = req.body;

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      res.status(404).json(formatErrorResponse(TransactionErrors.NOT_FOUND()));
      return;
    }

    // Verify buyer is the one confirming
    if (transaction.buyerId.toString() !== req.user.userId) {
      res.status(403).json(
        formatErrorResponse(EscrowErrors.UNAUTHORIZED_ACTION('confirm this transaction'))
      );
      return;
    }

    // Validate state transition: shipped → delivered
    validateTransition(transaction.status, 'delivered', 'confirm receipt');

    // Check if dispute is active
    if (transaction.disputeId) {
      const dispute = await Dispute.findById(transaction.disputeId);
      if (dispute && dispute.status === 'open') {
        res.status(409).json(formatErrorResponse(EscrowErrors.DISPUTE_ACTIVE()));
        return;
      }
    }

    // Update transaction
    transaction.status = 'delivered';
    transaction.deliveredAt = new Date();

    await transaction.save();
    await transaction.populate(['buyerId', 'sellerId']);

    res.status(200).json({
      success: true,
      message: 'Receipt confirmed - payout will be processed',
      data: transaction,
      nextStep: 'Payout is being processed to seller account',
    });
  } catch (error) {
    res.status(500).json(formatErrorResponse(error));
  }
};
