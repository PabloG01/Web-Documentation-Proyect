const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const http = require('http'); // Import http
const { initializeDatabase } = require('./database');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const documentRoutes = require('./routes/documents');
const apiSpecsRoutes = require('./routes/api-specs');
const reposRoutes = require('./routes/repos');
const githubAuthRoutes = require('./routes/github-auth');
const bitbucketAuthRoutes = require('./routes/bitbucket-auth');
const apiKeysRoutes = require('./routes/api-keys');
const statsRoutes = require('./routes/stats');
const socket = require('./socket'); // Import socket module
require('dotenv').config();
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const server = http.createServer(app); // Create HTTP server
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
    apis: ['./routes/auth.js', './routes/projects.js', './routes/documents.js', './routes/api-specs.js', './routes/repos.js', './routes/github-auth.js', './routes/bitbucket-auth.js', './routes/api-keys.js', './routes/stats.js'],
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
app.use('/environments', apiLimiter);
app.use('/api-keys', apiLimiter);
app.use('/repos', apiLimiter);

// Routes
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/documents', documentRoutes);
app.use('/api-specs', apiSpecsRoutes);
app.use('/environments', require('./routes/environments'));
app.use('/api-keys', apiKeysRoutes);
app.use('/stats', statsRoutes);
app.use('/repos', reposRoutes);
app.use('/github', githubAuthRoutes);
app.use('/bitbucket', bitbucketAuthRoutes);

// Error handling middleware (MUST be after all routes)
app.use(errorHandler);

// Export app for testing
module.exports = app;

// Initialize database and start server (only if not in test mode)
const startServer = async () => {
    try {
        // Database init - wait for it to complete
        await initializeDatabase();

        // Initialize Socket.IO
        socket.init(server);

        // Start the server only after database is ready
        server.listen(PORT, '0.0.0.0', () => { // Listen on server, not app
            console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
            console.log(`Accessible from LAN at http://<your-ip>:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Only start the server if this file is run directly
if (require.main === module) {
    startServer();
}
