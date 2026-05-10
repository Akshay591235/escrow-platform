/**
 * Razorpay Configuration
 * 
 * Initializes Razorpay instance with test mode API keys.
 * Used for payment collection (from buyer) and payouts (to seller).
 * 
 * Test Mode Setup:
 * 1. Create account at https://dashboard.razorpay.com
 * 2. Get test keys from Settings → API Keys → Test Mode
 * 3. Use card: 4111111111111111 for test transactions
 */

import Razorpay from 'razorpay';

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

if (!razorpayKeyId || !razorpayKeySecret) {
  throw new Error('Razorpay API keys not configured in .env');
}

export const razorpayInstance = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

export const RAZORPAY_TEST_CARD = {
  number: '4111111111111111',
  expiry: '12/25',
  cvv: '123',
};

export const PLATFORM_ACCOUNT_ID = process.env.PLATFORM_ACCOUNT_ID || 'acc_test_default';
export const PLATFORM_EMAIL = process.env.PLATFORM_EMAIL || 'escrow@platform.com';
export const PLATFORM_PHONE = process.env.PLATFORM_PHONE || '919876543210';
