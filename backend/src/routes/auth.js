import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import requireAuth from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimit.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
  return null;
}

const signToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  const { shopName, ownerName, email, password } = req.body || {};

  if (!shopName?.trim() || !ownerName?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (!EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ message: 'Please enter a valid email' });
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  try {
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists' });

    const user = await User.create({ shopName, ownerName, email, password });
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json({ token: signToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ user });
});

// Updates shop details. Changing the email needs the current password.
router.put('/me', requireAuth, async (req, res) => {
  const body = req.body || {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const shopName = str(body.shopName);
  const ownerName = str(body.ownerName);
  const email = str(body.email).toLowerCase();
  const address = str(body.address);

  if (!shopName || !ownerName || !email) return res.status(400).json({ message: 'Shop name, owner name and email are required' });
  if (shopName.length > 100 || ownerName.length > 100) return res.status(400).json({ message: 'Names must be at most 100 characters' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Please enter a valid email' });
  if (address.length > 300) return res.status(400).json({ message: 'Address must be at most 300 characters' });

  try {
    const user = await User.findById(req.userId).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (email !== user.email) {
      if (!body.currentPassword || !(await user.comparePassword(body.currentPassword))) {
        return res.status(401).json({ message: 'Enter your current password to change your email' });
      }
      if (await User.exists({ email, _id: { $ne: user._id } })) {
        return res.status(409).json({ message: 'An account with this email already exists' });
      }
    }

    Object.assign(user, { shopName, ownerName, email, address });
    await user.save();
    res.json({ user });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'An account with this email already exists' });
    console.error(err);
    res.status(500).json({ message: 'Could not save your profile' });
  }
});

router.put('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const passwordError = validatePassword(newPassword);
  if (passwordError) return res.status(400).json({ message: passwordError });

  const user = await User.findById(req.userId).select('+password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (!currentPassword || !(await user.comparePassword(currentPassword))) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }
  if (await user.comparePassword(newPassword)) {
    return res.status(400).json({ message: 'New password must be different from the current one' });
  }

  user.password = newPassword;
  await user.save();
  res.json({ ok: true });
});

export default router;
