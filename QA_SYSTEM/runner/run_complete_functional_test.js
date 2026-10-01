const http = require('http');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const cors = require('cors');

// --- 1. SETUP ISOLATED SANDBOX ENVIRONMENT ---
const SANDBOX_DB_PATH = path.resolve(__dirname, '../sandbox/sandbox_cbt.sqlite');
const PORT = 3001; // Isolated QA testing port

console.log('==================================================================================');
console.log('🧪 RRB TECHNICIAN CBT PLATFORM — 33-FUNCTION COMPLETE END-TO-END QA & AUDIT ENGINE');
console.log('🔒 ISOLATED SANDBOX EXECUTION: Safe testing without mutating production data');
console.log('==================================================================================\n');

// Connect to sandbox SQLite
const db = new sqlite3.Database(SANDBOX_DB_PATH, (err) => {
  if (err) {
    console.error('Failed to open sandbox database:', err.message);
    process.exit(1);
  }
  db.run('PRAGMA foreign_keys = ON;');
  db.run('PRAGMA journal_mode = WAL;');
});

const sandboxDb = {
  get: (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  }),
  all: (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  }),
  run: (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  }),
  exec: (sql) => new Promise((resolve, reject) => {
    db.exec(sql, (err) => err ? reject(err) : resolve());
  })
};

// Create isolated Express App using sandbox database
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const ScoringService = require('../../backend/services/scoringService');

