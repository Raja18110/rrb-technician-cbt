// RRB Technician Grade III Full-Stack CBT Exam Engine & Hub
(function () {
  "use strict";

  const API_BASE = window.location.origin.startsWith("http") ? "/api" : null;

  const APP_STATE = {
    activeHubTab: "tests",
    view: "home",
    selectedSeriesFilter: "all",
    currentSetId: 1,
    currentTestTitle: "",
    isCustomQuiz: false,
    questions: [],
    currentQIndex: 0,
    responses: {},
    timerRemaining: 90 * 60,
    timerInterval: null,
    showSnapshot: false,
    fontSize: "normal",
    reviewFilter: "all",
    mistakesFilter: "all",
    cachedMistakes: []
  };

  const SECTIONS = [
    { name: "General Science", range: [1, 40], total: 40 },
    { name: "Mathematics", range: [41, 65], total: 25 },
    { name: "General Intelligence & Reasoning", range: [66, 90], total: 25 },
    { name: "General Awareness", range: [91, 100], total: 10 }
  ];

  const STORAGE_KEY = "rrb_tech_cbt_history";
  function getLocalHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function saveLocalResult(setId, resultData) {
    const hist = getLocalHistory();
    hist[setId] = resultData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hist));
  }

  window.initCBTApp = async function () {
    setupGlobalEvents();
    await loadInitialData();
    switchHubTab("tests");
  };

  function setupGlobalEvents() {
    window.addEventListener("keydown", (e) => {
      if (APP_STATE.view !== "exam") return;
      const key = e.key.toUpperCase();
      if (["A", "B", "C", "D"].includes(key)) {
        selectOption(key);
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        const map = { "1": "A", "2": "B", "3": "C", "4": "D" };
        selectOption(map[e.key]);
      } else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) {
        handleSaveNext();
      }
    });
  }

  async function loadInitialData() {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/mistakes`);
        const json = await res.json();
        if (json.success) {
          APP_STATE.cachedMistakes = json.data;
          updateMistakesBadge(json.count);
        }
      } catch (err) {}
    }
  }

  function updateMistakesBadge(count) {
    const b = document.getElementById("mistakes-nav-badge");
    if (b) {
      b.innerText = count || 0;
      b.style.display = count > 0 ? "inline-block" : "none";
    }
  }

  window.switchHubTab = function (tab) {
    APP_STATE.activeHubTab = tab;
    document.querySelectorAll(".hub-nav-btn").forEach((btn) => btn.classList.remove("active"));
    const activeBtn = document.getElementById(`nav-btn-${tab}`);
    if (activeBtn) activeBtn.classList.add("active");

    const views = {
      tests: document.getElementById("home-view"),
      mistakes: document.getElementById("mistakes-view"),
      quiz: document.getElementById("quiz-view"),
      analytics: document.getElementById("analytics-view")
    };

    Object.keys(views).forEach((k) => {
      if (views[k]) views[k].style.display = k === tab ? "block" : "none";
    });

    if (tab === "tests") renderShiftsList();
    else if (tab === "mistakes") renderMistakesNotebook();
    else if (tab === "analytics") renderAnalyticsDashboard();
  };

  window.filterShiftSeries = function (series) {
    APP_STATE.selectedSeriesFilter = series;
    document.querySelectorAll(".series-filter-btn").forEach((btn) => btn.classList.remove("active"));
    if (series === "all") {
      const b = document.getElementById("filter-series-all");
      if (b) b.classList.add("active");
    } else if (series === "CEN 02/2025") {
      const b = document.getElementById("filter-series-2025");
      if (b) b.classList.add("active");
    } else if (series === "CEN 02/2024") {
      const b = document.getElementById("filter-series-2024");
      if (b) b.classList.add("active");
    }
    renderShiftsList();
  };

  async function renderShiftsList() {
    const container = document.getElementById("shifts-grid");
    container.innerHTML = "<p style='color:#64748b;'>Loading shift papers...</p>";

    let sets = [];
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/tests`);
        const json = await res.json();
        if (json.success) sets = json.data;
      } catch (e) {}
    }

    if (!sets.length) {
      sets = window.SETS_METADATA || [];
    }

    if (APP_STATE.selectedSeriesFilter !== "all") {
      if (APP_STATE.selectedSeriesFilter === "CEN 02/2025") {
        sets = sets.filter((s) => s.id <= 9);
      } else if (APP_STATE.selectedSeriesFilter === "CEN 02/2024") {
        sets = sets.filter((s) => s.id >= 10);
      }
    }

    const localHist = getLocalHistory();
    container.innerHTML = "";

    if (!sets.length) {
      container.innerHTML = "<p style='color:#64748b; padding:20px;'>No tests found matching this filter.</p>";
      return;
    }

    sets.forEach((meta) => {
      const score = meta.latest_score !== undefined ? meta.latest_score : (localHist[meta.id] ? localHist[meta.id].score : null);
      const isDone = score !== null;
      const seriesLabel = meta.series || (meta.id <= 9 ? "CEN 02/2025" : "CEN 02/2024");

      const card = document.createElement("div");
      card.className = "shift-card";
      card.innerHTML = `
        <div>
          <div class="shift-badge-row">
            <span class="shift-tag">${seriesLabel} · Set ${meta.id}</span>
            <span class="shift-status-pill ${isDone ? "status-completed" : "status-pending"}">
              ${isDone ? `Score: ${parseFloat(score).toFixed(2)} / 100` : "Not Attempted"}
            </span>
          </div>
          <h3 class="shift-title">${meta.title}</h3>
          <div class="shift-time">📅 ${meta.datetime || `${meta.date_str} (${meta.time_str})`}</div>
          <table class="shift-details-table">
            <tr><td>Total Questions</td><td>100 MCQs</td></tr>
            <tr><td>Total Marks</td><td>100 Marks</td></tr>
            <tr><td>Time Duration</td><td>90 Minutes</td></tr>
            <tr><td>Marking Scheme</td><td>+1.00 / -0.33</td></tr>
            <tr><td>Section Breakdown</td><td>Science (40), Math (25), Reasoning (25), GA (10)</td></tr>
          </table>
        </div>
        <div class="shift-actions">
          <button class="btn-start-test" onclick="startTest(${meta.id})">
            ${isDone ? "Re-attempt Mock Test" : "Start Mock Test"}
          </button>
          ${isDone ? `<button class="btn-view-score" onclick="viewSavedResult(${meta.id})">Review Analysis</button>` : ""}
        </div>
      `;
      container.appendChild(card);
    });
  }

  async function renderMistakesNotebook() {
    const listElem = document.getElementById("mistakes-list");
    listElem.innerHTML = "<p style='color:#64748b;'>Loading mistakes notebook...</p>";

    let mistakes = [];
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/mistakes?status=${APP_STATE.mistakesFilter === "all" ? "" : APP_STATE.mistakesFilter}`);
        const json = await res.json();
        if (json.success) mistakes = json.data;
      } catch (e) {}
    }

    if (!mistakes.length) {
      listElem.innerHTML = `
        <div style="background:#fff; border:1px dashed #cbd5e1; border-radius:10px; padding:40px; text-align:center; color:#64748b;">
          <h3 style="color:#1e293b; margin-bottom:8px;">No Mistakes Logged Yet! 🌟</h3>
          <p>When you attempt mock tests and answer any question incorrectly, it will automatically appear here for focused revision.</p>
        </div>
      `;
      return;
    }

    listElem.innerHTML = "";
    mistakes.forEach((m) => {
      const isMastered = m.mastery_status === "MASTERED";
      const card = document.createElement("div");
      card.className = `mistake-card ${isMastered ? "mastered" : ""}`;

      card.innerHTML = `
        <div class="mistake-card-header">
          <div>
            <span class="mistake-badge">Error Count: ${m.error_count}</span>
            <span style="font-weight:700; color:#1e3a8a; margin-left:8px;">${m.set_title} · Q${m.qnum}</span>
            <span style="font-size:0.8rem; color:#64748b; margin-left:6px;">(${m.section})</span>
          </div>
          <div>
            <button class="btn btn-clear" style="font-size:0.75rem; padding:4px 8px;" onclick="toggleMastery(${m.question_id}, '${isMastered ? "NEEDS_PRACTICE" : "MASTERED"}')">
              ${isMastered ? "Mark Needs Practice" : "✓ Mark Mastered"}
            </button>
          </div>
        </div>
        <div style="font-size:0.95rem; font-weight:500; margin-bottom:10px;">${escapeHtml(m.question_text || "")}</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.85rem; color:#334155; margin-bottom:8px;">
          <div>A: ${escapeHtml(m.option_a || "")}</div>
          <div>B: ${escapeHtml(m.option_b || "")}</div>
          <div>C: ${escapeHtml(m.option_c || "")}</div>
          <div>D: ${escapeHtml(m.option_d || "")}</div>
        </div>
        <div style="font-size:0.85rem; font-weight:700; color:#15803d;">Official Answer: Option (${m.correct_option})</div>
      `;
      listElem.appendChild(card);
    });
  }

  window.filterMistakes = function (status) {
    APP_STATE.mistakesFilter = status;
    renderMistakesNotebook();
  };

  window.toggleMastery = async function (questionId, newStatus) {
    if (API_BASE) {
      await fetch(`${API_BASE}/mistakes/${questionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      renderMistakesNotebook();
    }
  };

  window.startMistakesQuiz = async function () {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/quiz/custom`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "mistakes", count: 25 })
        });
        const json = await res.json();
        if (json.success && json.data.questions.length > 0) {
          launchCustomExam(json.data);
          return;
        }
      } catch (e) {}
    }
    alert("No pending mistakes in the notebook to practice. Attempt mock tests first!");
  };

  window.toggleQuizSectionSelect = function () {
    const mode = document.getElementById("quiz-mode").value;
    const group = document.getElementById("quiz-section-group");
    group.style.display = mode === "section" ? "block" : "none";
  };

  window.handleGenerateCustomQuiz = async function (e) {
    e.preventDefault();
    const mode = document.getElementById("quiz-mode").value;
    const section = document.getElementById("quiz-section").value;
    const count = document.querySelector('input[name="quiz_count"]:checked').value;

    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/quiz/custom`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, section, count })
        });
        const json = await res.json();
        if (json.success && json.data.questions.length > 0) {
          launchCustomExam(json.data);
          return;
        }
      } catch (err) {}
    }

    generateClientFallbackQuiz(mode, section, parseInt(count, 10));
  };

  function generateClientFallbackQuiz(mode, section, count) {
    let pool = [];
    for (let sId = 1; sId <= 32; sId++) {
      const d = window[`SET_${sId}_DATA`] || [];
      pool = pool.concat(d);
    }
    if (mode === "section") {
      pool = pool.filter((q) => q.section === section);
    }
    pool.sort(() => Math.random() - 0.5);
    const selected = pool.slice(0, count).map((q, idx) => ({ ...q, id: idx + 1 }));

    launchCustomExam({
      title: `Custom Practice Quiz (${mode === "section" ? section : "Mixed"})`,
      duration_minutes: Math.round(selected.length * 0.9),
      total_questions: selected.length,
      questions: selected
    });
  }

  function launchCustomExam(quizData) {
    APP_STATE.isCustomQuiz = true;
    APP_STATE.currentTestTitle = quizData.title;
    APP_STATE.questions = quizData.questions;
    APP_STATE.currentQIndex = 0;
    APP_STATE.timerRemaining = quizData.duration_minutes * 60;
    APP_STATE.showSnapshot = false;

    APP_STATE.responses = {};
    APP_STATE.questions.forEach((q) => {
      APP_STATE.responses[q.id] = { option: null, status: "not-visited", timeSpent: 0 };
    });
    APP_STATE.responses[APP_STATE.questions[0].id].status = "not-answered";

    document.getElementById("home-view").style.display = "none";
    document.getElementById("mistakes-view").style.display = "none";
    document.getElementById("quiz-view").style.display = "none";
    document.getElementById("analytics-view").style.display = "none";
    document.getElementById("hub-nav").style.display = "none";
    document.getElementById("timer-container").style.display = "flex";
    document.getElementById("result-view").style.display = "none";
    document.getElementById("exam-view").style.display = "flex";
    APP_STATE.view = "exam";

    document.getElementById("exam-header-title").innerText = quizData.title;
    document.getElementById("palette-total-title").innerText = `Question Palette (${quizData.questions.length})`;

    startTimer();
    renderSectionsBar();
    renderCurrentQuestion();
    renderPalette();
  }

  async function renderAnalyticsDashboard() {
    let stats = null;
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/analytics/summary`);
        const json = await res.json();
        if (json.success) stats = json.data;
      } catch (e) {}
    }

    if (!stats) {
      const hist = getLocalHistory();
      const keys = Object.keys(hist);
      const scores = keys.map((k) => hist[k].score);
      stats = {
        overall: {
          total_tests_taken: keys.length,
          average_score: keys.length ? (scores.reduce((a, b) => a + b, 0) / keys.length).toFixed(2) : 0,
          highest_score: keys.length ? Math.max(...scores).toFixed(2) : 0,
          average_accuracy: keys.length ? (keys.reduce((a, b) => a + hist[b].accuracy, 0) / keys.length).toFixed(1) : 0
        },
        section_performance: [
          { section: "General Science", accuracy: 82.5 },
          { section: "Mathematics", accuracy: 78.0 },
          { section: "General Intelligence & Reasoning", accuracy: 88.0 },
          { section: "General Awareness", accuracy: 65.0 }
        ],
        score_trend: keys.map((k) => ({
          id: k,
          title: `Set ${k}`,
          score: hist[k].score,
          accuracy: hist[k].accuracy,
          submitted_at: hist[k].submittedAt
        }))
      };
    }

    document.getElementById("an-tests-taken").innerText = stats.overall.total_tests_taken;
    document.getElementById("an-avg-score").innerText = stats.overall.average_score;
    document.getElementById("an-best-score").innerText = stats.overall.highest_score;
    document.getElementById("an-avg-accuracy").innerText = `${stats.overall.average_accuracy}%`;

    const barContainer = document.getElementById("analytics-subject-bars");
    barContainer.innerHTML = "";
    const colorMap = {
      "General Science": "#10b981",
      "Mathematics": "#3b82f6",
      "General Intelligence & Reasoning": "#8b5cf6",
      "General Awareness": "#f59e0b"
    };

    (stats.section_performance || []).forEach((sp) => {
      const col = colorMap[sp.section] || "#3b82f6";
      const div = document.createElement("div");
      div.className = "acc-bar-item";
      div.innerHTML = `
        <div class="acc-bar-meta">
          <span>${sp.section}</span>
          <span style="color:${col};">${sp.accuracy}%</span>
        </div>
        <div class="acc-bar-track">
          <div class="acc-bar-fill" style="width: ${sp.accuracy}%; background: ${col};"></div>
        </div>
      `;
      barContainer.appendChild(div);
    });

    const tbody = document.getElementById("analytics-history-tbody");
    tbody.innerHTML = "";
    (stats.score_trend || []).forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>#${item.id || "1"}</td>
        <td>${item.title}</td>
        <td>${item.submitted_at ? item.submitted_at.split("T")[0] : "Recent"}</td>
        <td style="font-weight:700; color:#1e3a8a;">${parseFloat(item.score).toFixed(2)}</td>
        <td>${item.accuracy}%</td>
        <td><button class="btn btn-clear" style="padding:2px 8px; font-size:0.75rem;" onclick="viewSavedResult(${item.set_id || 1})">Review</button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.startTest = async function (setId) {
    let testData = null;

    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/tests/${setId}`);
        const json = await res.json();
        if (json.success) {
          testData = {
            title: json.data.test.title,
            questions: json.data.questions,
            duration_minutes: json.data.test.duration_minutes || 90
          };
        }
      } catch (e) {}
    }

    if (!testData) {
      const meta = (window.SETS_METADATA || []).find((m) => m.id === setId);
      const dataVar = window[`SET_${setId}_DATA`];
      if (!dataVar || !dataVar.length) {
        alert("Shift data loading error. Please refresh.");
        return;
      }
      testData = {
        title: meta ? meta.title : `Set ${setId}`,
        questions: dataVar,
        duration_minutes: 90
      };
    }

    APP_STATE.isCustomQuiz = false;
    APP_STATE.currentSetId = setId;
    APP_STATE.currentTestTitle = testData.title;
    APP_STATE.questions = testData.questions;
    APP_STATE.currentQIndex = 0;
    APP_STATE.timerRemaining = testData.duration_minutes * 60;
    APP_STATE.showSnapshot = false;

    APP_STATE.responses = {};
    APP_STATE.questions.forEach((q) => {
      APP_STATE.responses[q.id] = { option: null, status: "not-visited", timeSpent: 0 };
    });
    APP_STATE.responses[APP_STATE.questions[0].id].status = "not-answered";

    document.getElementById("home-view").style.display = "none";
    document.getElementById("mistakes-view").style.display = "none";
    document.getElementById("quiz-view").style.display = "none";
    document.getElementById("analytics-view").style.display = "none";
    document.getElementById("hub-nav").style.display = "none";
    document.getElementById("result-view").style.display = "none";
    document.getElementById("timer-container").style.display = "flex";
    document.getElementById("exam-view").style.display = "flex";
    APP_STATE.view = "exam";

    document.getElementById("exam-header-title").innerText = testData.title;
    document.getElementById("palette-total-title").innerText = `Question Palette (${testData.questions.length})`;

    startTimer();
    renderSectionsBar();
    renderCurrentQuestion();
    renderPalette();
  };

  function startTimer() {
    clearInterval(APP_STATE.timerInterval);
    const timerElem = document.getElementById("timer-display");

    function updateTimer() {
      if (APP_STATE.timerRemaining <= 0) {
        clearInterval(APP_STATE.timerInterval);
        alert("Time is up! Submitting exam automatically...");
        submitExam(true);
        return;
      }

      APP_STATE.timerRemaining--;

      const currentQ = APP_STATE.questions[APP_STATE.currentQIndex];
      if (currentQ && APP_STATE.responses[currentQ.id]) {
        APP_STATE.responses[currentQ.id].timeSpent = (APP_STATE.responses[currentQ.id].timeSpent || 0) + 1;
      }

      const m = Math.floor(APP_STATE.timerRemaining / 60);
      const s = APP_STATE.timerRemaining % 60;
      timerElem.innerText = `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;

      if (m < 5) timerElem.parentElement.className = "timer-box timer-critical";
      else if (m < 15) timerElem.parentElement.className = "timer-box timer-warning";
      else timerElem.parentElement.className = "timer-box";
    }

    updateTimer();
    APP_STATE.timerInterval = setInterval(updateTimer, 1000);
  }

  function renderSectionsBar() {
    const bar = document.getElementById("sections-bar");
    bar.innerHTML = '<span class="section-label">Sections:</span>';

    const currentQ = APP_STATE.questions[APP_STATE.currentQIndex];

    if (APP_STATE.isCustomQuiz) {
      const btn = document.createElement("button");
      btn.className = "section-tab-btn active";
      btn.innerHTML = `<span>All Questions</span> <span class="section-count-badge">${APP_STATE.questions.length}</span>`;
      bar.appendChild(btn);
      return;
    }

    SECTIONS.forEach((sec) => {
      let answeredCount = 0;
      for (let i = sec.range[0]; i <= sec.range[1]; i++) {
        const resp = APP_STATE.responses[i];
        if (resp && (resp.status === "answered" || resp.status === "ans-marked")) {
          answeredCount++;
        }
      }

      const isCurrent = currentQ && currentQ.id >= sec.range[0] && currentQ.id <= sec.range[1];
      const btn = document.createElement("button");
      btn.className = `section-tab-btn ${isCurrent ? "active" : ""}`;
      btn.innerHTML = `<span>${sec.name}</span> <span class="section-count-badge">${answeredCount}/${sec.total}</span>`;
      btn.onclick = () => jumpToQuestionId(sec.range[0]);
      bar.appendChild(btn);
    });
  }

  function renderCurrentQuestion() {
    const q = APP_STATE.questions[APP_STATE.currentQIndex];
    if (!q) return;

    renderSectionsBar();

    const qNumPill = document.getElementById("q-number-pill");
    const qSectionName = document.getElementById("q-section-name");
    const qContent = document.getElementById("question-scroll-content");

    qNumPill.innerText = `Question ${q.id} of ${APP_STATE.questions.length}`;
    qSectionName.innerText = `Section: ${q.section}`;

    const resp = APP_STATE.responses[q.id] || { option: null };

    let html = "";
    if (APP_STATE.showSnapshot && q.card_img) {
      html += `
        <div class="q-snapshot-card">
          <div style="background: #e2e8f0; padding: 6px 12px; font-size: 0.8rem; font-weight: 600; color: #475569;">
            Original Paper Snapshot (CEN 02/2025)
          </div>
          <img src="${q.card_img}" alt="Official Question Paper Snapshot">
        </div>
      `;
    }

    const stemText = q.question && q.question.trim().length > 0 ? q.question : "(Refer to equation / diagram above)";
    html += `<div class="q-text-body" style="font-size: ${getFontSizeStyle()}">${escapeHtml(stemText)}</div>`;

    if (q.has_diagram && q.diagram_img) {
      html += `<div class="q-diagram-container"><img src="${q.diagram_img}" alt="Diagram"></div>`;
    }

    html += `<div class="options-list">`;
    ["A", "B", "C", "D"].forEach((letter) => {
      const optText = q.options[letter] || "";
      const isSelected = resp.option === letter;
      html += `
        <div class="option-item ${isSelected ? "selected" : ""}" onclick="selectOption('${letter}')">
          <input type="radio" name="cbt_opt" value="${letter}" ${isSelected ? "checked" : ""} class="option-radio">
          <span class="opt-letter-badge">${letter}.</span>
          <span class="opt-text">${optText ? escapeHtml(optText) : `<span style="color:#64748b; font-style:italic;">(Option ${letter})</span>`}</span>
        </div>
      `;
    });
    html += `</div>`;

    qContent.innerHTML = html;
    updatePaletteActiveState();
  }

  function getFontSizeStyle() {
    if (APP_STATE.fontSize === "large") return "1.15rem";
    if (APP_STATE.fontSize === "xlarge") return "1.3rem";
    return "1rem";
  }

  window.changeFontSize = function (delta) {
    if (delta > 0) APP_STATE.fontSize = APP_STATE.fontSize === "normal" ? "large" : "xlarge";
    else if (delta < 0) APP_STATE.fontSize = APP_STATE.fontSize === "xlarge" ? "large" : "normal";
    else APP_STATE.fontSize = "normal";
    renderCurrentQuestion();
  };

  window.toggleSnapshotView = function () {
    APP_STATE.showSnapshot = !APP_STATE.showSnapshot;
    const btn = document.getElementById("toggle-snapshot-text");
    if (btn) btn.innerText = APP_STATE.showSnapshot ? "Hide Paper Snapshot" : "View Paper Snapshot";
    renderCurrentQuestion();
  };

  window.selectOption = function (letter) {
    const q = APP_STATE.questions[APP_STATE.currentQIndex];
    if (!q) return;

    APP_STATE.responses[q.id].option = letter;

    document.querySelectorAll(".option-item").forEach((item) => {
      const radio = item.querySelector("input");
      if (radio.value === letter) {
        radio.checked = true;
        item.classList.add("selected");
      } else {
        radio.checked = false;
        item.classList.remove("selected");
      }
    });
  };

  window.handleSaveNext = function () {
    const q = APP_STATE.questions[APP_STATE.currentQIndex];
    const resp = APP_STATE.responses[q.id];
    resp.status = resp.option ? "answered" : "not-answered";
    advanceNext();
  };

  window.handleMarkReview = function () {
    const q = APP_STATE.questions[APP_STATE.currentQIndex];
    const resp = APP_STATE.responses[q.id];
    resp.status = resp.option ? "ans-marked" : "marked";
    advanceNext();
  };

  window.handleClearResponse = function () {
    const q = APP_STATE.questions[APP_STATE.currentQIndex];
    const resp = APP_STATE.responses[q.id];
    resp.option = null;
    resp.status = "not-answered";
    renderCurrentQuestion();
    renderPalette();
  };

  window.handlePrev = function () {
    if (APP_STATE.currentQIndex > 0) {
      saveLeavingState();
      APP_STATE.currentQIndex--;
      markEntered();
      renderCurrentQuestion();
      renderPalette();
    }
  };

  window.handleNext = function () {
    if (APP_STATE.currentQIndex < APP_STATE.questions.length - 1) {
      saveLeavingState();
      APP_STATE.currentQIndex++;
      markEntered();
      renderCurrentQuestion();
      renderPalette();
    }
  };

  function advanceNext() {
    renderPalette();
    if (APP_STATE.currentQIndex < APP_STATE.questions.length - 1) {
      APP_STATE.currentQIndex++;
      markEntered();
      renderCurrentQuestion();
      renderPalette();
    } else {
      alert("You have reached the last question. Click 'Submit Exam' when ready!");
    }
  }

  function saveLeavingState() {
    const q = APP_STATE.questions[APP_STATE.currentQIndex];
    const resp = APP_STATE.responses[q.id];
    if (resp.status === "not-visited") {
      resp.status = resp.option ? "answered" : "not-answered";
    }
  }

  function markEntered() {
    const q = APP_STATE.questions[APP_STATE.currentQIndex];
    const resp = APP_STATE.responses[q.id];
    if (resp.status === "not-visited") {
      resp.status = "not-answered";
    }
  }

  function jumpToQuestionId(qid) {
    const targetIdx = APP_STATE.questions.findIndex((q) => q.id === qid);
    if (targetIdx !== -1) {
      saveLeavingState();
      APP_STATE.currentQIndex = targetIdx;
      markEntered();
      renderCurrentQuestion();
      renderPalette();
    }
  }

  function renderPalette() {
    const grid = document.getElementById("palette-grid");
    grid.innerHTML = "";

    let counts = { answered: 0, notAnswered: 0, notVisited: 0, marked: 0, ansMarked: 0 };

    APP_STATE.questions.forEach((q, idx) => {
      const resp = APP_STATE.responses[q.id];
      const status = resp ? resp.status : "not-visited";

      if (status === "answered") counts.answered++;
      else if (status === "not-answered") counts.notAnswered++;
      else if (status === "marked") counts.marked++;
      else if (status === "ans-marked") counts.ansMarked++;
      else counts.notVisited++;

      const isCurrent = idx === APP_STATE.currentQIndex;
      const btn = document.createElement("button");
      btn.className = `q-btn status-${status} ${isCurrent ? "current" : ""}`;
      btn.innerText = q.id;
      btn.title = `Q${q.id} (${status})`;
      btn.onclick = () => jumpToQuestionId(q.id);
      grid.appendChild(btn);
    });

    document.getElementById("count-answered").innerText = counts.answered;
    document.getElementById("count-not-answered").innerText = counts.notAnswered;
    document.getElementById("count-not-visited").innerText = counts.notVisited;
    document.getElementById("count-marked").innerText = counts.marked;
    document.getElementById("count-ans-marked").innerText = counts.ansMarked;
  }

  function updatePaletteActiveState() {
    document.querySelectorAll(".q-btn").forEach((b, idx) => {
      if (idx === APP_STATE.currentQIndex) b.classList.add("current");
      else b.classList.remove("current");
    });
  }

  window.promptSubmitExam = function () {
    const summaryBody = document.getElementById("modal-summary-body");
    summaryBody.innerHTML = "";

    let totalAns = 0, totalNotAns = 0, totalMarked = 0, totalNotVis = 0;

    const sectionsToSummarize = APP_STATE.isCustomQuiz
      ? [{ name: "Custom Drill", range: [1, APP_STATE.questions.length], total: APP_STATE.questions.length }]
      : SECTIONS;

    sectionsToSummarize.forEach((sec) => {
      let secAns = 0, secNotAns = 0, secMarked = 0, secNotVis = 0;
      for (let i = sec.range[0]; i <= sec.range[1]; i++) {
        const r = APP_STATE.responses[i] || {};
        if (r.status === "answered") secAns++;
        else if (r.status === "ans-marked") { secAns++; secMarked++; }
        else if (r.status === "marked") secMarked++;
        else if (r.status === "not-answered") secNotAns++;
        else secNotVis++;
      }

      totalAns += secAns;
      totalNotAns += secNotAns;
      totalMarked += secMarked;
      totalNotVis += secNotVis;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${sec.name}</td>
        <td>${sec.total}</td>
        <td style="color:#15803d; font-weight:700;">${secAns}</td>
        <td style="color:#b91c1c; font-weight:700;">${secNotAns}</td>
        <td style="color:#6d28d9; font-weight:700;">${secMarked}</td>
        <td>${secNotVis}</td>
      `;
      summaryBody.appendChild(row);
    });

    const m = Math.floor(APP_STATE.timerRemaining / 60);
    const s = APP_STATE.timerRemaining % 60;
    document.getElementById("modal-time-rem").innerText = `${m}m ${s}s`;
    document.getElementById("submit-modal").style.display = "flex";
  };

  window.closeSubmitModal = function () {
    document.getElementById("submit-modal").style.display = "none";
  };

  window.confirmSubmitExam = function () {
    closeSubmitModal();
    submitExam(false);
  };

  async function submitExam(forced) {
    clearInterval(APP_STATE.timerInterval);
    const timeSpent = (APP_STATE.isCustomQuiz ? 25 * 60 : 90 * 60) - APP_STATE.timerRemaining;

    let evalResult = null;

    if (API_BASE && !APP_STATE.isCustomQuiz) {
      try {
        const res = await fetch(`${API_BASE}/tests/${APP_STATE.currentSetId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            responses: APP_STATE.responses,
            timeSpentSeconds: timeSpent,
            candidateId: "Candidate #2602"
          })
        });
        const json = await res.json();
        if (json.success) evalResult = json.data;
      } catch (e) {}
    }

    if (!evalResult) {
      let correct = 0, wrong = 0, unattempted = 0;
      let secStats = {
        "General Science": { correct: 0, wrong: 0, unattempted: 0, score: 0 },
        "Mathematics": { correct: 0, wrong: 0, unattempted: 0, score: 0 },
        "General Intelligence & Reasoning": { correct: 0, wrong: 0, unattempted: 0, score: 0 },
        "General Awareness": { correct: 0, wrong: 0, unattempted: 0, score: 0 }
      };

      APP_STATE.questions.forEach((q) => {
        const resp = APP_STATE.responses[q.id];
        const userOpt = resp ? resp.option : null;
        const isCorr = userOpt && userOpt === q.correct;
        const sec = q.section;
        if (!secStats[sec]) secStats[sec] = { correct: 0, wrong: 0, unattempted: 0, score: 0 };

        if (userOpt) {
          if (isCorr) {
            correct++;
            secStats[sec].correct++;
            secStats[sec].score += 1.0;
          } else {
            wrong++;
            secStats[sec].wrong++;
            secStats[sec].score -= 0.3333;
          }
        } else {
          unattempted++;
          secStats[sec].unattempted++;
        }
      });

      const totalScore = correct * 1.0 - wrong * 0.3333;
      const att = correct + wrong;
      evalResult = {
        score: Math.round(totalScore * 100) / 100,
        correct_count: correct,
        wrong_count: wrong,
        unattempted_count: unattempted,
        accuracy: att > 0 ? (correct / att) * 100 : 0,
        section_breakdown: secStats,
        timeSpent: timeSpent
      };

      if (!APP_STATE.isCustomQuiz) {
        saveLocalResult(APP_STATE.currentSetId, evalResult);
      }
    }

    renderResultView(evalResult);
  }

  window.viewSavedResult = async function (setId) {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/tests/${setId}`);
        const json = await res.json();
        if (json.success) {
          APP_STATE.questions = json.data.questions;
          APP_STATE.currentSetId = setId;
        }
      } catch (e) {}
    }

    if (!APP_STATE.questions.length) {
      APP_STATE.questions = window[`SET_${setId}_DATA`] || [];
      APP_STATE.currentSetId = setId;
    }

    const hist = getLocalHistory()[setId] || {
      score: 0,
      correct_count: 0,
      wrong_count: 0,
      unattempted_count: 100,
      accuracy: 0,
      timeSpent: 5400,
      section_breakdown: {}
    };

    renderResultView(hist);
  };

  function renderResultView(data) {
    APP_STATE.view = "review";
    document.getElementById("exam-view").style.display = "none";
    document.getElementById("timer-container").style.display = "none";
    document.getElementById("hub-nav").style.display = "block";
    document.getElementById("result-view").style.display = "block";

    document.getElementById("res-score-val").innerText = parseFloat(data.score).toFixed(2);
    document.getElementById("res-max-marks").innerText = `/ ${APP_STATE.questions.length}`;
    document.getElementById("res-correct").innerText = data.correct_count !== undefined ? data.correct_count : data.correct;
    document.getElementById("res-wrong").innerText = data.wrong_count !== undefined ? data.wrong_count : data.wrong;
    document.getElementById("res-unattempted").innerText = data.unattempted_count !== undefined ? data.unattempted_count : data.unattempted;
    document.getElementById("res-accuracy").innerText = `${parseFloat(data.accuracy).toFixed(1)}%`;

    const mins = Math.floor((data.timeSpent || 0) / 60);
    const secs = (data.timeSpent || 0) % 60;
    document.getElementById("res-time-taken").innerText = `${mins}m ${secs}s`;

    const tbody = document.getElementById("res-section-table-body");
    tbody.innerHTML = "";
    const breakdown = data.section_breakdown || data.secStats || {};

    Object.keys(breakdown).forEach((secName) => {
      const st = breakdown[secName];
      const att = st.correct + st.wrong;
      const acc = att > 0 ? (st.correct / att) * 100 : 0;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${secName}</td>
        <td>${st.total || (st.correct + st.wrong + st.unattempted)}</td>
        <td>${att}</td>
        <td style="color:#15803d; font-weight:700;">${st.correct}</td>
        <td style="color:#b91c1c; font-weight:700;">${st.wrong}</td>
        <td style="font-weight:700; color:#1e3a8a;">${parseFloat(st.score).toFixed(2)}</td>
        <td>${acc.toFixed(1)}%</td>
      `;
      tbody.appendChild(tr);
    });

    renderReviewQuestions("all");
  }

  window.filterReview = function (filter) {
    APP_STATE.reviewFilter = filter;
    document.querySelectorAll(".review-filter-btn").forEach((b) => {
      if (b.dataset.filter === filter) b.classList.add("active");
      else b.classList.remove("active");
    });
    renderReviewQuestions(filter);
  };

  function renderReviewQuestions(filter) {
    const container = document.getElementById("review-questions-list");
    container.innerHTML = "";

    APP_STATE.questions.forEach((q) => {
      const resp = APP_STATE.responses[q.id] || { option: null };
      const userOpt = resp.option;
      const isCorrect = userOpt && userOpt === q.correct;
      const isWrong = userOpt && userOpt !== q.correct;
      const isSkipped = !userOpt;

      if (filter === "correct" && !isCorrect) return;
      if (filter === "wrong" && !isWrong) return;
      if (filter === "skipped" && !isSkipped) return;

      const card = document.createElement("div");
      card.className = "review-question-card";

      let statusBadge = isCorrect
        ? '<span class="status-tag tag-correct">✓ Correct (+1.00)</span>'
        : isWrong
        ? '<span class="status-tag tag-wrong">✗ Incorrect (-0.33)</span>'
        : '<span class="status-tag tag-skipped">○ Unattempted (0.00)</span>';

      let optHtml = "";
      ["A", "B", "C", "D"].forEach((letter) => {
        const text = q.options[letter] || "";
        const isOfficialCorrect = letter === q.correct;
        const isSelectedByCandidate = letter === userOpt;

        let optClass = "review-option";
        let prefix = `<span class="opt-letter-badge">${letter}.</span>`;

        if (isOfficialCorrect) {
          optClass += " is-correct";
          prefix = `<strong>✓ ${letter}.</strong>`;
        } else if (isSelectedByCandidate && !isOfficialCorrect) {
          optClass += " is-user-wrong";
          prefix = `<strong>✗ ${letter}.</strong>`;
        }

        optHtml += `
          <div class="${optClass}">
            ${prefix}
            <span>${text ? escapeHtml(text) : `(Option ${letter})`}</span>
            ${isOfficialCorrect ? '<span style="margin-left:auto; font-size:0.75rem; color:#15803d; font-weight:700;">Official Answer</span>' : ""}
            ${isSelectedByCandidate && !isOfficialCorrect ? '<span style="margin-left:auto; font-size:0.75rem; color:#b91c1c; font-weight:700;">Your Response</span>' : ""}
          </div>
        `;
      });

      card.innerHTML = `
        <div class="review-q-header">
          <div>
            <strong style="color:#1e3a8a;">Question ${q.id}</strong> · <span style="color:#64748b; font-size:0.85rem;">${q.section}</span>
          </div>
          <div>${statusBadge}</div>
        </div>
        <div class="q-text-body">${escapeHtml(q.question || "")}</div>
        ${q.has_diagram && q.diagram_img ? `<div class="q-diagram-container"><img src="${q.diagram_img}" alt="Diagram"></div>` : ""}
        <div class="review-options-grid">${optHtml}</div>
        <div class="explanation-box">
          <strong>Official Solution:</strong> Correct Option is <strong>(${q.correct})</strong>.
          ${q.card_img ? `<div style="margin-top:8px;"><a href="${q.card_img}" target="_blank" style="color:#2563eb; text-decoration:underline; font-size:0.8rem;">🔍 View Paper Question Snapshot</a></div>` : ""}
        </div>
      `;

      container.appendChild(card);
    });
  }

  window.openInstructions = function () {
    document.getElementById("instructions-modal").style.display = "flex";
  };
  window.closeInstructions = function () {
    document.getElementById("instructions-modal").style.display = "none";
  };

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  window.renderHomeView = () => switchHubTab("tests");
})();
