# Master Mistake Notebook


---

### [MST-001] ReferenceError: evaluatedResponses was not defined during test submission evaluation
- **Date:** 2026-10-01
- **Category:** `Backend`
- **Module:** `Scoring Engine`
- **Expected Behavior:** ScoringService.evaluate initializes evaluatedResponses array before question iteration and pushes evaluated response objects
- **Actual Behavior:** Server crashed with HTTP 500 error when submitting mock test answers
- **Why It Happened:** Variable declaration was accidentally omitted during response normalization refactoring
- **Root Cause:** Missing declaration `const evaluatedResponses = [];` at the start of `ScoringService.evaluate`
- **Correct Approach:** Always declare accumulator arrays before iteration blocks and run automated unit tests immediately after refactoring
- **Fix Applied:** Declared `const evaluatedResponses = [];` on line 7 of scoringService.js
- **Golden Rule to Remember:** *"Never assume refactored functions work without executing an automated submission verification test"*
- **Related Concepts:** Scope, Variable Hoisting, Unit Testing, Scoring Engines
- **Related Bugs:** BUG-SCORE-001
- **Status:** `ACTIVE_KNOWLEDGE`


---

### [MST-002] Subqueries without LIMIT 1 in SELECT statements risk crashing if multiple active sessions match set_id
- **Date:** 2026-10-01
- **Category:** `Database`
- **Module:** `Active Sessions & Subqueries`
- **Expected Behavior:** Correlated subqueries in `getAllTests` must always guarantee a scalar return value by using `ORDER BY updated_at DESC LIMIT 1`
- **Actual Behavior:** Potential SQLite error "more than one row returned by a subquery used as an expression"
- **Why It Happened:** Subquery assumed 1-to-1 relationship without explicit scalar guarantee in SQLite query syntax
- **Root Cause:** Missing `ORDER BY updated_at DESC LIMIT 1` clause in correlated subquery
- **Correct Approach:** Always enforce `LIMIT 1` on correlated scalar subqueries
- **Fix Applied:** Added `ORDER BY updated_at DESC LIMIT 1` to active_sessions subqueries in `getAllTests`
- **Golden Rule to Remember:** *"Correlated subqueries in column lists must always be guaranteed single-row"*
- **Related Concepts:** Correlated Subqueries, Scalar Expressions, SQL Constraints
- **Related Bugs:** BUG-DB-002
- **Status:** `ACTIVE_KNOWLEDGE`


---

### [MST-003] 2024 answer keys with green ticks and red crosses were visible in test cards, leaking answers during practice
- **Date:** 2026-10-01
- **Category:** `UX`
- **Module:** `2024 Shift Papers`
- **Expected Behavior:** Authentic CBT format where questions are unadulterated stems and options are clean interactive cards without answer markings
- **Actual Behavior:** User saw official checkmarks and crosses before answering
- **Why It Happened:** Initial PDF extraction captured full snapshot cards containing TCS answer status banners and checkmarks
- **Root Cause:** Card rendering pipeline was using raw PDF crop strips instead of separating stem from options at x >= 86 coordinate boundary
- **Correct Approach:** Split question card into stem image and individual option images cropped to exclude answer marks and watermarks
- **Fix Applied:** Rebuilt 2024 questions using bounding-box crop (x >= 86) and zeroed watermark Form XObjects in PDF streams
- **Golden Rule to Remember:** *"A mock test platform must never leak the official answer in the live exam view"*
- **Related Concepts:** Exam Security, Bounding Box Cropping, PDF Stream Manipulation, TCS-iON Architecture
- **Related Bugs:** BUG-UI-003
- **Status:** `ACTIVE_KNOWLEDGE`

