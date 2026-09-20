-- Add active_sessions table for real-time exam progress auto-save & recovery
CREATE TABLE IF NOT EXISTS active_sessions (
    set_id INTEGER PRIMARY KEY,
    candidate_id TEXT DEFAULT 'Candidate #2602',
    current_q_index INTEGER DEFAULT 0,
    time_remaining INTEGER DEFAULT 5400,
    responses_json TEXT,
    is_custom_quiz INTEGER DEFAULT 0,
    quiz_data_json TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
