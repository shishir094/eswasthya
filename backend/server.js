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

app.use(cors({
    origin:process.env.CLIENT_URL,
    credentials:true,
})); 

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