/**
 * Seller Dashboard
 *
 * Allows sellers to:
 * 1. View all incoming orders
 * 2. Navigate to transaction detail to add shipping info
 * 3. See their User ID so buyers can initiate transactions with them
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionAPI } from '../services/api';
import { Transaction, User } from '../types';

const statusLabel: Record<string, string> = {
  initiated: 'Awaiting Buyer Payment',
  paid: 'Paid – Ship Now!',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  disputed: 'Disputed',
  refunded: 'Refunded',
};

interface Props {
  currentUser: any;
}

const SellerDashboard: React.FC<Props> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await transactionAPI.list('seller');
        setTransactions(res.data.data);
      } catch {
        setError('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const copyId = () => {
    navigator.clipboard.writeText(currentUser.userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pendingShipment = transactions.filter((t) => t.status === 'paid');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">📦 Seller Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Welcome, {currentUser.name}</p>
      </div>

      {/* Seller ID card */}
      <div className="card bg-indigo-50 border border-indigo-200">
        <h3 className="font-semibold text-indigo-800 mb-2">Your Seller ID</h3>
        <p className="text-sm text-gray-600 mb-3">
          Share this with buyers so they can initiate transactions with you.
        </p>
        <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 border border-indigo-200">
          <code className="text-sm font-mono text-gray-800 flex-1 break-all">{currentUser.userId}</code>
          <button onClick={copyId} className="button-secondary text-xs shrink-0">
            {copied ? '✅ Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Action needed */}
      {pendingShipment.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">
            ⚠️ {pendingShipment.length} order{pendingShipment.length > 1 ? 's' : ''} awaiting shipment
          </h3>
          <div className="space-y-2">
            {pendingShipment.map((txn) => (
              <div
                key={txn._id}
                onClick={() => navigate(`/transaction/${txn._id}`)}
                className="flex justify-between items-center bg-white rounded-lg px-4 py-2 border border-yellow-100 cursor-pointer hover:border-yellow-300 transition"
              >
                <span className="text-sm font-medium">{txn.itemName}</span>
                <span className="text-xs text-indigo-600">Add tracking →</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earnings Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Orders', value: transactions.length },
          {
            label: 'Completed',
            value: transactions.filter((t) => t.status === 'completed').length,
          },
          {
            label: 'Earnings (net)',
            value: `₹${transactions
              .filter((t) => t.status === 'completed')
              .reduce((sum, t) => sum + (t.itemPrice - 5), 0)}`,
          },
        ].map((stat) => (
          <div key={stat.label} className="card text-center">
            <p className="text-2xl font-bold text-indigo-600">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* All Transactions */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading orders…</div>
      ) : transactions.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-lg">No orders yet</p>
          <p className="text-gray-400 text-sm mt-1">Share your Seller ID with buyers to receive orders</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-semibold">All Orders</h3>
          {transactions.map((txn) => {
            const buyer = txn.buyerId as User;
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
                      Buyer: {buyer.name} · Item ₹{txn.itemPrice} · You receive ₹{txn.itemPrice - 5}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      {new Date(txn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`status-badge status-${txn.status}`}>
                    {statusLabel[txn.status] || txn.status}
                  </span>
                </div>

                {txn.status === 'paid' && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-lg">
                      🚚 Action needed: Add tracking details to ship the item
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

export default SellerDashboard;
