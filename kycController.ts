import { Request, Response } from 'express';
import User from '../models/User';

export const uploadKYC = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { aadhaar, pan, bankAccount, selfie } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.kyc = { aadhaar, pan, bankAccount, selfie, status: 'pending' };
    await user.save();
    res.json({ message: 'KYC submitted for review', kyc: user.kyc });
  } catch (err) {
    res.status(500).json({ error: 'KYC upload failed' });
  }
};

export const getPendingKYC = async (req: Request, res: Response) => {
  const users = await User.find({ 'kyc.status': 'pending' }).select('-password');
  res.json(users);
};

export const reviewKYC = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'
  try {
    const user = await User.findByIdAndUpdate(
      id,
      { 'kyc.status': status, isVerified: status === 'approved' },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: `KYC ${status}`, user });
  } catch (err) {
    res.status(400).json({ error: 'KYC review failed' });
  }
};