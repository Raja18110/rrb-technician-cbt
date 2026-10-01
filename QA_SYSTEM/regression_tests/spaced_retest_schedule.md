# Spaced Retesting Schedule

| Interval | Target Domain | Trigger Condition | Automated Verification Script |
| :--- | :--- | :--- | :--- |
| **Day 0 (Immediate)** | Submission, Evaluation, Autosave | Code changes in backend services | `node QA_SYSTEM/runner/run_master_qa.js` |
| **Day 3** | Mistakes Notebook & Mastery Flow | Candidate completes 5+ tests | Automated check on mastery toggling & error count |
| **Day 7** | SQL Injection, IDOR, Parameter Safety | Route additions / query modifications | Security audit suite |
| **Day 14** | Database Integrity & Foreign Keys | SQLite WAL checkpointing / backup | Constraint enforcement suite |
| **Day 30** | Full 32 Shift PYQ Integrity | Monthly platform health audit | Comprehensive 33-test regression suite |
