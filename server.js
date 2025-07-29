const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const { authMiddleware } = require('./middleware/authMiddleware');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

let isDBConnected = false;

app.get('/', (req, res) => {
  if (!isDBConnected) {
    return res.status(500).send(`
      <html>
        <head><title>Server Error</title></head>
        <body style="text-align:center;padding-top:100px;font-family:sans-serif;">
          <h1>⚠️ Server is running but database is not connected</h1>
          <p>Please check MongoDB connection.</p>
        </body>
      </html>
    `);
  }

  res.send(`
    <html>
      <head>
        <title>Shree Allamaprabhu Foundation</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            color: #333;
            text-align: center;
            padding-top: 100px;
          }
          h1 {
            color: #2c3e50;
          }
          p {
            font-size: 18px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            border-radius: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 Shree Allamaprabhu Foundation</h1>
          <p>Welcome to the Management API</p>
          <p>✅ Server and MongoDB are up and running.</p>
        </div>
      </body>
    </html>
  `);
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
