import jwt from 'jsonwebtoken';

export const protectAdmin = (req, res, next) => {
  const token = req.cookies.admin_token;

  if (!token) {
    return res.status(401).json({ message: 'Access denied. Admin authorization required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    
    // Ensure the token belongs to an admin session
    if (decoded.type !== 'admin') {
      return res.status(403).json({ message: 'Forbidden. Non-admin user access.' });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired admin token' });
  }
};

