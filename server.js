const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('./middleware/authMiddleware');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

let isDBConnected = false;

// HTML file paths
const errorPagePath = path.join(__dirname, 'views', 'error.html');
const successPagePath = path.join(__dirname, 'views', 'success.html');

app.get('/', (req, res) => {
  if (!isDBConnected) {
    try {
      const errorPage = fs.readFileSync(errorPagePath, 'utf8');
      return res.status(500).send(errorPage);
    } catch (error) {
      console.error('Error loading error page:', error);
      return res.status(500).json({ 
        error: 'Database Connection Failed', 
        message: 'MongoDB is not connected' 
      });
    }
  }

  try {
    const successPage = fs.readFileSync(successPagePath, 'utf8');
    res.send(successPage);
  } catch (error) {
    console.error('Error loading success page:', error);
    res.json({ 
      status: 'online', 
      message: 'Shree Allamaprabhu Foundation - Management API System',
      database: 'connected',
      services: {
        authentication: 'active',
        cors: 'enabled',
        api: 'ready'
      }
    });
  }
});

// Routes
const facultyRoutes = require('./routes/faculty');
const adminRoutes = require('./routes/admin');

app.use('/api/faculty', authMiddleware, facultyRoutes);
app.use('/api/admin', adminRoutes);

// DB Connection and Server Start
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    isDBConnected = true;
    console.log('MongoDB connected');
        
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Mongo Error:', err);
  });