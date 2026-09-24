const fs = require('fs');
const path = require('path');
const db = require('../backend/config/database');

const shiftMetadata = [
  // CEN 02/2025 Series (Sets 1 to 9)
  { id: 1, title: 'RRB Tech III - 06 Mar 2026 Shift 1', datetime: '06 Mar 2026 (9:00 AM - 10:30 AM)', series: 'CEN 02/2025' },
  { id: 2, title: 'RRB Tech III - 06 Mar 2026 Shift 2', datetime: '06 Mar 2026 (12:45 PM - 2:15 PM)', series: 'CEN 02/2025' },
  { id: 3, title: 'RRB Tech III - 06 Mar 2026 Shift 3', datetime: '06 Mar 2026 (4:30 PM - 6:00 PM)', series: 'CEN 02/2025' },
  { id: 4, title: 'RRB Tech III - 09 Mar 2026 Shift 1', datetime: '09 Mar 2026 (9:00 AM - 10:30 AM)', series: 'CEN 02/2025' },
  { id: 5, title: 'RRB Tech III - 09 Mar 2026 Shift 2', datetime: '09 Mar 2026 (12:45 PM - 2:15 PM)', series: 'CEN 02/2025' },
  { id: 6, title: 'RRB Tech III - 09 Mar 2026 Shift 3', datetime: '09 Mar 2026 (4:30 PM - 6:00 PM)', series: 'CEN 02/2025' },
  { id: 7, title: 'RRB Tech III - 10 Mar 2026 Shift 1', datetime: '10 Mar 2026 (9:00 AM - 10:30 AM)', series: 'CEN 02/2025' },
  { id: 8, title: 'RRB Tech III - 10 Mar 2026 Shift 2', datetime: '10 Mar 2026 (12:45 PM - 2:15 PM)', series: 'CEN 02/2025' },
  { id: 9, title: 'RRB Tech III - 10 Mar 2026 Shift 3', datetime: '10 Mar 2026 (4:30 PM - 6:00 PM)', series: 'CEN 02/2025' },

  // CEN 02/2024 Series (Sets 10 to 32)
  { id: 10, title: 'RRB Tech III - 20 Dec 2024 Shift 2', datetime: '20 Dec 2024 (12:45 PM - 2:15 PM)', series: 'CEN 02/2024' },
  { id: 11, title: 'RRB Tech III - 20 Dec 2024 Shift 3', datetime: '20 Dec 2024 (4:30 PM - 6:00 PM)', series: 'CEN 02/2024' },
  { id: 12, title: 'RRB Tech III - 23 Dec 2024 Shift 1', datetime: '23 Dec 2024 (9:00 AM - 10:30 AM)', series: 'CEN 02/2024' },
  { id: 13, title: 'RRB Tech III - 23 Dec 2024 Shift 2', datetime: '23 Dec 2024 (12:45 PM - 2:15 PM)', series: 'CEN 02/2024' },
  { id: 14, title: 'RRB Tech III - 23 Dec 2024 Shift 3', datetime: '23 Dec 2024 (4:30 PM - 6:00 PM)', series: 'CEN 02/2024' },
  { id: 15, title: 'RRB Tech III - 24 Dec 2024 Shift 1', datetime: '24 Dec 2024 (9:00 AM - 10:30 AM)', series: 'CEN 02/2024' },
  { id: 16, title: 'RRB Tech III - 24 Dec 2024 Shift 2', datetime: '24 Dec 2024 (12:45 PM - 2:15 PM)', series: 'CEN 02/2024' },
  { id: 17, title: 'RRB Tech III - 24 Dec 2024 Shift 3', datetime: '24 Dec 2024 (4:30 PM - 6:00 PM)', series: 'CEN 02/2024' },
  { id: 18, title: 'RRB Tech III - 26 Dec 2024 Shift 1', datetime: '26 Dec 2024 (9:00 AM - 10:30 AM)', series: 'CEN 02/2024' },
  { id: 19, title: 'RRB Tech III - 26 Dec 2024 Shift 2', datetime: '26 Dec 2024 (12:45 PM - 2:15 PM)', series: 'CEN 02/2024' },
  { id: 20, title: 'RRB Tech III - 26 Dec 2024 Shift 3', datetime: '26 Dec 2024 (4:30 PM - 6:00 PM)', series: 'CEN 02/2024' },
  { id: 21, title: 'RRB Tech III - 27 Dec 2024 Shift 1', datetime: '27 Dec 2024 (9:00 AM - 10:30 AM)', series: 'CEN 02/2024' },
  { id: 22, title: 'RRB Tech III - 27 Dec 2024 Shift 2', datetime: '27 Dec 2024 (12:45 PM - 2:15 PM)', series: 'CEN 02/2024' },
  { id: 23, title: 'RRB Tech III - 27 Dec 2024 Shift 3', datetime: '27 Dec 2024 (4:30 PM - 6:00 PM)', series: 'CEN 02/2024' },
  { id: 24, title: 'RRB Tech III - 28 Dec 2024 Shift 1', datetime: '28 Dec 2024 (9:00 AM - 10:30 AM)', series: 'CEN 02/2024' },
  { id: 25, title: 'RRB Tech III - 28 Dec 2024 Shift 2', datetime: '28 Dec 2024 (12:45 PM - 2:15 PM)', series: 'CEN 02/2024' },
  { id: 26, title: 'RRB Tech III - 28 Dec 2024 Shift 3', datetime: '28 Dec 2024 (4:30 PM - 6:00 PM)', series: 'CEN 02/2024' },
  { id: 27, title: 'RRB Tech III - 29 Dec 2024 Shift 1', datetime: '29 Dec 2024 (9:00 AM - 10:30 AM)', series: 'CEN 02/2024' },
  { id: 28, title: 'RRB Tech III - 29 Dec 2024 Shift 2', datetime: '29 Dec 2024 (12:45 PM - 2:15 PM)', series: 'CEN 02/2024' },
  { id: 29, title: 'RRB Tech III - 29 Dec 2024 Shift 3', datetime: '29 Dec 2024 (4:30 PM - 6:00 PM)', series: 'CEN 02/2024' },
  { id: 30, title: 'RRB Tech III - 30 Dec 2024 Shift 1', datetime: '30 Dec 2024 (9:00 AM - 10:30 AM)', series: 'CEN 02/2024' },
  { id: 31, title: 'RRB Tech III - 30 Dec 2024 Shift 2', datetime: '30 Dec 2024 (12:45 PM - 2:15 PM)', series: 'CEN 02/2024' },
  { id: 32, title: 'RRB Tech III - 30 Dec 2024 Shift 3', datetime: '30 Dec 2024 (4:30 PM - 6:00 PM)', series: 'CEN 02/2024' }
];

