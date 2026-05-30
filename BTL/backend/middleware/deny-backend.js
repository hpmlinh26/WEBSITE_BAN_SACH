function denyBackend(req, res, next) {
  if (req.path.startsWith('/backend')) return res.status(403).send('Forbidden');
  next();
}

module.exports = denyBackend;
