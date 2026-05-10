/**
 * App.tsx — Root component with routing
 *
 * Routes:
 *   / (unauthenticated)  → Landing + LoginRegister
 *   /                    → Dashboard (buyer | seller | admin)
 *   /transaction/:id     → Transaction detail
 */

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import LoginRegister from './pages/LoginRegister';
import BuyerDashboard from './pages/BuyerDashboard';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import TransactionDetail from './pages/TransactionDetail';

const Header: React.FC<{ user: any; onLogout: () => void }> = ({ user, onLogout }) => (
  <header className="bg-white shadow sticky top-0 z-10">
    <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔐</span>
        <span className="text-xl font-bold text-gray-900">Escrow Platform</span>
      </div>
      {user && (
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user.userType}</p>
          </div>
          <button onClick={onLogout} className="button-secondary text-sm">
            Logout
          </button>
        </div>
      )}
    </div>
  </header>
);

const Footer: React.FC = () => (
  <footer className="bg-gray-900 text-white mt-12 py-8">
    <div className="max-w-5xl mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 text-sm">
        {[
          { title: 'About', links: ['How It Works', 'Pricing', 'Security'] },
          { title: 'Legal', links: ['Terms of Service', 'Privacy Policy', 'Refund Policy'] },
          { title: 'Support', links: ['Contact Us', 'FAQ', 'Help Center'] },
          { title: 'Developer', links: ['API Docs', 'GitHub', 'Status'] },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="font-bold mb-3">{col.title}</h4>
            <ul className="space-y-2 text-gray-400">
              {col.links.map((link) => (
                <li key={link}>
                  <a href="#" className="hover:text-white transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-800 pt-6 text-center text-gray-400 text-sm">
        <p>🔐 Trusted Escrow – Buyer & Seller Protection · ₹10 per transaction · India-ready</p>
        <p className="text-gray-600 text-xs mt-2">© {new Date().getFullYear()} Escrow Platform. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

const Landing: React.FC<{ onAuth: (token: string, user: any) => void }> = ({ onAuth }) => (
  <div>
    <div className="text-center mb-10">
      <h1 className="text-4xl font-bold text-gray-900 mb-3">Secure Escrow for Every Deal</h1>
      <p className="text-gray-500 text-lg max-w-xl mx-auto">
        Pay safely, ship with confidence. Funds held until both parties are happy. ₹10 flat fee.
      </p>
      <div className="flex flex-wrap justify-center gap-3 mt-6 text-sm">
        {['🔒 Funds held in escrow', '🚚 Seller ships with tracking', '✅ Buyer confirms receipt', '💸 Seller receives payout'].map(
          (step) => (
            <span key={step} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">
              {step}
            </span>
          )
        )}
      </div>
    </div>
    <LoginRegister onAuth={onAuth} />
  </div>
);

const Dashboard: React.FC<{ user: any }> = ({ user }) => {
  if (user.userType === 'buyer') return <BuyerDashboard currentUser={user} />;
  if (user.userType === 'seller') return <SellerDashboard currentUser={user} />;
  if (user.userType === 'admin') return <AdminDashboard currentUser={user} />;
  return <p className="text-center text-gray-500 py-12">Unknown user type.</p>;
};

const App: React.FC = () => {
  const storedUser = localStorage.getItem('user');
  const [user, setUser] = useState<any>(storedUser ? JSON.parse(storedUser) : null);

  const handleAuth = (_token: string, userData: any) => setUser(userData);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header user={user} onLogout={handleLogout} />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
          <Routes>
            <Route
              path="/"
              element={user ? <Dashboard user={user} /> : <Landing onAuth={handleAuth} />}
            />
            <Route
              path="/login"
              element={user ? <Navigate to="/" replace /> : (
                <div className="max-w-md mx-auto">
                  <LoginRegister onAuth={handleAuth} />
                </div>
              )}
            />
            <Route
              path="/transaction/:id"
              element={user ? <TransactionDetail currentUser={user} /> : <Navigate to="/login" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
