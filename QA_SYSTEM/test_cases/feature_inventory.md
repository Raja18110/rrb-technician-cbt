# Complete Feature Inventory

| ID | Module | Feature | Type | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| SYS-001 | System Architecture | Static HTML Entry & Meta Tags | Structural | Critical | Tested |
| SYS-002 | Assets | CEN 02/2024 Question Stem Cards Existence | Data/Asset | High | Tested |
| SYS-003 | Assets | CEN 02/2024 Option Cards Existence | Data/Asset | High | Tested |
| SYS-004 | Assets | Offline Fallback JS Data Sets (1-32) | Data/Asset | Medium | Tested |
| API-001 | Shift Papers API | GET /api/tests Listing | API | Critical | Tested |
| API-002 | Shift Papers API | GET /api/tests/:id Detailed Retrieval | API | Critical | Tested |
| API-003 | Shift Papers API | Candidate Scoping in GET /api/tests | API | High | Tested |
| SES-001 | Session Engine | Auto-Save In-Progress State | Functional | Critical | Tested |
| SES-002 | Session Engine | Resume In-Progress State | Functional | Critical | Tested |
| SES-003 | Session Engine | Discard / Clear In-Progress State | Functional | High | Tested |
| EV-001 | Scoring Engine | Official RRB Scheme (+1 / -0.3333) | Algorithm | Critical | Tested |
| EV-002 | Scoring Engine | Sectional Breakdown Aggregation | Algorithm | High | Tested |
| EV-003 | Test Submission | Submission Persistence & Session Deletion | Functional | Critical | Tested |
| MST-001 | Mistakes Notebook | Auto-Logging Incorrect Questions | Functional | Critical | Tested |
| MST-002 | Mistakes Notebook | Mastery Status Progression | Functional | High | Tested |
| MST-003 | Mistakes Notebook | Candidate Filter Isolation | Security | High | Tested |
| QZ-001 | Custom Quiz | Subject-Specific Practice Drill | Functional | High | Tested |
| QZ-002 | Custom Quiz | Mistakes Notebook Weakness Drill | Functional | High | Tested |
| QZ-003 | Custom Quiz | Full Mixed PYQ Drill | Functional | Medium | Tested |
| AN-001 | Analytics Engine | Candidate-Scoped Summary Metrics | Functional | Critical | Tested |
| AN-002 | Analytics Engine | Subject-Wise Performance Radar | Functional | High | Tested |
| AN-003 | Analytics Engine | Score Progression Trend | Functional | Medium | Tested |
| BK-001 | Bookmarks | Toggle Question Bookmark | Functional | Medium | Tested |
| BK-002 | Bookmarks | Save Custom Note on Bookmarked Question | Functional | Medium | Tested |
| NEG-001 | Error Handling | Non-Existent Test Set ID (404/400) | Negative | High | Tested |
| NEG-002 | Error Handling | Invalid Param Types (NaN ID) | Negative | High | Tested |
| NEG-003 | Error Handling | Empty / Null Submission Body | Boundary | High | Tested |
| NEG-004 | Error Handling | Negative Countdown Time Session | Boundary | Medium | Tested |
| NEG-005 | Error Handling | Extreme Count in Custom Quiz Generator | Boundary | Medium | Tested |
| SEC-001 | Security | SQL Injection Resistance in Param/Query | Security | Critical | Tested |
| SEC-002 | Security | Stored XSS Vector Resistance in Text/Notes | Security | Critical | Tested |
| SEC-003 | Security | Candidate ID Isolation (IDOR Resistance) | Security | High | Tested |
| SEC-004 | Security | CORS Policy & Headers Hygiene | Security | Medium | Tested |
| DB-001 | Database | Foreign Key Enforcement (PRAGMA foreign_keys = ON) | Database | Critical | Tested |
| DB-002 | Database | Unique Constraint on (set_id, qnum) | Database | Critical | Tested |
| DB-003 | Database | Cascade Deletion on Attempt Responses | Database | High | Tested |
| PERF-001 | Performance | Full Question Set Fetch Latency (<50ms) | Performance | High | Tested |
| PERF-002 | Performance | Real-Time Auto-Save Latency (<20ms) | Performance | High | Tested |
| PERF-003 | Performance | Scoring & Submission Latency (<100ms) | Performance | High | Tested |
