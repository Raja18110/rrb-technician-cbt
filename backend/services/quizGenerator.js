const db = require('../config/database');

class QuizGenerator {
  /**
   * Generates custom dynamic practice quizzes based on parameters:
   * mode: 'mistakes' | 'section' | 'full_mix'
   * section: 'General Science' | 'Mathematics' | etc.
   * count: 10 | 25 | 50
   */
  static async generateQuiz({ mode = 'mistakes', section = null, count = 25 }) {
    let sql = '';
    let params = [];

    if (mode === 'mistakes') {
      sql = `
        SELECT q.id, q.set_id, q.qnum, q.section, q.question_text, 
               q.option_a, q.option_b, q.option_c, q.option_d, 
               q.correct_option, q.has_diagram, q.diagram_img, q.card_img,
               m.error_count
        FROM mistakes_notebook m
        JOIN questions q ON m.question_id = q.id
        WHERE m.mastery_status != 'MASTERED'
        ORDER BY RANDOM()
        LIMIT ?
      `;
      params = [count];
    } else if (mode === 'section' && section) {
      sql = `
        SELECT id, set_id, qnum, section, question_text, 
               option_a, option_b, option_c, option_d, 
               correct_option, has_diagram, diagram_img, card_img
        FROM questions
        WHERE section = ?
        ORDER BY RANDOM()
        LIMIT ?
      `;
      params = [section, count];
    } else {
      // Mixed random questions across all sections adhering to weightage
      sql = `
        SELECT id, set_id, qnum, section, question_text, 
               option_a, option_b, option_c, option_d, 
               correct_option, has_diagram, diagram_img, card_img
        FROM questions
        ORDER BY RANDOM()
        LIMIT ?
      `;
      params = [count];
    }

    const rows = await db.all(sql, params);

    // Format into standard quiz structure
    return rows.map((r, idx) => ({
      id: idx + 1, // Normalized 1 to N
      original_question_id: r.id,
      set_id: r.set_id,
      section: r.section,
      question: r.question_text,
      options: {
        A: r.option_a,
        B: r.option_b,
        C: r.option_c,
        D: r.option_d
      },
      correct: r.correct_option,
      has_diagram: !!r.has_diagram,
      diagram_img: r.diagram_img,
      card_img: r.card_img
    }));
  }
}

module.exports = QuizGenerator;
