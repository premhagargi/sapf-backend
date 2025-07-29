const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Error response formatter
const formatResponse = (statusCode, status, message, data = null, details = null) => ({
  statusCode,
  status,
  message,
  ...(data && { data }),
  ...(details && { details }),
  timestamp: new Date().toISOString()
});

// Middleware to verify JWT and authorize admin
const authMiddleware = async (req, res, next) => {
  try {
    // Check for token in Authorization header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json(
        formatResponse(401, 'error', 'Authentication required', null, 'No token provided')
      );
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // Find admin by ID from token payload
    const admin = await Admin.findById(decoded.admin.id).select('-password').lean();
    
    if (!admin) {
      return res.status(401).json(
        formatResponse(401, 'error', 'Invalid token', null, 'Admin not found')
      );
    }

    // Attach admin to request object
    req.admin = {
      id: admin._id,
      role: admin.role,
      email: admin.email,
      name: admin.name
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json(
        formatResponse(401, 'error', 'Token expired', null, 'Please login again')
      );
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json(
        formatResponse(401, 'error', 'Invalid token', null, 'Invalid token format')
      );
    }

    res.status(500).json(
      formatResponse(500, 'error', 'Authentication failed', null, err.message)
    );
  }
};

// Middleware to check for specific roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return res.status(403).json(
        formatResponse(403, 'error', 'Access denied', null, 
          `Requires one of the following roles: ${roles.join(', ')}`)
      );
    }
    next();
  };
};

module.exports = { authMiddleware, restrictTo };