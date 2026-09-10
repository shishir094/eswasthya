import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from "cookie-parser";
import authRoutes from './routes/auth.js';
import adminAuthRoutes from './routes/adminAuth.js';
import { protectAdmin } from './middleware/adminAuth.js';
import hospitalRoutes from './routes/hospital.js'
import makeDatabase from './routes/admin.js'
dotenv.config();
const app = express();

// const allowedOrigins = [
//     'http://localhost:5173',
//     'https://has-users.vercel.app',
//     'https://has-hospital.vercel.app',
//     'https://has-admin.vercel.app',
//   process.env.USER_FRONTEND_URL,
//   process.env.ADMIN_FRONTEND_URL,
//   process.env.HOSPITAL_FRONTEND_URL
// ].filter(Boolean); // Filters out any undefined values

app.use(cors({
  origin: ['http://localhost:5173', 'https://has-users.vercel.app',
    'https://has-hospital.vercel.app',
    'https://has-admin.vercel.app',],
  credentials: true
}));

// app.use(cors({
//   origin: function (origin, callback) {
//     // Allow tools like Postman or mobile apps with no origin
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.indexOf(origin) === -1) {
//       return callback(new Error('Blocked by CORS policy'));
//     }
//     return callback(null, true);
//   },
//   credentials: true
// }));

app.use(express.json());
app.use(cookieParser());

app.get("/",(req,res)=>{
    res.send("hello");
})
app.use("/api/auth",authRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api',hospitalRoutes);
app.use('/api/make',makeDatabase);
const PORT = process.env.PORT || 5000;

app.listen(PORT,()=>{
    console.log(`server running at port:${PORT}`);
})