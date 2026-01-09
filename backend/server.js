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
const reposRoutes = require('./routes/repos');
const githubAuthRoutes = require('./routes/github-auth');
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
    apis: ['./routes/auth.js', './routes/projects.js', './routes/documents.js', './routes/api-specs.js', './routes/repos.js', './routes/github-auth.js'],
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

app.use('/repos', apiLimiter);

// Routes
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/documents', documentRoutes);
app.use('/api-specs', apiSpecsRoutes);
app.use('/repos', reposRoutes);
app.use('/github', githubAuthRoutes);

// Error handling middleware (MUST be after all routes)
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
    try {
        // Database init - wait for it to complete
        await initializeDatabase();

        // Start the server only after database is ready
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
            console.log(`Accessible from LAN at http://<your-ip>:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
