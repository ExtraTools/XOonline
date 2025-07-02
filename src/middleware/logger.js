import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Log stream
const accessLogStream = fs.createWriteStream(
    path.join(logsDir, 'access.log'),
    { flags: 'a' }
);

// Color codes for console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',
    
    fg: {
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        gray: '\x1b[90m'
    },
    
    bg: {
        black: '\x1b[40m',
        red: '\x1b[41m',
        green: '\x1b[42m',
        yellow: '\x1b[43m',
        blue: '\x1b[44m',
        magenta: '\x1b[45m',
        cyan: '\x1b[46m',
        white: '\x1b[47m'
    }
};

// Get color based on status code
const getStatusColor = (status) => {
    if (status >= 500) return colors.fg.red;
    if (status >= 400) return colors.fg.yellow;
    if (status >= 300) return colors.fg.cyan;
    if (status >= 200) return colors.fg.green;
    return colors.fg.white;
};

// Get method color
const getMethodColor = (method) => {
    const methodColors = {
        GET: colors.fg.green,
        POST: colors.fg.blue,
        PUT: colors.fg.yellow,
        DELETE: colors.fg.red,
        PATCH: colors.fg.magenta
    };
    return methodColors[method] || colors.fg.white;
};

// Format response time
const formatResponseTime = (ms) => {
    if (ms < 10) return `${ms.toFixed(2)}ms`;
    if (ms < 100) return `${ms.toFixed(1)}ms`;
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
};

// Request logger middleware
export const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    // Log to console when response finishes
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        const method = req.method;
        const url = req.originalUrl || req.url;
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || '-';
        const userId = req.user?._id || '-';
        
        // Console log with colors
        const methodColor = getMethodColor(method);
        const statusColor = getStatusColor(status);
        const timeColor = duration > 1000 ? colors.fg.red : duration > 500 ? colors.fg.yellow : colors.fg.green;
        
        console.log(
            `${colors.fg.gray}[${timestamp}]${colors.reset} ` +
            `${methodColor}${method.padEnd(7)}${colors.reset} ` +
            `${statusColor}${status}${colors.reset} ` +
            `${timeColor}${formatResponseTime(duration).padStart(8)}${colors.reset} ` +
            `${colors.fg.cyan}${url}${colors.reset} ` +
            `${colors.fg.gray}${ip}${colors.reset}`
        );
        
        // Write to log file
        const logEntry = {
            timestamp,
            method,
            url,
            status,
            duration,
            ip,
            userAgent,
            userId,
            referer: req.headers.referer || '-',
            contentLength: res.get('content-length') || 0
        };
        
        accessLogStream.write(JSON.stringify(logEntry) + '\n');
    });
    
    next();
};

// Error logger
export const errorLogger = (err, req, res, next) => {
    const timestamp = new Date().toISOString();
    const errorLogStream = fs.createWriteStream(
        path.join(logsDir, 'error.log'),
        { flags: 'a' }
    );
    
    const errorEntry = {
        timestamp,
        method: req.method,
        url: req.originalUrl || req.url,
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?._id || '-',
        error: {
            message: err.message,
            stack: err.stack,
            status: err.statusCode || 500
        }
    };
    
    errorLogStream.write(JSON.stringify(errorEntry) + '\n');
    errorLogStream.end();
    
    next(err);
};

// Performance logger for slow requests
export const performanceLogger = (threshold = 1000) => {
    return (req, res, next) => {
        const startTime = Date.now();
        
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            
            if (duration > threshold) {
                const performanceLogStream = fs.createWriteStream(
                    path.join(logsDir, 'performance.log'),
                    { flags: 'a' }
                );
                
                const logEntry = {
                    timestamp: new Date().toISOString(),
                    method: req.method,
                    url: req.originalUrl || req.url,
                    duration,
                    status: res.statusCode,
                    userAgent: req.headers['user-agent']
                };
                
                performanceLogStream.write(JSON.stringify(logEntry) + '\n');
                performanceLogStream.end();
                
                console.warn(
                    `${colors.bg.red}${colors.fg.white} SLOW REQUEST ${colors.reset} ` +
                    `${req.method} ${req.url} took ${formatResponseTime(duration)}`
                );
            }
        });
        
        next();
    };
};