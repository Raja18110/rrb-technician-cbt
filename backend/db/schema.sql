-- Schema for RRB Technician Grade III CBT Platform
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS test_sets (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    date_str TEXT NOT NULL,
    time_str TEXT NOT NULL,
    total_questions INTEGER DEFAULT 100,
    total_marks INTEGER DEFAULT 100,
    duration_minutes INTEGER DEFAULT 90,
    negative_marking REAL DEFAULT 0.3333
);

CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER NOT NULL,
    qnum INTEGER NOT NULL,
    section TEXT NOT NULL,
    question_text TEXT,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    correct_option TEXT NOT NULL,
    has_diagram INTEGER DEFAULT 0,
    diagram_img TEXT,
    card_img TEXT,
    explanation TEXT,
    FOREIGN KEY (set_id) REFERENCES test_sets(id) ON DELETE CASCADE,
    UNIQUE(set_id, qnum)
);

CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER,
    candidate_id TEXT DEFAULT 'Candidate #2602',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    submitted_at DATETIME,
    score REAL DEFAULT 0.0,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    unattempted_count INTEGER DEFAULT 0,
    accuracy REAL DEFAULT 0.0,
    time_spent_seconds INTEGER DEFAULT 0,
    FOREIGN KEY (set_id) REFERENCES test_sets(id)
);

CREATE TABLE IF NOT EXISTS attempt_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    selected_option TEXT,
    is_correct INTEGER DEFAULT 0,
    status TEXT DEFAULT 'not-visited',
    time_spent INTEGER DEFAULT 0,
    FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE TABLE IF NOT EXISTS mistakes_notebook (
    question_id INTEGER PRIMARY KEY,
    set_id INTEGER NOT NULL,
    error_count INTEGER DEFAULT 1,
    last_attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    mastery_status TEXT DEFAULT 'NEEDS_PRACTICE', -- 'NEEDS_PRACTICE' | 'REVISED' | 'MASTERED'
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookmarks (
    question_id INTEGER PRIMARY KEY,
    user_note TEXT,
    tag TEXT DEFAULT 'Important',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_questions_set_sec ON questions(set_id, section);
CREATE INDEX IF NOT EXISTS idx_attempt_responses ON attempt_responses(attempt_id);
