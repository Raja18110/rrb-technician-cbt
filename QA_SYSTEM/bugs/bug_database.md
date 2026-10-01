# Bug Registry & Tracking Database

| Bug ID | Module | Problem | Severity | Status | Retest Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BUG-BK-001 | Bookmarks & Notes | Missing max-length validation and sanitization on bookmark tags and user notes allows unbounded text insertion | `LOW` | `OPEN` | `PENDING_APPROVAL` |
| BUG-QZ-002 | Custom Quiz Generator | Unbounded frequency of random question generation queries could cause CPU spikes under automated rapid polling | `MEDIUM` | `OPEN` | `PENDING_APPROVAL` |
| BUG-AUTH-003 | Authentication & Profile | Default candidate fallback varies between "Candidate #2602" in active_sessions table schema and "Rohit Kumar" in testController submit endpoint | `LOW` | `OPEN` | `PENDING_APPROVAL` |

---

## Detailed Bug Reports & Proposed Patches


### [BUG-BK-001] Missing max-length validation and sanitization on bookmark tags and user notes allows unbounded text insertion
- **Module:** Bookmarks & Notes
- **Severity:** `LOW` | **Status:** `OPEN`
- **Root Cause:** NotesController.toggleBookmark and saveNote accept raw req.body strings without checking String.length <= 500.
- **Fix Recommendation:** Introduce body schema validation limiting user_note to 1,000 characters and tag to 50 characters, trimming leading/trailing whitespace.
- **Proposed Patch:**
```javascript
// backend/controllers/notesController.js
const safeNote = (note || '').trim().slice(0, 1000);
const safeTag = (tag || 'Revision').trim().slice(0, 50);
```
- **Affected Files:** backend/controllers/notesController.js
- **Regression Risk:** LOW. Existing valid short notes and tags remain unaffected.
- **Approval Gate:** Staged in QA Sandbox. Awaiting explicit user approval before applying to main codebase.


### [BUG-QZ-002] Unbounded frequency of random question generation queries could cause CPU spikes under automated rapid polling
- **Module:** Custom Quiz Generator
- **Severity:** `MEDIUM` | **Status:** `OPEN`
- **Root Cause:** Endpoint POST /api/quiz/custom executes ORDER BY RANDOM() LIMIT ? without debounce or rate limiter middleware.
- **Fix Recommendation:** Add an express-rate-limit middleware (e.g. max 30 quiz generations per minute per candidate) or cache candidate mistake lists in memory.
- **Proposed Patch:**
```javascript
// backend/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const quizLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: 'Too many quizzes generated, please try again in a minute.' });
router.post('/quiz/custom', quizLimiter, ...);
```
- **Affected Files:** backend/routes/api.js
- **Regression Risk:** LOW. Protects database connection pool from excessive random sampling.
- **Approval Gate:** Staged in QA Sandbox. Awaiting explicit user approval before applying to main codebase.


### [BUG-AUTH-003] Default candidate fallback varies between "Candidate #2602" in active_sessions table schema and "Rohit Kumar" in testController submit endpoint
- **Module:** Authentication & Profile
- **Severity:** `LOW` | **Status:** `OPEN`
- **Root Cause:** Legacy default in schema.sql specifies DEFAULT "Candidate #2602", whereas recent candidate personalization introduced "Rohit Kumar".
- **Fix Recommendation:** Unify candidate ID default to "Rohit Kumar" across schema.sql and all controller default parameters.
- **Proposed Patch:**
```javascript
// backend/db/schema.sql
candidate_id TEXT DEFAULT 'Rohit Kumar'
```
- **Affected Files:** backend/db/schema.sql, backend/controllers/testController.js
- **Regression Risk:** LOW. Consistency improvement across all candidate queries.
- **Approval Gate:** Staged in QA Sandbox. Awaiting explicit user approval before applying to main codebase.

