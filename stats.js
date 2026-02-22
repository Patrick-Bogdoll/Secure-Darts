let currentModalType = "littler";

let currentModalRawName = "";

async function switchModalMode(mode) {
  if (!currentModalRawName) return;
  document.getElementById("tab-overview").style.opacity = "0.5"; // Kurzer Lade-Effekt

  if (mode === "501") {
    let { data } = await _supabase
      .from("stats_501")
      .select("*")
      .eq("name", currentModalRawName)
      .maybeSingle();
    if (data) {
      open501Stats(encodeURIComponent(JSON.stringify(data)), true);
    } else {
      alert("Noch keine 501-Daten für " + currentModalRawName + " vorhanden.");
    }
  } else {
    let { data } = await _supabase
      .from("highscores")
      .select("*")
      .eq("name", currentModalRawName)
      .maybeSingle();
    if (data) {
      openProStats(encodeURIComponent(JSON.stringify(data)), true);
    } else {
      alert(
        "Noch keine Littler-Daten für " + currentModalRawName + " vorhanden."
      );
    }
  }
  document.getElementById("tab-overview").style.opacity = "1";
}

async function save501Stats(
  playerName,
  legsWon,
  legsPlayed,
  matchDarts,
  matchScore,
  finalFinish,
  trackerObj
) {
  if (playerName.includes("🤖") || playerName.includes("🔥")) return;

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
  };

  if (!ex) {
    let payload = {
      name: playerName,
      wins: legsWon, // Speichert jetzt Legs Won
      games_played: legsPlayed, // Speichert jetzt Legs Played
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
    };
    if (isMe) payload.user_id = currentUser.id;

    const { error: insErr } = await _supabase
      .from("stats_501")
      .insert([payload]);
    if (insErr) {
      alert("Supabase Insert Fehler: " + insErr.message);
      console.error(insErr);
    }
  } else {
    let newHighFinish = Math.max(ex.highest_finish || 0, finalFinish);
    let newBestLeg = ex.best_leg > 0 ? ex.best_leg : 999;
    if (tr.bestLeg > 0) newBestLeg = Math.min(newBestLeg, tr.bestLeg);
    if (newBestLeg === 999) newBestLeg = 0;

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
  matchLog
) {
  if (playerName.includes("🤖") || playerName.includes("🔥")) return;
  await _supabase.from("match_history_501").insert([
    {
      player_name: playerName,
      opponent_name: opponentName,
      is_win: isWin,
      match_average: matchAvg,
      darts_thrown: darts,
      highest_finish: finish,
      match_details: matchLog,
    },
  ]);
}

function switchStatsMode(mode) {
  currentStatsMode = mode;
  document.getElementById("btn-stats-littler").style.background =
    mode === "littler" ? "var(--accent-blue)" : "#333";
  document.getElementById("btn-stats-littler").style.color =
    mode === "littler" ? "white" : "#aaa";
  document.getElementById("btn-stats-501").style.background =
    mode === "501" ? "var(--accent-blue)" : "#333";
  document.getElementById("btn-stats-501").style.color =
    mode === "501" ? "white" : "#aaa";
  if (mode === "littler")
    document.getElementById("stats-table-header").innerHTML =
      "<th>#</th><th>Name</th><th>Siege</th><th>Highscore</th>";
  else
    document.getElementById("stats-table-header").innerHTML =
      "<th>#</th><th>Name</th><th>Siege</th><th>3-Dart-Avg</th>";
  loadCurrentStats();
}
function loadCurrentStats() {
  if (currentStatsMode === "littler") loadHighscores();
  else load501Stats();
}

