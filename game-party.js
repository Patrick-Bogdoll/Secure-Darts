// ==========================================
// PARTY X01 LOGIK (Couch-Koop)
// ==========================================

let partyPlayers = [];
let partyStartingScore = 501;
let currentPartyInput = "";
let currentPartyTurnIndex = 0;
let partyHistoryStack = []; // <-- NEU: Speichert den Spielverlauf

// --- 1. SETUP LOGIK ---

function addPartyPlayer() {
  const input = document.getElementById("party-player-input");
  const name = input.value.trim();

  if (name === "") return;
  if (partyPlayers.length >= 8) {
    alert("Maximal 8 Spieler erlaubt!");
    return;
  }
  if (partyPlayers.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    alert("Dieser Spieler ist bereits in der Liste!");
    return;
  }

  partyPlayers.push({
    name: name,
    score: partyStartingScore,
    dartsThrown: 0,
  });

  input.value = "";
  updatePartyPlayerList();
}

function removePartyPlayer(index) {
  partyPlayers.splice(index, 1);
  updatePartyPlayerList();
}

function updatePartyPlayerList() {
  const list = document.getElementById("party-player-list");
  list.innerHTML = "";

  partyPlayers.forEach((p, index) => {
    const li = document.createElement("li");
    li.style.cssText =
      "display: flex; justify-content: space-between; align-items: center; background: #222; padding: 10px 15px; margin-bottom: 5px; border-radius: 6px;";
    li.innerHTML = `
      <span style="font-weight: bold; font-size: 1.1em;">${index + 1}. ${
      p.name
    }</span>
      <button onclick="removePartyPlayer(${index})" style="background: var(--accent-red); color: white; border: none; border-radius: 4px; padding: 5px 12px; cursor: pointer; font-weight: bold;">X</button>
    `;
    list.appendChild(li);
  });
}

function startPartyGame() {
  if (partyPlayers.length < 1) {
    alert("Bitte füge mindestens 1 Spieler hinzu!");
    return;
  }

  partyStartingScore = parseInt(
    document.getElementById("party-starting-score").value
  );

  partyPlayers.forEach((p) => {
    p.score = partyStartingScore;
    p.dartsThrown = 0;
  });

  currentPartyTurnIndex = 0;
  currentPartyInput = "";
  partyHistoryStack = []; // <-- NEU: Historie beim Start leeren

  // Undo-Button beim Start verstecken
  let undoBtn = document.getElementById("btn-undo-party");
  if (undoBtn) undoBtn.style.display = "none";

  document.getElementById("input-display-party").innerText = "";

  updatePartyScoreboard();
  updatePartyTurnIndicator();

  document.getElementById("party-setup-screen").style.display = "none";
  document.getElementById("game-party-screen").style.display = "block";
}

function cancelPartyGame() {
  cancelCurrentGame("game-party-screen");
}

// --- NEU: UNDO LOGIK ---

function savePartyState() {
  // Erstellt eine tiefe Kopie (Snapshot) des aktuellen Status
  partyHistoryStack.push({
    players: JSON.parse(JSON.stringify(partyPlayers)),
    turnIndex: currentPartyTurnIndex,
  });

  // Zeigt den Undo-Button an
  document.getElementById("btn-undo-party").style.display = "block";
}

function undoPartyTurn() {
  if (partyHistoryStack.length === 0) return;

  // Holt den letzten Snapshot zurück
  const lastState = partyHistoryStack.pop();
  partyPlayers = lastState.players;
  currentPartyTurnIndex = lastState.turnIndex;

  // Reset Eingabefeld
  currentPartyInput = "";
  document.getElementById("input-display-party").innerText = "";

  // UI aktualisieren
  updatePartyScoreboard();
  updatePartyTurnIndicator();

  // Button verstecken, falls wir ganz am Anfang sind
  if (partyHistoryStack.length === 0) {
    document.getElementById("btn-undo-party").style.display = "none";
  }
}

