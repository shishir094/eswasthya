import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import verifyHospital from '../middleware/hospitalAuth.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import nodemailer from 'nodemailer';
import pool from '../config/db.js';

const router = express.Router();

// ------------------------------------------
// 1. SERVICES & CONFIGURATIONS
// ------------------------------------------

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

// Configure Multer (Memory Storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and PDF files are allowed.'));
    }
  }
});

// Helper: Stream buffer to Cloudinary using v2 SDK
const uploadToCloudinary = (fileBuffer, originalName) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'hospital_documents',
        resource_type: 'auto',
        public_id: `doc_${Date.now()}_${originalName.replace(/[^a-zA-Z0-9]/g, '_')}`
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Must be false for port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// In-Memory OTP Store
const otpStore = new Map();

// JWT & Cookie Config
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || true,    // Required for HTTPS (Render)
  sameSite: 'none',
  maxAge: 30 * 24 * 60 * 60 * 1000
};

const generate_hospital_token = (id) => {
  return jwt.sign({ id }, process.env.HOSPITAL_SECRET_KEY, { expiresIn: '30d' });
};

const generateEsewaSignature = (secretKey, totalAmount, transactionUuid, productCode) => {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
};

// ------------------------------------------
// 2. EMAIL OTP VERIFICATION ROUTES
// ------------------------------------------

router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    otpStore.set(email, { otp, expiresAt });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Hospital Verification OTP Code",
      html: `<h3>Your OTP code for registration verification is: <b>${otp}</b></h3><p>Valid for 10 minutes.</p>`
    });

    return res.json({ message: "OTP sent successfully to email" });
  } catch (error) {
    console.error("OTP Error:", error);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
});

router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

  const record = otpStore.get(email);
  if (!record) return res.status(400).json({ message: "No OTP request found for this email" });

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ message: "OTP has expired" });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ message: "Invalid OTP code" });
  }

  otpStore.delete(email);
  return res.json({ message: "Email verified successfully", verified: true });
});

// ------------------------------------------
// 3. REGISTRATION & AUTHENTICATION
// ------------------------------------------

