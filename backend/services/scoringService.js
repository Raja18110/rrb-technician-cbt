// Scoring Engine adhering strictly to official RRB Railway Examination Scheme
class ScoringService {
  static evaluate(questions, responses) {
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalUnattempted = 0;

    const sectionBreakdown = {
      "General Science": { total: 40, correct: 0, wrong: 0, unattempted: 0, score: 0 },
      "Mathematics": { total: 25, correct: 0, wrong: 0, unattempted: 0, score: 0 },
      "General Intelligence & Reasoning": { total: 25, correct: 0, wrong: 0, unattempted: 0, score: 0 },
      "General Awareness": { total: 10, correct: 0, wrong: 0, unattempted: 0, score: 0 }
    };

    const evaluatedResponses = [];

    questions.forEach((q) => {
      const resp = responses[q.qnum] || responses[q.id] || null;
      const userOpt = resp && resp.option ? resp.option.toUpperCase() : null;
      const officialCorrect = q.correct_option ? q.correct_option.toUpperCase() : null;
      const sec = q.section;

      let isCorrect = false;
      let isWrong = false;

      if (!sectionBreakdown[sec]) {
        sectionBreakdown[sec] = { total: 0, correct: 0, wrong: 0, unattempted: 0, score: 0 };
      }

      if (userOpt) {
        if (userOpt === officialCorrect) {
          isCorrect = true;
          totalCorrect++;
          sectionBreakdown[sec].correct++;
          sectionBreakdown[sec].score += 1.0;
        } else {
          isWrong = true;
          totalWrong++;
          sectionBreakdown[sec].wrong++;
          sectionBreakdown[sec].score -= (1.0 / 3.0);
        }
      } else {
        totalUnattempted++;
        sectionBreakdown[sec].unattempted++;
      }

      evaluatedResponses.push({
        question_id: q.id,
        qnum: q.qnum,
        section: sec,
        selected_option: userOpt,
        correct_option: officialCorrect,
        is_correct: isCorrect ? 1 : 0,
        is_wrong: isWrong ? 1 : 0,
        status: resp ? resp.status : 'not-visited',
        time_spent: resp ? resp.timeSpent || 0 : 0
      });
    });

    const netScore = totalCorrect * 1.0 - totalWrong * (1.0 / 3.0);
    const totalAttempted = totalCorrect + totalWrong;
    const accuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

    return {
      score: Math.round(netScore * 100) / 100,
      total_attempted: totalAttempted,
      correct_count: totalCorrect,
      wrong_count: totalWrong,
      unattempted_count: totalUnattempted,
      accuracy: Math.round(accuracy * 10) / 10,
      section_breakdown: sectionBreakdown,
      evaluated_responses: evaluatedResponses
    };
  }
}

module.exports = ScoringService;
