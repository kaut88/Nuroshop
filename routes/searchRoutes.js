import express from 'express';
import { searchProducts, getSearchStats, clearCache } from '../controllers/searchController.js';
import { validateSearchInput } from '../middleware/index.js';

const router = express.Router();

// Search products endpoint
router.post('/search', validateSearchInput, searchProducts);

// Get search statistics
router.get('/stats', getSearchStats);

// Clear cache endpoint (admin)
router.post('/cache/clear', clearCache);

// API info endpoint
router.get('/info', (req, res) => {
    res.json({
        name: 'NeuroShop API',
        version: '1.0.0',
        description: 'AI-powered price comparison API with caching',
        endpoints: {
            'POST /api/v1/search': 'Search products across multiple platforms',
            'GET /api/v1/stats': 'Get API statistics',
            'POST /api/v1/cache/clear': 'Clear response cache',
            'GET /api/v1/info': 'Get API information',
            'GET /health': 'Health check',
            'GET /health/detailed': 'Detailed health check'
        },
        documentation: 'https://github.com/kaut88/Nuroshop',
        timestamp: new Date().toISOString()
    });
});

export default router;