async function main() {
  console.log('Sanitizing data files for all 32 sets...');

  for (let sId = 1; sId <= 32; sId++) {
    const jsonPath = path.resolve(__dirname, `../data/set${sId}.json`);
    const jsPath = path.resolve(__dirname, `../data/set${sId}.js`);

    if (!fs.existsSync(jsonPath)) continue;

    const questions = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    questions.forEach((q) => {
      if (sId <= 9) {
        // Sets 1 to 9: Clear mock cards that had green ticks
        q.card_img = null;
      } else {
        // Sets 10 to 32: Clean option text, keeping sanitized card_img
        if (q.options) {
          ['A', 'B', 'C', 'D'].forEach((l, idx) => {
            if (q.options[l] && q.options[l].includes('(See Question Card)')) {
              q.options[l] = `Option ${idx + 1}`;
            }
          });
        }
      }
    });

    // Write updated json and js
    fs.writeFileSync(jsonPath, JSON.stringify(questions, null, 2), 'utf8');
    fs.writeFileSync(jsPath, `window.SET_${sId}_DATA = ${JSON.stringify(questions, null, 2)};\n`, 'utf8');
  }

  console.log('✅ Updated JSON and JS data files for Sets 1-32.');

  // Now re-seed SQLite DB
  console.log('Updating SQLite database...');
  await db.run('PRAGMA foreign_keys = OFF;');
  await db.run('BEGIN TRANSACTION;');

  try {
    for (let sId = 1; sId <= 32; sId++) {
      const jsonPath = path.resolve(__dirname, `../data/set${sId}.json`);
      if (!fs.existsSync(jsonPath)) continue;

      const questions = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const seriesYear = sId <= 9 ? 'CEN 02/2025' : 'CEN 02/2024';

      for (const q of questions) {
        await db.run(
          `UPDATE questions 
           SET question_text = ?,
               option_a = ?,
               option_b = ?,
               option_c = ?,
               option_d = ?,
               card_img = ?
           WHERE set_id = ? AND qnum = ?`,
          [
            q.question || '',
            q.options ? q.options['A'] || '' : '',
            q.options ? q.options['B'] || '' : '',
            q.options ? q.options['C'] || '' : '',
            q.options ? q.options['D'] || '' : '',
            q.card_img || null,
            sId,
            q.id
          ]
        );
      }
    }
    await db.run('COMMIT;');
    console.log('🎉 SQLite database successfully updated with sanitized data!');
  } catch (err) {
    await db.run('ROLLBACK;');
    console.error('Error updating DB:', err);
  }

  process.exit(0);
}

main();
