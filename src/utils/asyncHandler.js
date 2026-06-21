/**
 * Wrap an async route handler so rejected promises are forwarded to Express'
 * error middleware instead of crashing or hanging the request.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
