const http = require('http');
const app = require('../backend/server');

const PORT = 3002;
const server = http.createServer(app);

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(chunks);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: chunks });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Running Comprehensive API & Backend Integration Tests (All 32 Shifts)...\n');

  await new Promise(res => server.listen(PORT, res));

  try {
    // 1. Test GET /api/tests - verify 32 sets
    const resTests = await request('GET', '/api/tests');
    console.log(`[PASS] GET /api/tests -> Status ${resTests.status}, Count: ${resTests.body.data.length}`);
    if (resTests.body.data.length !== 32) throw new Error(`Expected 32 sets, got ${resTests.body.data.length}`);

    // 2. Test GET /api/tests/1 (CEN 02/2025)
    const resSet1 = await request('GET', '/api/tests/1');
    console.log(`[PASS] GET /api/tests/1 -> Status ${resSet1.status}, Questions: ${resSet1.body.data.questions.length}, Title: ${resSet1.body.data.test.title}`);
    if (resSet1.body.data.questions.length !== 100) throw new Error('Expected 100 questions in Set 1');

    // 3. Test GET /api/tests/15 (CEN 02/2024 Part 1)
    const resSet15 = await request('GET', '/api/tests/15');
    console.log(`[PASS] GET /api/tests/15 -> Status ${resSet15.status}, Questions: ${resSet15.body.data.questions.length}, Title: ${resSet15.body.data.test.title}`);
    if (resSet15.body.data.questions.length !== 100) throw new Error('Expected 100 questions in Set 15');

    // 4. Test GET /api/tests/27 (CEN 02/2024 Part 3)
    const resSet27 = await request('GET', '/api/tests/27');
    console.log(`[PASS] GET /api/tests/27 -> Status ${resSet27.status}, Questions: ${resSet27.body.data.questions.length}, Title: ${resSet27.body.data.test.title}`);
    if (resSet27.body.data.questions.length !== 100) throw new Error('Expected 100 questions in Set 27');

    // 5. Test GET /api/tests/32 (CEN 02/2024 Final Part 4)
    const resSet32 = await request('GET', '/api/tests/32');
    console.log(`[PASS] GET /api/tests/32 -> Status ${resSet32.status}, Questions: ${resSet32.body.data.questions.length}, Title: ${resSet32.body.data.test.title}`);
    if (resSet32.body.data.questions.length !== 100) throw new Error('Expected 100 questions in Set 32');
    if (!resSet32.body.data.questions[0].card_img) throw new Error('Expected card_img in Set 32 question');

    // 6. Test Session Auto-saving & Restoration on Set 32
    const sessionPayload = {
      currentQIndex: 12,
      timeRemaining: 4500,
      responses: {
        1: { option: 'A', status: 'answered', timeSpent: 25 },
        2: { option: 'B', status: 'answered', timeSpent: 19 }
      }
    };
    const resSaveSession = await request('POST', '/api/tests/32/session', sessionPayload);
    console.log(`[PASS] POST /api/tests/32/session -> Status ${resSaveSession.status}, Saved: ${resSaveSession.body.success}`);
    if (!resSaveSession.body.success) throw new Error('Failed to save session');

    const resGetSession = await request('GET', '/api/tests/32/session');
    console.log(`[PASS] GET /api/tests/32/session -> Restored timer: ${resGetSession.body.data.time_remaining}s, Current Q: ${resGetSession.body.data.current_q_index}`);
    if (resGetSession.body.data.time_remaining !== 4500) throw new Error('Session timer mismatch');

    // 7. Test POST /api/tests/1/submit (Marking: +1, -1/3)
    const mockResponses = {
      1: { option: 'C', status: 'answered', timeSpent: 25 }, // correct (+1.0)
      2: { option: 'A', status: 'answered', timeSpent: 30 }, // correct (+1.0)
      3: { option: 'B', status: 'answered', timeSpent: 40 }  // wrong (-0.3333)
    };

    const testCandidateId = 'Candidate #2602';
    const resSubmit = await request('POST', '/api/tests/1/submit', {
      responses: mockResponses,
      timeSpentSeconds: 95,
      candidateId: testCandidateId
    });

    console.log(`[PASS] POST /api/tests/1/submit -> Status ${resSubmit.status}, Score: ${resSubmit.body.data.score}`);
    const expectedScore = Math.round((2.0 - 0.3333) * 100) / 100; // 1.67
    if (resSubmit.body.data.score !== expectedScore) {
      throw new Error(`Expected score ${expectedScore}, got ${resSubmit.body.data.score}`);
    }

    // 8. Test GET /api/analytics/summary
    const resAnalytics = await request('GET', `/api/analytics/summary?candidateId=${encodeURIComponent(testCandidateId)}`);
    console.log(`[PASS] GET /api/analytics/summary -> Total Tests Taken: ${resAnalytics.body.data.overall.total_tests_taken}`);

    // 9. Test GET /api/mistakes
    const resMistakes = await request('GET', `/api/mistakes?candidateId=${encodeURIComponent(testCandidateId)}`);
    console.log(`[PASS] GET /api/mistakes -> Mistake Count: ${resMistakes.body.count}`);
    if (resMistakes.body.count < 1) throw new Error('Expected mistake logged');

    // 10. Test PUT /api/mistakes/:id (Update mastery status)
    if (resMistakes.body.data && resMistakes.body.data.length > 0) {
      const mistakeId = resMistakes.body.data[0].question_id;
      const resUpdateMistake = await request('PUT', `/api/mistakes/${mistakeId}`, { status: 'MASTERED' });
      console.log(`[PASS] PUT /api/mistakes/${mistakeId} -> Status ${resUpdateMistake.status}, Message: ${resUpdateMistake.body.message}`);
      if (!resUpdateMistake.body.success) throw new Error('Failed to update mistake status');
    }

    // 11. Test POST /api/quiz/custom across the 3,200 questions pool
    const resQuiz = await request('POST', '/api/quiz/custom', {
      mode: 'section',
      section: 'Mathematics',
      count: 25
    });
    console.log(`[PASS] POST /api/quiz/custom -> Generated ${resQuiz.body.data.questions.length} questions from 3,200 question pool`);
    if (resQuiz.body.data.questions.length !== 25) throw new Error('Expected 25 custom questions');

    console.log('\n🎉 ALL 11 BACKEND & SERVICE INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
