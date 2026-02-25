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
      alert(`Game Over! Du bist unter 0 Punkte gefallen.`);
      document.getElementById("game-bobs-screen").style.display = "none";
      goHome();
    }, 300);
    return;
  }

  bobsTargetIndex++;

  if (bobsTargetIndex > 21) {
    isBobsGameOver = true;
    saveBobsStatsBackground(true);

    showToast("Spiel gewonnen!", "success");
    document.getElementById("game-bobs-screen").style.display = "none";
    goHome();
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
  if (!bobsPlayer) return;
  renderUniversalMiniGameHistory(
    "side-history-list-bobs",
    "history-bobs-name",
    bobsPlayer.name,
    bobsPlayer.pointsTable,
    "bobs"
  );
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
