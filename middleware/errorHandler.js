/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: "Internal server error",
      details: err.message
    });
  };
  
  export default errorHandler;