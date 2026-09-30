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

  const PROFILE_STORAGE_KEY = "rrb_cbt_profile_v1";

  function getCandidateProfile() {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY));
      if (saved && saved.name) return saved;
    } catch (e) {}
    return {
      name: "Rohit Kumar",
      rollNo: "2602025001",
      zone: "RRB Mumbai",
      category: "UR / General"
    };
  }

  function saveCandidateProfile(prof) {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(prof));
    updateCandidateUI();
  }

  function updateCandidateUI() {
    const prof = getCandidateProfile();
    const topName = document.getElementById("top-candidate-name");
    const topMeta = document.getElementById("top-candidate-meta");
    const sideName = document.getElementById("side-candidate-name");
    const sideRoll = document.getElementById("side-candidate-roll");
    const sideZone = document.getElementById("side-candidate-zone");

    if (topName) topName.innerText = prof.name;
    if (topMeta) topMeta.innerText = `Roll: ${prof.rollNo} · ${prof.zone} ⚙️`;
    if (sideName) sideName.innerText = prof.name;
    if (sideRoll) sideRoll.innerText = `Roll No: ${prof.rollNo}`;
    if (sideZone) sideZone.innerText = `Zone: ${prof.zone} (${prof.category})`;
  }

  window.openProfileModal = function () {
    const prof = getCandidateProfile();
    const nameInp = document.getElementById("prof-input-name");
    const rollInp = document.getElementById("prof-input-roll");
    const zoneInp = document.getElementById("prof-input-zone");
    const catInp = document.getElementById("prof-input-category");

    if (nameInp) nameInp.value = prof.name;
    if (rollInp) rollInp.value = prof.rollNo;
    if (zoneInp) zoneInp.value = prof.zone;
    if (catInp) catInp.value = prof.category;

    const modal = document.getElementById("profile-modal");
    if (modal) modal.style.display = "flex";
  };

  window.closeProfileModal = function () {
    const modal = document.getElementById("profile-modal");
    if (modal) modal.style.display = "none";
  };

  window.saveProfileFromModal = function () {
    const name = (document.getElementById("prof-input-name").value || "").trim() || "Candidate";
    const rollNo = (document.getElementById("prof-input-roll").value || "").trim() || "2602025001";
    const zone = document.getElementById("prof-input-zone").value;
    const category = document.getElementById("prof-input-category").value;

    saveCandidateProfile({ name, rollNo, zone, category });
    closeProfileModal();

    if (APP_STATE.activeHubTab === "tests") renderShiftsList();
    else if (APP_STATE.activeHubTab === "analytics") renderAnalyticsDashboard();
  };

  let autoSaveDebounce = null;
  function triggerRealtimeAutoSave(immediate = false) {
    if (APP_STATE.view !== "exam") return;
    if (!API_BASE) return;
    if (APP_STATE.isCustomQuiz) return;

    const doSave = async () => {
      try {
        const prof = getCandidateProfile();
        await fetch(`${API_BASE}/tests/${APP_STATE.currentSetId}/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateId: prof.name,
            currentQIndex: APP_STATE.currentQIndex,
            timeRemaining: APP_STATE.timerRemaining,
            responses: APP_STATE.responses,
            isCustomQuiz: false,
            quizData: null
          })
        });
      } catch (err) {}
    };

    clearTimeout(autoSaveDebounce);
    if (immediate) {
      doSave();
    } else {
      autoSaveDebounce = setTimeout(doSave, 350);
    }
  }

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
    updateCandidateUI();
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
        const prof = getCandidateProfile();
        const candidateQuery = prof && prof.name ? `?candidateId=${encodeURIComponent(prof.name)}` : '';
        const res = await fetch(`${API_BASE}/mistakes${candidateQuery}`);
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

    const prof = getCandidateProfile();
    let sets = [];
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/tests?candidateId=${encodeURIComponent(prof.name)}`);
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
      const score = meta.latest_score !== undefined && meta.latest_score !== null ? meta.latest_score : (localHist[meta.id] ? localHist[meta.id].score : null);
      const isDone = score !== null;
      const isInProgress = meta.active_time_remaining !== null && meta.active_time_remaining !== undefined;
      const seriesLabel = meta.series || (meta.id <= 9 ? "CEN 02/2025" : "CEN 02/2024");

      let statusPill = "";
      if (isInProgress) {
        const remMins = Math.floor(meta.active_time_remaining / 60);
        statusPill = `<span class="shift-status-pill" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-weight:700;">🟢 In Progress · Q${(meta.active_q_index || 0) + 1}/100 (${remMins}m left)</span>`;
      } else if (isDone) {
        statusPill = `<span class="shift-status-pill status-completed">Score: ${parseFloat(score).toFixed(2)} / 100 (${parseFloat(meta.latest_accuracy || 0).toFixed(1)}%)</span>`;
      } else {
        statusPill = `<span class="shift-status-pill status-pending">Not Attempted</span>`;
      }

      let actionButtons = "";
      if (isInProgress) {
        actionButtons = `
          <button class="btn-start-test" style="background:#2563eb; color:#fff;" onclick="resumeTest(${meta.id})">
            ▶ Resume Test
          </button>
          <button class="btn-clear" style="padding:10px 14px; font-size:0.85rem;" onclick="discardSession(${meta.id})">
            Restart Fresh
          </button>
        `;
      } else if (isDone) {
        actionButtons = `
          <button class="btn-start-test" onclick="startTest(${meta.id})">
            Re-attempt Mock Test
          </button>
          <button class="btn-view-score" onclick="viewSavedResult(${meta.id})">
            Review Analysis
          </button>
        `;
      } else {
        actionButtons = `
          <button class="btn-start-test" onclick="startTest(${meta.id})">
            Start Mock Test
          </button>
        `;
      }

      const card = document.createElement("div");
      card.className = "shift-card";
      card.innerHTML = `
        <div>
          <div class="shift-badge-row">
            <span class="shift-tag">${seriesLabel} · Set ${meta.id}</span>
            ${statusPill}
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
          ${actionButtons}
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
        const prof = getCandidateProfile();
        const candidateQuery = prof && prof.name ? `&candidateId=${encodeURIComponent(prof.name)}` : '';
        const res = await fetch(`${API_BASE}/mistakes?status=${APP_STATE.mistakesFilter === "all" ? "" : APP_STATE.mistakesFilter}${candidateQuery}`);
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
        ${m.stem_img ? `
          <div style="margin: 8px 0; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: left;">
            <img src="${m.stem_img}" alt="Q${m.qnum}" style="max-width: 100%; height: auto; display: block; border-radius: 4px;">
          </div>
        ` : (m.question_text ? `
          <div style="font-size:0.95rem; font-weight:500; margin-bottom:10px;">${escapeHtml(m.question_text || "")}</div>
        ` : '')}
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.85rem; color:#334155; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:6px;"><strong>(1)</strong> ${m.opt1_img ? `<img src="${m.opt1_img}" style="max-height:36px; max-width:100%;">` : escapeHtml(m.option_a || "Option 1")}</div>
          <div style="display:flex; align-items:center; gap:6px;"><strong>(2)</strong> ${m.opt2_img ? `<img src="${m.opt2_img}" style="max-height:36px; max-width:100%;">` : escapeHtml(m.option_b || "Option 2")}</div>
          <div style="display:flex; align-items:center; gap:6px;"><strong>(3)</strong> ${m.opt3_img ? `<img src="${m.opt3_img}" style="max-height:36px; max-width:100%;">` : escapeHtml(m.option_c || "Option 3")}</div>
          <div style="display:flex; align-items:center; gap:6px;"><strong>(4)</strong> ${m.opt4_img ? `<img src="${m.opt4_img}" style="max-height:36px; max-width:100%;">` : escapeHtml(m.option_d || "Option 4")}</div>
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
        const prof = getCandidateProfile();
        const res = await fetch(`${API_BASE}/quiz/custom`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "mistakes", count: 25, candidateId: prof.name })
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
    const prof = getCandidateProfile();

    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/quiz/custom`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, section, count, candidateId: prof.name })
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
    const prof = getCandidateProfile();

    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/analytics/summary?candidateId=${encodeURIComponent(prof.name)}`);
        const json = await res.json();
        if (json.success) stats = json.data;
      } catch (e) {}
    }

    if (!stats || !stats.overall || stats.overall.total_tests_taken === 0) {
      // Empty state for this candidate
      document.getElementById("an-tests-taken").innerText = "0";
      document.getElementById("an-avg-score").innerText = "0.00";
      document.getElementById("an-best-score").innerText = "0.00";
      document.getElementById("an-avg-accuracy").innerText = "0%";

      const barContainer = document.getElementById("analytics-subject-bars");
      barContainer.innerHTML = `
        <div style="text-align:center; padding: 32px 20px; color: #64748b;">
          <div style="font-size: 2.2rem; margin-bottom: 10px;">📊</div>
          <div style="font-weight: 700; color: #1e293b; font-size: 1.05rem; margin-bottom: 6px;">No Attempts Yet for ${escapeHtml(prof.name)}</div>
          <div style="font-size: 0.85rem; max-width: 480px; margin: 0 auto; line-height: 1.5;">
            Start practicing from any of the 32 Shift Papers. Your real-time marks, speed, accuracy, and subject mastery breakdown will update here automatically.
          </div>
        </div>
      `;

      const tbody = document.getElementById("analytics-history-tbody");
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b; padding:24px;">No test attempts recorded yet. Attempt a shift paper to see your live analysis!</td></tr>`;
      return;
    }

    document.getElementById("an-tests-taken").innerText = stats.overall.total_tests_taken;
    document.getElementById("an-avg-score").innerText = parseFloat(stats.overall.average_score).toFixed(2);
    document.getElementById("an-best-score").innerText = parseFloat(stats.overall.highest_score).toFixed(2);
    document.getElementById("an-avg-accuracy").innerText = `${parseFloat(stats.overall.average_accuracy).toFixed(1)}%`;

    const barContainer = document.getElementById("analytics-subject-bars");
    barContainer.innerHTML = "";
    const colorMap = {
      "General Science": "#10b981",
      "Mathematics": "#3b82f6",
      "General Intelligence & Reasoning": "#8b5cf6",
      "General Awareness": "#f59e0b"
    };

    if (stats.section_performance && stats.section_performance.length > 0) {
      stats.section_performance.forEach((sp) => {
        const col = colorMap[sp.section] || "#3b82f6";
        const div = document.createElement("div");
        div.className = "acc-bar-item";
        div.innerHTML = `
          <div class="acc-bar-meta">
            <span><strong>${sp.section}</strong> <small style="color:#64748b;">(${sp.total_correct || 0}/${sp.total_attempted || 0} correct)</small></span>
            <span style="color:${col}; font-weight:700;">${sp.accuracy}%</span>
          </div>
          <div class="acc-bar-track">
            <div class="acc-bar-fill" style="width: ${sp.accuracy}%; background: ${col};"></div>
          </div>
        `;
        barContainer.appendChild(div);
      });
    } else {
      barContainer.innerHTML = `<p style="color:#64748b; padding:10px;">Subject data will populate after your first test submission.</p>`;
    }

    const tbody = document.getElementById("analytics-history-tbody");
    tbody.innerHTML = "";
    (stats.score_trend || []).forEach((item) => {
      const tr = document.createElement("tr");
      const dt = item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : "Recent";
      tr.innerHTML = `
        <td><strong>#${item.id}</strong></td>
        <td>${item.title || `Set ${item.set_id}`}</td>
        <td>${dt}</td>
        <td style="font-weight:700; color:#1e3a8a;">${parseFloat(item.score).toFixed(2)}</td>
        <td><span style="color:${item.accuracy >= 65 ? '#15803d' : '#b91c1c'}; font-weight:700;">${parseFloat(item.accuracy).toFixed(1)}%</span></td>
        <td><button class="btn btn-clear" style="padding:4px 10px; font-size:0.75rem; border:1px solid #cbd5e1;" onclick="viewSavedResult(${item.set_id})">View Result</button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.resumeTest = async function (setId) {
    let sessionData = null;
    const prof = getCandidateProfile();
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/tests/${setId}/session?candidateId=${encodeURIComponent(prof.name)}`);
        const json = await res.json();
        if (json.success && json.has_session) {
          sessionData = json.data;
        }
      } catch (e) {}
    }

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
      testData = {
        title: meta ? meta.title : `Set ${setId}`,
        questions: dataVar || [],
        duration_minutes: 90
      };
    }

    APP_STATE.isCustomQuiz = sessionData ? !!sessionData.is_custom_quiz : false;
    APP_STATE.currentSetId = setId;
    APP_STATE.currentTestTitle = testData.title;
    APP_STATE.questions = testData.questions;
    APP_STATE.currentQIndex = sessionData && sessionData.current_q_index !== undefined ? sessionData.current_q_index : 0;
    APP_STATE.timerRemaining = sessionData && sessionData.time_remaining !== undefined ? sessionData.time_remaining : testData.duration_minutes * 60;
    APP_STATE.showSnapshot = false;

    APP_STATE.responses = sessionData && sessionData.responses ? sessionData.responses : {};
    APP_STATE.questions.forEach((q) => {
      if (!APP_STATE.responses[q.id]) {
        APP_STATE.responses[q.id] = { option: null, status: "not-visited", timeSpent: 0 };
      }
    });

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

  window.discardSession = async function (setId) {
    if (!confirm("Are you sure you want to discard your in-progress attempt for this shift and restart fresh?")) {
      return;
    }
    const prof = getCandidateProfile();
    if (API_BASE) {
      try {
        await fetch(`${API_BASE}/tests/${setId}/session?candidateId=${encodeURIComponent(prof.name)}`, { method: "DELETE" });
      } catch (e) {}
    }
    renderShiftsList();
  };

  window.exitExamToHub = async function () {
    if (confirm("Pause and save your test progress in real time? You can resume anytime from the Shift Papers list.")) {
      clearInterval(APP_STATE.timerInterval);
      await triggerRealtimeAutoSave(true);
      switchHubTab("tests");
    }
  };

  window.startTest = async function (setId) {
    const prof = getCandidateProfile();
    // If an active session exists in backend for this candidate, automatically resume it
    if (API_BASE) {
      try {
        const sRes = await fetch(`${API_BASE}/tests/${setId}/session?candidateId=${encodeURIComponent(prof.name)}`);
        const sJson = await sRes.json();
        if (sJson.success && sJson.has_session) {
          return resumeTest(setId);
        }
      } catch (e) {}
    }

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
    triggerRealtimeAutoSave(true);
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

      // Real-time auto-save every 5 seconds
      if (APP_STATE.timerRemaining % 5 === 0) {
        triggerRealtimeAutoSave();
      }
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
    if (q.stem_img) {
      html += `
        <div class="cbt-question-card" style="margin-bottom: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); text-align: left;">
          <img src="${q.stem_img}" alt="Question ${q.id}" style="max-width: 100%; height: auto; display: block; border-radius: 4px;">
        </div>
      `;
    } else if (q.card_img && (!q.question || q.question.trim().length === 0)) {
      html += `
        <div class="cbt-question-card" style="margin-bottom: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); text-align: left;">
          <img src="${q.card_img}" alt="Question ${q.id}" style="max-width: 100%; height: auto; display: block; border-radius: 4px;">
        </div>
      `;
    } else {
      const stemText = q.question && q.question.trim().length > 0 ? q.question : "";
      if (stemText) {
        html += `<div class="q-text-body" style="font-size: ${getFontSizeStyle()}; margin-bottom: 18px; line-height: 1.6; color: #0f172a; font-weight: 500;">${escapeHtml(stemText)}</div>`;
      }
      if (q.has_diagram && q.diagram_img) {
        html += `<div class="q-diagram-container" style="margin-bottom: 18px;"><img src="${q.diagram_img}" alt="Diagram" style="max-width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 6px;"></div>`;
      }
    }

    html += `<div class="options-list">`;
    const letterMap = ["A", "B", "C", "D"];
    letterMap.forEach((letter, idx) => {
      const numLabel = idx + 1;
      const optText = q.options && q.options[letter] ? q.options[letter] : "";
      const optImg = q.options_img && q.options_img[letter] ? q.options_img[letter] : null;
      const isSelected = resp.option === letter;

      let displayHtml = "";
      if (optImg) {
        displayHtml = `<span class="opt-text" style="display: inline-flex; align-items: center; width: 100%;"><img src="${optImg}" alt="Option ${numLabel}" style="max-height: 52px; max-width: 100%; height: auto; vertical-align: middle; border-radius: 3px;"></span>`;
      } else if (optText && !optText.toLowerCase().startsWith("option ") && !optText.includes("See Question Card")) {
        displayHtml = `<span class="opt-text" style="font-size: ${getFontSizeStyle()};">${escapeHtml(optText)}</span>`;
      } else {
        displayHtml = `<span class="opt-text" style="font-weight: 600; color: #1e293b; font-size: 1rem;">Option ${numLabel}</span>`;
      }

      html += `
        <div class="option-item ${isSelected ? "selected" : ""}" onclick="selectOption('${letter}')">
          <input type="radio" name="cbt_opt" value="${letter}" ${isSelected ? "checked" : ""} class="option-radio">
          <span class="opt-letter-badge">${numLabel}</span>
          ${displayHtml}
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

    triggerRealtimeAutoSave();
  };

  window.handleSaveNext = function () {
    const q = APP_STATE.questions[APP_STATE.currentQIndex];
    const resp = APP_STATE.responses[q.id];
    resp.status = resp.option ? "answered" : "not-answered";
    triggerRealtimeAutoSave();
    advanceNext();
  };

  window.handleMarkReview = function () {
    const q = APP_STATE.questions[APP_STATE.currentQIndex];
    const resp = APP_STATE.responses[q.id];
    resp.status = resp.option ? "ans-marked" : "marked";
    triggerRealtimeAutoSave();
    advanceNext();
  };

  window.handleClearResponse = function () {
    const q = APP_STATE.questions[APP_STATE.currentQIndex];
    const resp = APP_STATE.responses[q.id];
    resp.option = null;
    resp.status = "not-answered";
    triggerRealtimeAutoSave();
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
    const prof = getCandidateProfile();

    let evalResult = null;

    if (API_BASE && !APP_STATE.isCustomQuiz) {
      try {
        const res = await fetch(`${API_BASE}/tests/${APP_STATE.currentSetId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            responses: APP_STATE.responses,
            timeSpentSeconds: timeSpent,
            candidateId: prof.name
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
    }

    if (evalResult && !APP_STATE.isCustomQuiz) {
      saveLocalResult(APP_STATE.currentSetId, evalResult);
    }

    await loadInitialData();
    renderResultView(evalResult);
  }

  window.viewSavedResult = async function (setId) {
    const prof = getCandidateProfile();
    let attemptData = null;

    if (API_BASE) {
      try {
        const [testRes, attemptRes] = await Promise.all([
          fetch(`${API_BASE}/tests/${setId}`),
          fetch(`${API_BASE}/tests/${setId}/latest-attempt?candidateId=${encodeURIComponent(prof.name)}`)
        ]);
        const testJson = await testRes.json();
        const attemptJson = await attemptRes.json();

        if (testJson.success) {
          APP_STATE.questions = testJson.data.questions;
          APP_STATE.currentSetId = setId;
        }

        if (attemptJson.success && attemptJson.has_attempt) {
          const at = attemptJson.data.attempt;
          const respList = attemptJson.data.responses || [];

          APP_STATE.responses = {};
          respList.forEach((r) => {
            APP_STATE.responses[r.qnum] = {
              option: r.selected_option,
              status: r.status,
              timeSpent: r.time_spent
            };
          });

          let secStats = {
            "General Science": { correct: 0, wrong: 0, unattempted: 0, score: 0 },
            "Mathematics": { correct: 0, wrong: 0, unattempted: 0, score: 0 },
            "General Intelligence & Reasoning": { correct: 0, wrong: 0, unattempted: 0, score: 0 },
            "General Awareness": { correct: 0, wrong: 0, unattempted: 0, score: 0 }
          };

          respList.forEach((r) => {
            const sec = r.section;
            if (!secStats[sec]) secStats[sec] = { correct: 0, wrong: 0, unattempted: 0, score: 0 };
            if (r.selected_option) {
              if (r.is_correct) {
                secStats[sec].correct++;
                secStats[sec].score += 1.0;
              } else {
                secStats[sec].wrong++;
                secStats[sec].score -= 0.3333;
              }
            } else {
              secStats[sec].unattempted++;
            }
          });

          attemptData = {
            score: at.score,
            correct_count: at.correct_count,
            wrong_count: at.wrong_count,
            unattempted_count: at.unattempted_count,
            accuracy: at.accuracy,
            timeSpent: at.time_spent_seconds,
            section_breakdown: secStats
          };
        }
      } catch (e) {}
    }

    if (!APP_STATE.questions.length) {
      APP_STATE.questions = window[`SET_${setId}_DATA`] || [];
      APP_STATE.currentSetId = setId;
    }

    if (!attemptData) {
      const hist = getLocalHistory()[setId] || {
        score: 0,
        correct_count: 0,
        wrong_count: 0,
        unattempted_count: 100,
        accuracy: 0,
        timeSpent: 5400,
        section_breakdown: {}
      };
      attemptData = hist;
    }

    renderResultView(attemptData);
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
      const letterMap = ["A", "B", "C", "D"];
      letterMap.forEach((letter, idx) => {
        const numLabel = idx + 1;
        const text = q.options && q.options[letter] ? q.options[letter] : "";
        const isOfficialCorrect = letter === q.correct;
        const isSelectedByCandidate = letter === userOpt;

        let optClass = "review-option";
        let prefix = `<span class="opt-letter-badge">${numLabel}</span>`;

        if (isOfficialCorrect) {
          optClass += " is-correct";
          prefix = `<strong>✓ Option ${numLabel}</strong>`;
        } else if (isSelectedByCandidate && !isOfficialCorrect) {
          optClass += " is-user-wrong";
          prefix = `<strong>✗ Option ${numLabel}</strong>`;
        } else {
          prefix = `<span>Option ${numLabel}</span>`;
        }

        const optImg = q.options_img && q.options_img[letter] ? q.options_img[letter] : (q[`opt${numLabel}_img`] || null);
        let displayLabel = "";
        if (optImg) {
          displayLabel = `<span style="margin-left: 8px; display: inline-flex; align-items: center;"><img src="${optImg}" alt="Option ${numLabel}" style="max-height: 42px; max-width: 100%; vertical-align: middle; border-radius: 2px;"></span>`;
        } else if (text && !text.toLowerCase().startsWith("option ") && !text.includes("See Question Card")) {
          displayLabel = `<span style="margin-left: 8px;">${escapeHtml(text)}</span>`;
        } else {
          displayLabel = `<span style="margin-left: 8px; font-weight: 600;">Option ${numLabel}</span>`;
        }

        optHtml += `
          <div class="${optClass}">
            ${prefix}
            ${displayLabel}
            ${isOfficialCorrect ? '<span style="margin-left:auto; font-size:0.75rem; color:#15803d; font-weight:700;">Official Correct</span>' : ""}
            ${isSelectedByCandidate && !isOfficialCorrect ? '<span style="margin-left:auto; font-size:0.75rem; color:#b91c1c; font-weight:700;">Your Response</span>' : ""}
          </div>
        `;
      });

      const correctNum = { A: 1, B: 2, C: 3, D: 4 }[q.correct] || q.correct;

      card.innerHTML = `
        <div class="review-q-header">
          <div>
            <strong style="color:#1e3a8a;">Question ${q.id}</strong> · <span style="color:#64748b; font-size:0.85rem;">${q.section}</span>
          </div>
          <div>${statusBadge}</div>
        </div>
        ${q.stem_img ? `
          <div style="margin: 12px 0; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; text-align: left;">
            <img src="${q.stem_img}" alt="Question ${q.id}" style="max-width: 100%; height: auto; display: block; border-radius: 4px;">
          </div>
        ` : (q.card_img && (!q.question || q.question.trim().length === 0)) ? `
          <div style="margin: 12px 0; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; text-align: left;">
            <img src="${q.card_img}" alt="Question ${q.id}" style="max-width: 100%; height: auto; display: block; border-radius: 4px;">
          </div>
        ` : `
          <div class="q-text-body">${escapeHtml(q.question || "")}</div>
          ${q.has_diagram && q.diagram_img ? `<div class="q-diagram-container"><img src="${q.diagram_img}" alt="Diagram"></div>` : ""}
        `}
        <div class="review-options-grid">${optHtml}</div>
        <div class="explanation-box" style="margin-top: 14px; background: #f8fafc; border-left: 4px solid #16a34a; padding: 12px 14px; border-radius: 4px;">
          <div style="color: #166534; font-weight: 700; margin-bottom: 4px;">Official Solution:</div>
          <div>Correct Option is <strong>Option ${correctNum}</strong> (Marked as Option ${q.correct} in RRB Key).</div>
          <div style="color: #64748b; font-size: 0.8rem; margin-top: 4px;">Referenced from official RRB Technician Grade III official examination paper.</div>
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
