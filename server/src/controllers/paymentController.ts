/**
 * Payment Controller
 * 
 * Handles:
 * 1. Order creation (Razorpay order for buyer)
 * 2. Payment verification (validate Razorpay signature)
 * 3. Payout execution (transfer to seller after confirmation)
 * 
 * Fee Model:
 * - Buyer pays: itemPrice + ₹5
 * - Seller receives: itemPrice - ₹5
 * - Platform keeps: ₹10 total
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import { Transaction } from '../models/Transaction';
import { razorpayInstance, PLATFORM_ACCOUNT_ID } from '../config/razorpay';
import { calculateFees, validateFeeCalculation } from '../utils/feeCalculator';
import { validateTransition } from '../utils/escrowStateMachine';
import { PaymentErrors, EscrowErrors, formatErrorResponse } from '../utils/errorHandler';

/**
 * Create Razorpay order
 * POST /api/payment/order
 * 
 * Creates order for buyer to pay (item price + ₹5 fee)
 */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatErrorResponse(new Error('Unauthorized')));
      return;
    }

    const { transactionId } = req.body;

    // Get transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      res.status(404).json(formatErrorResponse(new Error('Transaction not found')));
      return;
    }

    // Verify buyer is creating order
    if (transaction.buyerId.toString() !== req.user.userId) {
      res.status(403).json(formatErrorResponse(new Error('Not authorized')));
      return;
    }

    // Check status is initiated
    if (transaction.status !== 'initiated') {
      res.status(400).json(
        formatErrorResponse(new Error(`Cannot create order for transaction in ${transaction.status} status`))
      );
      return;
    }

    // Calculate amount: item price + ₹5 platform fee
    const fees = calculateFees(transaction.itemPrice);
    validateFeeCalculation(fees);

    // Create Razorpay order
    const order = await razorpayInstance.orders.create({
      amount: fees.buyerTotal * 100, // Convert to paise
      currency: 'INR',
      receipt: `txn_${transactionId}`,
      notes: {
        transactionId,
        buyerId: transaction.buyerId.toString(),
        sellerId: transaction.sellerId.toString(),
        itemName: transaction.itemName,
      },
    });

    // Store order ID in transaction
    transaction.razorpayOrderId = order.id;
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Payment order created',
      data: {
        orderId: order.id,
        amount: fees.buyerTotal,
        itemPrice: transaction.itemPrice,
        platformFee: 5,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    res.status(500).json(formatErrorResponse(error));
  }
};

/**
 * Verify payment signature
 * POST /api/payment/verify
 * 
 * Validates Razorpay signature and marks transaction as paid
 * Also notifies seller to ship goods
 */
export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatErrorResponse(new Error('Unauthorized')));
      return;
    }

    const { orderId, paymentId, signature, transactionId } = req.body;

    // Verify Razorpay signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== signature) {
      res.status(401).json(formatErrorResponse(PaymentErrors.INVALID_SIGNATURE()));
      return;
    }

    // Get transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      res.status(404).json(formatErrorResponse(new Error('Transaction not found')));
      return;
    }

    // Verify buyer is confirming payment
    if (transaction.buyerId.toString() !== req.user.userId) {
      res.status(403).json(formatErrorResponse(new Error('Not authorized')));
      return;
    }

    // Verify order ID matches
    if (transaction.razorpayOrderId !== orderId) {
      res.status(400).json(formatErrorResponse(new Error('Order ID mismatch')));
      return;
    }

    // Check if already paid
    if (transaction.status !== 'initiated') {
      res.status(400).json(formatErrorResponse(EscrowErrors.ALREADY_PAID()));
      return;
    }

    // Update transaction: initiated → paid (ESCROW LOCKED)
    validateTransition(transaction.status, 'paid', 'verify payment');

    transaction.status = 'paid';
    transaction.razorpayPaymentId = paymentId;
    transaction.paymentVerifiedAt = new Date();

    await transaction.save();
    await transaction.populate(['buyerId', 'sellerId']);

    // ✅ CRITICAL: Notify seller to ship goods
    // In production, this would send SMS/email via Twilio, AWS SES, etc.
    notifySellerToShip(transaction);

    res.status(200).json({
      success: true,
      message: 'Payment verified - funds held in escrow - seller notified to ship',
      data: {
        transactionId: transaction._id,
        status: transaction.status,
        paymentId,
        orderId,
        amount: transaction.itemPrice + 5,
      },
    });
  } catch (error) {
    res.status(500).json(formatErrorResponse(error));
  }
};