async function loadHighscores() {
  const showBots = document.getElementById("chk-show-bots").checked;
  const tbody = document.querySelector("#lifetime-table tbody");
  tbody.innerHTML = '<tr><td colspan="4">Lade Daten...</td></tr>';
  let { data: highscores, error } = await _supabase
    .from("highscores")
    .select("*")
    .order("wins", { ascending: false })
    .order("highscore", { ascending: false });
  if (error) return;
  tbody.innerHTML = "";
  let rank = 1;
  highscores.forEach((entry) => {
    const isBotEntry = entry.name.includes("🤖") || entry.name.includes("🔥");
    if (isBotEntry && !showBots) return;
    const tr = document.createElement("tr");
    const safeData = encodeURIComponent(JSON.stringify(entry));
    let dName = entry.name.replace(
      " (Training)",
      ' <span style="color:#d500f9; font-size:0.8em;">(Training)</span>'
    );
    tr.innerHTML = `<td style="color:#666">${rank}.</td><td><a href="#" class="clickable-name" onclick="openProStats('${safeData}')">${dName}</a></td><td>${entry.wins}</td><td>${entry.highscore}</td>`;
    tbody.appendChild(tr);
    rank++;
  });
  if (rank === 1)
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center; color:#666;">Keine Daten vorhanden.</td></tr>';
}

async function load501Stats() {
  const showBots = document.getElementById("chk-show-bots").checked;
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
    const isBotEntry = entry.name.includes("🤖") || entry.name.includes("🔥");
    if (isBotEntry && !showBots) return;
    let avg = 0;
    if (entry.total_darts_thrown > 0) {
      avg = (entry.total_score_thrown / entry.total_darts_thrown) * 3;
    }
    const tr = document.createElement("tr");
    const safeData = encodeURIComponent(JSON.stringify(entry));
    tr.innerHTML = `<td style="color:#666">${rank}.</td><td style="font-weight:bold;"><a href="#" class="clickable-name" style="color:white;" onclick="open501Stats('${safeData}')">${
      entry.name
    }</a></td><td>${
      entry.wins
    }</td><td style="color:var(--accent-green)">${avg.toFixed(2)}</td>`;
    tbody.appendChild(tr);
    rank++;
  });
  if (rank === 1)
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center; color:#666;">Noch keine 501 Spiele absolviert.</td></tr>';
}

