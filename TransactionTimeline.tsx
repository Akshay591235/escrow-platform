import React from 'react';

const stages = [
  { key: 'initiated', label: 'Initiated' },
  { key: 'paid', label: 'Payment Secured' },
  { key: 'shipped', label: 'Seller Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'completed', label: 'Payout Released' },
] as const;

interface Props {
  currentStatus: string;
  isDisputed?: boolean;
}

const TransactionTimeline: React.FC<Props> = ({ currentStatus, isDisputed }) => {
  const currentIndex = stages.findIndex((s) => s.key === currentStatus);
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center my-6 gap-2">
      {stages.map((stage, idx) => {
        let stateClass = 'bg-gray-200 text-gray-500';
        if (isDisputed && currentStatus === 'disputed') {
          stateClass = 'bg-red-100 text-red-600 border border-red-400';
        } else if (idx <= currentIndex && currentIndex !== -1) {
          stateClass = 'bg-green-100 text-green-700 border border-green-400';
        }
        return (
          <div key={stage.key} className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${stateClass}`}>
              {stage.label}
            </div>
            {idx < stages.length - 1 && <span className="hidden sm:block text-gray-400">→</span>}
          </div>
        );
      })}
    </div>
  );
};

export default TransactionTimeline;