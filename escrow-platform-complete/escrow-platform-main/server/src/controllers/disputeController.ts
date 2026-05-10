/**
 * Dispute Controller
 *
 * Allows buyers or sellers to raise a dispute on a transaction.
 * Disputes freeze the escrow until an admin resolves them.
 */

import { Request, Response } from 'express';
import { Transaction } from '../models/Transaction';
import { Dispute } from '../models/Dispute';
import { formatErrorResponse, EscrowErrors, TransactionErrors } from '../utils/errorHandler';

/**
 * Create a dispute
 * POST /api/disputes
 *
 * Either buyer or seller can raise a dispute.
 * Transaction must be in paid, shipped, or delivered state.
 */
export const createDispute = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatErrorResponse(new Error('Unauthorized')));
      return;
    }

    const { transactionId, reason, description } = req.body;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      res.status(404).json(formatErrorResponse(TransactionErrors.NOT_FOUND()));
      return;
    }

    // Only buyer or seller of this transaction can raise a dispute
    const isBuyer = transaction.buyerId.toString() === req.user.userId;
    const isSeller = transaction.sellerId.toString() === req.user.userId;

    if (!isBuyer && !isSeller) {
      res.status(403).json(
        formatErrorResponse(EscrowErrors.UNAUTHORIZED_ACTION('raise a dispute on this transaction'))
      );
      return;
    }

    // Can only dispute transactions that are in progress
    const disputableStatuses = ['paid', 'shipped', 'delivered'];
    if (!disputableStatuses.includes(transaction.status)) {
      res.status(400).json(
        formatErrorResponse(
          new Error(
            `Cannot raise dispute for transaction in '${transaction.status}' status. ` +
            `Disputes can only be raised for transactions in: ${disputableStatuses.join(', ')}`
          )
        )
      );
      return;
    }

    // Check if dispute already exists and is open
    if (transaction.disputeId) {
      const existingDispute = await Dispute.findById(transaction.disputeId);
      if (existingDispute && existingDispute.status === 'open') {
        res.status(409).json(formatErrorResponse(EscrowErrors.DISPUTE_ACTIVE()));
        return;
      }
    }

    // Create dispute
    const dispute = new Dispute({
      transactionId,
      raisedBy: req.user.userId,
      reason,
      description,
      status: 'open',
    });

    await dispute.save();

    // Update transaction status to disputed and link dispute
    transaction.status = 'disputed';
    transaction.disputeId = dispute._id as any;
    await transaction.save();

    res.status(201).json({
      success: true,
      message: 'Dispute raised successfully. Funds are frozen until resolved by admin.',
      data: dispute,
    });
  } catch (error) {
    res.status(500).json(formatErrorResponse(error));
  }
};

/**
 * Get a dispute by ID
 * GET /api/disputes/:id
 */
export const getDispute = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatErrorResponse(new Error('Unauthorized')));
      return;
    }

    const { id } = req.params;

    const dispute = await Dispute.findById(id)
      .populate('transactionId')
      .populate('raisedBy', 'name email');

    if (!dispute) {
      res.status(404).json(formatErrorResponse(new Error('Dispute not found')));
      return;
    }

    const transaction = dispute.transactionId as any;

    // Only buyer, seller, or admin can view dispute
    if (
      req.user.userType !== 'admin' &&
      transaction.buyerId?.toString() !== req.user.userId &&
      transaction.sellerId?.toString() !== req.user.userId
    ) {
      res.status(403).json(
        formatErrorResponse(EscrowErrors.UNAUTHORIZED_ACTION('view this dispute'))
      );
      return;
    }

    res.status(200).json({
      success: true,
      data: dispute,
    });
  } catch (error) {
    res.status(500).json(formatErrorResponse(error));
  }
};
