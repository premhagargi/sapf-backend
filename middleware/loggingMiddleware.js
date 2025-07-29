const loggingMiddleware = (req, res, next) => {
  // Record start time
  const startTime = Date.now();

  // Format timestamp in IST (Indian Standard Time)
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // Store original res.end to calculate response time
  const originalEnd = res.end;

  // Override res.end to log response details
  res.end = function (...args) {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log request details
    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} - Status: ${statusCode} - ${responseTime}ms`
    );

    // Call original res.end
    originalEnd.apply(res, args);
  };

  next();
};

module.exports = loggingMiddleware;