# 🔐 Escrow Platform

A full-stack escrow service for secure buyer-seller transactions, built with Node.js, React, MongoDB, and Razorpay. ₹10 flat fee per transaction.

---

## How It Works

| Step | Who | What |
|------|-----|------|
| 1 | Buyer | Initiates transaction (shares seller ID + item details) |
| 2 | Buyer | Pays ₹itemPrice + ₹5 — funds held in escrow |
| 3 | Seller | Ships goods and adds tracking number |
| 4 | Buyer | Confirms receipt |
| 5 | Platform | Releases ₹itemPrice − ₹5 to seller |
| — | Platform | Keeps ₹10 total (₹5 from each side) |

Either party can raise a dispute at any point (paid → delivered), which freezes funds until an admin resolves it.

---

## Project Structure

```
escrow-platform/
├── client/          # React frontend (CRA + TypeScript + Tailwind)
│   └── src/
│       ├── pages/   # LoginRegister, BuyerDashboard, SellerDashboard, AdminDashboard, TransactionDetail
│       ├── services/ # api.ts (Axios), razorpay.ts
│       └── types/   # Shared TypeScript interfaces
└── server/          # Express + Mongoose backend
    └── src/
        ├── controllers/ # auth, transaction, payment, dispute, admin
        ├── models/      # User, Transaction, Dispute
        ├── middleware/  # auth (JWT), validation (express-validator)
        ├── utils/       # feeCalculator, escrowStateMachine, errorHandler
        └── config/      # database, jwt, razorpay
```

---

## Quick Start

### 1. Clone & install

```bash
git clone <repo-url>
cd escrow-platform
npm run install-all
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values (see below)
```

### 3. Run in development

```bash
npm run dev    # starts both server (port 5000) and client (port 3000)
```

---

## Environment Variables

Create `.env` in the project root (used by the server):

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB Atlas (free M0 cluster)
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/escrow-platform

# JWT (min 32 characters)
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# Razorpay Test Keys (dashboard.razorpay.com → Settings → API Keys)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx

# Platform config
PLATFORM_ACCOUNT_ID=acc_xxxxxxxxxxxxxxxx
PLATFORM_EMAIL=escrow@platform.com
PLATFORM_PHONE=919876543210

# Frontend (used by React)
REACT_APP_API_URL=http://localhost:5000
REACT_APP_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
```

---

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register (buyer/seller) |
| POST | `/api/auth/login` | Login → JWT token |
| GET | `/api/auth/me` | Get current user |

### Transactions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/transactions/initiate` | Buyer creates transaction |
| GET | `/api/transactions` | List user's transactions |
| GET | `/api/transactions/:id` | Get transaction details |
| PUT | `/api/transactions/:id/ship` | Seller adds tracking |
| PUT | `/api/transactions/:id/confirm` | Buyer confirms receipt |

### Payments
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payment/order` | Create Razorpay order |
| POST | `/api/payment/verify` | Verify payment signature |
| POST | `/api/payment/payout` | Execute payout to seller |

### Disputes
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/disputes` | Raise a dispute |
| GET | `/api/disputes/:id` | Get dispute details |

### Admin (requires admin JWT)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/transactions` | All transactions |
| GET | `/api/admin/disputes` | All disputes |
| PUT | `/api/admin/disputes/:id/resolve` | Resolve dispute |
| POST | `/api/admin/transactions/:id/manual-release` | Manual override |

---

## Running Tests

```bash
cd server
npm test           # Jest with coverage
npm run test:watch # Watch mode
```

Tests use `mongodb-memory-server` (no real DB needed).

---

## Deployment

### Frontend → Netlify

The `netlify.toml` is pre-configured. Update the backend URL:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://YOUR-BACKEND.onrender.com/api/:splat"
```

Then connect your GitHub repo in the Netlify dashboard.

### Backend → Render / Railway

1. Set all environment variables in the platform dashboard
2. Build command: `cd server && npm install && npm run build`
3. Start command: `cd server && npm start`

---

## Creating an Admin User

After deploying/running locally, update a user's type directly in MongoDB:

```javascript
db.users.updateOne({ email: "admin@example.com" }, { $set: { userType: "admin" } })
```

---

## Razorpay Test Cards

| Card | Number |
|------|--------|
| Visa (success) | 4111 1111 1111 1111 |
| Expiry | Any future date |
| CVV | Any 3 digits |

Use UPI ID `success@razorpay` for UPI test payments.

---

## Fee Model Summary

```
Buyer pays:      itemPrice + ₹5
Seller receives: itemPrice − ₹5
Platform keeps:  ₹10 total
```

Verified on every transaction by `server/src/utils/feeCalculator.ts`.
