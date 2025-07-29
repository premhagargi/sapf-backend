const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
institute: {
  type: String,
  enum: ['institute1', 'institute2', 'institute3'], // <- Add valid names here
  required: true
}

}, { timestamps: true });

module.exports = mongoose.model('Faculty', facultySchema);
