/**
 * TypeScript Types for Frontend
 */

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  userType: 'buyer' | 'seller' | 'admin';
  kycVerified: boolean;
  createdAt: string;
}

export interface Transaction {
  _id: string;
  buyerId: User | string;
  sellerId: User | string;
  itemName: string;
  itemPrice: number;
  description: string;
  status: 'initiated' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'disputed' | 'refunded';
  
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentVerifiedAt?: string;
  
  trackingNumber?: string;
  carrier?: string;
  shippedAt?: string;
  
  deliveredAt?: string;
  razorpayPayoutId?: string;
  payoutAmount?: number;
  completedAt?: string;
  
  platformFeeFromBuyer: number;
  platformFeeFromSeller: number;
  totalPlatformFee: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    email: string;
    name: string;
    userType: string;
    token: string;
  };
}

export interface PaymentOrder {
  success: boolean;
  data: {
    orderId: string;
    amount: number;
    itemPrice: number;
    platformFee: number;
    currency: string;
    keyId: string;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export interface Dispute {
  _id: string;
  transactionId: string;
  raisedBy: string;
  reason: string;
  description: string;
  status: 'open' | 'resolved' | 'closed';
  resolution?: 'refund' | 'payout' | 'partial';
  resolutionAmount?: number;
  createdAt: string;
}
