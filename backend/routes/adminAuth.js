import pool from '../config/db.js'; 
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {protectAdmin} from '../middleware/adminAuth.js'
const router = express.Router();

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || true,
    secure: true,      // Required for HTTPS (Render)
    sameSite: 'none',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
};

// Admin Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Always fetch the single admin account from ID 1
    const result = await pool.query('SELECT * FROM admin WHERE id = 1');
    const admin = result.rows[0];

    // Check both email and password against the single record
    if (admin.email !== email) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    // Generate JWT token...
    const token = jwt.sign(
      { id: admin.id, role: 'super_admin', type: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie('admin_token', token, { 
      httpOnly: true,
  secure: true,  
  sameSite: 'none'
     });
    res.json({ message: 'Admin login successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

//for getting users
router.get('/users', async (req, res) => {
  try {
    const query = `
      SELECT id, name, email, province, district, citizenship,image_url, created_at,is_approved,status 
      FROM users 
      ORDER BY created_at DESC;
    `;
    const { rows } = await pool.query(query);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error while fetching users' });
  }
});

router.patch('/users/:id/approve', async (req, res) => {
  const { id } = req.params;

  try {
    const updatedUser = await pool.query(
      'UPDATE users SET is_approved = TRUE, status = $1 WHERE id = $2 RETURNING id, name, email, is_approved, status',
      ['approved', id]
    );

    if (updatedUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User approved successfully',
      user: updatedUser.rows[0],
    });
  } catch (err) {
    console.error('Approve User Error:', err);
    res.status(500).json({ message: 'Failed to approve user' });
  }
});

router.post('/logout', (req, res) => {
    res.cookie('admin_token', '', { ...cookieOptions, maxAge: 1 });
    res.json({ message: 'logged out successfully' });
});
export default router;