function openProStats(encodedData, isSwitching = false) {
  currentModalType = "littler"; // Sagt dem Verlauf: Wir sind im Littler-Profil!

  document.getElementById("lbl-kpi-1").innerText = "Siege";
  document.getElementById("lbl-kpi-2").innerText = "Highscore";
  document.getElementById("lbl-kpi-3").innerText = "Winrate";
  document.getElementById("lbl-kpi-4").innerText = "Ø Score";
  document.getElementById("lbl-kpi-5").innerText = "Secure Rate";
  document.getElementById("lbl-kpi-6").innerText = "Double Rate";

  // 501-Spezialboxen verstecken
  document.getElementById("box-kpi-7").style.display = "none";
  document.getElementById("box-kpi-8").style.display = "none";
  document.getElementById("box-kpi-9").style.display = "none";
  document.getElementById("box-kpi-10").style.display = "none";

  document.querySelector(".modal-tab:nth-child(2)").style.display = "block";
  const data = JSON.parse(decodeURIComponent(encodedData));
  currentModalPlayer = data.name;

  currentModalRawName = data.name
    .replace(" (Training)", "")
    .replace(" (501)", "");
  let b1 = document.getElementById("modal-btn-501");
  let b2 = document.getElementById("modal-btn-littler");
  if (b1 && b2) {
    b1.style.background = "#333";
    b1.style.color = "#aaa";
    b2.style.background = "var(--accent-blue)";
    b2.style.color = "white";
  }

  const m = document.getElementById("stats-modal");

  document.getElementById("modal-name").innerText = data.name.replace(
    " (Training)",
    ""
  );

  // ALTE IDs WURDEN HIER ERSETZT (kpi-wins -> kpi-1 etc.)
  document.getElementById("kpi-1").innerText = data.wins;
  document.getElementById("kpi-2").innerText = data.highscore;

  let gp = data.games_played || 0;
  let rp = data.rounds_played || 0;

  document.getElementById("kpi-3").innerText =
    gp > 0 ? Math.round((data.wins / gp) * 100) + "%" : "0%";
  document.getElementById("kpi-4").innerText =
    gp > 0 ? Math.round(data.total_points / gp) : "0";
  document.getElementById("kpi-5").innerText =
    rp > 0 ? Math.round((data.secure_count / rp) * 100) + "%" : "0%";
  document.getElementById("kpi-6").innerText =
    rp > 0 ? Math.round((data.double_count / rp) * 100) + "%" : "0%";

  const allTargets = [];
  for (let i = 1; i <= 20; i++) allTargets.push(i.toString());
  allTargets.push("25");
  allTargets.push("50");
  const chartLabels = allTargets.map((t) => {
    if (t === "25") return "BULL";
    if (t === "50") return "B-EYE";
    return t;
  });
  const numStats = data.number_stats || {};
  const chartData = allTargets.map((key) => {
    const s = numStats[key];
    if (s && s.count > 0) return (s.points / s.count).toFixed(1);
    return 0;
  });

  if (statsChart) statsChart.destroy();
  const ctx = document.getElementById("statsChart").getContext("2d");
  statsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: "Ø Punkte pro Aufnahme",
          data: chartData,
          backgroundColor: "rgba(41, 121, 255, 0.6)",
          borderColor: "rgba(41, 121, 255, 1)",
          borderWidth: 1,
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "#333" },
          ticks: { color: "#aaa" },
        },
        x: {
          grid: { display: false },
          ticks: { color: "#aaa", font: { size: 10 } },
        },
      },
      plugins: { legend: { display: false } },
    },
  });
  if (!isSwitching) {
    switchModalTab("overview");
  } else if (document.getElementById("tab-history").style.display === "block") {
    loadMatchHistory(); // Lädt den Verlauf direkt mit um, falls er gerade offen ist!
  }
  m.style.display = "flex";
}

