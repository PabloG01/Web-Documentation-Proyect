const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { initializeDatabase } = require('./database');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const documentRoutes = require('./routes/documents');
require('dotenv').config();
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = process.env.PORT || 5000;

// Swagger configuration
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Documentación de prueba de la API',
            version: '1.0.0',
        },
    },
    apis: ['./routes/auth.js', './routes/projects.js', './routes/documents.js'],
};

const swaggerSpec = swaggerJsdoc(options); // Corregido: era swaggerOptions

// Server UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Endpoint para JSON
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json'); // Corregido: era aplication
    res.send(swaggerSpec);
});

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
app.use('/projects', projectRoutes);
app.use('/documents', documentRoutes);

// Error handling middleware (MUST be after all routes)
app.use(errorHandler);

// Database init
initializeDatabase();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
