import React from 'react';

const GrievanceOfficer: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Grievance Officer</h1>
      <p className="mb-2">In accordance with the Information Technology Act, 2000 and rules made thereunder, the contact details of the Grievance Officer are provided below:</p>
      <div className="border p-4 rounded bg-gray-50">
        <p><strong>Name:</strong> Ramesh Kumar</p>
        <p><strong>Email:</strong> grievance@escrowtrust.in</p>
        <p><strong>Phone:</strong> +91-9876543210</p>
        <p><strong>Address:</strong> 123, Trust Plaza, Bengaluru, Karnataka – 560001</p>
        <p className="mt-2 text-sm text-gray-500">All complaints will be acknowledged within 24 hours and resolved within 48 hours.</p>
      </div>
    </div>
  );
};

export default GrievanceOfficer;