const express = require('express');
const router = express.Router();
const Faculty = require('../models/Faculty');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');

// Error response formatter
const formatResponse = (statusCode, status, message, data = null, details = null) => ({
  statusCode,
  status,
  message,
  ...(data && { data }),
  ...(details && { details }),
  timestamp: new Date().toISOString()
});

// Validation middleware for faculty creation
const validateFaculty = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('institute').trim().notEmpty().withMessage('Institute is required'),
  body('department').trim().notEmpty().withMessage('Department is required')
];

// Create Faculty
router.post(
  '/',
  validateFaculty,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(formatResponse(400, 'error', 'Validation failed', null, errors.array()));
      }

      const newFaculty = new Faculty(req.body);
      const saved = await newFaculty.save();
      
      res.status(201).json(
        formatResponse(201, 'success', 'Faculty created successfully', saved)
      );
    } catch (err) {
      if (err.code === 11000) {
        // Handle duplicate key error
        const field = Object.keys(err.keyPattern)[0];
        return res.status(409).json(
          formatResponse(409, 'error', `Duplicate ${field}`, null,
            `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`)
        );
      }
      
      res.status(400).json(
        formatResponse(400, 'error', 'Failed to create faculty', null, err.message)
      );
    }
  }
);

// Get All Faculty
router.get('/', async (req, res) => {
  try {
    const facultyList = await Faculty.find().lean();
    
    if (!facultyList.length) {
      return res.status(404).json(
        formatResponse(404, 'error', 'No faculty members found')
      );
    }

    res.status(200).json(
      formatResponse(200, 'success', 'Faculty list retrieved successfully', {
        faculty: facultyList,
        count: facultyList.length
      })
    );
  } catch (err) {
    res.status(500).json(
      formatResponse(500, 'error', 'Failed to retrieve faculty list', null, err.message)
    );
  }
});

// Get Faculty by Institute
router.get('/institute/:name', [
  body('name').trim().notEmpty().withMessage('Institute name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(formatResponse(400, 'error', 'Validation failed', null, errors.array()));
    }

    const data = await Faculty.find({ institute: req.params.name }).lean();
    
    if (!data.length) {
      return res.status(404).json(
        formatResponse(404, 'error', `No faculty found for institute: ${req.params.name}`)
      );
    }

    res.status(200).json(
      formatResponse(200, 'success', `Faculty retrieved for ${req.params.name}`, {
        faculty: data,
        count: data.length
      })
    );
  } catch (err) {
    res.status(500).json(
      formatResponse(500, 'error', 'Failed to retrieve faculty', null, err.message)
    );
  }
});

// Update Faculty
router.put('/:id', [
  body('email').optional().isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json(
        formatResponse(400, 'error', 'Invalid faculty ID')
      );
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(formatResponse(400, 'error', 'Validation failed', null, errors.array()));
    }

    const updated = await Faculty.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      {
        new: true,
        runValidators: true
      }
    ).lean();

    if (!updated) {
      return res.status(404).json(
        formatResponse(404, 'error', 'Faculty not found')
      );
    }

    res.status(200).json(
      formatResponse(200, 'success', 'Faculty updated successfully', updated)
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
      formatResponse(400, 'error', 'Failed to update faculty', null, err.message)
    );
  }
});

// Delete Faculty
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json(
        formatResponse(400, 'error', 'Invalid faculty ID')
      );
    }

    const deleted = await Faculty.findByIdAndDelete(req.params.id).lean();

    if (!deleted) {
      return res.status(404).json(
        formatResponse(404, 'error', 'Faculty not found')
      );
    }

    res.status(200).json(
      formatResponse(200, 'success', 'Faculty deleted successfully')
    );
  } catch (err) {
    res.status(500).json(
      formatResponse(500, 'error', 'Failed to delete faculty', null, err.message)
    );
  }
});

module.exports = router;