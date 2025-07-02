export const errorHandler = (err, req, res, next) => {
    // Log error
    console.error('❌ Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userId: req.user?._id
    });

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
        
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            errors
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(409).json({
            success: false,
            error: `${field} already exists`
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token expired',
            code: 'TOKEN_EXPIRED'
        });
    }

    // Multer file upload errors
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large'
            });
        }
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }

    // CORS error
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            error: 'CORS policy violation'
        });
    }

    // Default error response
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
    
    res.status(statusCode).json({
        success: false,
        error: process.env.NODE_ENV === 'production' && statusCode === 500 
            ? 'Something went wrong' 
            : message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// Custom error class
export class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Common error creators
export const errors = {
    badRequest: (message = 'Bad request') => new ApiError(400, message),
    unauthorized: (message = 'Unauthorized') => new ApiError(401, message),
    forbidden: (message = 'Forbidden') => new ApiError(403, message),
    notFound: (message = 'Not found') => new ApiError(404, message),
    conflict: (message = 'Conflict') => new ApiError(409, message),
    tooManyRequests: (message = 'Too many requests') => new ApiError(429, message),
    internal: (message = 'Internal server error') => new ApiError(500, message)
};