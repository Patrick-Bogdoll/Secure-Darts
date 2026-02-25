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
  cancelCurrentGame("game-bobs-screen");
}

function updateBobsUI() {
  const targetVal = bobsTargets[bobsTargetIndex - 1];

  document.getElementById(
    "bobs-turn-indicator"
  ).innerText = `🎯 ${bobsPlayer.name} wirft...`;
  document.getElementById("bobs-current-score").innerText = bobsPlayer.score;

  let targetDisplay = targetVal === 25 ? "BULL" : `D${targetVal}`;
  document.getElementById("bobs-target-display").innerText = targetDisplay;

  renderUniversalDartboard("bobs-dartboard-container", targetVal, "bobs");
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
