const { db, run, get, all, hashPassword, transaction } = require('./connection');
const { createSchema } = require('./schema');
const { seedDatabase } = require('./seed');
const permissions = require('./permissions');
const { DB_PATH } = require('../config');

async function initDatabase() {
  await createSchema();
  await seedDatabase();
  await permissions.loadPermissions();
}

module.exports = { db, DB_PATH, initDatabase, run, get, all, hashPassword, transaction, permissions };
