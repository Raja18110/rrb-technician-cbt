const fs = require('fs');
const path = require('path');
const db = require('../backend/config/database');

async function remove2024Data() {
  console.log('🗑️ Removing 2024 PYQ Data (Sets 10 to 32)...');

  // 1. Delete JSON and JS files for sets 10 to 32
  const dataDir = path.resolve(__dirname, '../data');
  for (let i = 10; i <= 32; i++) {
    const jsonFile = path.join(dataDir, `set${i}.json`);
    const jsFile = path.join(dataDir, `set${i}.js`);
    if (fs.existsSync(jsonFile)) fs.unlinkSync(jsonFile);
    if (fs.existsSync(jsFile)) fs.unlinkSync(jsFile);
  }
  console.log('✅ Removed data/set10 to set32 json and js files.');

  // 2. Delete card image files for sets 10 to 32
  const cardsDir = path.resolve(__dirname, '../cards');
  if (fs.existsSync(cardsDir)) {
    const files = fs.readdirSync(cardsDir);
    let deletedCards = 0;
    for (const f of files) {
      const match = f.match(/^set(\d+)_/);
      if (match && parseInt(match[1], 10) >= 10) {
        fs.unlinkSync(path.join(cardsDir, f));
        deletedCards++;
      }
    }
    console.log(`✅ Removed ${deletedCards} card images for sets 10 to 32.`);
  }

  // 3. Clean SQLite Database - delete sets >= 10
  console.log('🧹 Cleaning SQLite database...');
  await db.run('PRAGMA foreign_keys = OFF;');
  await db.run('BEGIN TRANSACTION;');

  try {
    await db.run('DELETE FROM questions WHERE set_id >= 10;');
    await db.run('DELETE FROM test_sets WHERE id >= 10;');
    await db.run('DELETE FROM active_sessions WHERE set_id >= 10;');
    await db.run('DELETE FROM attempt_responses WHERE question_id IN (SELECT id FROM questions WHERE set_id >= 10);');
    await db.run('DELETE FROM mistakes_notebook WHERE question_id IN (SELECT id FROM questions WHERE set_id >= 10);');
    await db.run('DELETE FROM attempts WHERE set_id >= 10;');

    await db.run('COMMIT;');
    await db.run('PRAGMA foreign_keys = ON;');
    console.log('✅ SQLite database cleaned successfully.');
  } catch (err) {
    await db.run('ROLLBACK;');
    await db.run('PRAGMA foreign_keys = ON;');
    throw err;
  }

  const testCount = await db.get('SELECT COUNT(*) as count FROM test_sets');
  const qCount = await db.get('SELECT COUNT(*) as count FROM questions');
  console.log(`Verification: Database now has ${testCount.count} tests and ${qCount.count} questions.`);

  // 4. Update data/sets_meta.js to only have Sets 1 to 9
  const setsMeta = [
    {
      id: 1,
      title: "RRB Tech III - 06 Mar 2026 Shift 1",
      datetime: "06 Mar 2026 (9:00 AM - 10:30 AM)",
      total_questions: 100,
      total_marks: 100,
      duration_minutes: 90,
      negative_marking: 0.3333,
      sections: [
        { name: "General Science", count: 40, marks: 40 },
        { name: "Mathematics", count: 25, marks: 25 },
        { name: "General Intelligence & Reasoning", count: 25, marks: 25 },
        { name: "General Awareness", count: 10, marks: 10 }
      ]
    },
    {
      id: 2,
      title: "RRB Tech III - 06 Mar 2026 Shift 2",
      datetime: "06 Mar 2026 (12:45 PM - 2:15 PM)",
      total_questions: 100,
      total_marks: 100,
      duration_minutes: 90,
      negative_marking: 0.3333,
      sections: [
        { name: "General Science", count: 40, marks: 40 },
        { name: "Mathematics", count: 25, marks: 25 },
        { name: "General Intelligence & Reasoning", count: 25, marks: 25 },
        { name: "General Awareness", count: 10, marks: 10 }
      ]
    },
    {
      id: 3,
      title: "RRB Tech III - 06 Mar 2026 Shift 3",
      datetime: "06 Mar 2026 (4:30 PM - 6:00 PM)",
      total_questions: 100,
      total_marks: 100,
      duration_minutes: 90,
      negative_marking: 0.3333,
      sections: [
        { name: "General Science", count: 40, marks: 40 },
        { name: "Mathematics", count: 25, marks: 25 },
        { name: "General Intelligence & Reasoning", count: 25, marks: 25 },
        { name: "General Awareness", count: 10, marks: 10 }
      ]
    },
    {
      id: 4,
      title: "RRB Tech III - 09 Mar 2026 Shift 1",
      datetime: "09 Mar 2026 (9:00 AM - 10:30 AM)",
      total_questions: 100,
      total_marks: 100,
      duration_minutes: 90,
      negative_marking: 0.3333,
      sections: [
        { name: "General Science", count: 40, marks: 40 },
        { name: "Mathematics", count: 25, marks: 25 },
        { name: "General Intelligence & Reasoning", count: 25, marks: 25 },
        { name: "General Awareness", count: 10, marks: 10 }
      ]
    },
    {
      id: 5,
      title: "RRB Tech III - 09 Mar 2026 Shift 2",
      datetime: "09 Mar 2026 (12:45 PM - 2:15 PM)",
      total_questions: 100,
      total_marks: 100,
      duration_minutes: 90,
      negative_marking: 0.3333,
      sections: [
        { name: "General Science", count: 40, marks: 40 },
        { name: "Mathematics", count: 25, marks: 25 },
        { name: "General Intelligence & Reasoning", count: 25, marks: 25 },
        { name: "General Awareness", count: 10, marks: 10 }
      ]
    },
    {
      id: 6,
      title: "RRB Tech III - 09 Mar 2026 Shift 3",
      datetime: "09 Mar 2026 (4:30 PM - 6:00 PM)",
      total_questions: 100,
      total_marks: 100,
      duration_minutes: 90,
      negative_marking: 0.3333,
      sections: [
        { name: "General Science", count: 40, marks: 40 },
        { name: "Mathematics", count: 25, marks: 25 },
        { name: "General Intelligence & Reasoning", count: 25, marks: 25 },
        { name: "General Awareness", count: 10, marks: 10 }
      ]
    },
    {
      id: 7,
      title: "RRB Tech III - 10 Mar 2026 Shift 1",
      datetime: "10 Mar 2026 (9:00 AM - 10:30 AM)",
      total_questions: 100,
      total_marks: 100,
      duration_minutes: 90,
      negative_marking: 0.3333,
      sections: [
        { name: "General Science", count: 40, marks: 40 },
        { name: "Mathematics", count: 25, marks: 25 },
        { name: "General Intelligence & Reasoning", count: 25, marks: 25 },
        { name: "General Awareness", count: 10, marks: 10 }
      ]
    },
    {
      id: 8,
      title: "RRB Tech III - 10 Mar 2026 Shift 2",
      datetime: "10 Mar 2026 (12:45 PM - 2:15 PM)",
      total_questions: 100,
      total_marks: 100,
      duration_minutes: 90,
      negative_marking: 0.3333,
      sections: [
        { name: "General Science", count: 40, marks: 40 },
        { name: "Mathematics", count: 25, marks: 25 },
        { name: "General Intelligence & Reasoning", count: 25, marks: 25 },
        { name: "General Awareness", count: 10, marks: 10 }
      ]
    },
    {
      id: 9,
      title: "RRB Tech III - 10 Mar 2026 Shift 3",
      datetime: "10 Mar 2026 (4:30 PM - 6:00 PM)",
      total_questions: 100,
      total_marks: 100,
      duration_minutes: 90,
      negative_marking: 0.3333,
      sections: [
        { name: "General Science", count: 40, marks: 40 },
        { name: "Mathematics", count: 25, marks: 25 },
        { name: "General Intelligence & Reasoning", count: 25, marks: 25 },
        { name: "General Awareness", count: 10, marks: 10 }
      ]
    }
  ];

  const metaPath = path.resolve(__dirname, '../data/sets_meta.js');
  fs.writeFileSync(metaPath, 'window.SETS_METADATA = ' + JSON.stringify(setsMeta, null, 2) + ';\n', 'utf8');
  console.log('✅ Updated data/sets_meta.js to 9 sets.');
  process.exit(0);
}

remove2024Data().catch((err) => {
  console.error('Error removing 2024 data:', err);
  process.exit(1);
});
