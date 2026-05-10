import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import TransactionTimeline from '../components/TransactionTimeline';
import HowItWorks from '../components/HowItWorks';

interface Transaction {
  _id: string;
  itemName: string;
  description: string;
  amount: number;
  status: string;
  buyerId: string;
  sellerId: string;
  trackingInfo?: string;
  fee: number;
  sellerPayout: number;
  platformFee: number;
  isDisputed?: boolean;
}

const TransactionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTx = async () => {
      try {
        const res = await axios.get(`/api/transactions/${id}`);
        setTx(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTx();
  }, [id]);

  const handleConfirm = async () => {
    if (!tx) return;
    try {
      await axios.put(`/api/transactions/${tx._id}/confirm`);
      alert('Confirmed! Payout will be released.');
      // refresh transaction
      const res = await axios.get(`/api/transactions/${id}`);
      setTx(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Confirmation failed');
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (!tx) return <div className="p-4 text-red-500">Transaction not found.</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-2">{tx.itemName}</h2>
      <p className="text-gray-600">{tx.description}</p>

      <TransactionTimeline currentStatus={tx.status} isDisputed={tx.isDisputed} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        <div className="border p-3 rounded">
          <span className="font-semibold">Amount Paid:</span> ₹{tx.amount + tx.fee}
        </div>
        <div className="border p-3 rounded">
          <span className="font-semibold">Seller Receives:</span> ₹{tx.sellerPayout}
        </div>
        <div className="border p-3 rounded">
          <span className="font-semibold">Platform Fee:</span> ₹{tx.platformFee}
        </div>
        <div className="border p-3 rounded">
          <span className="font-semibold">Status:</span> {tx.status}
        </div>
      </div>

      {tx.trackingInfo && (
        <div className="bg-gray-100 p-3 rounded mb-4">
          <span className="font-semibold">Tracking:</span> {tx.trackingInfo}
        </div>
      )}

      {/* Buyer actions */}
      {tx.status === 'delivered' && (
        <button
          onClick={handleConfirm}
          className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 mr-3"
        >
          Confirm Receipt & Release Payment
        </button>
      )}
      {tx.status !== 'completed' && tx.status !== 'disputed' && !tx.isDisputed && (
        <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
          Raise Dispute (coming soon)
        </button>
      )}

      <HowItWorks />
    </div>
  );
};

export default TransactionDetail;