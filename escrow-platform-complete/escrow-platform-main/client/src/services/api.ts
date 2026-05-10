/**
 * API Service - Axios Instance
 * 
 * Handles all HTTP requests with authentication
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuthResponse, ErrorResponse } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create Axios instance
export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorResponse>) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Auth API Endpoints
 */
export const authAPI = {
  register: (data: any) => api.post<AuthResponse>('/api/auth/register', data),
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/api/auth/login', { email, password }),
  getCurrentUser: () => api.get('/api/auth/me'),
};

/**
 * Transaction API Endpoints
 */
export const transactionAPI = {
  initiate: (data: any) => api.post('/api/transactions/initiate', data),
  get: (id: string) => api.get(`/api/transactions/${id}`),
  list: (role: 'buyer' | 'seller', status?: string) =>
    api.get('/api/transactions', { params: { role, status } }),
  ship: (id: string, data: any) => api.put(`/api/transactions/${id}/ship`, data),
  confirm: (id: string, data: any) => api.put(`/api/transactions/${id}/confirm`, data),
};

/**
 * Payment API Endpoints
 */
export const paymentAPI = {
  createOrder: (transactionId: string) =>
    api.post('/api/payment/order', { transactionId }),
  verify: (data: any) => api.post('/api/payment/verify', data),
  executePayout: (transactionId: string) =>
    api.post('/api/payment/payout', { transactionId }),
};

/**
 * Dispute API Endpoints
 */
export const disputeAPI = {
  create: (data: any) => api.post('/api/disputes', data),
  get: (id: string) => api.get(`/api/disputes/${id}`),
};

/**
 * Admin API Endpoints
 */
export const adminAPI = {
  listTransactions: (status?: string) =>
    api.get('/api/admin/transactions', { params: { status } }),
  listDisputes: (status?: string) =>
    api.get('/api/admin/disputes', { params: { status } }),
  resolveDispute: (id: string, data: any) =>
    api.put(`/api/admin/disputes/${id}/resolve`, data),
};