async function open501Stats(encodedData, isSwitching = false) {
  currentModalType = "501";
  const data = JSON.parse(decodeURIComponent(encodedData));
  currentModalPlayer = data.name;

  currentModalRawName = data.name
    .replace(" (Training)", "")
    .replace(" (501)", "");
  let b1 = document.getElementById("modal-btn-501");
  let b2 = document.getElementById("modal-btn-littler");
  if (b1 && b2) {
    b1.style.background = "var(--accent-blue)";
    b1.style.color = "white";
    b2.style.background = "#333";
    b2.style.color = "#aaa";
  }

  let editBtn = document.getElementById("btn-edit-name");
  if (editBtn) {
    // Prüft, ob das aufgerufene Profil DIR gehört
    if (!isGuest && currentUser && data.user_id === currentUser.id) {
      editBtn.style.display = "block";
    } else {
      editBtn.style.display = "none";
    }
  }
  const m = document.getElementById("stats-modal");

  document.getElementById("modal-name").innerText = data.name + " (501)";
  document.getElementById("lbl-kpi-1").innerText = "Legs Won";
  document.getElementById("lbl-kpi-2").innerText = "Legs Played";
  document.getElementById("lbl-kpi-3").innerText = "Legs Win%";
  document.getElementById("lbl-kpi-4").innerText = "Lifetime Avg";
  document.getElementById("lbl-kpi-5").innerText = "High Finish";
  document.getElementById("lbl-kpi-6").innerText = "Double Rate";

  // Zusatzboxen einblenden
  for (let i = 7; i <= 10; i++)
    document.getElementById("box-kpi-" + i).style.display = "block";

  let gp = data.games_played || 0;
  let lifetimeAvg =
    data.total_darts_thrown > 0
      ? ((data.total_score_thrown / data.total_darts_thrown) * 3).toFixed(2)
      : "0.00";

  document.getElementById("kpi-1").innerText = data.wins;
  document.getElementById("kpi-2").innerText = gp;
  document.getElementById("kpi-2").style.color = "white";
  document.getElementById("kpi-3").innerText =
    gp > 0 ? Math.round((data.wins / gp) * 100) + "%" : "0%";
  document.getElementById("kpi-4").innerText = lifetimeAvg;
  document.getElementById("kpi-5").innerText = data.highest_finish || 0;

  let doubleRate = "0%";
  if (data.checkout_attempts > 0) {
    doubleRate =
      Math.round((data.checkout_hits / data.checkout_attempts) * 100) + "%";
  }
  document.getElementById("kpi-6").innerText = doubleRate;
  document.getElementById("kpi-6").style.color = "var(--accent-red)";

  document.getElementById("kpi-7").innerText =
    data.best_leg > 0 ? data.best_leg : "-";
  document.getElementById("kpi-8").innerText = data.count_100 || 0;
  document.getElementById("kpi-9").innerText = data.count_140 || 0;
  document.getElementById("kpi-10").innerText = data.count_180 || 0;

  let { data: matchData } = await _supabase
    .from("match_history_501")
    .select("match_details, created_at")
    .eq("player_name", data.name)
    .order("created_at", { ascending: false })
    .limit(5); // Get last 5 matches to show recent legs

  let chartLabels = [];
  let chartAverages = [];

  if (matchData && matchData.length > 0) {
    // Flatten leg details from recent matches
    let legCount = 1;
    matchData.reverse().forEach((match) => {
      if (match.match_details && Array.isArray(match.match_details)) {
        match.match_details.forEach((leg) => {
          chartLabels.push(`Leg ${legCount++}`);
          // Calculate Leg Average: ((501 - rest) / darts) * 3
          let isP1 = leg.p1_name === currentModalPlayer;
          let darts = isP1 ? leg.p1_darts : leg.p2_darts;
          let score = isP1 ? 501 - leg.p1_rest : 501 - leg.p2_rest;
          let avg = darts > 0 ? ((score / darts) * 3).toFixed(2) : 0;
          chartAverages.push(parseFloat(avg));
        });
      }
    });
  }

  if (chartAverages.length === 0) {
    chartLabels = ["Keine Daten"];
    chartAverages = [0];
  }

  if (statsChart) statsChart.destroy();
  const ctx = document.getElementById("statsChart").getContext("2d");
  statsChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: "Leg Average",
          data: chartAverages,
          borderColor: "rgba(0, 230, 118, 1)", // Green for 501 legs
          backgroundColor: "rgba(0, 230, 118, 0.2)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "#333" },
          ticks: { color: "#aaa" },
        },
        x: { grid: { display: false }, ticks: { color: "#aaa" } },
      },
      plugins: { legend: { display: true, labels: { color: "#aaa" } } },
    },
  });

  if (!isSwitching) {
    switchModalTab("overview");
  } else if (document.getElementById("tab-history").style.display === "block") {
    loadMatchHistory();
  }
  m.style.display = "flex";
}

