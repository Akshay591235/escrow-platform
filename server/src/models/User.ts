import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'buyer' | 'seller' | 'admin';
  kyc: {
    aadhaar?: string;
    pan?: string;
    selfie?: string;
    bankAccount?: string;
    status: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  };
  isVerified: boolean;                 // KYC approved → true
  trustedSeller: boolean;              // auto-awarded
  successfulTransactions: number;
  disputeCount: number;
  firstTransactionFree: boolean;       // true by default, becomes false after first completion
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    phone: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['buyer', 'seller', 'admin'],
      default: 'buyer',
    },
    // KYC fields
    kyc: {
      aadhaar: { type: String },
      pan: { type: String },
      selfie: { type: String },        // URL of uploaded image
      bankAccount: { type: String },   // for payouts
      status: {
        type: String,
        enum: ['not_submitted', 'pending', 'approved', 'rejected'],
        default: 'not_submitted',
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // Trust & reward fields
    trustedSeller: {
      type: Boolean,
      default: false,
    },
    successfulTransactions: {
      type: Number,
      default: 0,
    },
    disputeCount: {
      type: Number,
      default: 0,
    },
    firstTransactionFree: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model<IUser>('User', userSchema);
