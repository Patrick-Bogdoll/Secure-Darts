// ==========================================
// ROUND THE WORLD LOGIK (21 Runden, Punkte sammeln & Speichern)
// ==========================================

let rtwPlayer = null;
let rtwHistoryStack = [];
let rtwTargetMode = "double"; // 'single', 'double', 'triple'

const rtwTargets = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 25,
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
  cancelCurrentGame("game-rtw-screen");
}

function updateRtwUI() {
  const targetVal = rtwTargets[rtwPlayer.targetIndex];

  document.getElementById(
    "rtw-turn-indicator"
  ).innerText = `${rtwPlayer.name} wirft...`;
  document.getElementById(
    "rtw-points-count"
  ).innerText = `${rtwPlayer.totalPoints}`;

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
  renderUniversalDartboard("rtw-dartboard-container", targetVal, rtwTargetMode);

  updateRtwHistoryUI();
}

function updateRtwHistoryUI() {
  if (!rtwPlayer) return;
  renderUniversalMiniGameHistory(
    "side-history-list-rtw",
    "history-rtw-name",
    rtwPlayer.name,
    rtwPlayer.pointsTable,
    "rtw"
  );
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
    document.getElementById("game-rtw-screen").style.display = "none";
    showToast("Spiel abgeschlossen!", "success");
    goHome();
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