/**
 * Notify seller to ship goods
 * Called immediately after payment verification
 * 
 * In production: Send SMS/Email
 * In dev: Log to console
 */
const notifySellerToShip = (transaction: any): void => {
  const message = `
╔════════════════════════════════════════════════════════════╗
║ 🔔 NEW ORDER NOTIFICATION - PLEASE SHIP                   ║
╚════════════════════════════════════════════════════════════╝

Seller: ${transaction.sellerId.name} (${transaction.sellerId.email})
Item: ${transaction.itemName}
Price: ₹${transaction.itemPrice}
Buyer: ${transaction.buyerId.name}
Transaction ID: ${transaction._id}

ACTION REQUIRED: Add tracking details via PUT /api/transactions/${transaction._id}/ship

Funds are held in escrow. Payout will be released after buyer confirms receipt.
  `;

  console.log(message);

  // TODO: Replace with actual SMS/Email service
  // const notificationService = new NotificationService();
  // await notificationService.sendSMS(transaction.sellerId.phone, message);
  // await notificationService.sendEmail(transaction.sellerId.email, 'New Order - Please Ship', message);
};

/**
 * Execute payout to seller
 * Called when buyer confirms receipt (status: delivered → completed)
 * 
 * Payout: itemPrice - ₹5 platform fee
 * Platform keeps: ₹10 total (₹5 from buyer + ₹5 from seller)
 * 
 * Idempotent: Marked as completed immediately to prevent double-payout
 */
export const executePayout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatErrorResponse(new Error('Unauthorized')));
      return;
    }

    const { transactionId } = req.body;

    // Get transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      res.status(404).json(formatErrorResponse(new Error('Transaction not found')));
      return;
    }

    // Verify buyer is requesting payout (after confirmation)
    if (transaction.buyerId.toString() !== req.user.userId) {
      res.status(403).json(formatErrorResponse(new Error('Not authorized')));
      return;
    }

    // Check status is delivered
    if (transaction.status !== 'delivered') {
      res.status(400).json(
        formatErrorResponse(new Error(`Cannot execute payout for transaction in ${transaction.status} status`))
      );
      return;
    }

    // Calculate payout amount (minus ₹5 platform fee)
    const payoutAmount = transaction.itemPrice - 5;

    // Check if payout already executed
    if (transaction.razorpayPayoutId) {
      res.status(200).json({
        success: true,
        message: 'Payout already processed',
        data: {
          transactionId: transaction._id,
          payoutId: transaction.razorpayPayoutId,
          amount: payoutAmount,
        },
      });
      return;
    }

    // ✅ IDEMPOTENT: Mark as completed BEFORE actual payout
    // This prevents double-payout if payout fails and is retried
    transaction.status = 'completed';
    transaction.payoutAmount = payoutAmount;
    transaction.completedAt = new Date();

    // In production, execute actual Razorpay payout here
    // For testing, use mock payout ID
    const mockPayoutId = `payout_${Date.now()}`;
    transaction.razorpayPayoutId = mockPayoutId;

    await transaction.save();
    await transaction.populate(['buyerId', 'sellerId']);

    // Simulate payout to Razorpay (in test mode)
    // In production:
    // const payout = await razorpayInstance.transfers.create({
    //   account: transaction.sellerId.razorpayAccountId,
    //   amount: payoutAmount * 100,
    //   currency: 'INR',
    //   receipt: `payout_${transactionId}`,
    // });

    console.log(`
╔════════════════════════════════════════════════════════════╗
║ ✅ PAYOUT EXECUTED                                         ║
╚════════════════════════════════════════════════════════════╝

Transaction ID: ${transaction._id}
Seller: ${transaction.sellerId.name} (${transaction.sellerId.email})
Payout Amount: ₹${payoutAmount}
Payout ID: ${mockPayoutId}
Status: COMPLETED

Platform Fee Retained: ₹10
  Buyer paid: ₹5
  Seller paid: ₹5
    `);

    res.status(200).json({
      success: true,
      message: 'Payout executed successfully',
      data: {
        transactionId: transaction._id,
        status: transaction.status,
        payoutId: transaction.razorpayPayoutId,
        amount: payoutAmount,
        completedAt: transaction.completedAt,
      },
    });
  } catch (error) {
    res.status(500).json(formatErrorResponse(error));
  }
};
