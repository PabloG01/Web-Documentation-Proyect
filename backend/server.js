const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { initializeDatabase } = require('./database');
const authRoutes = require('./routes/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: 'http://localhost:3000', // Frontend URL
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/auth', authRoutes);

// Database init
initializeDatabase();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
