import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { BrevoClient } from '@getbrevo/brevo';

const router = express.Router();

const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
};

// Helper to extract admin ID from JWT cookie
const getAdminId = (req) => {
  try {
    const token = req.cookies.admin_token;
    if (!token) return 1;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch {
    return 1;
  }
};

// Helper to log audit actions
const logAudit = async (adminId, targetId, targetType, action, comments) => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (admin_id, target_id, target_type, action, comments) VALUES ($1, $2, $3, $4, $5)',
      [adminId, targetId, targetType, action, comments]
    );
  } catch (err) {
    console.error('Error recording audit log:', err);
  }
};

// Admin Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM admin WHERE id = 1');
    const admin = result.rows[0];

    if (!admin || admin.email !== email) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, role: 'super_admin', type: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.cookie('admin_token', token, cookieOptions);
    res.json({ message: 'Admin login successful' });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get users
router.get('/users', async (req, res) => {
  try {
    const query = `
      SELECT id, name, email, province, district, citizenship, image_url, created_at, is_approved, status 
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

// Approve Hospital
router.patch('/hospitals/:id/approve', async (req, res) => {
  const { id } = req.params;
  const adminId = getAdminId(req);

  try {
    const updatedHospital = await pool.query(
      'UPDATE hospital_db SET is_approved = TRUE WHERE hospital_id = $1 RETURNING hospital_id, name, email, is_approved',
      [id]
    );

    if (updatedHospital.rows.length === 0) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const hospital = updatedHospital.rows[0];

    await logAudit(adminId, id, 'HOSPITAL', 'APPROVE_HOSPITAL', 'Licenses verified.');

    await brevo.transactionalEmails.sendTransacEmail({
      sender: { 
        name: "Health Access System", 
        email: "ritushishir04@gmail.com" 
      },
      to: [{ email: hospital.email }],
      subject: 'Registration Status Update - National Health Access System',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Registration Status Update</h2>
          <p>Dear ${hospital.name} Management,</p>
          <p>Your hospital registration request has been approved.</p>
          <p style="margin-top: 20px;">Regards,<br>You can login into your account.</p>
        </div>
      `
    });

    res.json({
      message: 'Hospital approved successfully',
      hospital: hospital,
    });
  } catch (err) {
    console.error('Approve Hospital Error:', err);
    res.status(500).json({ message: 'Failed to approve hospital', error: err.message });
  }
});

// Approve user
router.patch('/users/:id/approve', async (req, res) => {
  const { id } = req.params;
  const adminId = getAdminId(req);

  try {
    const updatedUser = await pool.query(
      'UPDATE users SET is_approved = TRUE, status = $1 WHERE id = $2 RETURNING id, name, email, is_approved, status',
      ['approved', id]
    );

    if (updatedUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = updatedUser.rows[0];

    await logAudit(adminId, id, 'USER', 'APPROVE_REGISTRATION', 'Verified.');

    await brevo.transactionalEmails.sendTransacEmail({
      sender: { 
        name: "Health Access System", 
        email: "ritushishir04@gmail.com" 
      },
      to: [{ email: user.email }],
      subject: 'Registration Status Update - National Health Access System',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Registration Status Update</h2>
          <p>Dear ${user.name},</p>
          <p>Your user registration request has been approved.</p>
          <p style="margin-top: 20px;">Regards,<br>You can login into your account.</p>
        </div>
      `
    });

    res.json({
      message: 'User approved successfully and email sent',
      user: user,
    });
  } catch (err) {
    console.error('Approve User Error:', err);
    res.status(500).json({ message: 'Failed to approve user' });
  }
});

// Reject and Delete User
router.delete('/users/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const adminId = getAdminId(req);

  try {
    const userQuery = await pool.query('SELECT email, name FROM users WHERE id = $1', [id]);
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = userQuery.rows[0];

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    
    await logAudit(adminId, id, 'USER', 'REJECT_REGISTRATION', message || 'Registration rejected.');

    await brevo.transactionalEmails.sendTransacEmail({
      sender: { 
        name: "Health Access System", 
        email: "ritushishir04@gmail.com" 
      },
      to: [{ email: user.email }],
      subject: 'Registration Status Update - National Health Access System',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Registration Status Update</h2>
          <p>Dear ${user.name},</p>
          <p>Your user registration request has been rejected.</p>
          <p><strong>Reason / Message from Admin:</strong></p>
          <p style="background: #f9fafb; padding: 12px; border-left: 4px solid #ef4444; border-radius: 4px;">${message}</p>
          <p style="margin-top: 20px;">Regards,<br>Admin Team</p>
        </div>
      `
    });

    res.json({ success: true, message: 'User rejected, deleted, and notification email sent.' });
  } catch (err) {
    console.error('Reject User Error:', err);
    res.status(500).json({ message: 'Failed to reject and delete user', error: err.message });
  }
});

// Reject and Delete Hospital
router.delete('/hospitals/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const adminId = getAdminId(req);

  try {
    const hospitalQuery = await pool.query('SELECT email, name FROM hospital_db WHERE hospital_id = $1', [id]);
    if (hospitalQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    const hospital = hospitalQuery.rows[0];

    await pool.query('DELETE FROM hospital_db WHERE hospital_id = $1', [id]);
    
    await logAudit(adminId, id, 'HOSPITAL', 'REJECT_HOSPITAL', message || 'Hospital registration rejected.');

    await brevo.transactionalEmails.sendTransacEmail({
      sender: { 
        name: "Health Access System", 
        email: "ritushishir04@gmail.com" 
      },
      to: [{ email: hospital.email }],
      subject: 'Hospital Registration Status Update - National Health Access System',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Hospital Registration Status Update</h2>
          <p>Dear ${hospital.name} Management,</p>
          <p>Your hospital registration request has been rejected.</p>
          <p><strong>Reason / Message from Admin:</strong></p>
          <p style="background: #f9fafb; padding: 12px; border-left: 4px solid #ef4444; border-radius: 4px;">${message}</p>
          <p style="margin-top: 20px;">Regards,<br>Admin Team</p>
        </div>
      `
    });

    res.json({ success: true, message: 'Hospital rejected, deleted, and notification email sent.' });
  } catch (err) {
    console.error('Reject Hospital Error:', err);
    res.status(500).json({ message: 'Failed to reject and delete hospital', error: err.message });
  }
});

// Fetch Audit Logs
router.get('/audit-logs', async (req, res) => {
    try {
        const query = `
            SELECT 
                audit_logs.id,
                audit_logs.created_at AS timestamp,
                COALESCE(admin.email, 'Admin') AS officer,
                audit_logs.action,
                audit_logs.target_type,
                COALESCE(users.email, hospital_db.name, 'Unknown Target') AS target_identifier,
                audit_logs.comments
            FROM audit_logs
            JOIN admin ON audit_logs.admin_id = admin.id
            LEFT JOIN users ON audit_logs.target_id::text = users.id::text AND audit_logs.target_type = 'USER'
            LEFT JOIN hospital_db ON audit_logs.target_id::text = hospital_db.hospital_id::text AND audit_logs.target_type = 'HOSPITAL'
            ORDER BY audit_logs.created_at DESC
            LIMIT 100;
        `;
        const { rows } = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error('Failed to fetch audit logs:', err);
        res.status(500).json({ error: 'Failed to retrieve audit logs.' });
    }
});

// Admin Logout
router.post('/logout', (req, res) => {
    res.cookie('admin_token', '', { ...cookieOptions, maxAge: 1 });
    res.json({ message: 'logged out successfully' });
});

export default router;