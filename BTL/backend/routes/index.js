const healthRoutes = require('./health.routes');
const categoriesRoutes = require('./categories.routes');
const productsRoutes = require('./products.routes');
const authRoutes = require('./auth.routes');
const usersRoutes = require('./users.routes');
const cartRoutes = require('./cart.routes');
const ordersRoutes = require('./orders.routes');
const vouchersRoutes = require('./vouchers.routes');
const feedbacksRoutes = require('./feedbacks.routes');

function registerRoutes(app) {
  app.use('/api', healthRoutes);
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/vouchers', vouchersRoutes);
  app.use('/api/feedbacks', feedbacksRoutes);
}

module.exports = { registerRoutes };