router.post('/register', upload.single('document_url'), async (req, res) => {
  const {
    name, email, password, license_number, hospital_type,
    hospital_bed_capacity, province, district, municipality, phone, emergency_contact
  } = req.body;

  if (!req.file) return res.status(400).json({ message: "Registration document/photo is required" });

  let cloudinaryPublicId = null;

  try {
    // 1. Check duplicate email via PostgreSQL Pool
    const existingCheck = await pool.query(
      'SELECT email FROM hospital_db WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    // 2. Stream File Buffer to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, req.file.originalname);
    const document_url = cloudinaryResult.secure_url;
    cloudinaryPublicId = cloudinaryResult.public_id;

    // 3. Hash Password
    const password_hash = await bcrypt.hash(password, 10);

    // 4. Generate Hospital UUID Primary Key
    const hospital_id = crypto.randomUUID();

    // 5. Insert into PostgreSQL via pool
    const insertQuery = `
      INSERT INTO hospital_db (
        hospital_id, name, email, password_hash, license_number, hospital_type,
        hospital_bed_capacity, province, district, municipality, phone,
        emergency_contact, document_url, is_approved, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *;
    `;

    const values = [
      hospital_id,
      name,
      email,
      password_hash,
      license_number,
      hospital_type,
      parseInt(hospital_bed_capacity, 10),
      province,
      district,
      municipality,
      String(phone).replace(/\D/g, ''),
      String(emergency_contact).replace(/\D/g, ''),
      document_url,
      false,
      'pending'
    ];

    const { rows } = await pool.query(insertQuery, values);

    return res.status(201).json({
      message: "Hospital registered successfully. Awaiting approval.",
      hospital: rows[0]
    });

  } catch (error) {
    if (cloudinaryPublicId) {
      await cloudinary.uploader.destroy(cloudinaryPublicId);
    }
    console.error("Registration Error:", error);
    return res.status(500).json({ message: "Server error during registration", error: error.message });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Please provide email and password" });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM hospital_db WHERE email = $1 LIMIT 1',
      [email]
    );

    const hospital_data = rows[0];
    if (!hospital_data) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, hospital_data.password_hash);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const hospital_token = generate_hospital_token(hospital_data.hospital_id);
    res.cookie('hospital_token', hospital_token, cookieOptions);

    return res.json({
      message: "Login successful",
      hospital_token,
      hospital_admin: { id: hospital_data.hospital_id, name: hospital_data.name, email: hospital_data.email }
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
});

router.get('/me', verifyHospital, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT hospital_id, name, license_number, email, hospital_type, 
              hospital_bed_capacity, province, district, municipality, 
              phone, emergency_contact, document_url 
       FROM hospital_db WHERE hospital_id = $1 LIMIT 1`,
      [req.hospital.id]
    );

    if (rows.length === 0) return res.status(404).json({ message: 'Hospital profile not found' });
    return res.json({ user: rows[0] });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching user profile' });
  }
});

router.post('/logout', (req, res) => {
  res.cookie('hospital_token', '', { ...cookieOptions, maxAge: 1 });
  return res.json({ message: 'logged out successfully' });
});

// ------------------------------------------
// 4. PUBLIC DATA FETCHING
// ------------------------------------------
router.get('/list', async (req, res) => {
  try {
    const query = `
      SELECT 
        h.hospital_id, h.name, h.email, h.phone, h.emergency_contact, 
        h.province, h.district, h.municipality, h.hospital_type, 
        h.hospital_bed_capacity, h.document_url,
        COALESCE(
          json_agg(
            json_build_object(
              'department_id', d.department_id,
              'department_name', d.name,
              'description', d.description
            )
          ) FILTER (WHERE d.department_id IS NOT NULL), '[]'
        ) AS departments
      FROM hospital_db h
      LEFT JOIN departments d ON h.hospital_id = d.hospital_id
      GROUP BY h.hospital_id
      ORDER BY h.hospital_id ASC;
    `;

    const { rows } = await pool.query(query);
    return res.json(rows);
  } catch (error) {
    console.error("Error fetching hospital list:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get('/hospitals/:hospital_id/structure', async (req, res) => {
  const { hospital_id } = req.params;
  try {
    const query = `
      SELECT 
        d.department_id, d.name, d.description,
        COALESCE(
          json_agg(
            json_build_object(
              'doctor_id', doc.doctor_id,
              'name', doc.name,
              'phone', doc.phone,
              'specialization', doc.specialization
            )
          ) FILTER (WHERE doc.doctor_id IS NOT NULL), '[]'
        ) AS doctors
      FROM departments d
      LEFT JOIN doctors doc ON d.department_id = doc.department_id
      WHERE d.hospital_id = $1
      GROUP BY d.department_id, d.name, d.description;
    `;

    const { rows } = await pool.query(query, [hospital_id]);
    return res.json({ departments: rows });
  } catch (error) {
    console.error("Error fetching structure:", error);
    return res.status(500).json({ message: "Failed to fetch structure" });
  }
});
    
// ------------------------------------------
// 5. MANAGEMENT (DEPARTMENTS, DOCTORS, APPOINTMENTS)
// ------------------------------------------

router.post('/departments', verifyHospital, async (req, res) => {
  const { name, description } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO departments (hospital_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [req.hospital.id, name, description]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create department" });
  }
});

router.post('/doctors', verifyHospital, async (req, res) => {
  const { department_id, name, specialization, phone, email } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO doctors (hospital_id, department_id, name, specialization, phone, email) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.hospital.id, department_id, name, specialization, phone, email]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to add doctor" });
  }
});

router.get('/hospital/appointments', verifyHospital, async (req, res) => {
  try {
    const query = `
      SELECT 
        a.*,
        d.name AS department_name,
        doc.name AS doctor_name
      FROM appointments a
      LEFT JOIN departments d ON a.department_id = d.department_id
      LEFT JOIN doctors doc ON a.doctor_id = doc.doctor_id
      WHERE a.hospital_id = $1 AND LOWER(a.payment_status) = 'paid'
      ORDER BY a.appointment_date ASC;
    `;

    const { rows } = await pool.query(query, [req.hospital.id]);
    return res.json(rows);
  } catch (error) {
    console.error("Fetch Appointments Error:", error);
    return res.status(500).json({ message: "Failed to fetch appointments" });
  }
});

// ------------------------------------------
// 6. APPOINTMENTS & ESEWA INTEGRATION
// ------------------------------------------

router.get('/appointments/slot-counts', async (req, res) => {
  const { hospital_id, department_id, date } = req.query;

  if (!hospital_id || !department_id || !date) {
    return res.status(400).json({ message: "hospital_id, department_id, and date are required." });
  }

  try {
    const query = `
      SELECT appointment_time 
      FROM appointments 
      WHERE hospital_id = $1 AND department_id = $2 AND appointment_date = $3 AND status != 'CANCELLED'
    `;

    const { rows } = await pool.query(query, [hospital_id, department_id, date]);

    const slotCounts = {};
    rows.forEach(row => {
      const timeKey = String(row.appointment_time).slice(0, 5);
      slotCounts[timeKey] = (slotCounts[timeKey] || 0) + 1;
    });

    return res.json(slotCounts);
  } catch (error) {
    console.error("Error fetching slot counts:", error);
    return res.status(500).json({ message: "Failed to fetch slot counts" });
  }
});

router.post('/appointments', async (req, res) => {
  const { hospital_id, department_id, doctor_id, user_id, patient_name, patient_phone, appointment_date, appointment_time, notes } = req.body;

  if (!hospital_id || !department_id || !appointment_date || !appointment_time) {
    return res.status(400).json({ message: "Please fill all required fields." });
  }

  try {
    // 1. Duplicate check for registered user
    if (user_id) {
      const dupQuery = `
        SELECT appointment_id FROM appointments 
        WHERE user_id = $1 AND hospital_id = $2 AND department_id = $3 
          AND appointment_date = $4 AND appointment_time = $5 AND status != 'CANCELLED'
      `;
      const dupRes = await pool.query(dupQuery, [user_id, hospital_id, department_id, appointment_date, appointment_time]);
      if (dupRes.rows.length > 0) {
        return res.status(400).json({ message: "You have already booked an appointment for this exact time slot." });
      }
    }

    // 2. Capacity check (Max 20 appointments per slot)
    const capQuery = `
      SELECT COUNT(*) FROM appointments 
      WHERE hospital_id = $1 AND department_id = $2 AND appointment_date = $3 
        AND appointment_time = $4 AND status != 'CANCELLED'
    `;
    const capRes = await pool.query(capQuery, [hospital_id, department_id, appointment_date, appointment_time]);
    
    if (parseInt(capRes.rows[0].count, 10) >= 20) {
      return res.status(400).json({ message: "Maximum limit of 20 appointments reached for this time slot. Please select another slot." });
    }

    const transaction_uuid = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const amount = "500";

    const insertAppQuery = `
      INSERT INTO appointments (
        hospital_id, department_id, doctor_id, user_id,
        patient_name, patient_phone, appointment_date, appointment_time,
        notes, amount, payment_status, status, transaction_uuid
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    const values = [
      hospital_id, department_id, doctor_id || null, user_id || null,
      patient_name, patient_phone, appointment_date, appointment_time,
      notes || null, amount, 'PENDING', 'PENDING', transaction_uuid
    ];

    const { rows } = await pool.query(insertAppQuery, values);

    const secretKey = process.env.ESEWA_SECRET_KEY || "8gBm/:&EnhH.1/q";
    const productCode = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";
    const signature = generateEsewaSignature(secretKey, amount, transaction_uuid, productCode);

    const esewaFormData = {
      amount,
      tax_amount: "0",
      total_amount: amount,
      transaction_uuid,
      product_code: productCode,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: "http://localhost:5000/api/esewa/success",
      failure_url: "http://localhost:5000/api/esewa/failure",
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature
    };

    return res.status(201).json({
      message: "Appointment created. Complete payment via eSewa.",
      appointment: rows[0],
      esewaFormData,
      esewaPaymentUrl: "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
    });

  } catch (error) {
    console.error("Booking Error:", error);
    return res.status(500).json({ message: "Failed to schedule appointment." });
  }
});

// eSewa Callbacks
router.get('/esewa/success', async (req, res) => {
  const { data } = req.query;
  if (!data) return res.redirect('http://localhost:5173/dashboard?payment=failed');

  try {
    const decodedData = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
    const transaction_uuid = decodedData.transaction_uuid;
    const refId = decodedData.transaction_code || decodedData.reference_id || 'N/A';
    const status = decodedData.status;

    if (status === 'COMPLETE') {
      await pool.query(
        `UPDATE appointments 
         SET payment_status = 'PAID', status = 'CONFIRMED', esewa_ref_id = $1 
         WHERE transaction_uuid = $2`,
        [refId, transaction_uuid]
      );

      return res.redirect('http://localhost:5173/dashboard?payment=success');
    } else {
      await pool.query(
        `UPDATE appointments 
         SET payment_status = 'FAILED', status = 'CANCELLED' 
         WHERE transaction_uuid = $1`,
        [transaction_uuid]
      );
    }

    return res.redirect('http://localhost:5173/dashboard?payment=failed');
  } catch (err) {
    console.error("eSewa Callback Verification Error:", err);
    return res.redirect('http://localhost:5173/dashboard?payment=failed');
  }
});

router.get('/esewa/failure', async (req, res) => {
  const { data } = req.query;
  if (data) {
    try {
      const decodedData = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
      if (decodedData.transaction_uuid) {
        await pool.query(
          `UPDATE appointments SET status = 'CANCELLED', payment_status = 'FAILED' WHERE transaction_uuid = $1`,
          [decodedData.transaction_uuid]
        );
      }
    } catch (e) {
      console.error("Failure cleanup error:", e);
    }
  }
  return res.redirect('http://localhost:5173/dashboard?payment=cancelled');
});

// User Appointments Endpoint
router.get('/appointments/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const query = `
      SELECT 
        a.*,
        h.name AS hospital_name,
        d.name AS department_name,
        doc.name AS doctor_name
      FROM appointments a
      LEFT JOIN hospital_db h ON a.hospital_id = h.hospital_id
      LEFT JOIN departments d ON a.department_id = d.department_id
      LEFT JOIN doctors doc ON a.doctor_id = doc.doctor_id
      WHERE a.user_id = $1 AND LOWER(a.payment_status) = 'paid'
      ORDER BY a.appointment_date ASC;
    `;
    const { rows } = await pool.query(query, [userId]);
    return res.json(rows);
  } catch (error) {
    console.error("User Appointments Fetch Error:", error);
    return res.status(500).json({ message: "Failed to fetch user appointments" });
  }
});

export default router;