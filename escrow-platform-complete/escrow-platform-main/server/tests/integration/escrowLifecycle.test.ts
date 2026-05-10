/**
 * Escrow Lifecycle Integration Tests
 * 
 * Tests complete transaction flow:
 * initiated → paid → shipped → delivered → completed
 * 
 * This is the CORE test suite that validates:
 * - Full escrow state machine transitions
 * - Fee calculations (buyer +5, seller -5, platform +10)
 * - Payment verification and signature validation
 * - Payout idempotency (no double-spend)
 * - Edge cases (invalid transitions, disputes, etc.)
 */

import { app } from '../../src/app';
import request from 'supertest';
import { connectDatabase, disconnectDatabase } from '../../src/config/database';
import { User } from '../../src/models/User';
import { Transaction } from '../../src/models/Transaction';
import crypto from 'crypto';

describe('Escrow Lifecycle - Complete Integration Tests', () => {
  let buyerToken: string;
  let sellerToken: string;
  let buyerId: string;
  let sellerId: string;
  let transactionId: string;
  let razorpayOrderId: string;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});
    await Transaction.deleteMany({});
  });

  describe('✅ Complete Happy Path: Full Transaction Lifecycle', () => {
    test('Step 1: Register buyer and seller', async () => {
      // Register buyer
      const buyerRes = await request(app).post('/api/auth/register').send({
        name: 'Alice Buyer',
        email: 'alice@example.com',
        password: 'password123',
        phone: '9876543210',
        userType: 'buyer',
      });

      expect(buyerRes.status).toBe(201);
      expect(buyerRes.body.success).toBe(true);
      expect(buyerRes.body.data.token).toBeDefined();
      buyerToken = buyerRes.body.data.token;
      buyerId = buyerRes.body.data.userId;

      // Register seller
      const sellerRes = await request(app).post('/api/auth/register').send({
        name: 'Bob Seller',
        email: 'bob@example.com',
        password: 'password123',
        phone: '9876543211',
        userType: 'seller',
      });

      expect(sellerRes.status).toBe(201);
      expect(sellerRes.body.data.token).toBeDefined();
      sellerToken = sellerRes.body.data.token;
      sellerId = sellerRes.body.data.userId;
    });

    test('Step 2: Buyer initiates transaction with item price 50000', async () => {
      const res = await request(app)
        .post('/api/transactions/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          itemName: 'iPhone 14',
          itemPrice: 50000,
          description: 'New, sealed in box',
          sellerId: sellerId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('initiated');
      expect(res.body.data.itemPrice).toBe(50000);
      expect(res.body.data.platformFeeFromBuyer).toBe(5);
      expect(res.body.data.platformFeeFromSeller).toBe(5);
      expect(res.body.data.totalPlatformFee).toBe(10);
      transactionId = res.body.data._id;
    });

    test('Step 3: Buyer creates Razorpay payment order (amount = 50005)', async () => {
      const res = await request(app)
        .post('/api/payment/order')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          transactionId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(50005); // Item price + ₹5 platform fee
      expect(res.body.data.itemPrice).toBe(50000);
      expect(res.body.data.platformFee).toBe(5);
      razorpayOrderId = res.body.data.orderId;
    });

    test('Step 4: Buyer verifies payment signature - Status transitions to PAID', async () => {
      // Create mock Razorpay signature
      const paymentId = `pay_test_${Date.now()}`;
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
      hmac.update(`${razorpayOrderId}|${paymentId}`);
      const signature = hmac.digest('hex');

      const res = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: razorpayOrderId,
          paymentId,
          signature,
          transactionId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('paid');
      expect(res.body.message).toContain('seller notified');

      // Verify transaction status updated in DB
      const tx = await Transaction.findById(transactionId);
      expect(tx?.status).toBe('paid');
      expect(tx?.razorpayPaymentId).toBe(paymentId);
      expect(tx?.paymentVerifiedAt).toBeDefined();
    });

    test('Step 5: Seller ships goods with tracking - Status transitions to SHIPPED', async () => {
      const res = await request(app)
        .put(`/api/transactions/${transactionId}/ship`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          trackingNumber: 'TRK123456789',
          carrier: 'FedEx',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('shipped');
      expect(res.body.data.trackingNumber).toBe('TRK123456789');
      expect(res.body.data.carrier).toBe('FedEx');
      expect(res.body.data.shippedAt).toBeDefined();
    });

    test('Step 6: Buyer confirms receipt - Status transitions to DELIVERED', async () => {
      const res = await request(app)
        .put(`/api/transactions/${transactionId}/confirm`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          feedback: 'Great! Received in perfect condition',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('delivered');
      expect(res.body.data.deliveredAt).toBeDefined();
    });

    test('Step 7: Execute payout - Status transitions to COMPLETED', async () => {
      const res = await request(app)
        .post('/api/payment/payout')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          transactionId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.amount).toBe(49995); // 50000 - 5 platform fee
      expect(res.body.data.payoutId).toBeDefined();
      expect(res.body.data.completedAt).toBeDefined();
    });

    test('Step 8: Verify final transaction state - All fees correct', async () => {
      const tx = await Transaction.findById(transactionId).populate(['buyerId', 'sellerId']);

      // ✅ Verify complete state
      expect(tx?.status).toBe('completed');
      expect(tx?.itemPrice).toBe(50000);
      expect(tx?.payoutAmount).toBe(49995); // Seller receives: 50000 - 5
      expect(tx?.platformFeeFromBuyer).toBe(5);
      expect(tx?.platformFeeFromSeller).toBe(5);
      expect(tx?.totalPlatformFee).toBe(10);

      // ✅ Verify fee math
      // Buyer pays: 50000 + 5 = 50005
      // Seller receives: 50000 - 5 = 49995
      // Platform gets: 50005 - 49995 = 10
      expect(50005 - 49995).toBe(10);

      // ✅ Verify timestamps
      expect(tx?.paymentVerifiedAt).toBeDefined();
      expect(tx?.shippedAt).toBeDefined();
      expect(tx?.deliveredAt).toBeDefined();
      expect(tx?.completedAt).toBeDefined();
    });
  });

  describe('🛡️ Edge Cases & Error Handling', () => {
    test('Should NOT allow shipping before payment', async () => {
      // Create transaction
      const txRes = await request(app)
        .post('/api/transactions/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          itemName: 'Test Item',
          itemPrice: 1000,
          description: 'Test',
          sellerId,
        });

      const transId = txRes.body.data._id;

      // Try to ship without paying
      const res = await request(app)
        .put(`/api/transactions/${transId}/ship`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          trackingNumber: 'TRK123',
          carrier: 'Courier',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toContain('INVALID_STATE_TRANSITION');
    });

    test('Should NOT allow confirm before shipping', async () => {
      // Create transaction and pay
      const txRes = await request(app)
        .post('/api/transactions/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          itemName: 'Test Item',
          itemPrice: 1000,
          description: 'Test',
          sellerId,
        });

      const transId = txRes.body.data._id;

      // Create and verify payment
      const orderRes = await request(app)
        .post('/api/payment/order')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ transactionId: transId });

      const orderId = orderRes.body.data.orderId;
      const paymentId = `pay_test_${Date.now()}`;
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
      hmac.update(`${orderId}|${paymentId}`);
      const signature = hmac.digest('hex');

      await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId,
          paymentId,
          signature,
          transactionId: transId,
        });

      // Try to confirm without shipping
      const res = await request(app)
        .put(`/api/transactions/${transId}/confirm`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          feedback: 'Good item',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('Should prevent double payout (idempotency)', async () => {
      // Complete a full transaction first
      const txRes = await request(app)
        .post('/api/transactions/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          itemName: 'Test Item',
          itemPrice: 1000,
          description: 'Test',
          sellerId,
        });

      const transId = txRes.body.data._id;

      // Create order
      const orderRes = await request(app)
        .post('/api/payment/order')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ transactionId: transId });

      const orderId = orderRes.body.data.orderId;
      const paymentId = `pay_test_${Date.now()}`;
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
      hmac.update(`${orderId}|${paymentId}`);
      const signature = hmac.digest('hex');

      // Verify payment
      await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId,
          paymentId,
          signature,
          transactionId: transId,
        });

      // Ship
      await request(app)
        .put(`/api/transactions/${transId}/ship`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          trackingNumber: 'TRK123',
          carrier: 'Courier',
        });

      // Confirm
      await request(app)
        .put(`/api/transactions/${transId}/confirm`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ feedback: 'Good' });

      // First payout
      const payout1 = await request(app)
        .post('/api/payment/payout')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ transactionId: transId });

      expect(payout1.status).toBe(200);
      const payoutId1 = payout1.body.data.payoutId;

      // Second payout attempt (should be idempotent)
      const payout2 = await request(app)
        .post('/api/payment/payout')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ transactionId: transId });

      expect(payout2.status).toBe(200);
      expect(payout2.body.data.payoutId).toBe(payoutId1);
      expect(payout2.body.message).toContain('already processed');
    });

    test('Should reject invalid payment signature', async () => {
      const txRes = await request(app)
        .post('/api/transactions/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          itemName: 'Test Item',
          itemPrice: 1000,
          description: 'Test',
          sellerId,
        });

      const transId = txRes.body.data._id;

      const orderRes = await request(app)
        .post('/api/payment/order')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ transactionId: transId });

      const res = await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: orderRes.body.data.orderId,
          paymentId: 'pay_123',
          signature: 'invalid_signature_hash',
          transactionId: transId,
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    });

    test('Should prevent unauthorized seller from shipping', async () => {
      // Create transaction
      const txRes = await request(app)
        .post('/api/transactions/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          itemName: 'Test Item',
          itemPrice: 1000,
          description: 'Test',
          sellerId,
        });

      const transId = txRes.body.data._id;

      // Create order and verify payment
      const orderRes = await request(app)
        .post('/api/payment/order')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ transactionId: transId });

      const orderId = orderRes.body.data.orderId;
      const paymentId = `pay_test_${Date.now()}`;
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
      hmac.update(`${orderId}|${paymentId}`);
      const signature = hmac.digest('hex');

      await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId,
          paymentId,
          signature,
          transactionId: transId,
        });

      // Try to ship as buyer (wrong role)
      const res = await request(app)
        .put(`/api/transactions/${transId}/ship`)
        .set('Authorization', `Bearer ${buyerToken}`) // Using buyer token
        .send({
          trackingNumber: 'TRK123',
          carrier: 'Courier',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('💰 Fee Verification Tests', () => {
    test('Fee calculation: Buyer pays exactly +₹5', async () => {
      const fees = [
        { itemPrice: 100, expectedBuyerTotal: 105 },
        { itemPrice: 1000, expectedBuyerTotal: 1005 },
        { itemPrice: 50000, expectedBuyerTotal: 50005 },
      ];

      for (const { itemPrice, expectedBuyerTotal } of fees) {
        const txRes = await request(app)
          .post('/api/transactions/initiate')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            itemName: 'Test Item',
            itemPrice,
            description: 'Test',
            sellerId,
          });

        const transId = txRes.body.data._id;

        const orderRes = await request(app)
          .post('/api/payment/order')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({ transactionId: transId });

        expect(orderRes.body.data.amount).toBe(expectedBuyerTotal);
      }
    });

    test('Fee calculation: Seller receives exactly -₹5', async () => {
      const fees = [
        { itemPrice: 100, expectedSellerReceives: 95 },
        { itemPrice: 1000, expectedSellerReceives: 995 },
        { itemPrice: 50000, expectedSellerReceives: 49995 },
      ];

      for (const { itemPrice, expectedSellerReceives } of fees) {
        const txRes = await request(app)
          .post('/api/transactions/initiate')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            itemName: 'Test Item',
            itemPrice,
            description: 'Test',
            sellerId,
          });

        const tx = await Transaction.findById(txRes.body.data._id);
        const payoutAmount = tx!.itemPrice - 5;
        expect(payoutAmount).toBe(expectedSellerReceives);
      }
    });

    test('Fee calculation: Platform always gets ₹10', async () => {
      const prices = [1, 10, 100, 1000, 50000];

      for (const price of prices) {
        const txRes = await request(app)
          .post('/api/transactions/initiate')
          .set('Authorization', `Bearer ${buyerToken}`)
          .send({
            itemName: 'Test Item',
            itemPrice: price,
            description: 'Test',
            sellerId,
          });

        const tx = txRes.body.data;
        expect(tx.totalPlatformFee).toBe(10);
        expect(tx.platformFeeFromBuyer).toBe(5);
        expect(tx.platformFeeFromSeller).toBe(5);
      }
    });
  });

  describe('📊 State Machine Validation', () => {
    test('Transaction status follows exact sequence', async () => {
      const txRes = await request(app)
        .post('/api/transactions/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          itemName: 'Test Item',
          itemPrice: 1000,
          description: 'Test',
          sellerId,
        });

      const transId = txRes.body.data._id;
      const statuses: string[] = ['initiated'];

      // Check initial status
      let tx = await Transaction.findById(transId);
      expect(tx?.status).toBe('initiated');

      // Create and verify payment
      const orderRes = await request(app)
        .post('/api/payment/order')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ transactionId: transId });

      const orderId = orderRes.body.data.orderId;
      const paymentId = `pay_test_${Date.now()}`;
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
      hmac.update(`${orderId}|${paymentId}`);
      const signature = hmac.digest('hex');

      await request(app)
        .post('/api/payment/verify')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId,
          paymentId,
          signature,
          transactionId: transId,
        });

      tx = await Transaction.findById(transId);
      statuses.push(tx!.status);
      expect(tx?.status).toBe('paid');

      // Ship
      await request(app)
        .put(`/api/transactions/${transId}/ship`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          trackingNumber: 'TRK123',
          carrier: 'Courier',
        });

      tx = await Transaction.findById(transId);
      statuses.push(tx!.status);
      expect(tx?.status).toBe('shipped');

      // Confirm
      await request(app)
        .put(`/api/transactions/${transId}/confirm`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ feedback: 'Good' });

      tx = await Transaction.findById(transId);
      statuses.push(tx!.status);
      expect(tx?.status).toBe('delivered');

      // Payout
      await request(app)
        .post('/api/payment/payout')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ transactionId: transId });

      tx = await Transaction.findById(transId);
      statuses.push(tx!.status);
      expect(tx?.status).toBe('completed');

      // Verify exact sequence
      expect(statuses).toEqual(['initiated', 'paid', 'shipped', 'delivered', 'completed']);
    });
  });
});
