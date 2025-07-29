// seedSuperAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import Admin model
const Admin = require('./models/Admin');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Function to create superadmin
const seedSuperAdmin = async () => {
  try {
    // Check if superadmin already exists
    const existingAdmin = await Admin.findOne({ email: 'superadmin@example.com' });
    if (existingAdmin) {
      console.log('Superadmin already exists');
      mongoose.connection.close();
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('securepassword123', salt);

    // Create superadmin
    await Admin.create({
      name: 'Super Admin',
      email: 'superadmin@example.com',
      password: hashedPassword,
      role: 'superadmin',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Superadmin created successfully');
    mongoose.connection.close();
  } catch (err) {
    console.error('Error creating superadmin:', err);
    mongoose.connection.close();
  }
};

// Run the function
seedSuperAdmin();