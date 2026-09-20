const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function seedDatabase() {
  console.log('🚀 Starting SQLite Database Initialization & Seeding...');

  // 1. Run Schema
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await db.exec(schemaSql);
  console.log('✅ Schema created successfully.');

  // 2. Load sets metadata
  const setsMetaPath = path.resolve(__dirname, '../../data/sets_meta.js');
  let metaList = [];
  if (fs.existsSync(setsMetaPath)) {
    const content = fs.readFileSync(setsMetaPath, 'utf8');
    const jsonStr = content.replace(/^window\.SETS_METADATA\s*=\s*/, '').replace(/;\s*$/, '');
    metaList = JSON.parse(jsonStr);
  }

  await db.run('PRAGMA foreign_keys = OFF;');
  await db.run('BEGIN TRANSACTION;');

  try {
    for (const s of metaList) {
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
    console.log(`✅ Seeded ${metaList.length} test sets metadata.`);

    // 3. Insert Questions for all sets
    let totalInserted = 0;
    for (let sId = 1; sId <= metaList.length; sId++) {
      const setJsonPath = path.resolve(__dirname, `../../data/set${sId}.json`);
      if (!fs.existsSync(setJsonPath)) continue;

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
        totalInserted++;
      }
    }

    await db.run('COMMIT;');
    await db.run('PRAGMA foreign_keys = ON;');
    console.log(`🎉 Database seeding completed! Total questions inserted: ${totalInserted}`);
    process.exit(0);
  } catch (err) {
    await db.run('ROLLBACK;');
    await db.run('PRAGMA foreign_keys = ON;');
    throw err;
  }
}

seedDatabase().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
