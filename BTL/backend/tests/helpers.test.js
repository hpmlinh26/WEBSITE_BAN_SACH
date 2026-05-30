const assert = require('assert');
const { makeSlug, normalizeAssetPath } = require('../helpers');

function testMakeSlug() {
  const slug = makeSlug('Truyen NARUTO 100');
  assert.strictEqual(slug, 'truyen-naruto-100');
}

function testNormalizeAssetPath() {
  assert.strictEqual(normalizeAssetPath('assets/images/test.png'), 'assets/images/test.png');
  assert.strictEqual(normalizeAssetPath('https://example.com/img.png'), 'https://example.com/img.png');
  assert.strictEqual(normalizeAssetPath('sach-10.jpg'), 'assets/products/sach-10.jpg');
  assert.strictEqual(normalizeAssetPath('cover.png'), 'assets/images/cover.png');
}

function run() {
  testMakeSlug();
  testNormalizeAssetPath();
  console.log('helpers.test.js: OK');
}

run();
