const fs = require('fs');
const path = require('path');
const db = require('../backend/config/database');

const shiftNames = [
  // Sets 1 to 9: CEN 02/2025
  { id: 1, title: 'RRB Tech III - 06 Mar 2026 Shift 1', datetime: '06 Mar 2026 (9:00 AM - 10:30 AM)', series: 'CEN 02/2025' },
  { id: 2, title: 'RRB Tech III - 06 Mar 2026 Shift 2', datetime: '06 Mar 2026 (12:45 PM - 2:15 PM)', series: 'CEN 02/2025' },
  { id: 3, title: 'RRB Tech III - 06 Mar 2026 Shift 3', datetime: '06 Mar 2026 (4:30 PM - 6:00 PM)', series: 'CEN 02/2025' },
  { id: 4, title: 'RRB Tech III - 09 Mar 2026 Shift 1', datetime: '09 Mar 2026 (9:00 AM - 10:30 AM)', series: 'CEN 02/2025' },
  { id: 5, title: 'RRB Tech III - 09 Mar 2026 Shift 2', datetime: '09 Mar 2026 (12:45 PM - 2:15 PM)', series: 'CEN 02/2025' },
  { id: 6, title: 'RRB Tech III - 09 Mar 2026 Shift 3', datetime: '09 Mar 2026 (4:30 PM - 6:00 PM)', series: 'CEN 02/2025' },
  { id: 7, title: 'RRB Tech III - 10 Mar 2026 Shift 1', datetime: '10 Mar 2026 (9:00 AM - 10:30 AM)', series: 'CEN 02/2025' },
  { id: 8, title: 'RRB Tech III - 10 Mar 2026 Shift 2', datetime: '10 Mar 2026 (12:45 PM - 2:15 PM)', series: 'CEN 02/2025' },
  { id: 9, title: 'RRB Tech III - 10 Mar 2026 Shift 3', datetime: '10 Mar 2026 (4:30 PM - 6:00 PM)', series: 'CEN 02/2025' },

  // Sets 10 to 32: CEN 02/2024
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

const sectionsTemplate = [
  { name: 'General Science', count: 40, marks: 40 },
  { name: 'Mathematics', count: 25, marks: 25 },
  { name: 'General Intelligence & Reasoning', count: 25, marks: 25 },
  { name: 'General Awareness', count: 10, marks: 10 }
];

async function run() {
  console.log('Building full metadata for all 32 sets...');
  const fullMeta = shiftNames.map(s => ({
    id: s.id,
    title: s.title,
    datetime: s.datetime,
    series: s.series,
    total_questions: 100,
    total_marks: 100,
    duration_minutes: 90,
    negative_marking: 0.3333,
    sections: sectionsTemplate
  }));

  const metaPath = path.resolve(__dirname, '../data/sets_meta.js');
  fs.writeFileSync(metaPath, 'window.SETS_METADATA = ' + JSON.stringify(fullMeta, null, 2) + ';\n', 'utf8');
  console.log('✅ Wrote 32 sets to data/sets_meta.js');

  console.log('Seeding SQLite database with all 32 sets and 3200 questions...');
  
  await db.run('PRAGMA foreign_keys = OFF;');
  await db.run('BEGIN TRANSACTION;');

  try {
    for (const s of fullMeta) {
      await db.run(
        `INSERT INTO test_sets (id, title, date_str, time_str, total_questions, total_marks, duration_minutes, negative_marking)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           date_str = excluded.date_str,
           time_str = excluded.time_str,
           total_questions = excluded.total_questions,
           total_marks = excluded.total_marks,
           duration_minutes = excluded.duration_minutes,
           negative_marking = excluded.negative_marking`,
        [
          s.id,
          s.title,
          s.datetime.split('(')[0].trim(),
          s.datetime.includes('(') ? s.datetime.split('(')[1].replace(')', '').trim() : '',
          s.total_questions,
          s.total_marks,
          s.duration_minutes,
          s.negative_marking
        ]
      );
    }

    let totalQ = 0;
    for (let sId = 1; sId <= 32; sId++) {
      const setJsonPath = path.resolve(__dirname, `../data/set${sId}.json`);
      if (!fs.existsSync(setJsonPath)) {
        console.warn(`⚠️ Warning: ${setJsonPath} not found`);
        continue;
      }

      const questions = JSON.parse(fs.readFileSync(setJsonPath, 'utf8'));
      const seriesYear = sId <= 9 ? 'CEN 02/2025' : 'CEN 02/2024';

      for (const q of questions) {
        await db.run(
          `INSERT INTO questions 
           (set_id, qnum, section, question_text, option_a, option_b, option_c, option_d, correct_option, has_diagram, diagram_img, card_img, explanation)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(set_id, qnum) DO UPDATE SET
             section = excluded.section,
             question_text = excluded.question_text,
             option_a = excluded.option_a,
             option_b = excluded.option_b,
             option_c = excluded.option_c,
             option_d = excluded.option_d,
             correct_option = excluded.correct_option,
             has_diagram = excluded.has_diagram,
             diagram_img = excluded.diagram_img,
             card_img = excluded.card_img,
             explanation = excluded.explanation`,
          [
            sId,
            q.id,
            q.section,
            q.question || '',
            q.options ? q.options['A'] || '' : '',
            q.options ? q.options['B'] || '' : '',
            q.options ? q.options['C'] || '' : '',
            q.options ? q.options['D'] || '' : '',
            q.correct,
            q.has_diagram ? 1 : 0,
            q.diagram_img || null,
            q.card_img || null,
            `Official Answer: Option (${q.correct}). Referenced from official RRB Technician Grade III ${seriesYear} question paper and answer key.`
          ]
        );
        totalQ++;
      }
      if (sId % 5 === 0 || sId === 32) {
        console.log(`  Processed through Set ${sId} (${totalQ} questions inserted so far)...`);
      }
    }

    await db.run('COMMIT;');
    await db.run('PRAGMA foreign_keys = ON;');
    console.log(`🎉 Successfully seeded all ${totalQ} questions across 32 sets in SQLite database!`);
  } catch (err) {
    await db.run('ROLLBACK;');
    await db.run('PRAGMA foreign_keys = ON;');
    throw err;
  }

  const testCount = await db.get('SELECT COUNT(*) as count FROM test_sets');
  const qCount = await db.get('SELECT COUNT(*) as count FROM questions');
  console.log(`Verification: Database has ${testCount.count} tests and ${qCount.count} questions.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Error during seeding:', err);
  process.exit(1);
});
