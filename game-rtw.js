// ==========================================
// ROUND THE WORLD LOGIK (21 Runden, Punkte sammeln & Speichern)
// ==========================================

let rtwPlayer = null;
let rtwHistoryStack = [];
let rtwTargetMode = "double"; // 'single', 'double', 'triple'

const rtwTargets = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 25,
];

const rtwBoardOrder = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];

function startRtwGame() {
  const nameInput =
    document.getElementById("rtw-player-input").value.trim() || "Spieler";
  const modeSelect = document.getElementById("rtw-target-mode");
  rtwTargetMode = modeSelect ? modeSelect.value : "double";

  rtwPlayer = {
    name: nameInput,
    targetIndex: 0,
    dartsThrown: 0,
    pointsTable: [],
    totalPoints: 0,
  };
  rtwHistoryStack = [];

  document.getElementById("btn-undo-rtw").style.display = "none";
  document.getElementById("rtw-setup-screen").style.display = "none";
  document.getElementById("game-rtw-screen").style.display = "block";

  updateRtwUI();
}

function cancelRtwGame() {
  showCancelModal(() => {
    document.getElementById("game-rtw-screen").style.display = "none";
    goHome();
  });
}

function updateRtwUI() {
  const targetVal = rtwTargets[rtwPlayer.targetIndex];

  document.getElementById(
    "rtw-turn-indicator"
  ).innerText = `🎯 ${rtwPlayer.name} wirft...`;
  document.getElementById("rtw-darts-count").innerText = `${
    rtwPlayer.targetIndex + 1
  } / 21`;

  let targetDisplay = targetVal;

  if (targetVal === 25) {
    targetDisplay =
      rtwTargetMode === "double" || rtwTargetMode === "triple"
        ? "BULLSEYE"
        : "SINGLE BULL";
  } else {
    if (rtwTargetMode === "double") targetDisplay = "D" + targetVal;
    else if (rtwTargetMode === "triple") targetDisplay = "T" + targetVal;
  }

  document.getElementById("rtw-target-display").innerText = targetDisplay;
  renderDynamicDartboardRTW(targetVal);
}

// NEU: Supabase Speicherfunktion (läuft leise im Hintergrund)
async function saveRtwStatsBackground() {
  try {
    const payload = {
      name: rtwPlayer.name,
      total_points: rtwPlayer.totalPoints,
      mode: rtwTargetMode,
      details: rtwPlayer.pointsTable, // Speichert das Array als JSONB
    };

    // Wenn der User eingeloggt ist (aus app.js), verknüpfen wir die user_id
    if (typeof currentUser !== "undefined" && currentUser) {
      payload.user_id = currentUser.id;
    }

    const { error } = await _supabase.from("stats_rtw").insert([payload]);

    if (error) {
      console.error("Fehler beim Speichern der RTW-Stats:", error.message);
    } else {
      console.log(
        "✅ RTW-Stats erfolgreich im Hintergrund in Supabase gespeichert!"
      );
    }
  } catch (err) {
    console.error("Unerwarteter Fehler beim Speichern:", err);
  }
}

function submitRtwScore(hits) {
  rtwHistoryStack.push({
    targetIndex: rtwPlayer.targetIndex,
    dartsThrown: rtwPlayer.dartsThrown,
    totalPoints: rtwPlayer.totalPoints,
    tableLength: rtwPlayer.pointsTable.length,
  });
  document.getElementById("btn-undo-rtw").style.display = "block";

  const currentTarget = rtwTargets[rtwPlayer.targetIndex];
  rtwPlayer.pointsTable.push({
    target: currentTarget,
    hits: hits,
  });
  rtwPlayer.totalPoints += hits;

  rtwPlayer.dartsThrown += 3;
  rtwPlayer.targetIndex += 1;

  if (rtwPlayer.targetIndex >= rtwTargets.length) {
    rtwPlayer.targetIndex = rtwTargets.length - 1;
    updateRtwUI();

    // Sobald das letzte Feld bespielt wurde, feuern wir den Upload in den Hintergrund ab!
    saveRtwStatsBackground();

    setTimeout(() => {
      let resultMsg = `🎉 SPIEL BEENDET! 🎉\n\nDein geheimes Ergebnis:\n\n`;

      rtwPlayer.pointsTable.forEach((entry) => {
        let fieldName = entry.target === 25 ? "BULL" : entry.target;
        resultMsg += `Feld ${fieldName}: ${entry.hits} Treffer\n`;
      });

      resultMsg += `\nGESAMTPUNKTE: ${rtwPlayer.totalPoints} / 63`;

      alert(resultMsg);
      document.getElementById("game-rtw-screen").style.display = "none";
      goHome();
    }, 300);
    return;
  }

  updateRtwUI();
}

function undoRtwTurn() {
  if (rtwHistoryStack.length === 0) return;
  const lastState = rtwHistoryStack.pop();

  rtwPlayer.targetIndex = lastState.targetIndex;
  rtwPlayer.dartsThrown = lastState.dartsThrown;
  rtwPlayer.totalPoints = lastState.totalPoints;

  rtwPlayer.pointsTable = rtwPlayer.pointsTable.slice(0, lastState.tableLength);

  if (rtwHistoryStack.length === 0)
    document.getElementById("btn-undo-rtw").style.display = "none";

  updateRtwUI();
}

