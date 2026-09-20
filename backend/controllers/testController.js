const db = require('../config/database');
const ScoringService = require('../services/scoringService');
const MistakeService = require('../services/mistakeService');

class TestController {
  // GET /api/tests
  static async getAllTests(req, res, next) {
    try {
      const tests = await db.all(`
        SELECT t.*, 
               (SELECT score FROM attempts WHERE set_id = t.id ORDER BY id DESC LIMIT 1) as latest_score,
               (SELECT accuracy FROM attempts WHERE set_id = t.id ORDER BY id DESC LIMIT 1) as latest_accuracy,
               (SELECT COUNT(*) FROM attempts WHERE set_id = t.id) as attempt_count
        FROM test_sets t
        ORDER BY t.id ASC
      `);

      res.json({ success: true, data: tests });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/tests/:id
  static async getTestById(req, res, next) {
    try {
      const setId = parseInt(req.params.id, 10);
      const test = await db.get(`SELECT * FROM test_sets WHERE id = ?`, [setId]);
      if (!test) {
        return res.status(404).json({ success: false, message: 'Test set not found' });
      }

      const questions = await db.all(`
        SELECT id, set_id, qnum, section, question_text, 
               option_a, option_b, option_c, option_d, 
               correct_option, has_diagram, diagram_img, card_img
        FROM questions
        WHERE set_id = ?
        ORDER BY qnum ASC
      `, [setId]);

      // Format questions for CBT engine
      const formattedQuestions = questions.map((q) => ({
        id: q.qnum,
        db_id: q.id,
        section: q.section,
        question: q.question_text,
        options: {
          A: q.option_a,
          B: q.option_b,
          C: q.option_c,
          D: q.option_d
        },
        correct: q.correct_option,
        has_diagram: !!q.has_diagram,
        diagram_img: q.diagram_img,
        card_img: q.card_img
      }));

      res.json({
        success: true,
        data: {
          test,
          questions: formattedQuestions
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/tests/:id/submit
  static async submitTest(req, res, next) {
    try {
      const setId = parseInt(req.params.id, 10);
      const { responses, timeSpentSeconds, candidateId } = req.body;

      // 1. Fetch official questions
      const questions = await db.all(`
        SELECT id, set_id, qnum, section, correct_option 
        FROM questions 
        WHERE set_id = ? 
        ORDER BY qnum ASC
      `, [setId]);

      if (!questions.length) {
        return res.status(404).json({ success: false, message: 'Test not found' });
      }

      // 2. Evaluate with Scoring Engine
      const evaluation = ScoringService.evaluate(questions, responses || {});

      // 3. Persist Attempt
      const attemptRes = await db.run(`
        INSERT INTO attempts 
        (set_id, candidate_id, started_at, submitted_at, score, correct_count, wrong_count, unattempted_count, accuracy, time_spent_seconds)
        VALUES (?, ?, datetime('now', '-90 minutes'), CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)
      `, [
        setId,
        candidateId || 'Candidate #2602',
        evaluation.score,
        evaluation.correct_count,
        evaluation.wrong_count,
        evaluation.unattempted_count,
        evaluation.accuracy,
        timeSpentSeconds || 0
      ]);

      const attemptId = attemptRes.lastID;

      // 4. Persist individual responses
      for (const r of evaluation.evaluated_responses) {
        await db.run(`
          INSERT INTO attempt_responses (attempt_id, question_id, selected_option, is_correct, status, time_spent)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          attemptId,
          r.question_id,
          r.selected_option,
          r.is_correct,
          r.status,
          r.time_spent
        ]);
      }

      // 5. Automatically sync mistakes into Mistakes Notebook
      await MistakeService.syncMistakes(evaluation.evaluated_responses, setId);

      // 6. Remove active in-progress session if any
      await db.run(`DELETE FROM active_sessions WHERE set_id = ?`, [setId]);

      res.json({
        success: true,
        data: {
          attempt_id: attemptId,
          set_id: setId,
          ...evaluation
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/tests/attempts/:id
  static async getAttemptResult(req, res, next) {
    try {
      const attemptId = parseInt(req.params.id, 10);
      const attempt = await db.get(`
        SELECT a.*, t.title as test_title, t.date_str, t.time_str
        FROM attempts a
        JOIN test_sets t ON a.set_id = t.id
        WHERE a.id = ?
      `, [attemptId]);

      if (!attempt) {
        return res.status(404).json({ success: false, message: 'Attempt not found' });
      }

      const responses = await db.all(`
        SELECT ar.*, q.qnum, q.section, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
               q.correct_option, q.has_diagram, q.diagram_img, q.card_img
        FROM attempt_responses ar
        JOIN questions q ON ar.question_id = q.id
        WHERE ar.attempt_id = ?
        ORDER BY q.qnum ASC
      `, [attemptId]);

      res.json({
        success: true,
        data: {
          attempt,
          responses
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/tests/:id/session (Auto-save in real time)
  static async saveSession(req, res, next) {
    try {
      const setId = parseInt(req.params.id, 10);
      const { currentQIndex, timeRemaining, responses, candidateId, isCustomQuiz, quizData } = req.body;

      await db.run(`
        INSERT INTO active_sessions 
        (set_id, candidate_id, current_q_index, time_remaining, responses_json, is_custom_quiz, quiz_data_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(set_id) DO UPDATE SET
          current_q_index = excluded.current_q_index,
          time_remaining = excluded.time_remaining,
          responses_json = excluded.responses_json,
          is_custom_quiz = excluded.is_custom_quiz,
          quiz_data_json = excluded.quiz_data_json,
          updated_at = CURRENT_TIMESTAMP
      `, [
        setId,
        candidateId || 'Candidate #2602',
        currentQIndex || 0,
        timeRemaining !== undefined ? timeRemaining : 5400,
        JSON.stringify(responses || {}),
        isCustomQuiz ? 1 : 0,
        quizData ? JSON.stringify(quizData) : null
      ]);

      res.json({ success: true, message: 'Session auto-saved' });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/tests/:id/session (Resume in-progress test)
  static async getSession(req, res, next) {
    try {
      const setId = parseInt(req.params.id, 10);
      const session = await db.get(`SELECT * FROM active_sessions WHERE set_id = ?`, [setId]);

      if (!session) {
        return res.json({ success: true, has_session: false });
      }

      res.json({
        success: true,
        has_session: true,
        data: {
          set_id: session.set_id,
          candidate_id: session.candidate_id,
          current_q_index: session.current_q_index,
          time_remaining: session.time_remaining,
          responses: JSON.parse(session.responses_json || '{}'),
          is_custom_quiz: !!session.is_custom_quiz,
          quiz_data: session.quiz_data_json ? JSON.parse(session.quiz_data_json) : null,
          updated_at: session.updated_at
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/tests/:id/session
  static async clearSession(req, res, next) {
    try {
      const setId = parseInt(req.params.id, 10);
      await db.run(`DELETE FROM active_sessions WHERE set_id = ?`, [setId]);
      res.json({ success: true, message: 'Session cleared' });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/sessions (All active sessions for dashboard indicators)
  static async getAllSessions(req, res, next) {
    try {
      const sessions = await db.all(`
        SELECT s.set_id, s.current_q_index, s.time_remaining, s.updated_at, s.is_custom_quiz,
               t.title as set_title
        FROM active_sessions s
        LEFT JOIN test_sets t ON s.set_id = t.id
        ORDER BY s.updated_at DESC
      `);
      res.json({ success: true, data: sessions });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = TestController;
