/**
 * Buyer Dashboard
 *
 * Allows buyers to:
 * 1. Initiate a new escrow transaction (with a seller ID + item details)
 * 2. View all their transactions
 * 3. Navigate to transaction detail for payment / confirmation
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionAPI } from '../services/api';
import { Transaction, User } from '../types';

const statusLabel: Record<string, string> = {
  initiated: 'Awaiting Payment',
  paid: 'Paid – Awaiting Shipment',
  shipped: 'Shipped – Confirm Receipt',
  delivered: 'Delivered',
  completed: 'Completed',
  disputed: 'Disputed',
  refunded: 'Refunded',
};

interface Props {
  currentUser: any;
}

const BuyerDashboard: React.FC<Props> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // New transaction form
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [description, setDescription] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchTransactions = async () => {
    try {
      const res = await transactionAPI.list('buyer');
      setTransactions(res.data.data);
    } catch {
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      await transactionAPI.initiate({
        itemName,
        itemPrice: parseFloat(itemPrice),
        description,
        sellerId,
      });
      setShowForm(false);
      setItemName(''); setItemPrice(''); setDescription(''); setSellerId('');
      fetchTransactions();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Failed to initiate transaction');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">🛒 Buyer Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">Welcome, {currentUser.name}</p>
        </div>
        <button className="button-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Transaction'}
        </button>
      </div>

      {/* New Transaction Form */}
      {showForm && (
        <div className="card border-indigo-200 border-2">
          <h3 className="font-semibold mb-4 text-indigo-700">Start New Escrow Transaction</h3>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {formError}
            </div>
          )}
          <form onSubmit={handleInitiate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. iPhone 15 Pro"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Price (₹)</label>
                <input
                  type="number"
                  className="input-field"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="e.g. 50000"
                  min="1"
                  step="1"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="input-field h-20 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the item and any agreed conditions…"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seller ID</label>
              <input
                type="text"
                className="input-field font-mono text-sm"
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                placeholder="MongoDB ObjectId from seller's profile"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Ask the seller to share their User ID from their profile.</p>
            </div>
            {itemPrice && (
              <div className="bg-indigo-50 rounded-lg p-3 text-sm">
                <p className="text-indigo-700 font-medium">Fee Breakdown</p>
                <p className="text-gray-600 mt-1">Item price: ₹{parseFloat(itemPrice) || 0}</p>
                <p className="text-gray-600">Platform fee: ₹5</p>
                <p className="text-indigo-800 font-bold mt-1">You will pay: ₹{(parseFloat(itemPrice) || 0) + 5}</p>
                <p className="text-gray-500 text-xs mt-1">Seller receives: ₹{(parseFloat(itemPrice) || 0) - 5} (after ₹5 fee)</p>
              </div>
            )}
            <button type="submit" className="button-primary w-full" disabled={formLoading}>
              {formLoading ? 'Creating…' : 'Create Transaction'}
            </button>
          </form>
        </div>
      )}

      {/* Transactions List */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading transactions…</div>
      ) : transactions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-lg">No transactions yet</p>
          <p className="text-gray-400 text-sm mt-1">Start a new escrow transaction to get going!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((txn) => {
            const seller = txn.sellerId as User;
            return (
              <div
                key={txn._id}
                className="card hover:border-indigo-200 border border-transparent cursor-pointer transition-all"
                onClick={() => navigate(`/transaction/${txn._id}`)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{txn.itemName}</h3>
                    <p className="text-gray-500 text-sm mt-1">
                      Seller: {seller.name} · ₹{txn.itemPrice}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      {new Date(txn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`status-badge status-${txn.status}`}>
                    {statusLabel[txn.status] || txn.status}
                  </span>
                </div>

                {txn.status === 'initiated' && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg">
                      💳 Action needed: Pay ₹{txn.itemPrice + 5} to start escrow
                    </p>
                  </div>
                )}
                {txn.status === 'shipped' && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-purple-700 bg-purple-50 px-3 py-2 rounded-lg">
                      📦 Goods shipped via {txn.carrier} · #{txn.trackingNumber} · Confirm receipt to release payment
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BuyerDashboard;
