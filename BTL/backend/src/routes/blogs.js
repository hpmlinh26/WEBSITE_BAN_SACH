const express = require('express');
const { run, get, all } = require('../db');
const { asyncHandler } = require('../lib/http');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { toBlogResponse } = require('../serializers');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const rows = await all("SELECT * FROM blogs WHERE status = 'published' ORDER BY id DESC");
  res.json(rows.map(toBlogResponse));
}));

router.get('/all', requireAuth, requirePermission('blogs', 'view'), asyncHandler(async (req, res) => {
  const rows = await all('SELECT * FROM blogs ORDER BY id DESC');
  res.json(rows.map(toBlogResponse));
}));

router.get('/:slug', asyncHandler(async (req, res) => {
  const blog = await get('SELECT * FROM blogs WHERE slug = ?', [req.params.slug]);
  if (!blog) return res.status(404).json({ message: 'Không tìm thấy bài viết.' });
  res.json(toBlogResponse(blog));
}));

router.post('/', requireAuth, requirePermission('blogs', 'create'), asyncHandler(async (req, res) => {
  const { title, slug, excerpt, content, image, tag, author, status } = req.body;
  if (!title || !slug) return res.status(400).json({ message: 'Tiêu đề và slug là bắt buộc.' });
  const result = await run(
    'INSERT INTO blogs(title, slug, excerpt, content, image, tag, author, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [title, slug, excerpt || '', content || '', image || '', tag || '', author || 'MOT Store', status || 'published']
  );
  const blog = await get('SELECT * FROM blogs WHERE id = ?', [result.id]);
  res.status(201).json(toBlogResponse(blog));
}));

router.patch('/:id', requireAuth, requirePermission('blogs', 'edit'), asyncHandler(async (req, res) => {
  const blog = await get('SELECT * FROM blogs WHERE id = ?', [req.params.id]);
  if (!blog) return res.status(404).json({ message: 'Không tìm thấy bài viết.' });
  const { title, slug, excerpt, content, image, tag, author, status } = req.body;
  await run(
    'UPDATE blogs SET title=?, slug=?, excerpt=?, content=?, image=?, tag=?, author=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [title ?? blog.title, slug ?? blog.slug, excerpt ?? blog.excerpt, content ?? blog.content,
     image ?? blog.image, tag ?? blog.tag, author ?? blog.author, status ?? blog.status, req.params.id]
  );
  const updated = await get('SELECT * FROM blogs WHERE id = ?', [req.params.id]);
  res.json(toBlogResponse(updated));
}));

router.delete('/:id', requireAuth, requirePermission('blogs', 'delete'), asyncHandler(async (req, res) => {
  const result = await run('DELETE FROM blogs WHERE id = ?', [req.params.id]);
  if (!result.changes) return res.status(404).json({ message: 'Không tìm thấy bài viết.' });
  res.json({ message: 'Đã xóa bài viết.', id: Number(req.params.id) });
}));

module.exports = router;
