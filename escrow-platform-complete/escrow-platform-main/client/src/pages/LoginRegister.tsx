/**
 * Login / Register Page
 *
 * Unified auth page with tabs for login and registration.
 * On success, stores token + user in localStorage and redirects.
 */

import React, { useState } from 'react';
import { authAPI } from '../services/api';

interface Props {
  onAuth: (token: string, user: any) => void;
}

const LoginRegister: React.FC<Props> = ({ onAuth }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regUserType, setRegUserType] = useState<'buyer' | 'seller'>('buyer');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login(loginEmail, loginPassword);
      const { token, ...user } = res.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onAuth(token, user);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.register({
        name: regName,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        userType: regUserType,
      });
      const { token, ...user } = res.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onAuth(token, user);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card max-w-md mx-auto">
      {/* Tabs */}
      <div className="flex mb-6 border-b">
        <button
          className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
            tab === 'login'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => { setTab('login'); setError(''); }}
        >
          Login
        </button>
        <button
          className={`flex-1 pb-3 text-sm font-semibold transition-colors ${
            tab === 'register'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => { setTab('register'); setError(''); }}
        >
          Register
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {tab === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="input-field"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className="input-field"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="button-primary w-full" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              className="input-field"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="Rahul Sharma"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="input-field"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className="input-field"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="Min 6 characters"
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              className="input-field"
              value={regPhone}
              onChange={(e) => setRegPhone(e.target.value)}
              placeholder="10-digit mobile number"
              pattern="[0-9]{10,}"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">I am a…</label>
            <div className="flex gap-3">
              {(['buyer', 'seller'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRegUserType(type)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${
                    regUserType === type
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-300 text-gray-700 hover:border-indigo-400'
                  }`}
                >
                  {type === 'buyer' ? '🛒 Buyer' : '📦 Seller'}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="button-primary w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
      )}
    </div>
  );
};

export default LoginRegister;
