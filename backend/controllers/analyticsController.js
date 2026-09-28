const db = require('../config/database');

class AnalyticsController {
  // GET /api/analytics/summary
  static async getSummary(req, res, next) {
    try {
      const candidateId = req.query.candidateId || null;

      let overallSql = `
        SELECT 
          COUNT(id) as total_tests_taken,
          COALESCE(AVG(score), 0.0) as average_score,
          COALESCE(MAX(score), 0.0) as highest_score,
          COALESCE(AVG(accuracy), 0.0) as average_accuracy,
          COALESCE(SUM(time_spent_seconds), 0) as total_study_time
        FROM attempts
      `;
      const overallParams = [];
      if (candidateId) {
        overallSql += ` WHERE candidate_id = ?`;
        overallParams.push(candidateId);
      }
      const overall = await db.get(overallSql, overallParams);

      // Section-wise accuracy analysis from all attempt responses
      let secSql = `
        SELECT 
          q.section,
          COUNT(ar.id) as total_attempted,
          SUM(ar.is_correct) as total_correct,
          ROUND(CAST(SUM(ar.is_correct) AS REAL) * 100.0 / COUNT(ar.id), 1) as accuracy
        FROM attempt_responses ar
        JOIN attempts a ON ar.attempt_id = a.id
        JOIN questions q ON ar.question_id = q.id
        WHERE ar.selected_option IS NOT NULL
      `;
      const secParams = [];
      if (candidateId) {
        secSql += ` AND a.candidate_id = ?`;
        secParams.push(candidateId);
      }
      secSql += ` GROUP BY q.section`;
      const sectionPerformance = await db.all(secSql, secParams);

      // Score progression (recent 15 attempts)
      let trendSql = `
        SELECT a.id, a.set_id, a.score, a.accuracy, a.submitted_at, t.title
        FROM attempts a
        JOIN test_sets t ON a.set_id = t.id
      `;
      const trendParams = [];
      if (candidateId) {
        trendSql += ` WHERE a.candidate_id = ?`;
        trendParams.push(candidateId);
      }
      trendSql += ` ORDER BY a.id DESC LIMIT 15`;
      const scoreTrend = await db.all(trendSql, trendParams);

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
