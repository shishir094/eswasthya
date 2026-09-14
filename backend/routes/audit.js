import pool from '../config/db.js';

/**
 * Helper to write entries to the audit_logs table for any target entity
 * @param {Number|String} adminId - The ID of the admin
 * @param {String} targetId - The UUID of the user or hospital
 * @param {String} targetType - 'USER' or 'HOSPITAL'
 * @param {String} action - The action type
 * @param {String} comments - Notes or reasons
 */
const logAudit = async (adminId, targetId, targetType, action, comments = null) => {
    try {
        const query = `
            INSERT INTO audit_logs (admin_id, target_id, target_type, action, comments)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await pool.query(query, [adminId, targetId, targetType, action, comments]);
    } catch (error) {
        console.error('Failed to write audit log:', error);
    }
};

export default logAudit