async function loadMatchHistory() {
  const container = document.getElementById("history-list");
  container.innerHTML = "Lade Daten...";

  if (currentModalType === "littler") {
    // --- TRAINING HISTORY (LITTLER) ---
    let { data: matches, error } = await _supabase
      .from("match_history")
      .select("*")
      .eq("player_name", currentModalPlayer)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error || !matches || matches.length === 0) {
      container.innerHTML = "Noch keine Spiele aufgezeichnet.";
      return;
    }
    container.innerHTML = "";
    // In stats.js - Inside loadMatchHistory (501 block)
    matches.forEach((m) => {
      const date = new Date(m.created_at).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      const div = document.createElement("div");
      div.className = `history-item ${m.is_win ? "win" : ""}`;

      // Header Info
      let detailsHTML = `
    <div style="text-align:center; padding-bottom:5px; border-bottom:1px solid #444; margin-bottom:10px; color:#aaa;">
      Gegner: <b style="color:white">${m.opponent_name}</b> | Match Avg: <b style="color:var(--accent-blue)">${m.match_average}</b>
    </div>`;

      // Leg Loop
      if (m.match_details && Array.isArray(m.match_details)) {
        m.match_details.forEach((leg) => {
          let isP1 = leg.p1_name === currentModalPlayer;
          let myDarts = isP1 ? leg.p1_darts : leg.p2_darts;
          let myRest = isP1 ? leg.p1_rest : leg.p2_rest;
          let legWon = leg.winner === currentModalPlayer;

          let legStatus = legWon
            ? `<span style="color:var(--accent-green)">Check: ${leg.checkout} (${myDarts} Darts)</span>`
            : `<span style="color:var(--accent-red)">Rest: ${myRest} (${myDarts} Darts)</span>`;

          detailsHTML += `
        <div class="detail-row">
          <span style="font-weight:bold; color:#888;">Leg ${leg.leg_number}</span>
          <span>${legStatus}</span>
        </div>`;
        });
      }

      div.innerHTML = `
    <div class="history-summary" onclick="toggleHistoryDetails(this)">
      <div>
        <div style="font-weight:bold; color:${
          m.is_win ? "var(--accent-green)" : "#aaa"
        }">
          ${m.is_win ? "SIEG" : "NIEDERLAGE"}
        </div>
        <div class="history-date">${date}</div>
      </div>
      <div class="history-score">${m.is_win ? "🏆" : "❌"}</div>
    </div>
    <div class="history-details" style="display:none; padding: 10px; background: #1a1a1a; border-radius: 0 0 8px 8px;">
      ${detailsHTML}
    </div>`;
      container.appendChild(div);
    });
  } else {
    // --- 501 MATCH HISTORY ---
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
      div.className = `history-item ${m.is_win ? "win" : ""}`;
      let detailsHTML = `<div style="text-align:center; padding-bottom:5px; border-bottom:1px solid #444; margin-bottom:10px; color:#aaa;">Gegner: <b style="color:white">${m.opponent_name}</b> | Match Avg: <b style="color:var(--accent-blue)">${m.match_average}</b></div>`;

      if (m.match_details && Array.isArray(m.match_details)) {
        m.match_details.forEach((leg) => {
          let isP1 = leg.p1_name === currentModalPlayer;
          let myDarts = isP1 ? leg.p1_darts : leg.p2_darts;
          let myRest = isP1 ? leg.p1_rest : leg.p2_rest;
          let legWon = leg.winner === currentModalPlayer;

          let legText = legWon
            ? `<span style="color:var(--accent-green)">Gecheckt (${leg.checkout}) in ${myDarts} Darts</span>`
            : `<span style="color:var(--accent-red)">Verloren (Rest: ${myRest}) nach ${myDarts} Darts</span>`;

          detailsHTML += `<div class="detail-row"><span style="width:45px; font-weight:bold; color:#888;">Leg ${leg.leg_number}</span><span style="flex:1; text-align:right;">${legText}</span></div>`;
        });
      } else {
        detailsHTML += `<div class="detail-row" style="justify-content:center; color:#666;">Keine Leg-Details verfügbar</div>`;
      }
      div.innerHTML = `
        <div class="history-summary" style="display:flex; align-items:center; gap:10px;">
          <div onclick="this.parentElement.nextElementSibling.style.display = this.parentElement.nextElementSibling.style.display === 'block' ? 'none' : 'block'" style="flex:1; cursor:pointer;">
            <div style="font-weight:bold; color:${
              m.is_win ? "var(--accent-green)" : "#aaa"
            }">
              ${m.is_win ? "SIEG" : "Niederlage"}
            </div>
            <div class="history-date">${date}</div>
          </div>
          <div class="history-score">${m.is_win ? "🏆" : "❌"}</div>
          
          ${
            currentUser && m.player_name === myOnlineName
              ? `<button onclick="deleteMatch501(${m.id}, ${m.darts_thrown}, ${
                  m.is_win ? 1 : 0
                }, ${JSON.stringify(m.match_details).replace(/"/g, "&quot;")})" 
                     style="background:none; border:none; cursor:pointer; font-size:1.2em; padding:5px;">🗑️</button>`
              : ""
          }
        </div>
        <div class="history-details" style="display:none;">${detailsHTML}</div>`;
      container.appendChild(div);
    });
  }
}

