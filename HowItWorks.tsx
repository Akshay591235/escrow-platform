import React from 'react';

const HowItWorks: React.FC = () => {
  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 my-6">
      <h3 className="text-lg font-bold text-blue-800 mb-3">🔐 How Your Money is Protected</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="bg-white p-3 rounded shadow">
          <p className="font-semibold">1. You Pay</p>
          <p>Your ₹{'{'}amount{'}'} + ₹5 fee is held securely. The seller <strong>cannot withdraw it</strong> until you confirm delivery.</p>
        </div>
        <div className="bg-white p-3 rounded shadow">
          <p className="font-semibold">2. Seller Ships</p>
          <p>We notify the seller immediately. They must ship and upload tracking details.</p>
        </div>
        <div className="bg-white p-3 rounded shadow">
          <p className="font-semibold">3. You Confirm</p>
          <p>Once you receive the item, confirm on our platform. Only then the seller gets ₹{'{'}amount−5{'}'}.</p>
        </div>
      </div>
      <p className="mt-3 text-center text-blue-700 text-xs">Platform fee: ₹10 total (₹5 from you, ₹5 from seller). We earn only when both are satisfied.</p>
    </div>
  );
};

export default HowItWorks;