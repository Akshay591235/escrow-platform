/**
 * Dispute Model
 * 
 * Handles transaction disputes with admin resolution.
 * Can be raised by either buyer or seller.
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IDispute extends Document {
  transactionId: mongoose.Types.ObjectId;
  raisedBy: mongoose.Types.ObjectId;
  reason: string;
  description: string;
  status: 'open' | 'resolved' | 'closed';
  resolution?: 'refund' | 'payout' | 'partial' | null;
  resolutionAmount?: number;
  resolutionNotes?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const disputeSchema = new Schema<IDispute>(
  {
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
    },
    raisedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    resolution: {
      type: String,
      enum: ['refund', 'payout', 'partial', null],
      default: null,
    },
    resolutionAmount: Number,
    resolutionNotes: String,
    resolvedAt: Date,
  },
  { timestamps: true }
);

disputeSchema.index({ transactionId: 1 });
disputeSchema.index({ status: 1 });

export const Dispute = mongoose.model<IDispute>('Dispute', disputeSchema);
