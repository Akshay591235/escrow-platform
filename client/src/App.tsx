import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('token')
  );

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔐</span>
              <h1 className="text-3xl font-bold text-gray-900">Escrow Platform</h1>
            </div>
            {isAuthenticated && (
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  setIsAuthenticated(false);
                }}
                className="button-secondary"
              >
                Logout
              </button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          {!isAuthenticated ? (
            <div className="card max-w-md mx-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Welcome to Escrow Platform</h2>
                <p className="text-gray-600 mb-6">
                  Trusted middleman for secure transactions between buyers and sellers.
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => {
                    // Placeholder for login/register flow
                    window.location.href = '/login';
                  }}
                  className="button-primary w-full"
                >
                  Login / Register
                </button>
              </div>

              <div className="mt-8 pt-6 border-t">
                <h3 className="font-semibold mb-4">How It Works</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>✅ Buyer pays (item + ₹5 fee) - funds held safely</li>
                  <li>✅ Seller ships goods with tracking</li>
                  <li>✅ Buyer confirms receipt</li>
                  <li>✅ Seller receives payout (item - ₹5 fee)</li>
                  <li>✅ Platform keeps ₹10 fee</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card">
                <h3 className="text-xl font-bold mb-2">👤 Buyer</h3>
                <p className="text-gray-600 mb-4">Browse items and initiate secure transactions</p>
                <button className="button-primary">View as Buyer</button>
              </div>
              <div className="card">
                <h3 className="text-xl font-bold mb-2">📦 Seller</h3>
                <p className="text-gray-600 mb-4">Manage orders and ship with confidence</p>
                <button className="button-primary">View as Seller</button>
              </div>
              <div className="card">
                <h3 className="text-xl font-bold mb-2">⚙️ Admin</h3>
                <p className="text-gray-600 mb-4">Manage disputes and transactions</p>
                <button className="button-primary">View as Admin</button>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white mt-12 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div>
                <h4 className="font-bold mb-4">About</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="#">How It Works</a></li>
                  <li><a href="#">Pricing</a></li>
                  <li><a href="#">Security</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Legal</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="#">Terms of Service</a></li>
                  <li><a href="#">Privacy Policy</a></li>
                  <li><a href="#">Refund Policy</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Support</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="#">Contact Us</a></li>
                  <li><a href="#">FAQ</a></li>
                  <li><a href="#">Help Center</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold mb-4">Status</h4>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li><a href="#">API Status</a></li>
                  <li><a href="#">GitHub</a></li>
                  <li><a href="#">Docs</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8">
              <p className="text-center text-gray-400 text-sm">
                🔐 Trusted Escrow – Buyer & Seller Protection | ₹10 per transaction | India-ready
              </p>
              <p className="text-center text-gray-500 text-xs mt-2">
                © 2026 Escrow Platform. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App;
