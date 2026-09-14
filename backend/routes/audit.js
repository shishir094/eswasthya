import pool from '../config/db.js';

/**
 * Helper to write entries to the audit_logs table for any target entity
 * @param {Number|String} adminId - The ID of the admin
 * @param {String} targetId - The UUID of the user or hospital
 * @param {String} targetType - 'USER' or 'HOSPITAL'
 * @param {String} action - The action type
 * @param {String} comments - Notes or reasons
 */
const logAudit = async (req, res) => {
  try {
    const query = `
      SELECT 
        al.id, 
        al.created_at AS timestamp, 
        COALESCE(a.name, a.email, 'Admin #' || al.admin_id) AS officer,
        al.target_type, 
        CAST(al.target_id AS TEXT) AS target_identifier, 
        al.action, 
        al.comments
      FROM audit_logs al
      LEFT JOIN admin a ON al.admin_id = a.id
      ORDER BY al.created_at DESC
      LIMIT 100;
    `;
    
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Server error while fetching audit logs.' });
  }
};

export default logAudit