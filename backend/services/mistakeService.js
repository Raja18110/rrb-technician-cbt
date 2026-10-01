const db = require('../config/database');

class MistakeService {
  /**
   * Automatically process evaluated responses from a test submission
   * Logs incorrect questions into the mistakes notebook
   */
  static async syncMistakes(evaluatedResponses, setId, candidateId = 'Rohit Kumar') {
    for (const r of evaluatedResponses) {
      if (r.is_wrong) {
        // Upsert into mistakes_notebook
        await db.run(
          `INSERT INTO mistakes_notebook (question_id, set_id, candidate_id, error_count, last_attempted_at, mastery_status)
           VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, 'NEEDS_PRACTICE')
           ON CONFLICT(question_id) DO UPDATE SET
             candidate_id = excluded.candidate_id,
             error_count = error_count + 1,
             last_attempted_at = CURRENT_TIMESTAMP,
             mastery_status = 'NEEDS_PRACTICE'`,
          [r.question_id, setId, candidateId]
        );
      } else if (r.is_correct) {
        // If solved correctly, mark as REVISED or MASTERED
        await db.run(
          `UPDATE mistakes_notebook 
           SET mastery_status = 'MASTERED',
               candidate_id = ?
           WHERE question_id = ?`,
          [candidateId, r.question_id]
        );
      }
    }
  }

  static async getMistakesList(filterStatus = null, candidateId = 'Rohit Kumar') {
    const cId = (candidateId && candidateId.trim()) || 'Rohit Kumar';
    let sql = `
      SELECT m.question_id, m.set_id, m.candidate_id, m.error_count, m.last_attempted_at, m.mastery_status,
             q.qnum, q.section, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
             q.correct_option, q.has_diagram, q.diagram_img, q.card_img,
             q.stem_img, q.opt1_img, q.opt2_img, q.opt3_img, q.opt4_img,
             t.title as set_title
      FROM mistakes_notebook m
      JOIN questions q ON m.question_id = q.id
      JOIN test_sets t ON m.set_id = t.id
    `;
    const conditions = [];
    const params = [];
    if (filterStatus) {
      conditions.push('m.mastery_status = ?');
      params.push(filterStatus);
    }
    if (cId) {
      conditions.push('m.candidate_id = ?');
      params.push(cId);
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
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
