const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Helper: generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: sign JWT
function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// ─── SIGNUP: Step 1 - Send OTP ───────────────────────────────
// POST /api/auth/signup/send-otp
router.post('/signup/send-otp', async (req, res) => {
  try {
    const { name, email, mobile, role } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }
    if (!email && !mobile) {
      return res.status(400).json({ error: 'Email or mobile number is required' });
    }

    const validRoles = ['Restaurant / Food Donor', 'Farmer', 'Volunteer', 'Charity / Shelter', 'Administrator'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role selected' });
    }

    // Check if user already exists
    let existing = null;
    if (email) existing = await User.findOne({ email });
    else if (mobile) existing = await User.findOne({ mobile });

    if (existing && existing.isVerified) {
      return res.status(400).json({ error: 'An account with this contact already exists. Please sign in.' });
    }

    // Create or update pending user
    let user = existing || new User({ name, role });
    user.name = name;
    user.role = role;
    if (email) user.email = email;
    if (mobile) user.mobile = mobile;

    const otp = generateOTP();
    await user.setOTP(otp);
    await user.save();

    // In production: send OTP via SMS/email service
    // For demo: OTP is returned in response (remove in production)
    console.log('OTP for', email || mobile, ':', otp);

    res.json({
      message: 'OTP sent successfully',
      userId: user._id,
      // Remove 'otp' field in production — only for demo
      demoOTP: otp
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── SIGNUP: Step 2 - Verify OTP ─────────────────────────────
// POST /api/auth/signup/verify-otp
router.post('/signup/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      return res.status(400).json({ error: 'User ID and OTP are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await user.verifyOTP(otp);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please try again.' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = signToken(user._id);
    res.json({
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        profile: user.profile
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── LOGIN: Send OTP ──────────────────────────────────────────
// POST /api/auth/login/send-otp
router.post('/login/send-otp', async (req, res) => {
  try {
    const { email, mobile } = req.body;
    if (!email && !mobile) {
      return res.status(400).json({ error: 'Email or mobile number is required' });
    }

    let user = null;
    if (email) user = await User.findOne({ email, isVerified: true });
    else if (mobile) user = await User.findOne({ mobile, isVerified: true });

    if (!user) {
      return res.status(404).json({ error: 'No verified account found. Please sign up first.' });
    }

    const otp = generateOTP();
    await user.setOTP(otp);
    await user.save();

    // In production: send OTP via SMS/email service
    console.log('Login OTP for', email || mobile, ':', otp);

    res.json({
      message: 'OTP sent successfully',
      userId: user._id,
      // Remove 'demoOTP' in production
      demoOTP: otp
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── LOGIN: Verify OTP ────────────────────────────────────────
// POST /api/auth/login/verify-otp
router.post('/login/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      return res.status(400).json({ error: 'User ID and OTP are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await user.verifyOTP(otp);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please try again.' });
    }

    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = signToken(user._id);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        profile: user.profile
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ─── GET current user ─────────────────────────────────────────
// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      mobile: req.user.mobile,
      role: req.user.role,
      profile: req.user.profile
    }
  });
});

module.exports = router;
