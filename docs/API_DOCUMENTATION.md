# 📡 REST API Documentation
## RRB Technician CBT Backend Endpoints

All endpoints accept and return JSON payloads. The base path is `/api`.

---

### 1. Test Sets & CBT

#### `GET /api/tests`
Retrieves all 9 available shift test sets with candidate attempt statistics.
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "RRB Tech III - 06 Mar 2026 Shift 1",
      "date_str": "06 Mar 2026",
      "time_str": "9:00 AM - 10:30 AM",
      "total_questions": 100,
      "total_marks": 100,
      "duration_minutes": 90,
      "negative_marking": 0.3333,
      "latest_score": 78.67,
      "latest_accuracy": 85.2,
      "attempt_count": 2
    }
  ]
}
```

#### `GET /api/tests/:id`
Retrieves test metadata and all 100 questions formatted for the CBT engine.
- **Response:**
```json
{
  "success": true,
  "data": {
    "test": { "id": 1, "title": "...", "duration_minutes": 90 },
    "questions": [
      {
        "id": 1,
        "db_id": 1,
        "section": "General Science",
        "question": "What is the primary function of the cell wall in plant cells?",
        "options": {
          "A": "Control cell division",
          "B": "Control cellular respiration",
          "C": "Provide rigidity and protection",
          "D": "Transport nutrients"
        },
        "correct": "C",
        "has_diagram": false,
        "card_img": "cards/set1_q1.png"
      }
    ]
  }
}
```

#### `POST /api/tests/:id/submit`
Evaluates candidate responses, applies negative marking, records attempt in database, and automatically syncs errors to the Mistakes Notebook.
- **Request Body:**
```json
{
  "responses": {
    "1": { "option": "C", "status": "answered", "timeSpent": 24 },
    "2": { "option": "B", "status": "answered", "timeSpent": 45 }
  },
  "timeSpentSeconds": 5340,
  "candidateId": "Candidate #2602"
}
```
- **Response:** Evaluated scorecard with section-wise breakdown.

---

### 2. Mistakes Notebook

#### `GET /api/mistakes`
Fetches all questions answered incorrectly across past attempts.
- **Query Params:** `status` (optional: `'NEEDS_PRACTICE'` | `'MASTERED'`).

#### `PUT /api/mistakes/:id`
Updates question mastery status.
- **Request Body:** `{ "status": "MASTERED" }`

---

### 3. Adaptive Quiz Generator

#### `POST /api/quiz/custom`
Generates customized practice tests.
- **Request Body:**
```json
{
  "mode": "section",        // "section" | "mistakes" | "full_mix"
  "section": "General Science",
  "count": 25
}
```
