// Boc handler async de loi tu Promise duoc chuyen sang middleware xu ly loi.
function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

// Tao Error kem ma HTTP de middleware tra dung status.
function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = { asyncHandler, createError };
