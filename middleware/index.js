// Request logging middleware
export const requestLogger = (req, res, next) => {
    const start = Date.now();
    const { method, url, ip } = req;

    res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;

        console.log(`${new Date().toISOString()} - ${method} ${url} - ${statusCode} - ${duration}ms - ${ip}`);
    });

    next();
};

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV !== 'production';

    res.status(err.status || 500).json({
        error: 'Internal server error',
        message: isDevelopment ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString(),
        ...(isDevelopment && { stack: err.stack })
    });
};

// 404 handler
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.url} not found`,
        timestamp: new Date().toISOString()
    });
};

// Input validation middleware
export const validateSearchInput = (req, res, next) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Query parameter is required',
            timestamp: new Date().toISOString()
        });
    }

    if (typeof query !== 'string') {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Query must be a string',
            timestamp: new Date().toISOString()
        });
    }

    if (query.trim().length === 0) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Query cannot be empty',
            timestamp: new Date().toISOString()
        });
    }

    if (query.length > 200) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Query too long (max 200 characters)',
            timestamp: new Date().toISOString()
        });
    }

    // Sanitize query
    req.body.query = query.trim();
    next();
};

// Async error wrapper
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};