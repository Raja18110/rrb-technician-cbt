# 🚆 RRB Technician Grade III CBT · Full-Stack Platform (CEN 02/2025)
### An Enterprise-Grade, Local-First Examination & Analytics Engine

---

## 📌 Executive Summary & Architecture

This project is a **production-ready Full-Stack Software Engineering application** designed as a personal, high-performance Computer Based Test (CBT) preparation platform. It faithfully recreates the official **Railway / TCS-iON CBT examination interface** while providing a layered backend architecture, persistent relational database, intelligent error notebook, and comprehensive performance analytics.

```
rrb-technician-cbt/
├── backend/
│   ├── config/
│   │   └── database.js          # SQLite connection & WAL mode config
│   ├── db/
│   │   ├── schema.sql           # DDL schema (tests, questions, attempts, mistakes)
│   │   ├── seed.js              # Seed runner populating 900 questions
│   │   └── cbt_platform.sqlite  # Embedded relational database
│   ├── controllers/
│   │   ├── testController.js    # Test listing, question delivery, evaluation
│   │   ├── analyticsController.js# Aggregated score & accuracy analytics
│   │   └── notesController.js   # Bookmarks & personal study notes
│   ├── services/
│   │   ├── scoringService.js    # Official RRB marking algorithm (+1, -1/3)
│   │   ├── mistakeService.js    # Automated Mistakes Notebook sync
│   │   └── quizGenerator.js     # Adaptive custom quiz generation
│   ├── routes/
│   │   └── api.js               # RESTful API router (/api)
│   └── server.js                # Express.js server & static pipeline
├── cards/                       # Extracted official question cards & diagrams
├── docs/
│   ├── SYSTEM_DESIGN.md         # Architecture, ER diagrams & State Machine
│   └── API_DOCUMENTATION.md     # REST endpoint request/response specs
├── index.html                   # TCS-iON Single Page Application (SPA)
├── Start_FullStack_App.bat      # One-click full-stack server & browser launcher
├── Start_CBT_Test.bat           # 100% offline standalone direct launcher
└── package.json                 # Scripts & dependencies (Express, CORS, SQLite3)
```

---

## ⚡ Quick Start

### 1. Launch with Full-Stack Backend (Recommended)
Double-click **`Start_FullStack_App.bat`** or run:
```bash
npm start
```
* Backend starts on `http://localhost:3000` and automatically opens the dashboard in your default browser.
* All test submissions, time logs, and incorrect questions persist in the local SQLite database.

### 2. Launch in Offline Standalone Mode
Double-click **`Start_CBT_Test.bat`** or open **`index.html`** directly in any browser.
* Operates 100% offline with zero external dependencies, caching progress in `localStorage`.

---

## 🎯 Key Software Engineering Features

1. **Layered Backend Architecture:**
   * Clean separation of concerns: `Routes` $\to$ `Controllers` $\to$ `Services` $\to$ `Database`.
   * Promisified SQLite access in WAL (Write-Ahead Logging) mode.
2. **Automated Mistakes Notebook (`mistakes_notebook`):**
   * Automatically intercepts every incorrect answer upon test submission.
   * Tracks frequency of mistakes (`error_count`) and allows one-click targeted re-testing of weak spots.
3. **Adaptive Quiz Generator (`QuizGenerator`):**
   * Generates custom practice sets (10, 25, or 50 questions) filtered by Subject or strictly from your past mistakes.
4. **Authentic TCS-iON CBT Engine:**
   * 90-minute live countdown timer with auto-submit.
   * Section navigation bar with live question count badges.
   * Real-time 5-state Question Palette (Answered, Not Answered, Not Visited, Marked, Answered & Marked).
   * Keyboard shortcuts (`A, B, C, D` or `1, 2, 3, 4` to select options, `Enter` to Save & Next).
5. **Detailed Solutions & Paper Snapshot Toggle:**
   * Seamless toggle to view the original official paper snapshot with exact diagrams and formulas.
   * Comprehensive step-by-step solutions for every single question.

---

## 🧪 Running Automated Tests

Run the automated integration test suite:
```bash
npm test
```
Verifies endpoint response integrity, 900-question database loading, official RRB score calculations, error logging, and quiz generation.

---

## 📖 Engineering Documentation
- [System Architecture & Design Document (SYSTEM_DESIGN.md)](docs/SYSTEM_DESIGN.md)
- [REST API Specifications (API_DOCUMENTATION.md)](docs/API_DOCUMENTATION.md)


---

## 🌐 Deploying to GitHub & GitHub Pages

### 1. Push to GitHub
Create a new empty repository on GitHub named `rrb-technician-cbt` (https://github.com/new), then run:

```bash
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/rrb-technician-cbt.git
git branch -M main
git push -u origin main
```

### 2. Enable Free Instant Web Hosting (GitHub Pages)
Because this project is local-first and self-contained with pure web standards:
1. Go to your repository on GitHub: `https://github.com/YOUR_GITHUB_USERNAME/rrb-technician-cbt`
2. Click **Settings** $\to$ **Pages** (in the left sidebar).
3. Under **Build and deployment** $\to$ **Source**, choose **Deploy from a branch**.
4. Select Branch: **`main`** and Folder: **`/ (root)`**, then click **Save**.
5. Within 1-2 minutes, your live CBT examination portal will be accessible worldwide at:
   `https://YOUR_GITHUB_USERNAME.github.io/rrb-technician-cbt/`

