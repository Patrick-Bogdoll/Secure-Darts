// ==========================================
// BOB'S 27 LOGIK
// ==========================================

let bobsPlayer = null;
let bobsTargetIndex = 1; // 1 bis 21 (21 = Bull)
let bobsHistoryStack = [];
let isBobsGameOver = false;

const bobsTargets = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25,
];
const boardOrder = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];

function startBobsGame() {
  const nameInput =
    document.getElementById("bobs-player-input").value.trim() || "Spieler";

  bobsPlayer = {
    name: nameInput,
    score: 27,
    pointsTable: [],
  };
  bobsTargetIndex = 1;
  bobsHistoryStack = [];
  isBobsGameOver = false;

  document.getElementById("btn-undo-bobs").style.display = "none";
  document.getElementById("bobs-setup-screen").style.display = "none";
  document.getElementById("game-bobs-screen").style.display = "block";

  updateBobsUI();
}

function cancelBobsGame() {
  if (confirm("Spiel wirklich abbrechen?")) {
    document.getElementById("game-bobs-screen").style.display = "none";
    goHome();
  }
}

function updateBobsUI() {
  const targetVal = bobsTargets[bobsTargetIndex - 1];

  document.getElementById(
    "bobs-turn-indicator"
  ).innerText = `🎯 ${bobsPlayer.name} wirft...`;
  document.getElementById("bobs-current-score").innerText = bobsPlayer.score;

  let targetDisplay = targetVal === 25 ? "BULL" : `D${targetVal}`;
  document.getElementById("bobs-target-display").innerText = targetDisplay;

  renderDynamicDartboard(targetVal);
  updateBobsHistoryUI();
}

function submitBobsScore(hits) {
  if (isBobsGameOver) return;
  // Snapshot für Undo speichern (+ tableLength)
  bobsHistoryStack.push({
    score: bobsPlayer.score,
    targetIndex: bobsTargetIndex,
    tableLength: bobsPlayer.pointsTable.length, // <-- NEU
  });
  document.getElementById("btn-undo-bobs").style.display = "block";

  const targetVal = bobsTargets[bobsTargetIndex - 1];
  let pointsChange = 0;

  // Punkte berechnen
  if (hits > 0) {
    pointsChange = targetVal * 2 * hits;
    bobsPlayer.score += pointsChange;
  } else {
    pointsChange = -(targetVal * 2);
    bobsPlayer.score += pointsChange;
  }

  // <-- NEU: Wurf in die Historie speichern -->
  bobsPlayer.pointsTable.push({
    target: targetVal,
    hits: hits,
    points: pointsChange,
  });

  // Rausschmiss prüfen
  if (bobsPlayer.score < 0) {
    isBobsGameOver = true;
    saveBobsStatsBackground(false);

    setTimeout(() => {
      alert(`💀 Game Over! Du bist unter 0 Punkte gefallen.`);
      document.getElementById("game-bobs-screen").style.display = "none";
      goHome();
    }, 300);
    return;
  }

  bobsTargetIndex++;

  if (bobsTargetIndex > 21) {
    isBobsGameOver = true;
    saveBobsStatsBackground(true);

    setTimeout(() => {
      alert(
        `🎉 GLÜCKWUNSCH! 🎉\n\nDu hast Bob's 27 überlebt!\nDein Endstand: ${bobsPlayer.score} Punkte`
      );
      document.getElementById("game-bobs-screen").style.display = "none";
      goHome();
    }, 300);
    return;
  }

  updateBobsUI();
}

function undoBobsTurn() {
  if (bobsHistoryStack.length === 0) return;
  const lastState = bobsHistoryStack.pop();

  bobsPlayer.score = lastState.score;
  bobsTargetIndex = lastState.targetIndex;
  // <-- NEU: Letzten Wurf aus der Historie entfernen
  bobsPlayer.pointsTable = bobsPlayer.pointsTable.slice(
    0,
    lastState.tableLength
  );

  if (bobsHistoryStack.length === 0)
    document.getElementById("btn-undo-bobs").style.display = "none";

  updateBobsUI();
}

