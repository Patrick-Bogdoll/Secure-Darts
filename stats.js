let currentModalType = "secure";
let currentModalRawName = "";
let scoreDistChart = null;

// --- NEU: Zieht das Bild für ALLE User aus der Profiles-Tabelle ---
async function loadProfileAvatar(playerName) {
  let avatarImg = document.getElementById("modal-avatar-preview");
  if (!avatarImg) return;

  // 1. In der neuen Supabase Tabelle nach dem Namen suchen
  let { data: profile } = await _supabase
    .from("profiles")
    .select("avatar_url")
    .eq("name", playerName)
    .maybeSingle();

  // 2. Direkt das richtige Bild setzen (Verhindert das Flackern)
  if (profile && profile.avatar_url) {
    avatarImg.src = profile.avatar_url;
  } else {
    avatarImg.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${playerName}`;
  }
}

// ==========================================
// 1. ZENTRALE KONFIGURATION
// ==========================================
const STATS_CONFIG = {
  501: {
    table: "stats_501",
    alertText: "Noch keine 501-Daten für {name} vorhanden.",
    fetchType: "single",
    kpiLabels: [
      "Geworfene Darts",
      "Legs Gespielt",
      "Legs Winrate%",
      "Lifetime Avg",
      "High Finish",
      "Double Rate",
      "Bestes Leg",
      "100+",
      "140+",
      "180s",
    ],
    chartColor: "#10b981", // accent-green
    chartInteraction: "nearest",
    chartAxis: "x",
    chartTitle: null,
    hasScoreDist: true,
  },
  secure: {
    table: "stats_secure",
    alertText: "Noch keine Secure-Daten für {name} vorhanden.",
    fetchType: "single",
    kpiLabels: [
      "Siege",
      "Highscore",
      "Winrate%",
      "Ø Score",
      "Secure Rate",
      "Double Rate",
    ],
    chartColor: "#3b82f6", // accent-blue
    chartInteraction: "index",
    chartAxis: "xy",
    chartTitle: "DURCHSCHNITT PRO ZAHL",
  },
  bobs: {
    table: "stats_bobs",
    alertText: "Noch keine Bob's 27-Daten vorhanden.",
    fetchType: "multiple",
    kpiLabels: [
      "Gespielte Runden",
      "Siege",
      "Highscore",
      "Winrate%",
      "Ø Score",
      "Letztes Spiel",
    ],
    chartColor: "#f59e0b", // accent-orange
    chartInteraction: "index",
    chartAxis: "xy",
    chartTitle: "PUNKTEVERLAUF (LETZTE 20 SPIELE)",
  },
  rtw: {
    table: "stats_rtw",
    alertText: "Noch keine RTW-Daten vorhanden.",
    fetchType: "multiple",
    kpiLabels: [
      "Gespielte Runden",
      "Highscore",
      "Ø Treffer",
      "Single Modus",
      "Double Modus",
      "Triple Modus",
      "Alle Modus",
    ],
    chartColor: "#06b6d4", // accent-cyan
    chartInteraction: "index",
    chartAxis: "xy",
    chartTitle: "TREFFERVERLAUF (LETZTE 20 SPIELE)",
  },
};

// ==========================================
// 2. HAUPTSTEUERUNG & INITIALISIERUNG
// ==========================================

// Einstiegspunkt, wenn aus dem Leaderboard oder Profil geklickt wird
async function initUniversalModal(mode, encodedData, isSwitching = false) {
  currentModalType = mode;
  const data = JSON.parse(decodeURIComponent(encodedData));

  if (!isSwitching) {
    currentModalPlayer = data.name;
    currentModalRawName = data.name
      .replace(" (Training)", "")
      .replace(" (501)", "");
  }

  // Für 501 brauchen wir zusätzlich die Historie für den Chart
  let extraChartData = null;
  if (mode === "501") {
    let { data: mData } = await _supabase
      .from("match_history_501")
      .select("match_details, created_at")
      .eq("player_name", data.name)
      .order("created_at", { ascending: false })
      .limit(15);
    extraChartData = mData;
  }

  await renderUniversalStats(mode, data, extraChartData, isSwitching);
}

// Wrapper für bestehende onclick-Aufrufe
async function openMatchStats(mode, encodedData) {
  await initUniversalModal(mode, encodedData, false);
}
async function openProStats(encodedData) {
  await initUniversalModal("secure", encodedData, false);
}
async function open501Stats(encodedData) {
  await initUniversalModal("501", encodedData, false);
}

// Wird vom internen Modal-Tab-Menü aufgerufen
async function switchModalMode(mode) {
  if (!currentModalRawName) return;
  currentModalType = mode;
  document.getElementById("tab-overview").style.opacity = "0.5";

  // Buttons updaten
  document.querySelectorAll("#modal-mode-toggle .nav-btn").forEach((btn) => {
    btn.style.background = "#333";
    btn.style.color = "#aaa";
  });
  let activeBtn = document.getElementById(`modal-btn-${mode}`);
  if (activeBtn) {
    activeBtn.style.background = "var(--accent-blue)";
    activeBtn.style.color = "white";
  }

  const conf = STATS_CONFIG[mode];
  let query = _supabase
    .from(conf.table)
    .select("*")
    .eq("name", currentModalRawName);
  if (conf.fetchType === "multiple") {
    query = query.order("created_at", { ascending: false });
  }

  let { data } =
    conf.fetchType === "single" ? await query.maybeSingle() : await query;

  if (data && (conf.fetchType === "single" || data.length > 0)) {
    let extraChartData = null;
    if (mode === "501") {
      let { data: mData } = await _supabase
        .from("match_history_501")
        .select("match_details, created_at")
        .eq("player_name", currentModalRawName)
        .order("created_at", { ascending: false })
        .limit(15);
      extraChartData = mData;
    }
    await renderUniversalStats(mode, data, extraChartData, true);
  } else {
    alert(conf.alertText.replace("{name}", currentModalRawName));
  }
  document.getElementById("tab-overview").style.opacity = "1";
}

// ==========================================
// 3. RENDER-ENGINE FÜR DAS MODAL
// ==========================================
async function renderUniversalStats(
  mode,
  rawData,
  extraChartData,
  isSwitching,
) {
  const conf = STATS_CONFIG[mode];
  const isArray = Array.isArray(rawData);
  const firstRecord = isArray ? rawData[0] : rawData;

  // --- Avatar & Edit UI ---
  let editBtn = document.getElementById("btn-edit-name");
  let editAvatarBtn = document.getElementById("btn-edit-avatar");

  // Edit-Buttons nur anzeigen, wenn man sein eigenes Profil ansieht
  if (!isGuest && currentUser && firstRecord.user_id === currentUser.id) {
    if (editBtn) editBtn.style.display = "block";
    if (editAvatarBtn) editAvatarBtn.style.display = "block";
  } else {
    if (editBtn) editBtn.style.display = "none";
    if (editAvatarBtn) editAvatarBtn.style.display = "none";
  }

  document.getElementById("modal-name").innerText = currentModalRawName;

  // ---> Avatar für ALLE User aus der Datenbank laden
  if (!isSwitching) {
    await loadProfileAvatar(currentModalRawName);
  }

  // Buttons updaten (Falls wir nicht über switchModalMode kamen)
  document.querySelectorAll("#modal-mode-toggle .nav-btn").forEach((btn) => {
    btn.style.background = "#333";
    btn.style.color = "#aaa";
  });
  let activeBtn = document.getElementById(`modal-btn-${mode}`);
  if (activeBtn) {
    activeBtn.style.background = "var(--accent-blue)";
    activeBtn.style.color = "white";
  }

  // --- Parse Data ---
  let parsed;
  if (mode === "501") parsed = parse501Data(rawData, extraChartData);
  else if (mode === "secure") parsed = parseSecureData(rawData);
  else if (mode === "bobs") parsed = parseBobsData(rawData);
  else if (mode === "rtw") parsed = parseRtwData(rawData);

  // --- KPIs Befüllen ---
  for (let i = 0; i < 10; i++) {
    let box = document.getElementById(`box-kpi-${i + 1}`);
    let label = document.getElementById(`lbl-kpi-${i + 1}`);
    let value = document.getElementById(`kpi-${i + 1}`);

    if (conf.kpiLabels[i]) {
      if (box) box.style.display = "block";
      if (label) label.innerText = conf.kpiLabels[i];
      if (value) {
        value.innerText = parsed.kpis[i].val;
        value.style.color = parsed.kpis[i].color || "white";
      }
    } else {
      if (box) box.style.display = "none";
    }
  }

  // --- Chart Rendern ---
  const chartTitle = document.querySelector("#tab-overview h4");
  if (conf.chartTitle) {
    chartTitle.style.display = "block";
    chartTitle.innerText = conf.chartTitle;
    document.querySelector(".chart-container").style.display = "block";
  } else if (mode === "501") {
    chartTitle.style.display = "none";
    document.querySelector(".chart-container").style.display = "block";
  } else {
    chartTitle.style.display = "none";
    document.querySelector(".chart-container").style.display = "none";
  }
  renderChart(parsed.chart.labels, parsed.chart.values, conf);

  // ---> NEU: SCORE DISTRIBUTION CHART STEUERUNG ÜBER CONFIG <---
  const distCanvas = document.getElementById("score-dist-chart");
  if (distCanvas && distCanvas.parentElement) {
    if (conf.hasScoreDist && parsed.scoreFrequencies) {
      distCanvas.parentElement.style.display = "block"; // Zeigt die Box
      renderScoreDistributionChart(parsed.scoreFrequencies);
    } else {
      distCanvas.parentElement.style.display = "none"; // Versteckt sie bei anderen Modi
    }
  }
  // -------------------------------------------------------------

  // --- Historie Rendern ---
  if (conf.fetchType === "multiple") {
    document.getElementById("history-list").innerHTML = parsed.historyHtml;
  } else if (document.getElementById("tab-history").style.display === "block") {
    loadMatchHistory(); // Dynamisches Fetching für 501 / Secure
  }

  if (!isSwitching) switchModalTab("overview");
  document.getElementById("stats-modal").style.display = "flex";
}

// ==========================================
// 4. PARSER (Daten normalisieren)
// ==========================================
function parse501Data(data, extraChartData) {
  let gp = data.games_played || 0;
  let winrate = gp > 0 ? Math.round((data.wins / gp) * 100) + "%" : "0%";
  let lifetimeAvg =
    data.total_darts_thrown > 0
      ? ((data.total_score_thrown / data.total_darts_thrown) * 3).toFixed(2)
      : "0.00";
  let doubleRate =
    data.checkout_attempts > 0
      ? Math.round((data.checkout_hits / data.checkout_attempts) * 100) + "%"
      : "0%";

  let kpis = [
    { val: data.total_darts_thrown || 0, color: "white" },
    { val: gp, color: "white" },
    { val: winrate, color: "white" },
    { val: lifetimeAvg, color: "var(--accent-green)" },
    { val: data.highest_finish || 0, color: "white" },
    { val: doubleRate, color: "var(--accent-red)" },
    { val: data.best_leg > 0 ? data.best_leg : "-", color: "white" },
    { val: data.count_100 || 0, color: "white" },
    { val: data.count_140 || 0, color: "white" },
    { val: data.count_180 || 0, color: "var(--accent-green)" },
  ];

  let cLabels = [],
    cValues = [];
  if (extraChartData && extraChartData.length > 0) {
    let legCount = 1;
    extraChartData.reverse().forEach((match) => {
      if (match.match_details && Array.isArray(match.match_details)) {
        match.match_details.forEach((leg) => {
          cLabels.push(`Leg ${legCount++}`);
          let isP1 = leg.p1_name === currentModalPlayer;
          let darts = isP1 ? leg.p1_darts : leg.p2_darts;
          let score = isP1 ? 501 - leg.p1_rest : 501 - leg.p2_rest;
          let avg = darts > 0 ? ((score / darts) * 3).toFixed(2) : 0;
          cValues.push(parseFloat(avg));
        });
      }
    });
  }
  if (cValues.length === 0) {
    cLabels = ["Keine Daten"];
    cValues = [0];
  }
  if (cValues.length > 15) {
    cValues = cValues.slice(-15);
    cLabels = cLabels.slice(-15);
  }

  return {
    kpis,
    chart: { labels: cLabels, values: cValues },
    scoreFrequencies: data.score_frequencies || {}, // <--- NEU
  };
}

function parseSecureData(data) {
  let gp = data.games_played || 0;
  let rp = data.rounds_played || 0;
  let winrate = gp > 0 ? Math.round((data.wins / gp) * 100) + "%" : "0%";
  let avgScore = gp > 0 ? Math.round(data.total_points / gp) : "0";
  let secRate =
    rp > 0 ? Math.round((data.secure_count / rp) * 100) + "%" : "0%";
  let dblRate =
    rp > 0 ? Math.round((data.double_count / rp) * 100) + "%" : "0%";

  let kpis = [
    { val: data.wins, color: "var(--accent-green)" },
    { val: data.highscore, color: "var(--accent-purple)" },
    { val: winrate, color: "white" },
    { val: avgScore, color: "white" },
    { val: secRate, color: "var(--accent-blue)" },
    { val: dblRate, color: "var(--accent-red)" },
  ];

  const allTargets = [];
  for (let i = 1; i <= 20; i++) allTargets.push(i.toString());
  allTargets.push("25", "50");
  const cLabels = allTargets.map((t) =>
    t === "25" ? "BULL" : t === "50" ? "B-EYE" : t,
  );
  const numStats = data.number_stats || {};
  const cValues = allTargets.map((key) => {
    const s = numStats[key];
    return s && s.count > 0 ? (s.points / s.count).toFixed(1) : 0;
  });

  return { kpis, chart: { labels: cLabels, values: cValues } };
}

function parseBobsData(data) {
  let totalGames = data.length;
  let totalWins = data.filter((g) => g.is_win).length;
  let highscore =
    totalGames > 0 ? Math.max(...data.map((g) => g.final_score)) : 0;
  let avgScore =
    totalGames > 0
      ? Math.round(data.reduce((sum, g) => sum + g.final_score, 0) / totalGames)
      : 0;
  let winRate =
    totalGames > 0 ? Math.round((totalWins / totalGames) * 100) + "%" : "0%";
  let lastScore = totalGames > 0 ? data[0].final_score : 0;

  let kpis = [
    { val: totalGames, color: "white" },
    { val: totalWins, color: "var(--accent-green)" },
    { val: highscore, color: "var(--accent-purple)" },
    { val: winRate, color: "white" },
    { val: avgScore, color: "var(--accent-blue)" },
    { val: lastScore, color: "white" },
  ];

  let chartGames = data.slice(0, 20).reverse();
  let cLabels = chartGames.map((_, i) => `Spiel ${i + 1}`);
  let cValues = chartGames.map((g) => g.final_score);

  let historyHtml = "";
  data.forEach((game) => {
    let dateStr = new Date(game.created_at).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    let winColor = game.is_win ? "var(--accent-green)" : "var(--accent-red)";
    let safeData = encodeURIComponent(JSON.stringify(game)).replace(
      /'/g,
      "%27",
    );

    // Detail-Tabelle generieren
    let detailsHTML = `<div style="border-top: 1px solid #444; margin-top: 10px; padding-top: 5px;">`;
    if (game.details && Array.isArray(game.details)) {
      game.details.forEach((turn) => {
        let hitColor =
          turn.hits > 0 ? "var(--accent-green)" : "var(--accent-red)";
        detailsHTML += `
          <div style="display: flex; justify-content: space-between; font-size: 0.85em; padding: 6px 0; border-bottom: 1px solid #222;">
            <span style="color: #888;">Feld <b style="color: white;">${
              turn.target === 25 ? "BULL" : `D${turn.target}`
            }</b> (${turn.hits}x)</span>
            <span style="color: ${hitColor}; font-weight: bold;">${
              turn.points > 0 ? "+" : ""
            }${turn.points}</span>
          </div>`;
      });
    } else {
      detailsHTML += `<div style="color: #888; font-size: 0.85em; padding: 10px 0;">Keine Details verfügbar.</div>`;
    }
    detailsHTML += `</div>`;

    // History Item im Secure/501 Design
    historyHtml += `
      <div class="history-item ${
        game.is_win ? "win" : "lose"
      }" style="background: var(--glass-bg); margin-bottom: 8px;">
        <div class="history-summary" onclick="toggleHistoryDetails(this)" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
          <div style="text-align:left;">
            <div style="font-weight:bold; color:${winColor}">${
              game.is_win ? "SIEG" : "BUST"
            }</div>
            <div class="history-date">${dateStr}</div>
          </div>
          <div style="display:flex; align-items:center; gap:15px;">
            <div style="font-size: 1.5em; font-weight: bold; color: white;">
              ${
                game.final_score
              } <span style="font-size: 0.5em; color: #888; font-weight: normal;">Pkt</span>
            </div>
            ${
              currentUser &&
              (game.user_id === currentUser.id || game.name === myOnlineName)
                ? `
              <button onclick="event.stopPropagation(); deleteUniversalMatch('bobs', ${game.id}, '${safeData}')" 
                      style="background:none; border:none; cursor:pointer; color:var(--text-muted); display:flex; align-items:center; padding:0; height:18px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>`
                : ""
            }
          </div>
        </div>
        <div class="history-details" style="display:none; padding-bottom: 5px;">${detailsHTML}</div>
      </div>`;
  });

  return { kpis, chart: { labels: cLabels, values: cValues }, historyHtml };
}

function parseRtwData(data) {
  let totalGames = data.length;
  let highscore =
    totalGames > 0 ? Math.max(...data.map((g) => g.total_points)) : 0;
  let avgScore =
    totalGames > 0
      ? Math.round(
          data.reduce((sum, g) => sum + g.total_points, 0) / totalGames,
        )
      : 0;

  let kpis = [
    { val: totalGames, color: "white" },
    { val: highscore, color: "var(--accent-blue)" },
    { val: avgScore, color: "white" },
    { val: data.filter((g) => g.mode === "single").length, color: "white" },
    {
      val: data.filter((g) => g.mode === "double").length,
      color: "var(--accent-green)",
    },
    {
      val: data.filter((g) => g.mode === "triple").length,
      color: "var(--accent-purple)",
    },
  ];

  let chartGames = data.slice(0, 20).reverse();
  let cLabels = chartGames.map((_, i) => `Spiel ${i + 1}`);
  let cValues = chartGames.map((g) => g.total_points);

  let historyHtml = "";
  data.forEach((game) => {
    let dateStr = new Date(game.created_at).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    let safeData = encodeURIComponent(JSON.stringify(game)).replace(
      /'/g,
      "%27",
    );
    let modeText =
      game.mode === "single"
        ? "Single"
        : game.mode === "double"
          ? "Double"
          : game.mode === "triple"
            ? "Triple"
            : "Alle";

    let detailsHTML = `<div style="border-top: 1px solid #444; margin-top: 10px; padding-top: 5px;">`;
    if (game.details && Array.isArray(game.details)) {
      game.details.forEach((turn) => {
        detailsHTML += `
          <div style="display: flex; justify-content: space-between; font-size: 0.85em; padding: 6px 0; border-bottom: 1px solid #222;">
            <span style="color: #888;">Feld <b style="color: white;">${
              turn.target === 25 ? "BULL" : turn.target
            }</b></span>
            <span style="color: ${
              turn.hits > 0 ? "var(--accent-green)" : "#888"
            }; font-weight: bold;">${turn.hits} Treffer</span>
          </div>`;
      });
    }
    detailsHTML += `</div>`;

    historyHtml += `
      <div class="history-item win" style="background: var(--glass-bg); margin-bottom: 8px; border-left: 4px solid var(--accent-blue);">
        <div class="history-summary" onclick="toggleHistoryDetails(this)" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
          <div style="text-align:left;">
            <div style="font-weight:bold; color:var(--accent-blue)">MODUS: ${modeText.toUpperCase()}</div>
            <div class="history-date">${dateStr}</div>
          </div>
          <div style="display:flex; align-items:center; gap:15px;">
            <div style="font-size: 1.5em; font-weight: bold; color: white;">
              ${
                game.total_points
              } <span style="font-size: 0.5em; color: #888; font-weight: normal;">Treffer</span>
            </div>
            ${
              currentUser &&
              (game.user_id === currentUser.id || game.name === myOnlineName)
                ? `
              <button onclick="event.stopPropagation(); deleteUniversalMatch('rtw', ${game.id}, '${safeData}')" 
                      style="background:none; border:none; cursor:pointer; color:var(--text-muted); display:flex; align-items:center; padding:0; height:18px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>`
                : ""
            }
          </div>
        </div>
        <div class="history-details" style="display:none; padding-bottom: 5px;">${detailsHTML}</div>
      </div>`;
  });

  return { kpis, chart: { labels: cLabels, values: cValues }, historyHtml };
}

// ==========================================
// 5. CHART.JS RENDERING
// ==========================================
function renderChart(labels, dataArray, conf) {
  if (statsChart) statsChart.destroy();
  const ctx = document.getElementById("statsChart").getContext("2d");

  let tooltipCallback = {};
  if (conf.table === "stats_501") {
    tooltipCallback = {
      label: function (context) {
        return `Avg: ${context.parsed.y}`;
      },
    };
  }

  statsChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Wert",
          data: dataArray,
          borderColor: conf.chartColor,
          backgroundColor: conf.chartColor + "33", // Fügt "33" (ca. 20% Transparenz) an den Hex-Code an
          borderWidth: 3,
          fill: true,
          tension: 0.3,
          pointRadius: conf.chartInteraction === "nearest" ? 5 : 4,
          pointHitRadius: conf.chartInteraction === "nearest" ? 100 : 50,
          pointHoverRadius: conf.chartInteraction === "nearest" ? 12 : 10,
          pointBackgroundColor: conf.chartColor,
          pointBorderColor:
            conf.chartInteraction === "nearest" ? "#fff" : "rgba(0,0,0,0.1)",
          pointBorderWidth: conf.chartInteraction === "nearest" ? 2 : 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: conf.chartInteraction,
        axis: conf.chartAxis,
        intersect: false,
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: { color: "#888" },
        },
        x: { grid: { display: false }, ticks: { color: "#888" } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          position: conf.chartInteraction === "nearest" ? "nearest" : "average",
          backgroundColor: "rgba(0,0,0,0.8)",
          titleFont: { size: 14 },
          bodyFont: { size: 16, weight: "bold" },
          displayColors: false,
          padding: 10,
          callbacks: tooltipCallback,
        },
      },
    },
  });
}

// ==========================================
// 6. ALLGEMEINE STATISTIK-LOGIK (DB & UI)
// ==========================================
async function save501Stats(
  playerName,
  legsWon,
  legsPlayed,
  matchDarts,
  matchScore,
  finalFinish,
  trackerObj,
) {
  if (playerName.includes("[BOT]")) return;

  let isMe = false;
  if (
    !isGuest &&
    currentUser &&
    (playerName === myOnlineName || playerName === localP1Name)
  )
    isMe = true;

  let ex = null;
  if (isMe) {
    let { data: exById } = await _supabase
      .from("stats_501")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle();
    if (exById) ex = exById;
    else {
      let { data: exByName } = await _supabase
        .from("stats_501")
        .select("*")
        .eq("name", playerName)
        .is("user_id", null)
        .maybeSingle();
      if (exByName) ex = exByName;
    }
  } else {
    let { data: guestData } = await _supabase
      .from("stats_501")
      .select("*")
      .eq("name", playerName)
      .is("user_id", null)
      .maybeSingle();
    if (guestData) ex = guestData;
  }

  let tr = trackerObj || {
    bestLeg: 0,
    t100: 0,
    t140: 0,
    t180: 0,
    busts: 0,
    checkoutAttempts: 0,
    checkoutHits: 0,
    scoreFrequencies: {}, // <-- Fallback hinzugefügt
  };

  if (!ex) {
    let payload = {
      name: playerName,
      wins: legsWon,
      games_played: legsPlayed,
      total_darts_thrown: matchDarts,
      total_score_thrown: matchScore,
      highest_finish: finalFinish,
      best_leg: tr.bestLeg || 0,
      count_100: tr.t100 || 0,
      count_140: tr.t140 || 0,
      count_180: tr.t180 || 0,
      count_busts: tr.busts || 0,
      checkout_attempts: tr.checkoutAttempts || 0,
      checkout_hits: tr.checkoutHits || 0,
      score_frequencies: tr.scoreFrequencies || {}, // <-- Neu: Beim Insert speichern
    };
    if (isMe) payload.user_id = currentUser.id;
    const { error: insErr } = await _supabase
      .from("stats_501")
      .insert([payload]);
    if (insErr) console.error(insErr);
  } else {
    let newHighFinish = Math.max(ex.highest_finish || 0, finalFinish);
    let newBestLeg = ex.best_leg > 0 ? ex.best_leg : 999;
    if (tr.bestLeg > 0) newBestLeg = Math.min(newBestLeg, tr.bestLeg);
    if (newBestLeg === 999) newBestLeg = 0;

    // --- NEU: MERGE DER SCORE FREQUENCIES ---
    let mergedFreq = { ...(ex.score_frequencies || {}) };
    let newFreq = tr.scoreFrequencies || {};

    // Wir iterieren über alle Scores, die im Match geworfen wurden, und addieren sie
    for (let scoreKey in newFreq) {
      mergedFreq[scoreKey] = (mergedFreq[scoreKey] || 0) + newFreq[scoreKey];
    }
    // ----------------------------------------

    let updatePayload = {
      wins: (ex.wins || 0) + legsWon,
      games_played: (ex.games_played || 0) + legsPlayed,
      total_darts_thrown: (ex.total_darts_thrown || 0) + matchDarts,
      total_score_thrown: (ex.total_score_thrown || 0) + matchScore,
      highest_finish: newHighFinish,
      best_leg: newBestLeg,
      count_100: (ex.count_100 || 0) + (tr.t100 || 0),
      count_140: (ex.count_140 || 0) + (tr.t140 || 0),
      count_180: (ex.count_180 || 0) + (tr.t180 || 0),
      count_busts: (ex.count_busts || 0) + (tr.busts || 0),
      checkout_attempts:
        (ex.checkout_attempts || 0) + (tr.checkoutAttempts || 0),
      checkout_hits: (ex.checkout_hits || 0) + (tr.checkoutHits || 0),
      score_frequencies: mergedFreq, // <-- Neu: Gemergte Frequenzen updaten
    };

    if (isMe) {
      updatePayload.user_id = currentUser.id;
      updatePayload.name = playerName;
      await _supabase
        .from("stats_501")
        .update(updatePayload)
        .eq("user_id", currentUser.id);
    } else {
      await _supabase
        .from("stats_501")
        .update(updatePayload)
        .eq("name", ex.name);
    }
  }
}

async function save501MatchHistory(
  playerName,
  opponentName,
  isWin,
  matchAvg,
  darts,
  finish,
  matchLog,
) {
  if (playerName.includes("[BOT]")) return;
  let payload = {
    player_name: playerName,
    opponent_name: opponentName,
    is_win: isWin,
    match_average: matchAvg,
    darts_thrown: darts,
    highest_finish: finish,
    match_details: matchLog,
  };
  if (!isGuest && currentUser) payload.user_id = currentUser.id;
  await _supabase.from("match_history_501").insert([payload]);
}

async function loadHighscores() {
  const tbody = document.querySelector("#lifetime-table tbody");
  tbody.innerHTML = '<tr><td colspan="4">Lade Daten...</td></tr>';
  let { data: highscores, error } = await _supabase
    .from("stats_secure")
    .select("*")
    .order("wins", { ascending: false })
    .order("highscore", { ascending: false });
  if (error) return;

  tbody.innerHTML = "";
  let rank = 1;
  highscores.forEach((entry) => {
    if (entry.name.includes("[BOT]")) return;
    const safeData = encodeURIComponent(JSON.stringify(entry));
    let dName = entry.name.replace(
      " (Training)",
      ' <span style="color:#d500f9; font-size:0.8em;">(Training)</span>',
    );
    let tr = document.createElement("tr");
    tr.innerHTML = `<td style="color:#666">${rank}.</td><td><a href="#" class="clickable-name" onclick="openMatchStats('secure', '${safeData}')">${dName}</a></td><td>${entry.wins}</td><td>${entry.highscore}</td>`;
    tbody.appendChild(tr);
    rank++;
  });
  if (rank === 1)
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center; color:#666;">Keine Daten vorhanden.</td></tr>';
}

async function load501Stats() {
  const tbody = document.querySelector("#lifetime-table tbody");
  tbody.innerHTML = '<tr><td colspan="4">Lade 501 Daten...</td></tr>';
  let { data: stats501, error } = await _supabase
    .from("stats_501")
    .select("*")
    .order("wins", { ascending: false });
  if (error) return;

  tbody.innerHTML = "";
  let rank = 1;
  stats501.forEach((entry) => {
    if (entry.name.includes("[BOT]")) return;
    let avg =
      entry.total_darts_thrown > 0
        ? (entry.total_score_thrown / entry.total_darts_thrown) * 3
        : 0;
    const safeData = encodeURIComponent(JSON.stringify(entry));
    let tr = document.createElement("tr");
    tr.innerHTML = `<td style="color:#666">${rank}.</td><td style="font-weight:bold;"><a href="#" class="clickable-name" style="color:white;" onclick="openMatchStats('501', '${safeData}')">${
      entry.name
    }</a></td><td>${
      entry.wins
    }</td><td style="color:var(--accent-green)">${avg.toFixed(2)}</td>`;
    tbody.appendChild(tr);
    rank++;
  });
}

// Dynamisches Fetching für die Secure und 501 Match Historien (Listet die Legs/Spiele auf)
async function loadMatchHistory() {
  const container = document.getElementById("history-list");
  container.innerHTML = "Lade Daten...";

  if (currentModalType === "secure") {
    // --- SECURE HISTORY ---
    let { data: matches, error } = await _supabase
      .from("match_history_secure")
      .select("*")
      .eq("player_name", currentModalPlayer)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !matches || matches.length === 0) {
      container.innerHTML = "Noch keine Spiele aufgezeichnet.";
      return;
    }

    container.innerHTML = "";

    matches.forEach((m) => {
      const date = new Date(m.created_at).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      const div = document.createElement("div");
      div.className = `history-item ${m.is_win ? "win" : "lose"}`;

      // Runden (Match Details) durchlaufen
      let detailsHTML = `<div style="border-top:1px solid #444; margin-top:10px; padding-top:5px;">`;

      if (m.match_details && Array.isArray(m.match_details)) {
        m.match_details.forEach((round, i) => {
          let targetName =
            round.target === 25
              ? "BULL"
              : round.target === 50
                ? "BULLSEYE"
                : round.target;
          let secureText = round.secured
            ? `<span style="color:var(--accent-green)">Gesichert (x${round.multiplier})</span>`
            : `<span style="color:var(--accent-red)">Verfehlt</span>`;
          let pointsText =
            round.final_points > 0
              ? `<b style="color:var(--accent-blue)">+${round.final_points} Pkt</b>`
              : `<b style="color:#888">0 Pkt</b>`;

          detailsHTML += `
            <div style="display: flex; justify-content: space-between; font-size: 0.85em; padding: 6px 0; border-bottom: 1px solid #222;">
              <span style="color: #888;">Runde ${
                i + 1
              } (Ziel <b style="color: white;">${targetName}</b>)</span>
              <span style="text-align: right;">
                Wurf: <b style="color:white;">${
                  round.raw_score
                }</b> &rarr; ${secureText} <br>
                ${pointsText}
              </span>
            </div>`;
        });
      } else {
        detailsHTML += `<div style="color: #888; font-size: 0.85em; padding-top: 10px;">Keine Runden-Details verfügbar.</div>`;
      }
      detailsHTML += `</div>`;

      // ---> DRY: Hier ist der Secure Mülleimer
      let safeData = encodeURIComponent(JSON.stringify(m)).replace(/'/g, "%27");
      div.innerHTML = `
        <div class="history-summary" onclick="toggleHistoryDetails(this)" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
          <div style="text-align:left;">
            <div style="font-weight:bold; color:${
              m.is_win ? "var(--accent-green)" : "var(--accent-red)"
            }">
              ${m.is_win ? "SIEG" : "NIEDERLAGE"} ${
                m.is_training
                  ? '<span style="color:var(--accent-purple); font-size:0.8em;">(Training)</span>'
                  : ""
              }
            </div>
            <div class="history-date">${date}</div>
          </div>
          <div style="display:flex; align-items:center; gap:15px;">
            <div style="font-size: 1.5em; font-weight: bold; color: white;">
              ${
                m.final_score || 0
              } <span style="font-size: 0.5em; color: #888; font-weight: normal;">Pkt</span>
            </div>
            ${
              currentUser &&
              (m.user_id === currentUser.id || m.player_name === myOnlineName)
                ? `<button onclick="event.stopPropagation(); deleteUniversalMatch('secure', ${m.id}, '${safeData}')" style="background:none; border:none; cursor:pointer; color:var(--text-muted); display:flex; align-items:center;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>`
                : ""
            }
          </div>
        </div>
        <div class="history-details" style="display:none;">${detailsHTML}</div>`;

      container.appendChild(div);
    });
  } else if (currentModalType === "501") {
    // --- 501 HISTORY ---
    let { data: matches, error } = await _supabase
      .from("match_history_501")
      .select("*")
      .eq("player_name", currentModalPlayer)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error || !matches || matches.length === 0) {
      container.innerHTML = "Noch keine Spiele aufgezeichnet.";
      return;
    }

    container.innerHTML = "";
    matches.forEach((m) => {
      const date = new Date(m.created_at).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      const div = document.createElement("div");
      div.className = `history-item ${m.is_win ? "win" : "lose"}`;

      let legsHTML = "";
      if (m.match_details && Array.isArray(m.match_details)) {
        m.match_details.forEach((leg) => {
          const isP1 = leg.p1_name === currentModalPlayer;
          const myHistory = isP1 ? leg.p1_history : leg.p2_history;
          const oppHistory = isP1 ? leg.p2_history : leg.p1_history;
          const myDarts = isP1 ? leg.p1_darts : leg.p2_darts;

          legsHTML += `
            <div class="leg-detail-container" style="margin-top:15px; border-top:1px solid #444; padding-top:10px;">
              <div style="text-align:center; font-weight:bold; color:var(--accent-blue); margin-bottom:15px; text-transform:uppercase; letter-spacing:1px;">LEG ${
                leg.leg_number
              } (${
                leg.winner === currentModalPlayer ? "GEWONNEN" : "VERLOREN"
              })</div>
              <div style="display:grid; grid-template-columns: 20% 20% 20% 20% 20%; text-align:center; font-size:0.7em; color:#888; margin-bottom:10px; text-transform:uppercase;">
                <div>Darts<br><b style="color:white; font-size:1.3em;">${myDarts}</b></div>
                <div>Avg<br><b style="color:white; font-size:1.3em;">${
                  myDarts > 0
                    ? (((501 - leg.p1_rest) / myDarts) * 3).toFixed(1)
                    : "0"
                }</b></div>
                <div>Rest<br><b style="color:var(--accent-blue); font-size:1.3em;">${
                  isP1 ? leg.p1_rest : leg.p2_rest
                }</b></div>
                <div>Finish<br><b style="color:white; font-size:1.3em;">${
                  leg.checkout || "-"
                }</b></div>
                <div>Opp. Rest<br><b style="color:white; font-size:1.3em;">${
                  isP1 ? leg.p2_rest : leg.p1_rest
                }</b></div>
              </div>
              <table style="width:100%; table-layout: fixed; font-size:0.85em; border-collapse:collapse; text-align:center;">
                <thead>
                  <tr style="color:#555; font-size:0.8em; border-bottom:1px solid #333; text-transform:uppercase;">
                    <th style="width:20%; padding:8px 0;">Pkt</th><th style="width:20%; padding:8px 0;">Score</th>
                    <th style="width:20%; padding:8px 0; color:var(--accent-blue);">Aufn.</th>
                    <th style="width:20%; padding:8px 0;">Score</th><th style="width:20%; padding:8px 0;">Pkt</th>
                  </tr>
                </thead>
                <tbody>`;

          const maxTurns = Math.max(
            myHistory?.length || 0,
            oppHistory?.length || 0,
          );
          for (let i = 0; i < maxTurns; i++) {
            legsHTML += `
              <tr style="border-bottom:1px solid #222;">
                <td style="color:#888; padding:8px 0;">${
                  myHistory && myHistory[i] ? myHistory[i].old : ""
                }</td>
                <td style="font-weight:bold; color:white; padding:8px 0;">${
                  myHistory && myHistory[i] ? myHistory[i].thrown : ""
                }</td>
                <td style="color:#444; padding:8px 0;">${i + 1}</td>
                <td style="font-weight:bold; color:white; padding:8px 0;">${
                  oppHistory && oppHistory[i] ? oppHistory[i].thrown : ""
                }</td>
                <td style="color:#888; padding:8px 0;">${
                  oppHistory && oppHistory[i] ? oppHistory[i].old : ""
                }</td>
              </tr>`;
          }
          legsHTML += `</tbody></table></div>`;
        });
      }

      // ---> DRY: Hier ist der 501 Mülleimer
      let safeData = encodeURIComponent(JSON.stringify(m)).replace(/'/g, "%27");
      div.innerHTML = `
  <div class="history-summary" onclick="toggleHistoryDetails(this)" style="display:flex; align-items:center; gap:10px; cursor:pointer;">
    <div style="flex:1;">
      <div style="font-weight:bold; color:${
        m.is_win ? "var(--accent-green)" : "var(--accent-red)"
      }">${m.is_win ? "Match-Sieg" : "Match-Niederlage"} gegen <b>${
        m.opponent_name
      }</b></div>
      <div class="history-date">${date} | Avg: ${m.match_average}</div>
    </div>
    
    ${
      currentUser &&
      (m.user_id === currentUser.id || m.player_name === myOnlineName)
        ? `<button onclick="event.stopPropagation(); deleteUniversalMatch('501', ${m.id}, '${safeData}')" style="background:none; border:none; cursor:pointer; color:var(--text-muted); display:flex; align-items:center; padding: 5px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>`
        : ""
    }
        </div>
        <div class="history-details" style="display:none; padding:10px; background:#111;">${legsHTML}</div>`;
      container.appendChild(div);
    });
  }
}

async function loadPlayerSuggestions() {
  let { data: playersDB, error } = await _supabase
    .from("stats_secure")
    .select("name");
  if (error || !playersDB) return;
  const uniqueNames = new Set();
  playersDB.forEach((p) =>
    uniqueNames.add(p.name.replace(" (Training)", "").trim()),
  );

  const datalist = document.getElementById("player-suggestions");
  datalist.innerHTML = "";
  uniqueNames.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    datalist.appendChild(option);
  });
}

async function openMyProfile() {
  if (isGuest || !currentUser)
    return alert("Bitte logge dich ein, um dein Profil zu sehen.");
  let { data } = await _supabase
    .from("stats_501")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (data) {
    open501Stats(encodeURIComponent(JSON.stringify(data)));
  } else {
    let myName =
      currentUser.user_metadata?.display_name ||
      currentUser.user_metadata?.full_name ||
      currentUser.email.split("@")[0];
    let { data: secureData } = await _supabase
      .from("stats_secure")
      .select("*")
      .eq("name", myName)
      .maybeSingle();

    if (secureData) {
      openProStats(encodeURIComponent(JSON.stringify(secureData)));
    } else {
      const skeletonData = {
        name: myName,
        user_id: currentUser.id,
        wins: 0,
        games_played: 0,
        total_darts_thrown: 0,
        total_score_thrown: 0,
        highest_finish: 0,
        best_leg: 0,
        count_100: 0,
        count_140: 0,
        count_180: 0,
        checkout_attempts: 0,
        checkout_hits: 0,
      };
      open501Stats(encodeURIComponent(JSON.stringify(skeletonData)));
    }
  }
}

function toggleHistoryDetails(element) {
  const details = element.nextElementSibling;
  const isVisible = details.style.display === "block";
  details.style.display = isVisible ? "none" : "block";
  if (!isVisible)
    details.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ==========================================
// UNIVERSAL DELETE LOGIC
// ==========================================
function deleteUniversalMatch(mode, matchId, encodedData) {
  showConfirmModal(
    "Möchtest du dieses Match wirklich löschen? Die Statistiken werden korrigiert.",
    async () => {
      const m = JSON.parse(decodeURIComponent(encodedData));

      try {
        if (mode === "bobs") {
          await _supabase.from("stats_bobs").delete().eq("id", matchId);
        } else if (mode === "rtw") {
          await _supabase.from("stats_rtw").delete().eq("id", matchId);
        } else if (mode === "501") {
          let totalPointsInMatch = 0;
          let legsCount = m.match_details ? m.match_details.length : 0;
          let legsWonInMatch = 0; // <--- NEU: Zählt die gewonnenen LEGS, nicht Matches

          let scoresToRemove = {};
          let bustsToRemove = 0;
          let t100ToRemove = 0;
          let t140ToRemove = 0;
          let t180ToRemove = 0;

          if (m.match_details && Array.isArray(m.match_details)) {
            m.match_details.forEach((leg) => {
              let isP1 = leg.p1_name === m.player_name;
              totalPointsInMatch += isP1
                ? 501 - leg.p1_rest
                : 501 - leg.p2_rest;

              // NEU: Hat der Spieler dieses spezielle Leg gewonnen?
              if (leg.winner === m.player_name) legsWonInMatch++;

              let myHistory = isP1 ? leg.p1_history : leg.p2_history;

              if (myHistory && Array.isArray(myHistory)) {
                myHistory.forEach((turn) => {
                  let val = turn.thrown === "Bust" ? 0 : parseInt(turn.thrown);
                  if (!isNaN(val)) {
                    scoresToRemove[val] = (scoresToRemove[val] || 0) + 1;
                    if (turn.thrown === "Bust") bustsToRemove++;
                    else if (val === 180) t180ToRemove++;
                    else if (val >= 140) t140ToRemove++;
                    else if (val >= 100) t100ToRemove++;
                  }
                });
              }
            });
          }

          const { data: currentStats } = await _supabase
            .from("stats_501")
            .select("*")
            .eq("name", m.player_name)
            .maybeSingle();

          if (currentStats) {
            let updatedFreq = { ...(currentStats.score_frequencies || {}) };
            for (let key in scoresToRemove) {
              if (updatedFreq[key]) {
                updatedFreq[key] = Math.max(
                  0,
                  updatedFreq[key] - scoresToRemove[key],
                );
                if (updatedFreq[key] === 0) delete updatedFreq[key];
              }
            }

            await _supabase
              .from("stats_501")
              .update({
                wins: Math.max(0, (currentStats.wins || 0) - legsWonInMatch), // <-- GEFIXT: Zieht Legs ab!
                games_played: Math.max(
                  0,
                  (currentStats.games_played || 0) - legsCount,
                ),
                total_darts_thrown: Math.max(
                  0,
                  (currentStats.total_darts_thrown || 0) - m.darts_thrown,
                ),
                total_score_thrown: Math.max(
                  0,
                  (currentStats.total_score_thrown || 0) - totalPointsInMatch,
                ),
                checkout_hits: Math.max(
                  0,
                  (currentStats.checkout_hits || 0) - legsWonInMatch,
                ), // <-- GEFIXT
                count_100: Math.max(
                  0,
                  (currentStats.count_100 || 0) - t100ToRemove,
                ),
                count_140: Math.max(
                  0,
                  (currentStats.count_140 || 0) - t140ToRemove,
                ),
                count_180: Math.max(
                  0,
                  (currentStats.count_180 || 0) - t180ToRemove,
                ),
                count_busts: Math.max(
                  0,
                  (currentStats.count_busts || 0) - bustsToRemove,
                ),
                score_frequencies: updatedFreq,
              })
              .eq("name", m.player_name);
          }
          await _supabase.from("match_history_501").delete().eq("id", matchId);
        } else if (mode === "secure") {
          let roundsCount = 0;
          let secureCount = 0;
          let doubleCount = 0;
          let numStatsSub = {};

          if (m.match_details && Array.isArray(m.match_details)) {
            roundsCount = m.match_details.length;
            m.match_details.forEach((round) => {
              if (round.secured) secureCount++;
              if (round.multiplier === 2) doubleCount++;
              let key = round.target.toString();
              if (!numStatsSub[key]) numStatsSub[key] = { points: 0, count: 0 };
              numStatsSub[key].points += round.raw_score;
              numStatsSub[key].count += 1;
            });
          }
          const { data: currentStats } = await _supabase
            .from("stats_secure")
            .select("*")
            .eq("name", m.player_name)
            .maybeSingle();
          if (currentStats) {
            let mStats = currentStats.number_stats || {};
            for (let k in numStatsSub) {
              if (mStats[k]) {
                mStats[k].points = Math.max(
                  0,
                  mStats[k].points - numStatsSub[k].points,
                );
                mStats[k].count = Math.max(
                  0,
                  mStats[k].count - numStatsSub[k].count,
                );
              }
            }
            await _supabase
              .from("stats_secure")
              .update({
                wins: Math.max(
                  0,
                  (currentStats.wins || 0) - (m.is_win ? 1 : 0),
                ),
                games_played: Math.max(0, (currentStats.games_played || 0) - 1),
                total_points: Math.max(
                  0,
                  (currentStats.total_points || 0) - (m.final_score || 0),
                ),
                rounds_played: Math.max(
                  0,
                  (currentStats.rounds_played || 0) - roundsCount,
                ),
                secure_count: Math.max(
                  0,
                  (currentStats.secure_count || 0) - secureCount,
                ),
                double_count: Math.max(
                  0,
                  (currentStats.double_count || 0) - doubleCount,
                ),
                number_stats: mStats,
              })
              .eq("name", m.player_name);
          }
          await _supabase
            .from("match_history_secure")
            .delete()
            .eq("id", matchId);
        }

        showToast("Match gelöscht und Statistiken aktualisiert!", "success");
        switchModalMode(mode);
      } catch (err) {
        showToast("Fehler beim Löschen: " + err.message, "error");
      }
    },
  );
}

function renderScoreDistributionChart(frequencies) {
  const canvas = document.getElementById("score-dist-chart");
  if (!canvas) return;

  // 1. Altes Chart zerstören (verhindert Überlagerungs-Glitches)
  if (scoreDistChart) {
    scoreDistChart.destroy();
  }

  // 2. Prüfen, ob überhaupt Daten existieren
  if (!frequencies || Object.keys(frequencies).length === 0) {
    // Optional: Canvas verstecken oder Platzhalter-Text anzeigen
    return;
  }

  // 3. Daten sortieren: Die am häufigsten geworfenen Scores nach oben!
  // Object.entries macht aus {"26": 5, "60": 12} -> [["26", 5], ["60", 12]]
  const sortedScores = Object.entries(frequencies)
    .sort((a, b) => b[1] - a[1]) // Nach der Wurf-Anzahl absteigend sortieren
    .slice(0, 10); // Wir nehmen nur die "Top 10" Scores für die Übersichtlichkeit

  const labels = sortedScores.map((item) => item[0] + " Pkt");
  const dataPoints = sortedScores.map((item) => item[1]);

  // 4. Das Chart mit Chart.js zeichnen
  scoreDistChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Häufigkeit",
          data: dataPoints,
          backgroundColor: "rgba(74, 222, 128, 0.7)", // Schönes accent-green
          borderColor: "var(--accent-green)",
          borderWidth: 1,
          borderRadius: 4, // Abgerundete Balken
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }, // Legende ausblenden, ist selbsterklärend
        title: {
          display: true,
          text: "HÄUFIGSTE AUFNAHMEN", // Clean & Sachlich
          color: "white",
          padding: { top: 10, bottom: 20 },
          font: {
            size: 11,
            family: "'Inter', sans-serif",
            weight: "600",
            letterSpacing: 1, // Passt zum Header-Design
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: "#ccc", stepSize: 1, precision: 0 },
            grid: { color: "rgba(255,255,255,0.1)" },
          },
          x: {
            ticks: { color: "white", font: { weight: "bold" } },
            grid: { display: false },
          },
        },
      },
    },
  });
}
