function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const message = status === 500 ? 'Lỗi server. Vui lòng kiểm tra terminal.' : err.message;
  res.status(status).json({ message });
}

module.exports = errorHandler;
