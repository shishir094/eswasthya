import jwt from 'jsonwebtoken';

const verifyHospital = (req, res, next) => {
  const token = req.cookies.hospital_token;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.HOSPITAL_SECRET_KEY);
    
    // Ensure this matches req.hospital used in router.get('/me')
    req.hospital = decoded; 
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default verifyHospital;