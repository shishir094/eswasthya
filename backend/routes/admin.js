import express from 'express';
import pool from '../config/db.js'; 

const router = express.Router();

router.post('/create', async (req, res) => {
    try {
        const queryText = `
            CREATE TABLE IF NOT EXISTS department (
                INT PRIMARY KEY,
                VARCHAR(255) NOT NULL
            )
        `;
        await pool.query(queryText);
        res.status(200).json({ message: "Table created successfully" });
    } catch (error) {
        console.error("Database error:", error);
        res.status(400).json({ message: "Error creating dynamic table", error: error.message });
    }
});

export default router;