// --- 2. SPIEL LOGIK & SCOREBOARD ---

function updatePartyTurnIndicator() {
  const currentPlayer = partyPlayers[currentPartyTurnIndex];
  document.getElementById(
    "party-turn-indicator"
  ).innerText = `🎯 ${currentPlayer.name} ist dran`;

  // Checkout-Weg anzeigen (Nutzt die Funktion aus game-501.js)
  const checkoutPath =
    typeof getCheckoutPath === "function"
      ? getCheckoutPath(currentPlayer.score)
      : "";
  const checkoutDiv = document.getElementById("party-checkout-display");

  if (checkoutPath) {
    checkoutDiv.innerText = `Finish: ${checkoutPath}`;
    checkoutDiv.style.opacity = "1";
  } else {
    checkoutDiv.innerText = "";
    checkoutDiv.style.opacity = "0";
  }
}

function updatePartyScoreboard() {
  const board = document.getElementById("party-scoreboard");
  board.innerHTML = "";

  partyPlayers.forEach((p, index) => {
    const isCurrent = index === currentPartyTurnIndex;

    const card = document.createElement("div");
    // Kompakteres Design für die Übersicht
    card.style.cssText = `
      padding: 8px 12px; border-radius: 8px;
      background: ${isCurrent ? "var(--accent-blue)" : "#2a2a2a"};
      color: ${isCurrent ? "white" : "#888"};
      text-align: center; 
      border: 1px solid ${isCurrent ? "white" : "#444"};
      min-width: 80px;
      transition: 0.3s;
      ${
        isCurrent
          ? "box-shadow: 0 0 10px rgba(33, 150, 243, 0.5);"
          : "opacity: 0.7;"
      }
    `;

    card.innerHTML = `
      <div style="font-size: 0.8em; font-weight: bold; margin-bottom: 2px;">${p.name}</div>
      <div style="font-size: 1.4em; font-weight: 900;">${p.score}</div>
    `;

    board.appendChild(card);
  });
}

// --- 3. NUMPAD EINGABEN ---

function appendPartyInput(num) {
  if (currentPartyInput.length < 3) {
    currentPartyInput += num;
    document.getElementById("input-display-party").innerText =
      currentPartyInput;
  }
}

function deletePartyInput() {
  currentPartyInput = currentPartyInput.slice(0, -1);
  document.getElementById("input-display-party").innerText = currentPartyInput;
}

function submitPartyScore(presetScore = null) {
  let scoreStr =
    presetScore !== null ? presetScore.toString() : currentPartyInput;

  if (scoreStr === "") return;
  let score = parseInt(scoreStr);

  if (score > 180) {
    alert("Maximal 180 Punkte pro Aufnahme möglich!");
    currentPartyInput = "";
    document.getElementById("input-display-party").innerText = "";
    return;
  }

  // <-- NEU: Snapshot speichern, BEVOR wir etwas verändern!
  savePartyState();

  let player = partyPlayers[currentPartyTurnIndex];
  let newScore = player.score - score;

  player.dartsThrown += 3;

  if (newScore < 0) {
    //alert(`Oh nein, ${player.name}! Überworfen (Bust).`);
  } else if (newScore === 0) {
    player.score = 0;
    updatePartyScoreboard();

    setTimeout(() => {
      alert(`🎉 JAAAA! ${player.name} hat gewonnen! 🎉`);
      document.getElementById("game-party-screen").style.display = "none";
      goHome();
    }, 300);
    return;
  } else {
    player.score = newScore;
  }

  currentPartyTurnIndex++;
  if (currentPartyTurnIndex >= partyPlayers.length) {
    currentPartyTurnIndex = 0;
  }

  currentPartyInput = "";
  document.getElementById("input-display-party").innerText = "";

  updatePartyScoreboard();
  updatePartyTurnIndicator();
}
