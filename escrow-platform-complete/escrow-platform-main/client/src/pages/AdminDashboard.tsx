/**
 * Admin Dashboard
 *
 * Admin-only view for:
 * - All transactions with filters
 * - All open disputes with resolution actions
 * - Manual override (complete / refund)
 */

import React, { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';

type AdminTab = 'transactions' | 'disputes';

const statusColor: Record<string, string> = {
  initiated: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  disputed: 'bg-red-100 text-red-800',
  refunded: 'bg-orange-100 text-orange-800',
  open: 'bg-red-100 text-red-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-700',
};

interface Props {
  currentUser: any;
}

const AdminDashboard: React.FC<Props> = ({ currentUser }) => {
  const [tab, setTab] = useState<AdminTab>('transactions');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedDispute, setExpandedDispute] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.listTransactions(statusFilter || undefined);
      setTransactions(res.data.data);
    } catch {
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.listDisputes(statusFilter || undefined);
      setDisputes(res.data.data);
    } catch {
      setError('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setError('');
    if (tab === 'transactions') fetchTransactions();
    else fetchDisputes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, statusFilter]);

  const handleResolveDispute = async (disputeId: string, resolution: string) => {
    setActionLoading(disputeId);
    try {
      await adminAPI.resolveDispute(disputeId, {
        resolution,
        notes: `Resolved by admin as ${resolution}`,
      });
      fetchDisputes();
    } catch {
      setError('Failed to resolve dispute');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">⚙️ Admin Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Platform management · {currentUser.email}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {(['transactions', 'disputes'] as AdminTab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setStatusFilter(''); }}
            className={`px-6 py-3 text-sm font-semibold capitalize transition-colors ${
              tab === t
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'transactions' ? '📋 Transactions' : '⚠️ Disputes'}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-3 items-center">
        <span className="text-sm text-gray-500">Filter by status:</span>
        {tab === 'transactions'
          ? ['', 'initiated', 'paid', 'shipped', 'delivered', 'completed', 'disputed', 'refunded'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  statusFilter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:border-indigo-400'
                }`}
              >
                {s || 'All'}
              </button>
            ))
          : ['', 'open', 'resolved', 'closed'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  statusFilter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-600 hover:border-indigo-400'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : tab === 'transactions' ? (
        /* TRANSACTIONS */
        transactions.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-400">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 pr-4">Item</th>
                  <th className="pb-3 pr-4">Buyer</th>
                  <th className="pb-3 pr-4">Seller</th>
                  <th className="pb-3 pr-4">Price</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((txn) => (
                  <tr key={txn._id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{txn.itemName}</p>
                      <p className="text-xs text-gray-400 font-mono">{txn._id.slice(-8)}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p>{txn.buyerId?.name}</p>
                      <p className="text-xs text-gray-400">{txn.buyerId?.email}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p>{txn.sellerId?.name}</p>
                      <p className="text-xs text-gray-400">{txn.sellerId?.email}</p>
                    </td>
                    <td className="py-3 pr-4 font-medium">₹{txn.itemPrice}</td>
                    <td className="py-3 pr-4">
                      <span className={`status-badge ${statusColor[txn.status]}`}>{txn.status}</span>
                    </td>
                    <td className="py-3 text-gray-400">
                      {new Date(txn.createdAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* DISPUTES */
        disputes.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-400">No disputes found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map((dispute) => (
              <div key={dispute._id} className="card border border-red-100">
                <div
                  className="flex justify-between items-start cursor-pointer"
                  onClick={() => setExpandedDispute(expandedDispute === dispute._id ? null : dispute._id)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`status-badge ${statusColor[dispute.status]}`}>{dispute.status}</span>
                      <span className="font-medium">{dispute.reason}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Raised by {dispute.raisedBy?.name} ·{' '}
                      {new Date(dispute.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <span className="text-gray-400 text-sm">{expandedDispute === dispute._id ? '▲' : '▼'}</span>
                </div>

                {expandedDispute === dispute._id && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Description</p>
                      <p className="text-sm text-gray-600 mt-1">{dispute.description}</p>
                    </div>
                    {dispute.transactionId && (
                      <div className="bg-gray-50 rounded-lg p-3 text-sm">
                        <p className="font-medium text-gray-700">Transaction</p>
                        <p className="text-gray-600 mt-1">Item: {dispute.transactionId.itemName}</p>
                        <p className="text-gray-600">Price: ₹{dispute.transactionId.itemPrice}</p>
                        <p className="text-gray-600">Status: {dispute.transactionId.status}</p>
                      </div>
                    )}

                    {dispute.status === 'open' && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Resolve Dispute</p>
                        <div className="flex gap-3 flex-wrap">
                          <button
                            onClick={() => handleResolveDispute(dispute._id, 'refund')}
                            disabled={actionLoading === dispute._id}
                            className="px-4 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition font-medium"
                          >
                            💸 Refund Buyer
                          </button>
                          <button
                            onClick={() => handleResolveDispute(dispute._id, 'payout')}
                            disabled={actionLoading === dispute._id}
                            className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-medium"
                          >
                            ✅ Release to Seller
                          </button>
                          <button
                            onClick={() => handleResolveDispute(dispute._id, 'partial')}
                            disabled={actionLoading === dispute._id}
                            className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition font-medium"
                          >
                            ⚖️ Partial Settlement
                          </button>
                        </div>
                        {actionLoading === dispute._id && (
                          <p className="text-sm text-gray-500 mt-2">Processing…</p>
                        )}
                      </div>
                    )}

                    {dispute.status === 'resolved' && (
                      <div className="bg-green-50 rounded-lg p-3 text-sm">
                        <p className="font-medium text-green-700">Resolved: {dispute.resolution}</p>
                        {dispute.resolutionNotes && (
                          <p className="text-green-600 mt-1">{dispute.resolutionNotes}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default AdminDashboard;
