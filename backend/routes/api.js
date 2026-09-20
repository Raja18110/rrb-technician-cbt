const express = require('express');
const router = express.Router();

const TestController = require('../controllers/testController');
const AnalyticsController = require('../controllers/analyticsController');
const NotesController = require('../controllers/notesController');
const MistakeService = require('../services/mistakeService');
const QuizGenerator = require('../services/quizGenerator');

// --- TESTS & CBT ---
router.get('/tests', TestController.getAllTests);
router.get('/tests/:id', TestController.getTestById);
router.post('/tests/:id/submit', TestController.submitTest);
router.get('/tests/attempts/:id', TestController.getAttemptResult);

// --- REAL-TIME SESSIONS ---
router.get('/sessions', TestController.getAllSessions);
router.get('/tests/:id/session', TestController.getSession);
router.post('/tests/:id/session', TestController.saveSession);
router.delete('/tests/:id/session', TestController.clearSession);

// --- ANALYTICS ---
router.get('/analytics/summary', AnalyticsController.getSummary);

// --- MISTAKES NOTEBOOK ---
router.get('/mistakes', async (req, res, next) => {
  try {
    const list = await MistakeService.getMistakesList(req.query.status);
    res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    next(err);
  }
});

router.put('/mistakes/:id', async (req, res, next) => {
  try {
    const questionId = parseInt(req.params.id, 10);
    const { status } = req.body; // 'NEEDS_PRACTICE' | 'REVISED' | 'MASTERED'
    await MistakeService.updateStatus(questionId, status);
    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    next(err);
  }
});

// --- CUSTOM QUIZ GENERATOR ---
router.post('/quiz/custom', async (req, res, next) => {
  try {
    const { mode, section, count } = req.body;
    const questions = await QuizGenerator.generateQuiz({
      mode: mode || 'section',
      section: section || null,
      count: parseInt(count, 10) || 25
    });
    res.json({
      success: true,
      data: {
        title: `Custom Practice Quiz (${mode === 'mistakes' ? 'Mistakes Notebook' : section || 'Mixed'})`,
        total_questions: questions.length,
        duration_minutes: Math.round(questions.length * 0.9), // ~54 seconds per question
        questions
      }
    });
  } catch (err) {
    next(err);
  }
});

// --- BOOKMARKS & NOTES ---
router.get('/bookmarks', NotesController.getBookmarks);
router.post('/bookmarks/toggle', NotesController.toggleBookmark);
router.post('/bookmarks/note', NotesController.saveNote);

module.exports = router;
