# 🏗️ System Architecture & Design Document
## RRB Technician Grade III CBT Platform & Analytics Engine

---

## 1. System Overview & Architecture

The system is designed as a **modular, local-first Full-Stack Examination Platform**. It features an event-driven Single Page Application (SPA) on the frontend, backed by a layered Node.js / Express REST API and a durable SQLite relational database running in WAL (Write-Ahead Logging) mode.

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Browser SPA)"]
        UI["TCS-iON Exam Interface"]
        HUB["Personal Hub (Mistakes / Quiz / Analytics)"]
        STATE["Client State Machine & Timer"]
    end

    subgraph API ["REST API Layer (Express.js)"]
        ROUTER["API Router (/api)"]
        TC["Test Controller"]
        AC["Analytics Controller"]
        MC["Mistakes Service"]
        QC["Quiz Generator"]
        SC["Scoring Engine (+1.0 / -0.33)"]
    end

    subgraph Data ["Data & Storage Layer (SQLite)"]
        DB[("cbt_platform.sqlite (WAL Mode)")]
        ASSETS["Static Assets (/cards, /css, /js)"]
    end

    UI --> |"Submissions & State"| ROUTER
    HUB --> |"Queries & Custom Quizzes"| ROUTER
    ROUTER --> TC & AC & MC & QC
    TC --> SC
    TC & AC & MC & QC --> |"Parameterized Queries"| DB
    UI --> |"Render Card Snapshots"| ASSETS
```

---

## 2. Entity-Relationship Data Model

```mermaid
erDiagram
    TEST_SETS ||--o{ QUESTIONS : contains
    TEST_SETS ||--o{ ATTEMPTS : has
    ATTEMPTS ||--o{ ATTEMPT_RESPONSES : records
    QUESTIONS ||--o{ ATTEMPT_RESPONSES : answered_in
    QUESTIONS ||--o| MISTAKES_NOTEBOOK : tracks
    QUESTIONS ||--o| BOOKMARKS : saved_as

    TEST_SETS {
        int id PK
        string title
        string date_str
        string time_str
        int total_questions
        int total_marks
        int duration_minutes
        real negative_marking
    }

    QUESTIONS {
        int id PK
        int set_id FK
        int qnum
        string section
        string question_text
        string option_a
        string option_b
        string option_c
        string option_d
        string correct_option
        int has_diagram
        string diagram_img
        string card_img
        string explanation
    }

    ATTEMPTS {
        int id PK
        int set_id FK
        string candidate_id
        datetime started_at
        datetime submitted_at
        real score
        int correct_count
        int wrong_count
        int unattempted_count
        real accuracy
        int time_spent_seconds
    }

    ATTEMPT_RESPONSES {
        int id PK
        int attempt_id FK
        int question_id FK
        string selected_option
        int is_correct
        string status
        int time_spent
    }

    MISTAKES_NOTEBOOK {
        int question_id PK, FK
        int set_id
        int error_count
        datetime last_attempted_at
        string mastery_status
    }

    BOOKMARKS {
        int question_id PK, FK
        string user_note
        string tag
        datetime created_at
    }
```

---

## 3. Examination State Machine

```mermaid
stateDiagram-v2
    [*] --> NotVisited
    NotVisited --> NotAnswered : Question Opened
    NotAnswered --> Answered : Option Selected & Saved
    NotAnswered --> MarkedForReview : Mark for Review Clicked
    Answered --> MarkedAndAnswered : Mark for Review Clicked
    MarkedAndAnswered --> Answered : Save & Next Clicked
    Answered --> NotAnswered : Clear Response Clicked
    Answered --> Evaluated : Exam Submitted
    MarkedAndAnswered --> Evaluated : Exam Submitted (Counted in Score)
    NotAnswered --> Evaluated : Exam Submitted (0 Marks)
    MarkedForReview --> Evaluated : Exam Submitted (0 Marks)
    NotVisited --> Evaluated : Exam Submitted (0 Marks)
```

---

## 4. Scoring Algorithm & Mathematical Formalism

Railway Recruitment Boards (RRB) use a standardized objective scoring formula:

$$\text{Total Raw Score} = \sum_{i=1}^{N} S_i$$

Where for question $i$:
$$S_i = \begin{cases} 
+1.00 & \text{if } \text{Option}_i = \text{AnswerKey}_i \\
-\frac{1}{3} \approx -0.3333 & \text{if } \text{Option}_i \neq \text{AnswerKey}_i \text{ and } \text{Option}_i \neq \emptyset \\
0.00 & \text{if } \text{Option}_i = \emptyset \text{ (Unattempted)}
\end{cases}$$

Accuracy is evaluated over attempted questions:
$$\text{Accuracy (\%)} = \left( \frac{\text{Correct}}{\text{Correct} + \text{Wrong}} \right) \times 100$$
