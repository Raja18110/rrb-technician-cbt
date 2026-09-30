// Scoring Engine adhering strictly to official RRB Railway Examination Scheme
class ScoringService {
  static evaluate(questions, responses) {
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalUnattempted = 0;
    const evaluatedResponses = [];

    const sectionBreakdown = {
      "General Science": { total: 40, correct: 0, wrong: 0, unattempted: 0, score: 0 },
      "Mathematics": { total: 25, correct: 0, wrong: 0, unattempted: 0, score: 0 },
      "General Intelligence & Reasoning": { total: 25, correct: 0, wrong: 0, unattempted: 0, score: 0 },
      "General Awareness": { total: 10, correct: 0, wrong: 0, unattempted: 0, score: 0 }
    };

    // Normalize responses into a lookup map by question id and qnum
    const responseMap = {};
    if (Array.isArray(responses)) {
      responses.forEach((r) => {
        if (!r) return;
        if (r.question_id !== undefined) responseMap[r.question_id] = r;
        if (r.qnum !== undefined) responseMap[r.qnum] = r;
        if (r.id !== undefined) responseMap[r.id] = r;
      });
    } else if (responses && typeof responses === 'object') {
      Object.keys(responses).forEach((k) => {
        responseMap[k] = responses[k];
      });
    }

    questions.forEach((q) => {
      const resp = responseMap[q.qnum] !== undefined ? responseMap[q.qnum] : (responseMap[q.id] !== undefined ? responseMap[q.id] : null);
      let rawOpt = null;
      let respStatus = 'not-visited';
      let timeSpent = 0;

      if (resp) {
        if (typeof resp === 'string') {
          rawOpt = resp;
          respStatus = 'answered';
        } else if (typeof resp === 'object') {
          rawOpt = resp.option || resp.selected_option || resp.selectedOption || null;
          respStatus = resp.status || (rawOpt ? 'answered' : 'not-answered');
          timeSpent = resp.timeSpent || resp.time_spent || 0;
        }
      }

      // Normalize option to A, B, C, D
      let userOpt = null;
      if (rawOpt) {
        const s = String(rawOpt).trim().toUpperCase();
        if (['A', 'B', 'C', 'D'].includes(s)) {
          userOpt = s;
        } else if (['1', '2', '3', '4'].includes(s)) {
          userOpt = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' }[s];
        } else {
          userOpt = s;
        }
      }

      const officialCorrect = q.correct_option ? String(q.correct_option).trim().toUpperCase() : null;
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
        status: respStatus,
        time_spent: timeSpent
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
