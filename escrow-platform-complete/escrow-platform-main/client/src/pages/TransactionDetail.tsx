/**
 * Transaction Detail Page
 *
 * Shows full transaction info and role-appropriate action buttons:
 * - Buyer: Pay → Confirm receipt → Raise dispute
 * - Seller: Ship goods → Raise dispute
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { transactionAPI, paymentAPI, disputeAPI } from '../services/api';
import { Transaction, User } from '../types';
import { loadRazorpayScript, openRazorpayCheckout } from '../services/razorpay';

const STATUS_STEPS = ['initiated', 'paid', 'shipped', 'delivered', 'completed'];

const statusLabel: Record<string, string> = {
  initiated: 'Initiated',
  paid: 'Payment Received',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  disputed: 'Disputed',
  refunded: 'Refunded',
};

interface Props {
  currentUser: any;
}

const TransactionDetail: React.FC<Props> = ({ currentUser }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [txn, setTxn] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  // Ship form
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');

  // Dispute form
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');

  const fetchTxn = async () => {
    try {
      const res = await transactionAPI.get(id!);
      setTxn(res.data.data);
    } catch {
      setError('Failed to load transaction');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTxn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isBuyer = txn && (txn.buyerId as User)._id === currentUser.userId;
  const isSeller = txn && (txn.sellerId as User)._id === currentUser.userId;

  const handlePay = async () => {
    if (!txn) return;
    setActionLoading(true);
    setError('');
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Failed to load Razorpay');

      const orderRes = await paymentAPI.createOrder(txn._id);
      const { orderId, amount, keyId } = orderRes.data.data;

      openRazorpayCheckout({
        key: keyId,
        order_id: orderId,
        amount: amount * 100,
        currency: 'INR',
        name: 'Escrow Platform',
        description: txn.itemName,
        prefill: {
          name: currentUser.name,
          email: currentUser.email,
          contact: currentUser.phone || '',
        },
        handler: async (response: any) => {
          try {
            await paymentAPI.verify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              transactionId: txn._id,
            });
            setSuccess('Payment successful! Funds held in escrow. Seller has been notified.');
            fetchTxn();
          } catch {
            setError('Payment verification failed. Please contact support.');
          }
        },
      });
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Payment failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShip = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    try {
      await transactionAPI.ship(txn!._id, { trackingNumber, carrier });
      setSuccess('Shipping details added successfully!');
      setTrackingNumber('');
      setCarrier('');
      fetchTxn();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update shipping');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    setActionLoading(true);
    setError('');
    try {
      await transactionAPI.confirm(txn!._id, {});
      // Trigger payout
      await paymentAPI.executePayout(txn!._id);
      setSuccess('Receipt confirmed! Payout processed to seller.');
      fetchTxn();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to confirm receipt');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    try {
      await disputeAPI.create({
        transactionId: txn!._id,
        reason: disputeReason,
        description: disputeDesc,
      });
      setSuccess('Dispute raised. Funds frozen until admin resolves it.');
      setShowDisputeForm(false);
      fetchTxn();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to raise dispute');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading transaction…</div>;
  if (!txn) return <div className="text-center py-12 text-red-500">{error || 'Transaction not found'}</div>;

  const buyer = txn.buyerId as User;
  const seller = txn.sellerId as User;
  const stepIndex = STATUS_STEPS.indexOf(txn.status);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="text-indigo-600 text-sm hover:underline">
        ← Back
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>
      )}

      {/* Status Progress */}
      {!['disputed', 'refunded'].includes(txn.status) && (
        <div className="card">
          <h3 className="font-semibold mb-4">Transaction Progress</h3>
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, i) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      i <= stepIndex ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {i < stepIndex ? '✓' : i + 1}
                  </div>
                  <span className="text-xs text-gray-500 mt-1 text-center w-16">{statusLabel[step]}</span>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-1 mb-4 transition-colors ${i < stepIndex ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Info */}
      <div className="card">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">{txn.itemName}</h2>
            <p className="text-gray-500 text-sm mt-1">{txn.description}</p>
          </div>
          <span className={`status-badge status-${txn.status}`}>{statusLabel[txn.status] || txn.status}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Item Price</span>
            <p className="font-semibold">₹{txn.itemPrice}</p>
          </div>
          <div>
            <span className="text-gray-500">Platform Fee</span>
            <p className="font-semibold">₹{txn.totalPlatformFee}</p>
          </div>
          <div>
            <span className="text-gray-500">Buyer Pays</span>
            <p className="font-semibold text-indigo-700">₹{txn.itemPrice + 5}</p>
          </div>
          <div>
            <span className="text-gray-500">Seller Receives</span>
            <p className="font-semibold text-green-700">₹{txn.itemPrice - 5}</p>
          </div>
        </div>

        <hr className="my-4" />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Buyer</span>
            <p className="font-medium">{buyer.name}</p>
            <p className="text-gray-400 text-xs">{buyer.email}</p>
          </div>
          <div>
            <span className="text-gray-500">Seller</span>
            <p className="font-medium">{seller.name}</p>
            <p className="text-gray-400 text-xs">{seller.email}</p>
          </div>
        </div>

        {(txn.trackingNumber || txn.carrier) && (
          <>
            <hr className="my-4" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Carrier</span>
                <p className="font-medium">{txn.carrier}</p>
              </div>
              <div>
                <span className="text-gray-500">Tracking #</span>
                <p className="font-medium font-mono">{txn.trackingNumber}</p>
              </div>
            </div>
          </>
        )}

        {txn.razorpayPaymentId && (
          <>
            <hr className="my-4" />
            <div className="text-sm">
              <span className="text-gray-500">Razorpay Payment ID</span>
              <p className="font-mono text-xs text-gray-700">{txn.razorpayPaymentId}</p>
            </div>
          </>
        )}

        <p className="text-xs text-gray-400 mt-4">
          Transaction ID: {txn._id} · Created {new Date(txn.createdAt).toLocaleDateString('en-IN')}
        </p>
      </div>

      {/* Actions */}
      <div className="card space-y-3">
        <h3 className="font-semibold">Actions</h3>

        {/* Buyer: Pay */}
        {isBuyer && txn.status === 'initiated' && (
          <button onClick={handlePay} className="button-primary w-full" disabled={actionLoading}>
            {actionLoading ? 'Processing…' : `💳 Pay ₹${txn.itemPrice + 5} (item ₹${txn.itemPrice} + ₹5 fee)`}
          </button>
        )}

        {/* Seller: Ship */}
        {isSeller && txn.status === 'paid' && (
          <form onSubmit={handleShip} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Carrier</label>
              <input
                type="text"
                className="input-field"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="e.g. Delhivery, BlueDart, DTDC"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
              <input
                type="text"
                className="input-field"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. DEL1234567890"
                required
              />
            </div>
            <button type="submit" className="button-primary w-full" disabled={actionLoading}>
              {actionLoading ? 'Updating…' : '🚚 Mark as Shipped'}
            </button>
          </form>
        )}

        {/* Buyer: Confirm Receipt */}
        {isBuyer && txn.status === 'shipped' && (
          <button onClick={handleConfirm} className="button-primary w-full" disabled={actionLoading}>
            {actionLoading ? 'Processing…' : '✅ Confirm Receipt & Release Payment'}
          </button>
        )}

        {/* Status messages */}
        {txn.status === 'paid' && isBuyer && (
          <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg">
            ✅ Payment received. Waiting for seller to ship the goods.
          </p>
        )}
        {txn.status === 'shipped' && isSeller && (
          <p className="text-sm text-purple-700 bg-purple-50 p-3 rounded-lg">
            📦 Goods shipped. Waiting for buyer to confirm receipt.
          </p>
        )}
        {txn.status === 'completed' && (
          <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
            🎉 Transaction completed! Seller has received ₹{txn.itemPrice - 5}.
          </p>
        )}
        {txn.status === 'disputed' && (
          <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">
            ⚠️ This transaction is under dispute. Funds are frozen until an admin resolves it.
          </p>
        )}
        {txn.status === 'refunded' && (
          <p className="text-sm text-orange-700 bg-orange-50 p-3 rounded-lg">
            💸 This transaction has been refunded.
          </p>
        )}

        {/* Raise Dispute */}
        {(isBuyer || isSeller) && ['paid', 'shipped', 'delivered'].includes(txn.status) && (
          <>
            {!showDisputeForm ? (
              <button
                onClick={() => setShowDisputeForm(true)}
                className="button-secondary w-full text-red-600 hover:bg-red-50"
              >
                ⚠️ Raise Dispute
              </button>
            ) : (
              <form onSubmit={handleDispute} className="space-y-3 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-700">Raise a Dispute</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <input
                    type="text"
                    className="input-field"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="e.g. Item not received, Wrong item sent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="input-field h-24 resize-none"
                    value={disputeDesc}
                    onChange={(e) => setDisputeDesc(e.target.value)}
                    placeholder="Describe the issue in detail…"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="button-primary bg-red-600 hover:bg-red-700 flex-1" disabled={actionLoading}>
                    {actionLoading ? 'Submitting…' : 'Submit Dispute'}
                  </button>
                  <button type="button" className="button-secondary" onClick={() => setShowDisputeForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TransactionDetail;