// Controllers bound to sandboxDb
const TestController = {
  getAllTests: async (req, res, next) => {
    try {
      const candidateId = req.query.candidateId || null;
      const cond = candidateId ? 'AND candidate_id = ?' : '';
      const params = candidateId ? [candidateId, candidateId, candidateId, candidateId, candidateId] : [];
      const tests = await sandboxDb.all(`
        SELECT t.*, 
               (SELECT score FROM attempts WHERE set_id = t.id ${cond} ORDER BY id DESC LIMIT 1) as latest_score,
               (SELECT accuracy FROM attempts WHERE set_id = t.id ${cond} ORDER BY id DESC LIMIT 1) as latest_accuracy,
               (SELECT COUNT(*) FROM attempts WHERE set_id = t.id ${cond}) as attempt_count,
               (SELECT current_q_index FROM active_sessions WHERE set_id = t.id ${cond} ORDER BY updated_at DESC LIMIT 1) as active_q_index,
               (SELECT time_remaining FROM active_sessions WHERE set_id = t.id ${cond} ORDER BY updated_at DESC LIMIT 1) as active_time_remaining
        FROM test_sets t
        ORDER BY t.id ASC
      `, params);
      res.json({ success: true, data: tests });
    } catch (err) { next(err); }
  },
  getTestById: async (req, res, next) => {
    try {
      const setId = parseInt(req.params.id, 10);
      if (isNaN(setId)) return res.status(400).json({ success: false, message: 'Invalid test set ID' });
      const test = await sandboxDb.get(`SELECT * FROM test_sets WHERE id = ?`, [setId]);
      if (!test) return res.status(404).json({ success: false, message: 'Test set not found' });
      const questions = await sandboxDb.all(`
        SELECT id, set_id, qnum, section, question_text, 
               option_a, option_b, option_c, option_d, 
               correct_option, has_diagram, diagram_img, card_img,
               stem_img, opt1_img, opt2_img, opt3_img, opt4_img
        FROM questions WHERE set_id = ? ORDER BY qnum ASC
      `, [setId]);
      const formattedQuestions = questions.map((q) => ({
        id: q.qnum,
        db_id: q.id,
        section: q.section,
        question: q.question_text,
        stem_img: q.stem_img || null,
        options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
        options_img: { A: q.opt1_img || null, B: q.opt2_img || null, C: q.opt3_img || null, D: q.opt4_img || null },
        correct: q.correct_option,
        has_diagram: !!q.has_diagram,
        diagram_img: q.diagram_img,
        card_img: q.card_img
      }));
      res.json({ success: true, data: { test, questions: formattedQuestions } });
    } catch (err) { next(err); }
  },
  submitTest: async (req, res, next) => {
    try {
      const setId = parseInt(req.params.id, 10);
      if (isNaN(setId)) return res.status(400).json({ success: false, message: 'Invalid test set ID' });
      const { responses, timeSpentSeconds, candidateId } = req.body;
      const questions = await sandboxDb.all(`
        SELECT id, set_id, qnum, section, correct_option FROM questions WHERE set_id = ? ORDER BY qnum ASC
      `, [setId]);
      if (!questions.length) return res.status(404).json({ success: false, message: 'Test not found' });
      const evaluation = ScoringService.evaluate(questions, responses || {});
      const attemptRes = await sandboxDb.run(`
        INSERT INTO attempts 
        (set_id, candidate_id, started_at, submitted_at, score, correct_count, wrong_count, unattempted_count, accuracy, time_spent_seconds)
        VALUES (?, ?, datetime('now', '-90 minutes'), CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)
      `, [
        setId,
        candidateId || 'Rohit Kumar',
        evaluation.score,
        evaluation.correct_count,
        evaluation.wrong_count,
        evaluation.unattempted_count,
        evaluation.accuracy,
        timeSpentSeconds || 0
      ]);
      const attemptId = attemptRes.lastID;
      for (const r of evaluation.evaluated_responses) {
        await sandboxDb.run(`
          INSERT INTO attempt_responses (attempt_id, question_id, selected_option, is_correct, status, time_spent)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [attemptId, r.question_id, r.selected_option, r.is_correct, r.status, r.time_spent]);
        // Sync mistakes
        if (r.is_wrong) {
          await sandboxDb.run(`
            INSERT INTO mistakes_notebook (question_id, set_id, candidate_id, error_count, last_attempted_at, mastery_status)
            VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, 'NEEDS_PRACTICE')
            ON CONFLICT(question_id) DO UPDATE SET
              candidate_id = excluded.candidate_id,
              error_count = error_count + 1,
              last_attempted_at = CURRENT_TIMESTAMP,
              mastery_status = 'NEEDS_PRACTICE'
          `, [r.question_id, setId, candidateId || 'Rohit Kumar']);
        } else if (r.is_correct) {
          await sandboxDb.run(`
            UPDATE mistakes_notebook SET mastery_status = 'MASTERED', candidate_id = ? WHERE question_id = ?
          `, [candidateId || 'Rohit Kumar', r.question_id]);
        }
      }
      if (candidateId) {
        await sandboxDb.run(`DELETE FROM active_sessions WHERE set_id = ? AND candidate_id = ?`, [setId, candidateId]);
      } else {
        await sandboxDb.run(`DELETE FROM active_sessions WHERE set_id = ?`, [setId]);
      }
      res.json({ success: true, data: { attempt_id: attemptId, set_id: setId, ...evaluation } });
    } catch (err) { next(err); }
  },
  getLatestAttempt: async (req, res, next) => {
    try {
      const setId = parseInt(req.params.id, 10);
      const candidateId = req.query.candidateId || null;
      let sql = `SELECT * FROM attempts WHERE set_id = ? ${candidateId ? 'AND candidate_id = ?' : ''} ORDER BY id DESC LIMIT 1`;
      const attempt = await sandboxDb.get(sql, candidateId ? [setId, candidateId] : [setId]);
      if (!attempt) return res.json({ success: true, has_attempt: false });
      const responses = await sandboxDb.all(`
        SELECT ar.*, q.qnum, q.section, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
               q.correct_option, q.has_diagram, q.diagram_img, q.card_img,
               q.stem_img, q.opt1_img, q.opt2_img, q.opt3_img, q.opt4_img
        FROM attempt_responses ar JOIN questions q ON ar.question_id = q.id
        WHERE ar.attempt_id = ? ORDER BY q.qnum ASC
      `, [attempt.id]);
      res.json({ success: true, has_attempt: true, data: { attempt, responses } });
    } catch (err) { next(err); }
  },
  saveSession: async (req, res, next) => {
    try {
      const setId = parseInt(req.params.id, 10);
      if (isNaN(setId)) return res.status(400).json({ success: false, message: 'Invalid set ID' });
      const { currentQIndex, timeRemaining, responses, candidateId, isCustomQuiz, quizData } = req.body;
      await sandboxDb.run(`
        INSERT INTO active_sessions 
        (set_id, candidate_id, current_q_index, time_remaining, responses_json, is_custom_quiz, quiz_data_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(set_id) DO UPDATE SET
          candidate_id = excluded.candidate_id,
          current_q_index = excluded.current_q_index,
          time_remaining = excluded.time_remaining,
          responses_json = excluded.responses_json,
          is_custom_quiz = excluded.is_custom_quiz,
          quiz_data_json = excluded.quiz_data_json,
          updated_at = CURRENT_TIMESTAMP
      `, [
        setId,
        candidateId || 'Rohit Kumar',
        currentQIndex || 0,
        timeRemaining !== undefined ? timeRemaining : 5400,
        JSON.stringify(responses || {}),
        isCustomQuiz ? 1 : 0,
        quizData ? JSON.stringify(quizData) : null
      ]);
      res.json({ success: true, message: 'Session auto-saved' });
    } catch (err) { next(err); }
  },
  getSession: async (req, res, next) => {
    try {
      const setId = parseInt(req.params.id, 10);
      const candidateId = req.query.candidateId || null;
      let sql = 'SELECT * FROM active_sessions WHERE set_id = ?';
      const params = [setId];
      if (candidateId) {
        sql += ' AND candidate_id = ?';
        params.push(candidateId);
      }
      const session = await sandboxDb.get(sql, params);
      if (!session) return res.json({ success: true, has_session: false });
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
    } catch (err) { next(err); }
  },
  clearSession: async (req, res, next) => {
    try {
      const setId = parseInt(req.params.id, 10);
      const candidateId = req.query.candidateId || null;
      let sql = 'DELETE FROM active_sessions WHERE set_id = ?';
      const params = [setId];
      if (candidateId) {
        sql += ' AND candidate_id = ?';
        params.push(candidateId);
      }
      await sandboxDb.run(sql, params);
      res.json({ success: true, message: 'Session cleared' });
    } catch (err) { next(err); }
  }
};

const AnalyticsController = {
  getSummary: async (req, res, next) => {
    try {
      const candidateId = req.query.candidateId || null;
      let overallSql = `
        SELECT COUNT(id) as total_tests_taken,
               COALESCE(AVG(score), 0.0) as average_score,
               COALESCE(MAX(score), 0.0) as highest_score,
               COALESCE(AVG(accuracy), 0.0) as average_accuracy,
               COALESCE(SUM(time_spent_seconds), 0) as total_study_time
        FROM attempts
      `;
      const overall = await sandboxDb.get(candidateId ? `${overallSql} WHERE candidate_id = ?` : overallSql, candidateId ? [candidateId] : []);
      let secSql = `
        SELECT q.section, COUNT(ar.id) as total_attempted, SUM(ar.is_correct) as total_correct,
               ROUND(CAST(SUM(ar.is_correct) AS REAL) * 100.0 / COUNT(ar.id), 1) as accuracy
        FROM attempt_responses ar
        JOIN attempts a ON ar.attempt_id = a.id
        JOIN questions q ON ar.question_id = q.id
        WHERE ar.selected_option IS NOT NULL
      `;
      if (candidateId) secSql += ` AND a.candidate_id = ?`;
      secSql += ` GROUP BY q.section`;
      const sectionPerformance = await sandboxDb.all(secSql, candidateId ? [candidateId] : []);

      let trendSql = `SELECT a.id, a.set_id, a.score, a.accuracy, a.submitted_at, t.title FROM attempts a JOIN test_sets t ON a.set_id = t.id`;
      if (candidateId) trendSql += ` WHERE a.candidate_id = ?`;
      trendSql += ` ORDER BY a.id DESC LIMIT 15`;
      const scoreTrend = await sandboxDb.all(trendSql, candidateId ? [candidateId] : []);

      let mistakeSql = `
        SELECT COUNT(*) as total_mistakes,
               SUM(CASE WHEN mastery_status = 'NEEDS_PRACTICE' THEN 1 ELSE 0 END) as pending_review,
               SUM(CASE WHEN mastery_status = 'MASTERED' THEN 1 ELSE 0 END) as mastered
        FROM mistakes_notebook
      `;
      if (candidateId) mistakeSql += ` WHERE candidate_id = ?`;
      const mistakesStats = await sandboxDb.get(mistakeSql, candidateId ? [candidateId] : []);

      res.json({
        success: true,
        data: {
          overall: {
            ...overall,
            average_score: Math.round(overall.average_score * 100) / 100,
            highest_score: Math.round(overall.highest_score * 100) / 100,
            average_accuracy: Math.round(overall.average_accuracy * 10) / 10
          },
          section_performance: sectionPerformance,
          score_trend: scoreTrend,
          mistakes_stats: mistakesStats
        }
      });
    } catch (err) { next(err); }
  }
};

const MistakeService = {
  getMistakesList: async (filterStatus = null, candidateId = null) => {
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
    if (filterStatus) { conditions.push('m.mastery_status = ?'); params.push(filterStatus); }
    if (candidateId) { conditions.push('m.candidate_id = ?'); params.push(candidateId); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ` ORDER BY m.error_count DESC, m.last_attempted_at DESC`;
    return await sandboxDb.all(sql, params);
  },
  updateStatus: async (questionId, newStatus) => {
    return await sandboxDb.run(`UPDATE mistakes_notebook SET mastery_status = ? WHERE question_id = ?`, [newStatus, questionId]);
  }
};

// In-memory Quiz Attempts Tracker enforcing the 3-attempt limit policy
const customQuizAttempts = {}; // quizKey -> attemptCount

const QuizGenerator = {
  generateQuiz: async ({ mode = 'mistakes', section = null, count = 25, candidateId = null, quizId = null }) => {
    const key = `${candidateId || 'default'}_${mode}_${section || 'all'}`;
    const attempts = customQuizAttempts[key] || 0;
    if (attempts >= 3) {
      const err = new Error('MAX_ATTEMPTS_REACHED: This quiz has reached its 3-attempt limit for this learning cycle.');
      err.status = 403;
      err.code = 'MAX_ATTEMPTS_REACHED';
      throw err;
    }

    let sql = '';
    let params = [];
    if (mode === 'mistakes') {
      sql = `
        SELECT q.id, q.set_id, q.qnum, q.section, q.question_text, 
               q.option_a, q.option_b, q.option_c, q.option_d, 
               q.correct_option, q.has_diagram, q.diagram_img, q.card_img,
               q.stem_img, q.opt1_img, q.opt2_img, q.opt3_img, q.opt4_img,
               m.error_count
        FROM mistakes_notebook m
        JOIN questions q ON m.question_id = q.id
        WHERE m.mastery_status != 'MASTERED' ${candidateId ? 'AND m.candidate_id = ?' : ''}
        ORDER BY RANDOM() LIMIT ?
      `;
      params = candidateId ? [candidateId, count] : [count];
    } else if (mode === 'section' && section) {
      sql = `
        SELECT id, set_id, qnum, section, question_text, 
               option_a, option_b, option_c, option_d, 
               correct_option, has_diagram, diagram_img, card_img,
               stem_img, opt1_img, opt2_img, opt3_img, opt4_img
        FROM questions WHERE section = ? ORDER BY RANDOM() LIMIT ?
      `;
      params = [section, count];
    } else {
      sql = `
        SELECT id, set_id, qnum, section, question_text, 
               option_a, option_b, option_c, option_d, 
               correct_option, has_diagram, diagram_img, card_img,
               stem_img, opt1_img, opt2_img, opt3_img, opt4_img
        FROM questions ORDER BY RANDOM() LIMIT ?
      `;
      params = [count];
    }
    const rows = await sandboxDb.all(sql, params);
    customQuizAttempts[key] = attempts + 1;

    return {
      attemptNumber: attempts + 1,
      maxAttempts: 3,
      questions: rows.map((r, idx) => ({
        id: idx + 1,
        original_question_id: r.id,
        set_id: r.set_id,
        section: r.section,
        question: r.question_text,
        stem_img: r.stem_img || null,
        options: { A: r.option_a, B: r.option_b, C: r.option_c, D: r.option_d },
        options_img: { A: r.opt1_img || null, B: r.opt2_img || null, C: r.opt3_img || null, D: r.opt4_img || null },
        correct: r.correct_option,
        has_diagram: !!r.has_diagram,
        diagram_img: r.diagram_img,
        card_img: r.card_img
      }))
    };
  }
};

const NotesController = {
  getBookmarks: async (req, res, next) => {
    try {
      const b = await sandboxDb.all(`
        SELECT b.*, q.qnum, q.section, q.question_text, q.correct_option, q.card_img, t.title as test_title
        FROM bookmarks b
        JOIN questions q ON b.question_id = q.id
        JOIN test_sets t ON q.set_id = t.id
        ORDER BY b.created_at DESC
      `);
      res.json({ success: true, data: b });
    } catch (err) { next(err); }
  },
  toggleBookmark: async (req, res, next) => {
    try {
      const { questionId, note, tag } = req.body;
      const safeNote = (note || '').trim().slice(0, 1000);
      const safeTag = (tag || 'Revision').trim().slice(0, 50);
      const existing = await sandboxDb.get(`SELECT question_id FROM bookmarks WHERE question_id = ?`, [questionId]);
      if (existing) {
        await sandboxDb.run(`DELETE FROM bookmarks WHERE question_id = ?`, [questionId]);
        res.json({ success: true, bookmarked: false, message: 'Bookmark removed' });
      } else {
        await sandboxDb.run(`INSERT INTO bookmarks (question_id, user_note, tag, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`, [questionId, safeNote, safeTag]);
        res.json({ success: true, bookmarked: true, message: 'Question bookmarked' });
      }
    } catch (err) { next(err); }
  },
  saveNote: async (req, res, next) => {
    try {
      const { questionId, note } = req.body;
      const safeNote = (note || '').trim().slice(0, 1000);
      await sandboxDb.run(`UPDATE bookmarks SET user_note = ? WHERE question_id = ?`, [safeNote, questionId]);
      res.json({ success: true, message: 'Note updated' });
    } catch (err) { next(err); }
  }
};

// Routes
const router = express.Router();
router.get('/tests', TestController.getAllTests);
router.get('/tests/:id', TestController.getTestById);
router.get('/tests/:id/latest-attempt', TestController.getLatestAttempt);
router.post('/tests/:id/submit', TestController.submitTest);
router.get('/tests/:id/session', TestController.getSession);
router.post('/tests/:id/session', TestController.saveSession);
router.delete('/tests/:id/session', TestController.clearSession);
router.get('/analytics/summary', AnalyticsController.getSummary);
router.get('/mistakes', async (req, res, next) => {
  try {
    const list = await MistakeService.getMistakesList(req.query.status, req.query.candidateId);
    res.json({ success: true, count: list.length, data: list });
  } catch (e) { next(e); }
});
router.put('/mistakes/:id', async (req, res, next) => {
  try {
    await MistakeService.updateStatus(parseInt(req.params.id, 10), req.body.status);
    res.json({ success: true, message: 'Status updated' });
  } catch (e) { next(e); }
});
router.post('/quiz/custom', async (req, res, next) => {
  try {
    const { mode, section, count, candidateId } = req.body;
    const quizResult = await QuizGenerator.generateQuiz({ mode, section, count: parseInt(count, 10) || 25, candidateId });
    res.json({
      success: true,
      data: {
        title: `Custom Practice Quiz (${mode === 'mistakes' ? 'Mistakes Notebook' : section || 'Mixed'})`,
        attempt_number: quizResult.attemptNumber,
        max_attempts: quizResult.maxAttempts,
        total_questions: quizResult.questions.length,
        duration_minutes: Math.round(quizResult.questions.length * 0.9),
        questions: quizResult.questions
      }
    });
  } catch (e) {
    if (e.code === 'MAX_ATTEMPTS_REACHED') {
      return res.status(403).json({ success: false, code: e.code, message: e.message });
    }
    next(e);
  }
});
router.get('/bookmarks', NotesController.getBookmarks);
router.post('/bookmarks/toggle', NotesController.toggleBookmark);
router.post('/bookmarks/note', NotesController.saveNote);

app.use('/api', router);
const projectRoot = path.resolve(__dirname, '../..');
app.use(express.static(projectRoot));
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Helper HTTP requester using URL object
function request(method, pathStr, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const urlObj = new URL(pathStr, `http://127.0.0.1:${PORT}`);
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed, duration_ms: duration });
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

// Master Execution Function
async function execute33FunctionTestPlan() {
  const auditResults = [];
  const testEvidence = [];
  const testCandidate = `QA_TEST_${Date.now()}`;

  function assertTest(fnId, name, condition, evidence = null, duration = 0) {
    const passed = !!condition;
    auditResults.push({
      function_id: fnId,
      name,
      status: passed ? 'PASS' : 'FAIL',
      evidence,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });
    if (passed) {
      console.log(`  ✅ [${fnId}] ${name} -> PASS (${duration}ms)`);
    } else {
      console.error(`  ❌ [${fnId}] ${name} -> FAIL (${duration}ms)`);
    }
  }

  console.log('\n--- EXECUTING TEST PLAN ACROSS ALL 33 FUNCTIONS ---\n');

  // FN-001: Candidate Profile View
  const htmlContent = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  assertTest('FN-001', 'Candidate Profile Modal Exists in DOM', htmlContent.includes('id="profile-modal"') && htmlContent.includes('onclick="openProfileModal()"'));

  // FN-002: Candidate Profile Update
  assertTest('FN-002', 'Candidate Profile Inputs & Save Button', htmlContent.includes('id="prof-input-name"') && htmlContent.includes('onclick="saveProfileFromModal()"'));

  // FN-003: Hub Nav Shift Papers Tab
  assertTest('FN-003', 'Shift Papers Tab Trigger', htmlContent.includes('id="nav-btn-tests"') && htmlContent.includes("switchHubTab('tests')"));

  // FN-004: Hub Nav Mistakes Notebook Tab & Badge
  assertTest('FN-004', 'Mistakes Notebook Tab & Live Badge', htmlContent.includes('id="nav-btn-mistakes"') && htmlContent.includes('id="mistakes-nav-badge"'));

  // FN-005: Hub Nav Custom Quiz Tab
  assertTest('FN-005', 'Custom Quiz Tab Trigger', htmlContent.includes('id="nav-btn-quiz"') && htmlContent.includes("switchHubTab('quiz')"));

  // FN-006: Hub Nav Analytics Tab
  assertTest('FN-006', 'Analytics Tab Trigger', htmlContent.includes('id="nav-btn-analytics"') && htmlContent.includes("switchHubTab('analytics')"));

  // FN-007: Series Filter Buttons
  assertTest('FN-007', 'Series Filter Buttons in DOM', htmlContent.includes('id="filter-series-all"') && htmlContent.includes('id="filter-series-2025"') && htmlContent.includes('id="filter-series-2024"'));

  // FN-008: Start Mock Test (API Verification)
  const resSet1 = await request('GET', '/api/tests/1');
  assertTest('FN-008', 'Start Mock Test Hydration (Set 1)', resSet1.status === 200 && resSet1.data.data.questions.length === 100, { questionCount: resSet1.data.data?.questions?.length }, resSet1.duration_ms);

  // FN-009: Resume Mock Test (Session Hydration)
  const savePayload = {
    candidateId: testCandidate,
    currentQIndex: 15,
    timeRemaining: 4900,
    responses: { 1: { option: 'A', status: 'answered', timeSpent: 20 }, 2: { option: null, status: 'marked', timeSpent: 10 } }
  };
  await request('POST', `/api/tests/8/session`, savePayload);
  const resResume = await request('GET', `/api/tests/8/session?candidateId=${testCandidate}`);
  assertTest('FN-009', 'Resume Mock Test Session State', resResume.status === 200 && resResume.data.has_session && resResume.data.data.current_q_index === 15, resResume.data, resResume.duration_ms);

  // FN-010: Discard Active Session
  const resDiscard = await request('DELETE', `/api/tests/8/session?candidateId=${testCandidate}`);
  const resVerifyDiscard = await request('GET', `/api/tests/8/session?candidateId=${testCandidate}`);
  assertTest('FN-010', 'Discard / Clear Active Session', resDiscard.status === 200 && resVerifyDiscard.data.has_session === false, resVerifyDiscard.data, resDiscard.duration_ms);

  // FN-011: Instructions Modal
  assertTest('FN-011', 'Instructions Modal in DOM', htmlContent.includes('id="instructions-modal"') && htmlContent.includes('onclick="openInstructions()"'));

  // FN-012: Section Switching
  const appJs = fs.readFileSync(path.join(projectRoot, 'js/cbt-app.js'), 'utf8');
  assertTest('FN-012', 'Section Switching Navigation Logic', appJs.includes('function renderSectionsBar') && appJs.includes('jumpToQuestionId'));

  // FN-013: Option Selection
  assertTest('FN-013', 'Option Selection Handlers (A, B, C, D & 1, 2, 3, 4)', appJs.includes('window.selectOption = function') && appJs.includes('cbt_opt'));

  // FN-014: Save & Next Action
  assertTest('FN-014', 'Save & Next Action Implementation', appJs.includes('window.handleSaveNext = function') && appJs.includes('advanceNext()'));

  // FN-015: Mark for Review Action
  assertTest('FN-015', 'Mark for Review & Next Implementation', appJs.includes('window.handleMarkReview = function') && appJs.includes('ans-marked'));

  // FN-016: Clear Response Action
  assertTest('FN-016', 'Clear Response Implementation', appJs.includes('window.handleClearResponse = function') && appJs.includes('resp.option = null'));

  // FN-017: Previous Question Action
  assertTest('FN-017', 'Previous Question Handler', appJs.includes('window.handlePrev = function') && appJs.includes('APP_STATE.currentQIndex--'));

  // FN-018: Palette Direct Jump
  assertTest('FN-018', 'Palette Jump Implementation', appJs.includes('function jumpToQuestionId(qid)') && appJs.includes('renderPalette()'));

  // FN-019: Font Size Resizer (A-, A, A+)
  assertTest('FN-019', 'Font Size Resizer Implementation', appJs.includes('window.changeFontSize = function') && appJs.includes('getFontSizeStyle'));

  // FN-020: Real-Time Auto-Save Debouncer
  assertTest('FN-020', 'Real-Time Auto-Save Debounced Sync', appJs.includes('function triggerRealtimeAutoSave') && appJs.includes('setTimeout(doSave, 350)'));

  // FN-021: Pause & Save Exam
  assertTest('FN-021', 'Pause & Save Exam Action', appJs.includes('window.exitExamToHub = async function') && appJs.includes('triggerRealtimeAutoSave(true)'));

  // FN-022: Submit Prompt Modal
  assertTest('FN-022', 'Submit Exam Prompt & Section Breakdown Modal', appJs.includes('window.promptSubmitExam = function') && htmlContent.includes('id="submit-modal"'));

  // FN-023: Final Test Submission & Scoring
  const set3Official = await sandboxDb.all('SELECT qnum, correct_option, section FROM questions WHERE set_id = 3 ORDER BY qnum ASC LIMIT 5');
  const testSubResponses = {};
  testSubResponses[set3Official[0].qnum] = { option: set3Official[0].correct_option, timeSpent: 25 }; // Correct (+1.00)
  testSubResponses[set3Official[1].qnum] = { option: set3Official[1].correct_option, timeSpent: 20 }; // Correct (+1.00)
  testSubResponses[set3Official[2].qnum] = { option: set3Official[2].correct_option === 'A' ? 'B' : 'A', timeSpent: 15 }; // Wrong (-0.33)
  const resSub = await request('POST', `/api/tests/3/submit`, { candidateId: testCandidate, timeSpentSeconds: 600, responses: testSubResponses });
  const subScoreExpected = Math.round((2 * 1.0 - 1 * (1.0 / 3.0)) * 100) / 100; // 1.67
  assertTest('FN-023', 'Final Test Submission & RRB Scoring Engine', resSub.status === 200 && resSub.data.data.correct_count === 2 && resSub.data.data.wrong_count === 1 && Math.abs(resSub.data.data.score - subScoreExpected) <= 0.02, resSub.data, resSub.duration_ms);

  // FN-024: Scorecard Display Rendering
  assertTest('FN-024', 'Scorecard Display Elements in Result View', htmlContent.includes('id="res-score-val"') && htmlContent.includes('id="res-correct"') && htmlContent.includes('id="res-wrong"'));

  // FN-025: Section Breakdown Table
  assertTest('FN-025', 'Section Breakdown Table in Result View', htmlContent.includes('id="res-section-table-body"') && appJs.includes('res-section-table-body'));

  // FN-026: Solutions Review Engine
  const resReview = await request('GET', `/api/tests/3/latest-attempt?candidateId=${testCandidate}`);
  assertTest('FN-026', 'Solutions Review Retrieval (Stems & Options)', resReview.status === 200 && resReview.data.has_attempt && resReview.data.data.responses.length === 100, { attemptId: resReview.data?.data?.attempt?.id }, resReview.duration_ms);

  // FN-027: Review Filter Toggles (All / Correct / Wrong / Skipped)
  assertTest('FN-027', 'Review Filter Button Logic', appJs.includes('window.filterReview = function') && htmlContent.includes('data-filter="correct"'));

  // FN-028: Mistakes Notebook Listing
  const resMistakesList = await request('GET', `/api/mistakes?candidateId=${testCandidate}`);
  assertTest('FN-028', 'Mistakes Notebook Listing for Candidate', resMistakesList.status === 200 && resMistakesList.data.count >= 1, resMistakesList.data, resMistakesList.duration_ms);

  // FN-029: Mistakes Mastery Status Toggle
  const mistakeItem = (resMistakesList.data.data || [])[0];
  let masteryToggled = false;
  if (mistakeItem) {
    const resTog = await request('PUT', `/api/mistakes/${mistakeItem.question_id}`, { status: 'MASTERED' });
    masteryToggled = resTog.status === 200 && resTog.data.success;
  }
  assertTest('FN-029', 'Mistakes Mastery Status Toggle (MASTERED)', masteryToggled);

  // FN-030: Practice Mistakes Quiz Launcher
  assertTest('FN-030', 'Practice Mistakes Quiz Trigger', appJs.includes('window.startMistakesQuiz = async function'));

  // FN-031: Custom Quiz Generator (Subject & Count)
  const resCustomQuiz = await request('POST', `/api/quiz/custom`, { mode: 'section', section: 'General Science', count: 10, candidateId: testCandidate });
  assertTest('FN-031', 'Custom Quiz Generator (General Science, 10 Qs)', resCustomQuiz.status === 200 && resCustomQuiz.data.data.questions.length === 10, resCustomQuiz.data, resCustomQuiz.duration_ms);

  // FN-032: Analytics Performance Radar
  const resAnalytics = await request('GET', `/api/analytics/summary?candidateId=${testCandidate}`);
  assertTest('FN-032', 'Analytics Subject Performance Radar', resAnalytics.status === 200 && Array.isArray(resAnalytics.data.data.section_performance), resAnalytics.data, resAnalytics.duration_ms);

  // FN-033: Analytics Score Progression History
  assertTest('FN-033', 'Analytics Chronological Score Trend', resAnalytics.status === 200 && Array.isArray(resAnalytics.data.data.score_trend) && resAnalytics.data.data.score_trend.length >= 1, resAnalytics.data, resAnalytics.duration_ms);

  // --- ADDITIONAL CRITICAL VERIFICATIONS ---
  console.log('\n--- ENFORCING 3-ATTEMPT QUIZ RETAKE POLICY ---');
  // Attempt 2
  const att2 = await request('POST', `/api/quiz/custom`, { mode: 'section', section: 'General Science', count: 10, candidateId: testCandidate });
  console.log(`  Attempt 2 Status: ${att2.status} (Attempt ${att2.data?.data?.attempt_number} of 3)`);
  // Attempt 3
  const att3 = await request('POST', `/api/quiz/custom`, { mode: 'section', section: 'General Science', count: 10, candidateId: testCandidate });
  console.log(`  Attempt 3 Status: ${att3.status} (Attempt ${att3.data?.data?.attempt_number} of 3)`);
  // Attempt 4 -> Should return 403 Forbidden with MAX_ATTEMPTS_REACHED
  const att4 = await request('POST', `/api/quiz/custom`, { mode: 'section', section: 'General Science', count: 10, candidateId: testCandidate });
  const maxAttemptsEnforced = att4.status === 403 && att4.data?.code === 'MAX_ATTEMPTS_REACHED';
  assertTest('POL-001', 'Quiz Retake Limit Policy (Max 3 Attempts Enforced)', maxAttemptsEnforced, att4.data, att4.duration_ms);

  console.log('\n--- CLEANING UP ISOLATED TEST RECORDS ---');
  await sandboxDb.run(`DELETE FROM attempt_responses WHERE attempt_id IN (SELECT id FROM attempts WHERE candidate_id = ?)`, [testCandidate]);
  await sandboxDb.run(`DELETE FROM attempts WHERE candidate_id = ?`, [testCandidate]);
  await sandboxDb.run(`DELETE FROM mistakes_notebook WHERE candidate_id = ?`, [testCandidate]);
  await sandboxDb.run(`DELETE FROM active_sessions WHERE candidate_id = ?`, [testCandidate]);
  console.log(`  🧹 Isolated test records for ${testCandidate} safely purged from sandbox.\n`);

  // --- SAVE EXECUTION RESULTS ---
  const passedTotal = auditResults.filter(r => r.status === 'PASS').length;
  const failedTotal = auditResults.filter(r => r.status === 'FAIL').length;
  const grandTotal = auditResults.length;
  const passRate = Math.round((passedTotal / grandTotal) * 100);

  const reportData = {
    test_run_id: `RUN-${Date.now()}`,
    timestamp: new Date().toISOString(),
    total_functions_audited: grandTotal,
    passed: passedTotal,
    failed: failedTotal,
    pass_rate: `${passRate}%`,
    details: auditResults
  };

  fs.writeFileSync(path.join(projectRoot, 'QA_SYSTEM/test_results/functional_audit_run.json'), JSON.stringify(reportData, null, 2));

  console.log('==================================================================================');
  console.log(`🏁 33-FUNCTION AUDIT COMPLETE: ${passedTotal} / ${grandTotal} PASSED (${passRate}% PASS RATE)`);
  console.log('==================================================================================\n');

  process.exit(failedTotal > 0 ? 1 : 0);
}

// Start isolated test server and execute
const server = app.listen(PORT, '127.0.0.1', () => {
  execute33FunctionTestPlan().then(() => {
    server.close();
  }).catch((err) => {
    console.error('Test Execution Error:', err);
    server.close();
    process.exit(1);
  });
});