async function loadPlayerSuggestions() {
  let { data: playersDB, error } = await _supabase
    .from("highscores")
    .select("name");
  if (error || !playersDB) return;
  const uniqueNames = new Set();
  playersDB.forEach((p) => {
    uniqueNames.add(p.name.replace(" (Training)", "").trim());
  });
  const datalist = document.getElementById("player-suggestions");
  datalist.innerHTML = "";
  uniqueNames.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    datalist.appendChild(option);
  });
}

async function openMyProfile() {
  if (isGuest || !currentUser) {
    return alert("Bitte logge dich ein, um dein Profil zu sehen.");
  }

  // 1. Try to fetch 501 data
  let { data, error } = await _supabase
    .from("stats_501")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (data) {
    open501Stats(encodeURIComponent(JSON.stringify(data)));
  } else {
    // 2. Try to fetch Littler data
    let myName =
      currentUser.user_metadata?.display_name ||
      currentUser.user_metadata?.full_name ||
      currentUser.email.split("@")[0];

    let { data: littlerData } = await _supabase
      .from("highscores")
      .select("*")
      .eq("name", myName)
      .maybeSingle();

    if (littlerData) {
      openProStats(encodeURIComponent(JSON.stringify(littlerData)));
    } else {
      // --- NEW: FORCED PROFILE VIEW FOR NEW USERS ---
      // If no data exists yet, we pass a skeleton object so the modal opens
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

  // Optional: Scroll into view if opening
  if (!isVisible) {
    details.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

async function deleteMatch501(matchId, dartsCount, wasWin, matchDetails) {
  if (
    !confirm(
      "Möchtest du dieses Match wirklich löschen? Die Statistiken werden entsprechend korrigiert."
    )
  )
    return;

  // 1. Berechnung der Punkte, die abgezogen werden müssen
  let totalPointsInMatch = 0;
  let legsCount = 0;
  if (matchDetails && Array.isArray(matchDetails)) {
    legsCount = matchDetails.length;
    matchDetails.forEach((leg) => {
      let isP1 = leg.p1_name === currentModalPlayer;
      totalPointsInMatch += isP1 ? 501 - leg.p1_rest : 501 - leg.p2_rest;
    });
  }

  // 2. Gesamt-Statistiken in stats_501 korrigieren (Werte abziehen)
  const { data: currentStats } = await _supabase
    .from("stats_501")
    .select("*")
    .eq("name", currentModalPlayer)
    .maybeSingle();

  if (currentStats) {
    await _supabase
      .from("stats_501")
      .update({
        wins: Math.max(0, currentStats.wins - wasWin),
        games_played: Math.max(0, currentStats.games_played - legsCount),
        total_darts_thrown: Math.max(
          0,
          currentStats.total_darts_thrown - dartsCount
        ),
        total_score_thrown: Math.max(
          0,
          currentStats.total_score_thrown - totalPointsInMatch
        ),
        // Hinweis: Best Leg und High Finish lassen wir aus Sicherheitsgründen stehen,
        // da wir nicht wissen, ob sie aus diesem oder einem anderen Match stammen.
      })
      .eq("name", currentModalPlayer);
  }

  // 3. Den Eintrag aus der Historie löschen
  const { error } = await _supabase
    .from("match_history_501")
    .delete()
    .eq("id", matchId);

  if (error) {
    alert("Fehler beim Löschen: " + error.message);
  } else {
    alert("Match gelöscht und Statistik korrigiert!");
    // Modal aktualisieren
    switchModalMode("501");
  }
}
