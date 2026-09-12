import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import dotenv from 'dotenv';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { BrevoClient } from '@getbrevo/brevo';
import { protect } from '../middleware/auth.js';

dotenv.config();

const router = express.Router();
const otpStore = new Map();
// Initialize Brevo client
const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});
// 1. Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

// 2. Multer In-Memory Storage
const upload = multer({ storage: multer.memoryStorage() });

// 3. Nodemailer Transporter Setup


// Helper: Upload file buffer to Cloudinary
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'user_citizenship_docs' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || true,    // Required for HTTPS (Render)
  sameSite: 'none',
  maxAge: 30 * 24 * 60 * 60 * 1000
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// ==========================================
// API 1: SEND OTP EMAIL
// ==========================================
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStore.set(email, { otp, expiresAt });
    // Send via Brevo HTTPS API (bypasses Render SMTP port blocks)
    await brevo.transactionalEmails.sendTransacEmail({
      sender: { 
        name: "Health Access System", 
        email: "ritushishir04@gmail.com@gmail.com" // Must match your Brevo account email
      },
      to: [{ email: email }],
      subject: 'Your Registration Verification Code',
      htmlContent: `<h3>Your Verification Code is: <b>${otp}</b></h3><p>Valid for 10 minutes.</p>`
    });

    // Hash OTP to send back as a verification token for the client
    const hashedOtp = await bcrypt.hash(otp, 10);

    return res.status(200).json({ 
      message: 'OTP sent successfully to email', 
      token: hashedOtp // Sent back to verify on client
    });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return res.status(500).json({ message: 'Failed to send OTP email', error: error.message });
  }
});

// ==========================================
// API 2: VERIFY OTP
// ==========================================
router.post('/verify-otp', async (req, res) => {
  const { otp, token } = req.body;
  if (!otp || !token) {
    return res.status(400).json({ message: 'OTP and verification token are required' });
  }
const record = otpStore.get(email);
  const isValid = await bcrypt.compare(otp, token);
  if (!isValid) {
    return res.status(400).json({ message: 'Invalid verification code' });
  }
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ message: "OTP has expired" });
  }

  return res.status(200).json({ success: true, verified: true, message: 'Email verified successfully!' });
});
// ==========================================
// API 3: REGISTER USER (WITH IMAGE & OTP VERIFIED)
// ==========================================
router.post('/register', upload.single('image'), async (req, res) => {
  try {
    const { name, province, district, email, password, citizenship, isVerified } = req.body;

    if (!isVerified || isVerified !== 'true') {
      return res.status(400).json({ message: 'Please verify your email address before submitting.' });
    }

    if (!name || !province || !district || !email || !password || !citizenship) {
      return res.status(400).json({ message: 'Please provide all required text fields.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Citizenship document image is required.' });
    }

    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 1. Upload file buffer to Cloudinary
    const imageUrl = await uploadToCloudinary(req.file.buffer);

    // 2. Hash password
    const hashPassword = await bcrypt.hash(password, 10);

    // 3. Save into Database
    const newUser = await pool.query(
      `INSERT INTO users 
        (name, province, district, email, password, citizenship, image_url, is_verified, is_approved, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, false, 'pending') 
       RETURNING id, name, email, image_url`,
      [name, province, district, email, hashPassword, citizenship, imageUrl]
    );

    const token = generateToken(newUser.rows[0].id);
    res.cookie('token', token, cookieOptions);

    return res.status(200).json({ 
      message: 'Registration successful!', 
      user: newUser.rows[0] 
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

// LOGIN & ME ROUTES REMAIN UNCHANGED...
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Provide all required fields' });
  }

  const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (user.rows.length === 0) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const userData = user.rows[0];
  const isMatch = await bcrypt.compare(password, userData.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const token = generateToken(userData.id);
  res.cookie('token', token, cookieOptions);
  res.json({
    user: { id: userData.id, name: userData.name, email: userData.email }
  });
});

router.get('/me', protect, async (req, res) => {
  try {
    const userQuery = await pool.query(
      'SELECT id, name, email, province, district, citizenship, image_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ user: userQuery.rows[0] });
  } catch (error) {
    console.error('Fetch Me Error:', error);
    return res.status(500).json({ message: 'Server error fetching user profile' });
  }
});

router.post('/logout', (req, res) => {
  res.cookie('token', '', { ...cookieOptions, maxAge: 1 });
  res.json({ message: 'Logged out successfully' });
});

export default router;