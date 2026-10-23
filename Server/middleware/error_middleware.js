
export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

// Must have all four parameters for Express error middleware.
export const errorHandler = (err, req, res, next) => {
  console.error(`[${req.method} ${req.originalUrl}]`, err);

  const status = err.statusCode || err.status || 500;

  const safeStatus =
    Number.isInteger(status) && status >= 400 && status <= 599
      ? status
      : 500;

  const message =
    process.env.NODE_ENV === "production" && safeStatus === 500
      ? "Internal server error"
      : err.message || "Something went wrong";

  if (res.headersSent) {
    return next(err);
  }

  return res.status(safeStatus).json({
    success: false,
    message,
  });
};
