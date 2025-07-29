const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const { authMiddleware } = require('./middleware/authMiddleware');
const { loggingMiddleware} = require('./middleware/loggingMiddleware')

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', loggingMiddleware);

// DB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('Mongo Error:', err));

// Routes
const facultyRoutes = require('./routes/faculty');
const adminRoutes = require('./routes/admin');

app.use('/api/faculty', authMiddleware, facultyRoutes);
app.use('/api/admin', adminRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));