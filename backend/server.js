const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { initializeDatabase } = require('./database');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const documentRoutes = require('./routes/documents');
const apiSpecsRoutes = require('./routes/api-specs');
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
app.use(cors({
    origin: true, // Permite cualquier origen
    credentials: true
}));
app.use(helmet());
app.use(express.json({ limit: '1mb' })); // Limitar payload a 1MB para prevenir DoS
app.use(cookieParser());

// Rate limiting global para todas las rutas de la API
app.use('/auth', apiLimiter);
app.use('/projects', apiLimiter);
app.use('/documents', apiLimiter);
app.use('/api-specs', apiLimiter);

// Routes
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/documents', documentRoutes);
app.use('/api-specs', apiSpecsRoutes);

// Error handling middleware (MUST be after all routes)
app.use(errorHandler);

// Database init
initializeDatabase();

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Accessible from LAN at http://<your-ip>:${PORT}`);
});
