import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import searchRoutes from './routes/searchRoutes.js';
import { requestLogger, errorHandler, notFoundHandler } from './middleware/index.js';
import { startKeepAlive, warmUp } from './utils/keepAlive.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting with optimized limits
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: NODE_ENV === 'production' ? 50 : 1000, // Reduced for production
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
const corsOptions = {
    origin: NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || true
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware with smaller limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging
app.use(requestLogger);

// API routes
app.use('/api/v1', searchRoutes);

// Health check endpoints
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: NODE_ENV
    });
});

app.get('/health/detailed', async (req, res) => {
    const { searchCache } = await import('./utils/cache.js');

    const healthCheck = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: NODE_ENV,
        uptime: Math.floor(process.uptime()),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        services: {
            groq: process.env.GROQ_API_KEY ? 'configured' : 'missing',
            mockData: process.env.USE_MOCK_DATA === 'true' ? 'enabled' : 'disabled',
            cache: {
                size: searchCache.size(),
                enabled: true
            }
        }
    };

    res.json(healthCheck);
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

app.listen(PORT, async () => {
    console.log(`🚀 NeuroShop Backend Server`);
    console.log(`📍 Environment: ${NODE_ENV}`);
    console.log(`🌐 Port: ${PORT}`);
    console.log(`📡 CORS: ${NODE_ENV === 'production' ? 'Restricted' : 'All Origins'}`);
    console.log(`🔒 Rate Limit: ${NODE_ENV === 'production' ? '50' : '1000'} requests/15min`);
    console.log(`💾 Caching: Enabled (5min TTL)`);
    console.log(`⚡ Server ready at http://localhost:${PORT}`);

    // Warm up services
    await warmUp();

    // Start keep-alive in production
    if (NODE_ENV === 'production' && process.env.KEEP_ALIVE_URL) {
        startKeepAlive(process.env.KEEP_ALIVE_URL, 10); // Ping every 10 minutes
    }
});

export default app;