// --- SVG DARTBOARD GENERATOR ---
function renderDynamicDartboardRTW(activeTarget) {
  const container = document.getElementById("rtw-dartboard-container");

  const cx = 150,
    cy = 150;
  const rBoard = 145;
  const rDoubleOuter = 115,
    rDoubleInner = 105;
  const rTripleOuter = 65,
    rTripleInner = 55;
  const rOuterBull = 16,
    rInnerBull = 7;
  const rText = 130;

  let slicesHTML = `
    <style>
      @keyframes flash-target {
        0%, 100% { fill: var(--accent-green) !important; stroke: #ffffff !important; }
        50% { fill: #ffffff !important; stroke: var(--accent-green) !important; stroke-width: 2px !important; }
      }
      .blinking-target {
        animation: flash-target 0.8s infinite ease-in-out;
      }
    </style>
  `;

  slicesHTML += `<circle cx="${cx}" cy="${cy}" r="${rBoard}" fill="#1c1c1c" />`;

  const angleStep = 360 / 20;

  function createArc(rIn, rOut, startA, endA) {
    const sRad = ((startA - 90) * Math.PI) / 180;
    const eRad = ((endA - 90) * Math.PI) / 180;

    const x1_in = cx + rIn * Math.cos(sRad),
      y1_in = cy + rIn * Math.sin(sRad);
    const x2_in = cx + rIn * Math.cos(eRad),
      y2_in = cy + rIn * Math.sin(eRad);

    const x1_out = cx + rOut * Math.cos(sRad),
      y1_out = cy + rOut * Math.sin(sRad);
    const x2_out = cx + rOut * Math.cos(eRad),
      y2_out = cy + rOut * Math.sin(eRad);

    return `M ${x1_in} ${y1_in} L ${x1_out} ${y1_out} A ${rOut} ${rOut} 0 0 1 ${x2_out} ${y2_out} L ${x2_in} ${y2_in} A ${rIn} ${rIn} 0 0 0 ${x1_in} ${y1_in} Z`;
  }

  rtwBoardOrder.forEach((num, index) => {
    const startAngle = index * angleStep - angleStep / 2;
    const endAngle = startAngle + angleStep;

    const isRedBlack = index % 2 === 0;
    const isActive = num === activeTarget;

    const colorSingle = isRedBlack ? "#222222" : "#5d554a";
    const colorDoubleTriple = isRedBlack ? "#a82b2b" : "#1a5d38";

    let innerSingleClass = "";
    let tripleClass = "";
    let outerSingleClass = "";
    let doubleClass = "";

    if (isActive) {
      if (rtwTargetMode === "single") {
        innerSingleClass = ' class="blinking-target"';
        outerSingleClass = ' class="blinking-target"';
      } else if (rtwTargetMode === "double") {
        doubleClass = ' class="blinking-target"';
      } else if (rtwTargetMode === "triple") {
        tripleClass = ' class="blinking-target"';
      }
    }

    slicesHTML += `<path${innerSingleClass} d="${createArc(
      rOuterBull,
      rTripleInner,
      startAngle,
      endAngle
    )}" fill="${colorSingle}" stroke="#aaa" stroke-width="0.5" />`;
    slicesHTML += `<path${tripleClass} d="${createArc(
      rTripleInner,
      rTripleOuter,
      startAngle,
      endAngle
    )}" fill="${colorDoubleTriple}" stroke="#aaa" stroke-width="0.5" />`;
    slicesHTML += `<path${outerSingleClass} d="${createArc(
      rTripleOuter,
      rDoubleInner,
      startAngle,
      endAngle
    )}" fill="${colorSingle}" stroke="#aaa" stroke-width="0.5" />`;
    slicesHTML += `<path${doubleClass} d="${createArc(
      rDoubleInner,
      rDoubleOuter,
      startAngle,
      endAngle
    )}" fill="${colorDoubleTriple}" stroke="#aaa" stroke-width="0.5" />`;

    const textRad = ((startAngle + angleStep / 2 - 90) * Math.PI) / 180;
    const tx = cx + rText * Math.cos(textRad);
    const ty = cy + rText * Math.sin(textRad);
    slicesHTML += `<text x="${tx}" y="${ty}" fill="white" font-size="14" font-weight="bold" font-family="sans-serif" text-anchor="middle" dominant-baseline="central">${num}</text>`;
  });

  const isBullTarget = activeTarget === 25;
  let outerBullClass = "";
  let innerBullClass = "";

  if (isBullTarget) {
    if (rtwTargetMode === "single") {
      outerBullClass = ' class="blinking-target"';
    } else {
      innerBullClass = ' class="blinking-target"';
    }
  }

  slicesHTML += `<circle${outerBullClass} cx="${cx}" cy="${cy}" r="${rOuterBull}" fill="#1a5d38" stroke="#aaa" stroke-width="0.5" />`;
  slicesHTML += `<circle${innerBullClass} cx="${cx}" cy="${cy}" r="${rInnerBull}" fill="#a82b2b" stroke="#aaa" stroke-width="0.5" />`;

  container.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 300 300" style="max-width: 350px; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));">${slicesHTML}</svg>`;
}
