const db = require('../config/database');

class AnalyticsController {
  // GET /api/analytics/summary
  static async getSummary(req, res, next) {
    try {
      const overall = await db.get(`
        SELECT 
          COUNT(id) as total_tests_taken,
          COALESCE(AVG(score), 0.0) as average_score,
          COALESCE(MAX(score), 0.0) as highest_score,
          COALESCE(AVG(accuracy), 0.0) as average_accuracy,
          COALESCE(SUM(time_spent_seconds), 0) as total_study_time
        FROM attempts
      `);

      // Section-wise accuracy analysis from all attempt responses
      const sectionPerformance = await db.all(`
        SELECT 
          q.section,
          COUNT(ar.id) as total_attempted,
          SUM(ar.is_correct) as total_correct,
          ROUND(CAST(SUM(ar.is_correct) AS REAL) * 100.0 / COUNT(ar.id), 1) as accuracy
        FROM attempt_responses ar
        JOIN questions q ON ar.question_id = q.id
        WHERE ar.selected_option IS NOT NULL
        GROUP BY q.section
      `);

      // Score progression (recent 10 attempts)
      const scoreTrend = await db.all(`
        SELECT a.id, a.set_id, a.score, a.accuracy, a.submitted_at, t.title
        FROM attempts a
        JOIN test_sets t ON a.set_id = t.id
        ORDER BY a.id ASC
        LIMIT 10
      `);

      // Mistakes notebook count
      const mistakesStats = await db.get(`
        SELECT 
          COUNT(*) as total_mistakes,
          SUM(CASE WHEN mastery_status = 'NEEDS_PRACTICE' THEN 1 ELSE 0 END) as pending_review,
          SUM(CASE WHEN mastery_status = 'MASTERED' THEN 1 ELSE 0 END) as mastered
        FROM mistakes_notebook
      `);

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
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AnalyticsController;
