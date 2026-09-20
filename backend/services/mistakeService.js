const db = require('../config/database');

class MistakeService {
  /**
   * Automatically process evaluated responses from a test submission
   * Logs incorrect questions into the mistakes notebook
   */
  static async syncMistakes(evaluatedResponses, setId) {
    for (const r of evaluatedResponses) {
      if (r.is_wrong) {
        // Upsert into mistakes_notebook
        await db.run(
          `INSERT INTO mistakes_notebook (question_id, set_id, error_count, last_attempted_at, mastery_status)
           VALUES (?, ?, 1, CURRENT_TIMESTAMP, 'NEEDS_PRACTICE')
           ON CONFLICT(question_id) DO UPDATE SET
             error_count = error_count + 1,
             last_attempted_at = CURRENT_TIMESTAMP,
             mastery_status = 'NEEDS_PRACTICE'`,
          [r.question_id, setId]
        );
      } else if (r.is_correct) {
        // If solved correctly, mark as REVISED or MASTERED
        await db.run(
          `UPDATE mistakes_notebook 
           SET mastery_status = 'MASTERED'
           WHERE question_id = ?`,
          [r.question_id]
        );
      }
    }
  }

  static async getMistakesList(filterStatus = null) {
    let sql = `
      SELECT m.question_id, m.set_id, m.error_count, m.last_attempted_at, m.mastery_status,
             q.qnum, q.section, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
             q.correct_option, q.has_diagram, q.diagram_img, q.card_img,
             t.title as set_title
      FROM mistakes_notebook m
      JOIN questions q ON m.question_id = q.id
      JOIN test_sets t ON m.set_id = t.id
    `;
    const params = [];
    if (filterStatus) {
      sql += ` WHERE m.mastery_status = ?`;
      params.push(filterStatus);
    }
    sql += ` ORDER BY m.error_count DESC, m.last_attempted_at DESC`;

    return await db.all(sql, params);
  }

  static async updateStatus(questionId, newStatus) {
    return await db.run(
      `UPDATE mistakes_notebook SET mastery_status = ? WHERE question_id = ?`,
      [newStatus, questionId]
    );
  }
}

module.exports = MistakeService;
