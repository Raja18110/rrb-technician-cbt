const db = require('../config/database');

class NotesController {
  // GET /api/bookmarks
  static async getBookmarks(req, res, next) {
    try {
      const bookmarks = await db.all(`
        SELECT b.*, q.qnum, q.section, q.question_text, q.correct_option, q.card_img, t.title as test_title
        FROM bookmarks b
        JOIN questions q ON b.question_id = q.id
        JOIN test_sets t ON q.set_id = t.id
        ORDER BY b.created_at DESC
      `);
      res.json({ success: true, data: bookmarks });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/bookmarks/toggle
  static async toggleBookmark(req, res, next) {
    try {
      const { questionId, note, tag } = req.body;
      const existing = await db.get(`SELECT question_id FROM bookmarks WHERE question_id = ?`, [questionId]);

      if (existing) {
        await db.run(`DELETE FROM bookmarks WHERE question_id = ?`, [questionId]);
        res.json({ success: true, bookmarked: false, message: 'Bookmark removed' });
      } else {
        await db.run(
          `INSERT INTO bookmarks (question_id, user_note, tag, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
          [questionId, note || '', tag || 'Revision']
        );
        res.json({ success: true, bookmarked: true, message: 'Question bookmarked' });
      }
    } catch (err) {
      next(err);
    }
  }

  // POST /api/bookmarks/note
  static async saveNote(req, res, next) {
    try {
      const { questionId, note } = req.body;
      await db.run(`UPDATE bookmarks SET user_note = ? WHERE question_id = ?`, [note, questionId]);
      res.json({ success: true, message: 'Note updated' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = NotesController;