function updateBobsHistoryUI() {
  const container = document.getElementById("side-history-list-bobs");
  const nameLabel = document.getElementById("history-bobs-name");

  if (!container) return;

  if (nameLabel && bobsPlayer) {
    nameLabel.innerText = bobsPlayer.name;
  }

  let html = "";
  if (bobsPlayer && bobsPlayer.pointsTable) {
    bobsPlayer.pointsTable.forEach((entry) => {
      let fieldName = entry.target === 25 ? "BULL" : `D${entry.target}`;
      let hitColor =
        entry.hits > 0 ? "var(--accent-green)" : "var(--accent-red)";
      let prefix = entry.points > 0 ? "+" : ""; // Fügt ein Pluszeichen bei positiven Punkten hinzu

      html += `
        <div style="display:flex; justify-content:space-between; padding:8px 10px; background:#2a2a2a; margin-bottom:5px; border-radius:6px; font-size: 0.9em; color:#ccc;">
          <span>Feld <b style="color:white;">${fieldName}</b></span>
          <span style="color:${hitColor}; font-weight:bold;">${prefix}${entry.points}</span>
        </div>`;
    });
  }

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

// NEU: Supabase Speicherfunktion für Bob's 27 (läuft leise im Hintergrund)
async function saveBobsStatsBackground(isWin) {
  try {
    const payload = {
      name: bobsPlayer.name,
      final_score: bobsPlayer.score,
      is_win: isWin,
      details: bobsPlayer.pointsTable, // Speichert das Array als JSONB
    };

    // Wenn der User eingeloggt ist (aus app.js), verknüpfen wir die user_id
    if (typeof currentUser !== "undefined" && currentUser) {
      payload.user_id = currentUser.id;
    }

    const { error } = await _supabase.from("stats_bobs").insert([payload]);

    if (error) {
      console.error("Fehler beim Speichern der Bob's 27 Stats:", error.message);
    } else {
      console.log(
        "✅ Bob's 27 Stats erfolgreich im Hintergrund in Supabase gespeichert!"
      );
    }
  } catch (err) {
    console.error("Unerwarteter Fehler beim Speichern:", err);
  }
}

// --- SVG DARTBOARD GENERATOR ---
// --- SVG DARTBOARD GENERATOR ---
// --- SVG DARTBOARD GENERATOR ---
function renderDynamicDartboard(activeTarget) {
  const container = document.getElementById("bobs-dartboard-container");

  const cx = 150,
    cy = 150;
  const rBoard = 145;
  const rDoubleOuter = 115;
  const rDoubleInner = 105;
  const rTripleOuter = 65;
  const rTripleInner = 55;
  const rOuterBull = 16;
  const rInnerBull = 7;
  const rText = 130;

  // NEU: Wir fügen eine CSS Keyframe-Animation direkt in das SVG ein
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

  boardOrder.forEach((num, index) => {
    const startAngle = index * angleStep - angleStep / 2;
    const endAngle = startAngle + angleStep;

    const isRedBlack = index % 2 === 0;
    const colorSingle = isRedBlack ? "#222222" : "#5d554a";
    const colorDoubleTriple = isRedBlack ? "#a82b2b" : "#1a5d38";

    const isActive = num === activeTarget;
    const doubleColor = isActive ? "var(--accent-green)" : colorDoubleTriple;
    const strokeWidth = isActive ? "1.5" : "0.5";
    const strokeColor = isActive ? "#fff" : "#aaa";

    // NEU: Die Blinking-Klasse anheften, falls das Ziel aktiv ist
    const activeClass = isActive ? ' class="blinking-target"' : "";

    slicesHTML += `<path d="${createArc(
      rOuterBull,
      rTripleInner,
      startAngle,
      endAngle
    )}" fill="${colorSingle}" stroke="#aaa" stroke-width="0.5" />`;
    slicesHTML += `<path d="${createArc(
      rTripleInner,
      rTripleOuter,
      startAngle,
      endAngle
    )}" fill="${colorDoubleTriple}" stroke="#aaa" stroke-width="0.5" />`;
    slicesHTML += `<path d="${createArc(
      rTripleOuter,
      rDoubleInner,
      startAngle,
      endAngle
    )}" fill="${colorSingle}" stroke="#aaa" stroke-width="0.5" />`;

    // Hier fügen wir die Klasse dem Doppel-Ring hinzu
    slicesHTML += `<path${activeClass} d="${createArc(
      rDoubleInner,
      rDoubleOuter,
      startAngle,
      endAngle
    )}" fill="${doubleColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;

    const textRad = ((startAngle + angleStep / 2 - 90) * Math.PI) / 180;
    const tx = cx + rText * Math.cos(textRad);
    const ty = cy + rText * Math.sin(textRad);
    slicesHTML += `<text x="${tx}" y="${ty}" fill="white" font-size="14" font-weight="bold" font-family="sans-serif" text-anchor="middle" dominant-baseline="central">${num}</text>`;
  });

  // Bull & Bullseye (beide blinken, wenn das Ziel 25 ist)
  const isBullTarget = activeTarget === 25 || activeTarget === 50;
  const bullClass = isBullTarget ? ' class="blinking-target"' : "";
  const outerBullColor = isBullTarget ? "var(--accent-green)" : "#1a5d38";
  const innerBullColor = isBullTarget ? "var(--accent-green)" : "#a82b2b";

  slicesHTML += `<circle${bullClass} cx="${cx}" cy="${cy}" r="${rOuterBull}" fill="${outerBullColor}" stroke="#aaa" stroke-width="0.5" />`;
  slicesHTML += `<circle${bullClass} cx="${cx}" cy="${cy}" r="${rInnerBull}" fill="${innerBullColor}" stroke="#aaa" stroke-width="0.5" />`;

  container.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 300 300" style="max-width: 350px; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));">${slicesHTML}</svg>`;
}
