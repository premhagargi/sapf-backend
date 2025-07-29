const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware, restrictTo } = require('../middleware/authMiddleware');

// Error response formatter
const formatResponse = (statusCode, status, message, data = null, details = null) => ({
  statusCode,
  status,
  message,
  ...(data && { data }),
  ...(details && { details }),
  timestamp: new Date().toISOString()
});

// Validation middleware for admin creation
const validateAdmin = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').trim().notEmpty().withMessage('Role is required').isIn(['superadmin', 'admin', 'moderator']).withMessage('Invalid role')
];

// Validation middleware for login
const validateLogin = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Create Admin (Restricted to superadmin)
router.post(
  '/',
  authMiddleware,
  restrictTo('superadmin'),
  validateAdmin,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(formatResponse(400, 'error', 'Validation failed', null, errors.array()));
      }

      const { name, email, password, role } = req.body;
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newAdmin = new Admin({
        name,
        email,
        password: hashedPassword,
        role
      });

      const saved = await newAdmin.save();
      
      res.status(201).json(
        formatResponse(201, 'success', 'Admin created successfully', saved)
      );
    } catch (err) {
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(409).json(
          formatResponse(409, 'error', `Duplicate ${field}`, null,
            `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`)
        );
      }
      
      res.status(400).json(
        formatResponse(400, 'error', 'Failed to create admin', null, err.message)
      );
    }
  }
);

// Admin Login (No auth required)
router.post(
  '/login',
  validateLogin,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(formatResponse(400, 'error', 'Validation failed', null, errors.array()));
      }

      const { email, password } = req.body;

      const admin = await Admin.findOne({ email }).lean();
      if (!admin) {
        return res.status(401).json(
          formatResponse(401, 'error', 'Invalid credentials')
        );
      }

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json(
          formatResponse(401, 'error', 'Invalid credentials')
        );
      }

      // Generate JWT
      const payload = {
        admin: {
          id: admin._id,
          role: admin.role
        }
      };

      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '10h' }
      );

      res.status(200).json(
        formatResponse(200, 'success', 'Login successful', {
          token,
          admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role
          }
        })
      );
    } catch (err) {
      res.status(500).json(
        formatResponse(500, 'error', 'Login failed', null, err.message)
      );
    }
  }
);

// Get All Admins (Restricted to admin, superadmin)
router.get(
  '/',
  authMiddleware,
  restrictTo('admin', 'superadmin'),
  async (req, res) => {
    try {
      const adminList = await Admin.find().select('-password').lean();
      
      if (!adminList.length) {
        return res.status(404).json(
          formatResponse(404, 'error', 'No admins found')
        );
      }

      res.status(200).json(
        formatResponse(200, 'success', 'Admin list retrieved successfully', {
          admins: adminList,
          count: adminList.length
        })
      );
    } catch (err) {
      res.status(500).json(
        formatResponse(500, 'error', 'Failed to retrieve admin list', null, err.message)
      );
    }
  }
);

// Get Admin by ID (Restricted to admin, superadmin)
router.get(
  '/:id',
  authMiddleware,
  restrictTo('admin', 'superadmin'),
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json(
          formatResponse(400, 'error', 'Invalid admin ID')
        );
      }

      const admin = await Admin.findById(req.params.id).select('-password').lean();
      
      if (!admin) {
        return res.status(404).json(
          formatResponse(404, 'error', 'Admin not found')
        );
      }

      res.status(200).json(
        formatResponse(200, 'success', 'Admin retrieved successfully', admin)
      );
    } catch (err) {
      res.status(500).json(
        formatResponse(500, 'error', 'Failed to retrieve admin', null, err.message)
      );
    }
  }
);

// Update Admin (Restricted to superadmin)
router.put(
  '/:id',
  authMiddleware,
  restrictTo('superadmin'),
  [
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['superadmin', 'admin', 'moderator']).withMessage('Invalid role')
  ],
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json(
          formatResponse(400, 'error', 'Invalid admin ID')
        );
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(formatResponse(400, 'error', 'Validation failed', null, errors.array()));
      }

      const updateData = { ...req.body, updatedAt: new Date() };

      // Hash password if provided
      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(req.body.password, salt);
      }

      const updated = await Admin.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true
        }
      ).select('-password').lean();

      if (!updated) {
        return res.status(404).json(
          formatResponse(404, 'error', 'Admin not found')
        );
      }

      res.status(200).json(
        formatResponse(200, 'success', 'Admin updated successfully', updated)
      );
    } catch (err) {
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(409).json(
          formatResponse(409, 'error', `Duplicate ${field}`, null,
            `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`)
        );
      }

      res.status(400).json(
        formatResponse(400, 'error', 'Failed to update admin', null, err.message)
      );
    }
  }
);

// Delete Admin (Restricted to superadmin)
router.delete(
  '/:id',
  authMiddleware,
  restrictTo('superadmin'),
  async (req, res) => {
    try {
      const adminId = req.params.id;
      console.log('adminId:', adminId);
      console.log('token id:', String(req.admin.id));

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(adminId)) {
        return res.status(400).json(
          formatResponse(400, 'error', 'Invalid admin ID')
        );
      }

      // Prevent self-deletion
      if (String(req.admin.id) === String(adminId)) {
        return res.status(403).json(
          formatResponse(403, 'error', 'You cannot delete your own account')
        );
      }

      // Fetch admin to delete and count of superadmins in parallel
      const [adminToDelete, superadminCount] = await Promise.all([
        Admin.findById(adminId).lean(),
        Admin.countDocuments({ role: 'superadmin' })
      ]);

      // Admin not found
      if (!adminToDelete) {
        return res.status(404).json(
          formatResponse(404, 'error', 'Admin not found')
        );
      }

      // Prevent deleting the last superadmin
      if (adminToDelete.role === 'superadmin' && superadminCount <= 1) {
        return res.status(403).json(
          formatResponse(403, 'error', 'Cannot delete the last superadmin')
        );
      }

      // Delete admin
      await Admin.findByIdAndDelete(adminId);

      // Audit log
      console.log(
        `[${new Date().toISOString()}] Admin "${req.admin.name}" (${req.admin.id}) deleted admin "${adminToDelete.name}" (${adminToDelete._id})`
      );

      // Success response
      res.status(200).json(
        formatResponse(200, 'success', 'Admin deleted successfully')
      );
    } catch (err) {
      res.status(500).json(
        formatResponse(
          500,
          'error',
          'Failed to delete admin',
          null,
          err.message
        )
      );
    }
  }
);



module.exports = router;