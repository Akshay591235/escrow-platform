/**
 * Transaction Model - CORE ESCROW LOGIC
 * 
 * Central data model for all escrow transactions.
 * 
 * State Machine:
 *   initiated → paid → shipped �� delivered → completed
 *   ↓ (at any stage)
 *   disputed → resolved/refunded
 * 
 * Fee Model:
 *   - Buyer pays: itemPrice + ₹5 platform fee
 *   - Seller receives: itemPrice - ₹5 platform fee
 *   - Platform keeps: ₹10 total (₹5 from buyer + ₹5 from seller)
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  itemName: string;
  itemPrice: number; // in rupees
  description: string;
  
  // Escrow State
  status: 'initiated' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'disputed' | 'refunded';
  
  // Payment Details
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentVerifiedAt?: Date;
  
  // Shipping Details
  trackingNumber?: string;
  carrier?: string;
  shippedAt?: Date;
  
  // Delivery & Payout
  deliveredAt?: Date;
  razorpayPayoutId?: string;
  payoutAmount?: number;
  completedAt?: Date;
  
  // Fees (Fixed)
  platformFeeFromBuyer: number; // ₹5
  platformFeeFromSeller: number; // ₹5
  totalPlatformFee: number; // ₹10
  
  // Dispute
  disputeId?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    itemPrice: {
      type: Number,
      required: true,
      min: 1,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['initiated', 'paid', 'shipped', 'delivered', 'completed', 'disputed', 'refunded'],
      default: 'initiated',
      index: true,
    },
    razorpayOrderId: {
      type: String,
      sparse: true,
    },
    razorpayPaymentId: {
      type: String,
      sparse: true,
    },
    paymentVerifiedAt: Date,
    trackingNumber: String,
    carrier: String,
    shippedAt: Date,
    deliveredAt: Date,
    razorpayPayoutId: {
      type: String,
      sparse: true,
    },
    payoutAmount: Number,
    completedAt: Date,
    platformFeeFromBuyer: {
      type: Number,
      default: 5,
    },
    platformFeeFromSeller: {
      type: Number,
      default: 5,
    },
    totalPlatformFee: {
      type: Number,
      default: 10,
    },
    disputeId: {
      type: Schema.Types.ObjectId,
      ref: 'Dispute',
      sparse: true,
    },
  },
  { timestamps: true }
);

/**
 * Indexes for query optimization
 */
transactionSchema.index({ buyerId: 1, createdAt: -1 });
transactionSchema.index({ sellerId: 1, createdAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ razorpayOrderId: 1 });
transactionSchema.index({ razorpayPaymentId: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
