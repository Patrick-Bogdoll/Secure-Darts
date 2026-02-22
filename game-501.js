let p1LegThrows = [];
let p2LegThrows = [];

function resetStatsTracker() {
  statsTracker = {
    p1: {
      dartsCurrentLeg: 0,
      bestLeg: 0,
      t100: 0,
      t140: 0,
      t180: 0,
      busts: 0,
      checkoutAttempts: 0,
      checkoutHits: 0,
    },
    p2: {
      dartsCurrentLeg: 0,
      bestLeg: 0,
      t100: 0,
      t140: 0,
      t180: 0,
      busts: 0,
      checkoutAttempts: 0,
      checkoutHits: 0,
    },
  };
}

function startLocal501Game() {
  bestOfLegs = parseInt(document.getElementById("best-of-legs").value || 3);
  localP1Name =
    document.getElementById("local-p1-name").value.trim() || "Spieler 1";
  localP2Name =
    document.getElementById("local-p2-name").value.trim() || "Spieler 2";
  localP1Legs = 0;
  localP2Legs = 0;
  p1TotalScore = 0;
  p2TotalScore = 0;
  p1Darts501 = 0;
  p2Darts501 = 0;
  p1DartsAtLegStart = 0;
  p2DartsAtLegStart = 0;
  currentMatchLog501 = [];
  p1LastThrow = "-";
  p2LastThrow = "-";
  isLocal501 = true;
  document.getElementById("online-lobby-screen").style.display = "none";
  document.getElementById("game-501-screen").style.display = "block";
  resetLegLocal();
  resetStatsTracker();
}

function resetLegLocal() {
  localP1Score = 501;
  localP2Score = 501;
  p1LegThrows = [];
  p2LegThrows = [];
  updateThrowHistoryUI();
  history501Stack = [];
  localCurrentTurn = (localP1Legs + localP2Legs) % 2 === 0 ? 1 : 2;
  isMyTurn = true;
  statsTracker.p1.dartsCurrentLeg = 0;
  statsTracker.p2.dartsCurrentLeg = 0;
  document.getElementById("win-overlay-501").style.display = "none";
  document.getElementById("p1-name").innerText = localP1Name;
  document.getElementById("p2-name").innerText = localP2Name;
  updateLocalTurnHighlight();
  update501QoL(localP1Score, localP2Score);
}

function update501QoL(p1Score, p2Score) {
  let p1MatchAvg =
    p1Darts501 > 0 ? ((p1TotalScore / p1Darts501) * 3).toFixed(2) : "0.00";
  let p2MatchAvg =
    p2Darts501 > 0 ? ((p2TotalScore / p2Darts501) * 3).toFixed(2) : "0.00";

  let p1LegDarts = p1Darts501 - p1DartsAtLegStart;
  let p2LegDarts = p2Darts501 - p2DartsAtLegStart;

  let p1LegAvg =
    p1LegDarts > 0 ? (((501 - p1Score) / p1LegDarts) * 3).toFixed(2) : "0.00";
  let p2LegAvg =
    p2LegDarts > 0 ? (((501 - p2Score) / p2LegDarts) * 3).toFixed(2) : "0.00";

  if (document.getElementById("p1-match-avg")) {
    document.getElementById("p1-match-avg").innerText = p1MatchAvg;
    document.getElementById("p1-leg-avg").innerText = p1LegAvg;
    document.getElementById("p2-match-avg").innerText = p2MatchAvg;
    document.getElementById("p2-leg-avg").innerText = p2LegAvg;
  }
  document.getElementById("p1-darts").innerText = `${p1Darts501} Darts`;
  document.getElementById("p2-darts").innerText = `${p2Darts501} Darts`;
  document.getElementById("p1-checkout").innerText = getCheckoutPath(p1Score);
  document.getElementById("p2-checkout").innerText = getCheckoutPath(p2Score);

  if (document.getElementById("p1-legs-display"))
    document.getElementById("p1-legs-display").innerText = localP1Legs;
  if (document.getElementById("p2-legs-display"))
    document.getElementById("p2-legs-display").innerText = localP2Legs;
  if (document.getElementById("p1-last-throw"))
    document.getElementById("p1-last-throw").innerText = p1LastThrow;
  if (document.getElementById("p2-last-throw"))
    document.getElementById("p2-last-throw").innerText = p2LastThrow;

  const undoBtn = document.getElementById("btn-undo-501");
  if (history501Stack.length > 0 && isLocal501) {
    undoBtn.style.display = "block";
  } else {
    undoBtn.style.display = "none";
  }
}

function updateLocalTurnHighlight() {
  if (localCurrentTurn === 1) {
    document.getElementById("p1-box").classList.remove("inactive");
    document.getElementById("p2-box").classList.add("inactive");
  } else {
    document.getElementById("p2-box").classList.remove("inactive");
    document.getElementById("p1-box").classList.add("inactive");
  }
  current501Input = "";
  update501Display();
}

function getCheckoutPath(score) {
  if (
    score > 170 ||
    score < 2 ||
    [169, 168, 166, 165, 163, 162, 159].includes(score)
  )
    return "";
  const checkouts = {
    170: "T20 T20 BULL",
    167: "T20 T19 BULL",
    164: "T20 T18 BULL",
    161: "T20 T17 BULL",
    160: "T20 T20 D20",
    158: "T20 T20 D19",
    157: "T20 T19 D20",
    156: "T20 T20 D18",
    155: "T20 T19 D19",
    154: "T20 T18 D20",
    153: "T20 T19 D18",
    152: "T20 T20 D16",
    151: "T20 T17 D20",
    150: "T20 T18 D18",
    149: "T20 T19 D16",
    148: "T20 T16 D20",
    147: "T20 T17 D18",
    146: "T20 T18 D16",
    145: "T20 T15 D20",
    144: "T20 T20 D12",
    143: "T20 T17 D16",
    142: "T20 T14 D20",
    141: "T20 T15 D18",
    140: "T20 T20 D10",
    139: "T20 T13 D20",
    138: "T20 T18 D12",
    137: "T20 T15 D16",
    136: "T20 T20 D8",
    135: "T20 T17 D12",
    134: "T20 T14 D16",
    133: "T20 T19 D8",
    132: "T20 T16 D12",
    131: "T20 T13 D16",
    130: "T20 T20 D5",
    129: "T19 T16 D12",
    128: "T18 T14 D16",
    127: "T20 T17 D8",
    126: "T19 T19 D6",
    125: "BULL T17 D12",
    124: "T20 T16 D8",
    123: "T19 T16 D9",
    122: "T18 T20 D4",
    121: "T20 T15 D8",
    120: "T20 20 D20",
    119: "T19 T10 D16",
    118: "T20 18 D20",
    117: "T20 17 D20",
    116: "T20 16 D20",
    115: "T20 15 D20",
    114: "T20 14 D20",
    113: "T20 13 D20",
    112: "T20 12 D20",
    111: "T20 11 D20",
    110: "T20 10 D20",
    109: "T19 12 D20",
    108: "T20 16 D16",
    107: "T19 10 D20",
    106: "T20 10 D18",
    105: "T19 16 D16",
    104: "T18 10 D20",
    103: "T19 10 D18",
    102: "T20 10 D16",
    101: "T17 10 D20",
    100: "T20 D20",
    99: "T19 10 D16",
    98: "T20 D19",
    97: "T19 D20",
    96: "T20 D18",
    95: "T19 D19",
    94: "T18 D20",
    93: "T19 D18",
    92: "T20 D16",
    91: "T17 D20",
    90: "T18 D18",
    89: "T19 D16",
    88: "T16 D20",
    87: "T17 D18",
    86: "T18 D16",
    85: "T15 D20",
    84: "T20 D12",
    83: "T17 D16",
    82: "BULL D16",
    81: "T15 D18",
    80: "T20 D10",
    79: "T13 D20",
    78: "T18 D12",
    77: "T15 D16",
    76: "T20 D8",
    75: "T17 D12",
    74: "T14 D16",
    73: "T19 D8",
    72: "T16 D12",
    71: "T13 D16",
    70: "T18 D8",
    69: "T15 D12",
    68: "T20 D4",
    67: "T17 D8",
    66: "10 16 D20",
    65: "T19 D4",
    64: "16 16 D16",
    63: "T13 D12",
    62: "10 12 D20",
    61: "T15 D8",
    60: "20 D20",
    59: "19 D20",
    58: "18 D20",
    57: "17 D20",
    56: "16 D20",
    55: "15 D20",
    54: "14 D20",
    53: "13 D20",
    52: "12 D20",
    51: "11 D20",
    50: "BULLSEYE",
    49: "9 D20",
    48: "16 D16",
    47: "15 D16",
    46: "14 D16",
    45: "13 D16",
    44: "12 D16",
    43: "3 D20",
    42: "10 D16",
    41: "9 D16",
  };
  if (checkouts[score]) return checkouts[score];
  if (score <= 40 && score % 2 === 0) return `D${score / 2}`;
  return "";
}

function undo501Turn() {
  if (history501Stack.length === 0) return;
  const lastState = history501Stack.pop();
  localP1Score = lastState.p1Score;
  localP2Score = lastState.p2Score;
  p1Darts501 = lastState.p1Darts;
  p2Darts501 = lastState.p2Darts;
  localCurrentTurn = lastState.turn;

  p1LastThrow = lastState.p1Last || "-";
  p2LastThrow = lastState.p2Last || "-";
  p1TotalScore = lastState.p1Total || 0;
  p2TotalScore = lastState.p2Total || 0;

  p1LegThrows = lastState.p1Throws || [];
  p2LegThrows = lastState.p2Throws || [];
  updateThrowHistoryUI();

  document.getElementById("p1-score").innerText = localP1Score;
  document.getElementById("p2-score").innerText = localP2Score;
  updateLocalTurnHighlight();
  update501QoL(localP1Score, localP2Score);
}

async function hostOnlineGame() {
  isLocal501 = false;
  myOnlineName = document.getElementById("online-player-name").value.trim();
  if (!myOnlineName) return alert("Bitte gib deinen Namen ein!");
  currentRoomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
  amIPlayer1 = true;
  bestOfLegs = parseInt(document.getElementById("best-of-legs").value || 3);
  p1TotalScore = 0;
  p2TotalScore = 0;
  p1Darts501 = 0;
  p2Darts501 = 0;
  p1DartsAtLegStart = 0;
  p2DartsAtLegStart = 0;
  currentMatchLog501 = [];
  resetStatsTracker();

  const { error } = await _supabase.from("live_matches").insert([
    {
      room_code: currentRoomCode,
      player1_name: myOnlineName,
      status: "waiting",
      best_of_legs: bestOfLegs,
      player1_legs: 0,
      player2_legs: 0,
      player1_last_score: "-",
      player2_last_score: "-",
    },
  ]);

  if (error) return alert("Fehler:\n" + error.message);
  document.getElementById("lobby-setup").style.display = "none";
  document.getElementById("lobby-waiting").style.display = "block";
  document.getElementById("display-room-code").innerText = currentRoomCode;
  listenForOpponent(currentRoomCode);
}

async function joinOnlineGame() {
  isLocal501 = false;
  myOnlineName = document.getElementById("online-player-name").value.trim();
  const codeInput = document
    .getElementById("join-room-code")
    .value.trim()
    .toUpperCase();
  if (!myOnlineName) return alert("Bitte gib deinen Namen ein!");
  if (!codeInput) return alert("Bitte gib einen Raumcode ein!");

  let { data: room, error } = await _supabase
    .from("live_matches")
    .select("*")
    .eq("room_code", codeInput)
    .single();
  if (error || !room) return alert("Raum nicht gefunden!");
  if (room.status !== "waiting") return alert("Das Spiel läuft bereits.");

  resetStatsTracker();
  amIPlayer1 = false;
  currentRoomCode = codeInput;
  bestOfLegs = room.best_of_legs || 3;
  p1TotalScore = 0;
  p2TotalScore = 0;
  p1Darts501 = 0;
  p2Darts501 = 0;
  p1DartsAtLegStart = 0;
  p2DartsAtLegStart = 0;
  currentMatchLog501 = [];

  await _supabase
    .from("live_matches")
    .update({
      player2_name: myOnlineName,
      status: "playing",
      last_action: "Spiel gestartet!",
    })
    .eq("room_code", codeInput);
  room.player2_name = myOnlineName;
  room.status = "playing";
  document.getElementById("online-lobby-screen").style.display = "none";
  document.getElementById("game-501-screen").style.display = "block";
  sync501UI(room);
  listenForOpponent(currentRoomCode);
}

async function cancelLobby() {
  if (currentRoomCode)
    await _supabase
      .from("live_matches")
      .delete()
      .eq("room_code", currentRoomCode);
  if (realtimeSubscription) _supabase.removeChannel(realtimeSubscription);
  document.getElementById("lobby-setup").style.display = "block";
  document.getElementById("lobby-waiting").style.display = "none";
  currentRoomCode = "";
  goHome();
}

function sync501UI(dbData) {
  if (!isLocal501) {
    // Wenn das Leg gerade frisch resettet wurde:
    if (
      dbData.player1_score === 501 &&
      dbData.player2_score === 501 &&
      dbData.player1_darts === 0 &&
      dbData.player2_darts === 0
    ) {
      p1LegThrows = [];
      p2LegThrows = [];
    } else {
      // Hat der Gegner geworfen?
      if (amIPlayer1 && dbData.player2_darts > p2Darts501) {
        p2LegThrows.push({
          old: parseInt(document.getElementById("p2-score").innerText),
          thrown: dbData.player2_last_score,
          new: dbData.player2_score,
        });
      } else if (!amIPlayer1 && dbData.player1_darts > p1Darts501) {
        p1LegThrows.push({
          old: parseInt(document.getElementById("p1-score").innerText),
          thrown: dbData.player1_last_score,
          new: dbData.player1_score,
        });
      }
      // Hat der Gegner "Undo" gedrückt?
      if (dbData.player1_darts < p1Darts501) p1LegThrows.pop();
      if (dbData.player2_darts < p2Darts501) p2LegThrows.pop();
    }
    updateThrowHistoryUI();
  }

  document.getElementById("p1-name").innerText = dbData.player1_name;
  document.getElementById("p2-name").innerText = dbData.player2_name;
  document.getElementById("p1-score").innerText = dbData.player1_score;
  document.getElementById("p2-score").innerText = dbData.player2_score;

  p1Darts501 = dbData.player1_darts || 0;
  p2Darts501 = dbData.player2_darts || 0;

  p1TotalScore = Math.round(((dbData.player1_avg || 0) / 3) * p1Darts501);
  p2TotalScore = Math.round(((dbData.player2_avg || 0) / 3) * p2Darts501);

  p1LastThrow = dbData.player1_last_score || "-";
  p2LastThrow = dbData.player2_last_score || "-";
  localP1Legs = dbData.player1_legs || 0;
  localP2Legs = dbData.player2_legs || 0;

  let p1LegDarts = p1Darts501 - p1DartsAtLegStart;
  let p2LegDarts = p2Darts501 - p2DartsAtLegStart;
  let p1LegAvg =
    p1LegDarts > 0
      ? (((501 - dbData.player1_score) / p1LegDarts) * 3).toFixed(2)
      : "0.00";
  let p2LegAvg =
    p2LegDarts > 0
      ? (((501 - dbData.player2_score) / p2LegDarts) * 3).toFixed(2)
      : "0.00";

  if (document.getElementById("p1-match-avg")) {
    document.getElementById("p1-match-avg").innerText = dbData.player1_avg
      ? dbData.player1_avg.toFixed(2)
      : "0.00";
    document.getElementById("p1-leg-avg").innerText = p1LegAvg;
    document.getElementById("p2-match-avg").innerText = dbData.player2_avg
      ? dbData.player2_avg.toFixed(2)
      : "0.00";
    document.getElementById("p2-leg-avg").innerText = p2LegAvg;
  }

  document.getElementById("p1-darts").innerText = `${p1Darts501} Darts`;
  document.getElementById("p2-darts").innerText = `${p2Darts501} Darts`;

  document.getElementById("p1-checkout").innerText = getCheckoutPath(
    dbData.player1_score
  );
  document.getElementById("p2-checkout").innerText = getCheckoutPath(
    dbData.player2_score
  );

  if (document.getElementById("p1-legs-display"))
    document.getElementById("p1-legs-display").innerText =
      dbData.player1_legs || 0;
  if (document.getElementById("p2-legs-display"))
    document.getElementById("p2-legs-display").innerText =
      dbData.player2_legs || 0;
  if (document.getElementById("p1-last-throw"))
    document.getElementById("p1-last-throw").innerText =
      dbData.player1_last_score || "-";
  if (document.getElementById("p2-last-throw"))
    document.getElementById("p2-last-throw").innerText =
      dbData.player2_last_score || "-";

  if (dbData.current_turn === 1) {
    document.getElementById("p1-box").classList.remove("inactive");
    document.getElementById("p2-box").classList.add("inactive");
    isMyTurn = amIPlayer1;
  } else {
    document.getElementById("p2-box").classList.remove("inactive");
    document.getElementById("p1-box").classList.add("inactive");
    isMyTurn = !amIPlayer1;
  }
  current501Input = "";
  update501Display();

  const undoBtn = document.getElementById("btn-undo-501");
  if (!isLocal501) {
    undoBtn.style.display = !isMyTurn ? "block" : "none";
  }
}

function append501Input(num) {
  if (!isLocal501 && !isMyTurn) return;
  if (current501Input.length >= 3) return;
  current501Input += num;
  if (parseInt(current501Input) > 180) current501Input = "180";
  update501Display();
}

function set501Input(val) {
  if (!isLocal501 && !isMyTurn) return;
  current501Input = val;
  update501Display();
}

function delete501Input() {
  if (!isLocal501 && !isMyTurn) return;
  current501Input = current501Input.slice(0, -1);
  update501Display();
}

function update501Display() {
  const display = document.getElementById("input-display-501");
  if (!isLocal501 && !isMyTurn) {
    display.innerText = "Gegner wirft...";
    display.style.color = "#888";
  } else if (current501Input === "") {
    let activeName = "Dein Wurf...";
    if (isLocal501) {
      activeName = localCurrentTurn === 1 ? localP1Name : localP2Name;
      display.innerText = `${activeName} wirft...`;
    } else {
      display.innerText = activeName;
    }
    display.style.color = "var(--accent-blue)";
  } else {
    display.innerText = current501Input;
    display.style.color = "white";
  }
}

function askCheckoutOverlay(question, minVal, maxVal) {
  return new Promise((resolve) => {
    // Genialer UX-Trick: Wenn es nur eine logische Antwort gibt (z. B. Check mit dem 1. Dart = 1 Versuch aufs Doppel),
    // dann überspringt die App die Abfrage vollautomatisch, um dir einen Klick zu sparen!
    if (minVal === maxVal) return resolve(minVal);

    // Numpad verstecken
    document.querySelector(".preset-grid").style.display = "none";
    document.querySelector(".numpad-grid").style.display = "none";

    const overlay = document.getElementById("checkout-overlay");
    document.getElementById("checkout-question").innerText = question;

    const btnContainer = document.getElementById("checkout-buttons");
    btnContainer.innerHTML = "";

    // Buttons generieren (z. B. 1, 2, 3)
    for (let i = minVal; i <= maxVal; i++) {
      let btn = document.createElement("button");
      btn.className = "num-btn";
      btn.style.background = "var(--accent-green)";
      btn.style.color = "black";
      btn.style.flex = "1";
      btn.innerText = i;
      btn.onclick = () => {
        overlay.style.display = "none";
        // Numpad wieder einblenden
        document.querySelector(".preset-grid").style.display = "grid";
        document.querySelector(".numpad-grid").style.display = "grid";
        resolve(i); // Code läuft weiter!
      };
      btnContainer.appendChild(btn);
    }
    overlay.style.display = "flex";
  });
}

function updateThrowHistoryUI() {
  let p1Container = document.getElementById("side-history-list-p1");
  let p2Container = document.getElementById("side-history-list-p2");
  if (!p1Container || !p2Container) return;

  // Setzt die aktuellen Namen in die Kopfzeile der Historie
  document.getElementById("history-p1-name").innerText =
    document.getElementById("p1-name").innerText;
  document.getElementById("history-p2-name").innerText =
    document.getElementById("p2-name").innerText;

  // Liste für Spieler 1 (Links) aufbauen
  let html1 = "";
  for (let t of p1LegThrows) {
    html1 += `<div style="display:flex; justify-content:space-between; padding:8px 10px; background:#2a2a2a; margin-bottom:5px; border-radius:6px; font-size: 0.9em; color:#ccc;">
                <span>${t.old} &rarr; <b style="color:white;">${t.new}</b></span>
                <span style="color:var(--accent-blue); font-weight:bold;">[${t.thrown}]</span>
              </div>`;
  }
  p1Container.innerHTML = html1;

  // Liste für Spieler 2 (Rechts) aufbauen
  let html2 = "";
  for (let t of p2LegThrows) {
    html2 += `<div style="display:flex; justify-content:space-between; padding:8px 10px; background:#2a2a2a; margin-bottom:5px; border-radius:6px; font-size: 0.9em; color:#ccc;">
                <span style="color:var(--accent-blue); font-weight:bold;">[${t.thrown}]</span>
                <span><b style="color:white;">${t.new}</b> &larr; ${t.old}</span>
              </div>`;
  }
  p2Container.innerHTML = html2;

  // Scrollt automatisch zum neuesten Wurf nach unten
  p1Container.scrollTop = p1Container.scrollHeight;
  p2Container.scrollTop = p2Container.scrollHeight;

  // Best-of-Text aktualisieren
  if (document.getElementById("match-format-display")) {
    document.getElementById(
      "match-format-display"
    ).innerText = `Best of ${bestOfLegs} Legs`;
  }
}

async function submit501Score() {
  if (!isLocal501 && !isMyTurn) if (current501Input === "") return;

  let score = parseInt(current501Input);

  const impossibleScores = [163, 166, 169, 172, 173, 175, 176, 178, 179];
  if (impossibleScores.includes(score)) {
    alert(`Ein Score von ${score} ist nicht möglich!`);
    current501Input = "";
    update501Display();
    return;
  }

  let currentPoints = isLocal501
    ? localCurrentTurn === 1
      ? localP1Score
      : localP2Score
    : amIPlayer1
    ? parseInt(document.getElementById("p1-score").innerText)
    : parseInt(document.getElementById("p2-score").innerText);

  const bogeyFinishes = [169, 168, 166, 165, 163, 162, 159];
  if (score === currentPoints && bogeyFinishes.includes(score)) {
    alert(
      `Nice try! Aber ${score} ist eine Bogey-Zahl. Die kannst du unmöglich mit einem Doppel checken!`
    );
    current501Input = "";
    update501Display();
    return;
  }

  let newScore = currentPoints - score;
  let isBust = false;
  let throwText = score.toString();

  if (newScore < 0 || newScore === 1) {
    newScore = currentPoints;
    isBust = true;
    throwText = "Bust";
  }

  let isFinished = newScore === 0;

  // --- PRO STATS & CHECKOUT TRACKING ---
  let isOnFinish = getCheckoutPath(currentPoints) !== "";
  let dartsThrownThisTurn = 3;
  let pStats = isLocal501
    ? localCurrentTurn === 1
      ? statsTracker.p1
      : statsTracker.p2
    : amIPlayer1
    ? statsTracker.p1
    : statsTracker.p2;

  if (isBust) {
    pStats.busts++;
    if (isOnFinish) {
      let ans = await askCheckoutOverlay(
        "Bust! Wie viele Darts gingen aufs Doppel?",
        0,
        3
      );
      pStats.checkoutAttempts += ans;
    }
  } else if (isFinished) {
    pStats.checkoutHits++;

    // Abfrage 1: Gesamte Darts für den Check
    let turnDarts = await askCheckoutOverlay(
      "GAME SHOT! 🎯\nMit dem wievielten Dart gecheckt?",
      1,
      3
    );
    dartsThrownThisTurn = turnDarts;

    // Abfrage 2: Darts auf das Doppel (Maximal so viele, wie insgesamt geworfen wurden)
    let doubleDarts = await askCheckoutOverlay(
      `Checkout Attempts:\nWie viele der ${turnDarts} Darts waren aufs Doppel?`,
      1,
      turnDarts
    );
    pStats.checkoutAttempts += doubleDarts;
  } else {
    if (score === 180) pStats.t180++;
    else if (score >= 140) pStats.t140++;
    else if (score >= 100) pStats.t100++;

    if (isOnFinish && score > 0) {
      let ans = await askCheckoutOverlay(
        "Kein Finish! Wie viele Darts gingen aufs Doppel?",
        0,
        3
      );
      pStats.checkoutAttempts += ans;
    }
  }

  pStats.dartsCurrentLeg += dartsThrownThisTurn;
  if (
    isFinished &&
    (pStats.bestLeg === 0 || pStats.dartsCurrentLeg < pStats.bestLeg)
  ) {
    pStats.bestLeg = pStats.dartsCurrentLeg;
  }
  // -------------------------------------

  if (isLocal501) {
    history501Stack.push({
      p1Score: localP1Score,
      p2Score: localP2Score,
      p1Darts: p1Darts501,
      p2Darts: p2Darts501,
      turn: localCurrentTurn,
      p1Last: p1LastThrow,
      p2Last: p2LastThrow,
      p1Total: p1TotalScore,
      p2Total: p2TotalScore,
      p1Throws: [...p1LegThrows], // <--- NEU
      p2Throws: [...p2LegThrows], // <--- NEU
    });

    // --- NEU: WURF IN DIE LISTE SCHREIBEN (LOKAL) ---
    if (localCurrentTurn === 1)
      p1LegThrows.push({
        old: currentPoints,
        thrown: throwText,
        new: newScore,
      });
    else
      p2LegThrows.push({
        old: currentPoints,
        thrown: throwText,
        new: newScore,
      });
    updateThrowHistoryUI();
    // ------------------------------------------------

    if (localCurrentTurn === 1) {
      localP1Score = newScore;
      p1Darts501 += dartsThrownThisTurn; // Nutzt jetzt die echten Darts!
      p1TotalScore += currentPoints - newScore;
      p1LastThrow = throwText;
    } else {
      localP2Score = newScore;
      p2Darts501 += dartsThrownThisTurn; // Nutzt jetzt die echten Darts!
      p2TotalScore += currentPoints - newScore;
      p2LastThrow = throwText;
    }

    document.getElementById("p1-score").innerText = localP1Score;
    document.getElementById("p2-score").innerText = localP2Score;
    update501QoL(localP1Score, localP2Score);

    if (isFinished) {
      handleLegWinLocal(
        localCurrentTurn === 1 ? localP1Name : localP2Name,
        localCurrentTurn === 1 ? 1 : 2,
        score
      );
      return;
    }
    localCurrentTurn = localCurrentTurn === 1 ? 2 : 1;
    updateLocalTurnHighlight();
  } else {
    let prevState = {
      player1_score: parseInt(document.getElementById("p1-score").innerText),
      player2_score: parseInt(document.getElementById("p2-score").innerText),
      player1_darts: p1Darts501,
      player2_darts: p2Darts501,
      player1_avg:
        parseFloat(document.getElementById("p1-match-avg").innerText) || 0,
      player2_avg:
        parseFloat(document.getElementById("p2-match-avg").innerText) || 0,
      player1_last_score: document.getElementById("p1-last-throw").innerText,
      player2_last_score: document.getElementById("p2-last-throw").innerText,
      current_turn: amIPlayer1 ? 1 : 2,
    };

    if (amIPlayer1) {
      p1LegThrows.push({
        old: currentPoints,
        thrown: throwText,
        new: newScore,
      }); // <--- NEU
      p1Darts501 += dartsThrownThisTurn;
    } else {
      p2LegThrows.push({
        old: currentPoints,
        thrown: throwText,
        new: newScore,
      }); // <--- NEU
      p2Darts501 += dartsThrownThisTurn;
    }
    let myDarts = amIPlayer1 ? p1Darts501 : p2Darts501;

    update501QoL(
      amIPlayer1 ? newScore : prevState.player1_score,
      amIPlayer1 ? prevState.player2_score : newScore
    );
    isMyTurn = false;
    document.getElementById("input-display-501").innerText = "Sende...";

    let updatePayload = {
      current_turn: amIPlayer1 ? 2 : 1,
      last_action: isBust ? "Bust" : `Score: ${score}`,
      undo_requested: false,
      prev_state: prevState,
    };

    if (amIPlayer1) {
      updatePayload.player1_score = newScore;
      updatePayload.player1_darts = myDarts;
      updatePayload.player1_last_score = throwText;
      updatePayload.player1_avg =
        parseFloat(((p1TotalScore / myDarts) * 3).toFixed(2)) || 0.0;
    } else {
      updatePayload.player2_score = newScore;
      updatePayload.player2_darts = myDarts;
      updatePayload.player2_last_score = throwText;
      updatePayload.player2_avg =
        parseFloat(((p2TotalScore / myDarts) * 3).toFixed(2)) || 0.0;
    }

    if (isFinished) {
      let p1LegsDB =
        parseInt(document.getElementById("p1-legs-display").innerText) || 0;
      let p2LegsDB =
        parseInt(document.getElementById("p2-legs-display").innerText) || 0;
      if (amIPlayer1) p1LegsDB++;
      else p2LegsDB++;
      updatePayload.player1_legs = p1LegsDB;
      updatePayload.player2_legs = p2LegsDB;

      let safeBestOf = parseInt(bestOfLegs) || 3;
      let neededLegs = Math.max(1, Math.ceil(safeBestOf / 2));
      if (p1LegsDB >= neededLegs || p2LegsDB >= neededLegs)
        updatePayload.status = "match_won";
      else updatePayload.status = "leg_won";
    }
    const { error: dbError } = await _supabase
      .from("live_matches")
      .update(updatePayload)
      .eq("room_code", currentRoomCode);
    if (dbError) {
      alert("Datenbank-Fehler beim Senden: " + dbError.message);
      document.getElementById("input-display-501").innerText = "Fehler!";
    }
  }
}

function listenForOpponent(roomCode) {
  if (realtimeSubscription) _supabase.removeChannel(realtimeSubscription);
  realtimeSubscription = _supabase
    .channel("online-match-channel")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "live_matches",
        filter: `room_code=eq.${roomCode}`,
      },
      (payload) => {
        const dbData = payload.new;

        if (
          dbData.status === "playing" &&
          document.getElementById("game-501-screen").style.display === "none"
        ) {
          document.getElementById("online-lobby-screen").style.display = "none";
          document.getElementById("game-501-screen").style.display = "block";
        }

        if (dbData.status === "playing") sync501UI(dbData);

        if (dbData.status === "leg_won" || dbData.status === "match_won") {
          sync501UI(dbData);
          document.getElementById("win-overlay-501").style.display = "flex";

          let matchWon = dbData.status === "match_won";
          let winnerName =
            dbData.player1_score === 0
              ? dbData.player1_name
              : dbData.player2_name;
          let totalLegsDB = dbData.player1_legs + dbData.player2_legs;
          if (currentMatchLog501.length < totalLegsDB) {
            let p1Rest = dbData.player1_score;
            let p2Rest = dbData.player2_score;
            let fScore =
              p1Rest === 0
                ? parseInt(dbData.player1_last_score)
                : parseInt(dbData.player2_last_score);
            recordLegStat501(
              winnerName,
              dbData.player1_name,
              dbData.player2_name,
              p1Rest,
              p2Rest,
              fScore || 0
            );
          }
          document.getElementById("win-subtitle-501").innerText = matchWon
            ? `${winnerName} gewinnt das Match!`
            : `${winnerName} gewinnt das Leg!`;

          let btnNext = document.getElementById("btn-next-leg");
          let btnRematch = document.getElementById("btn-rematch");

          if (matchWon) {
            btnNext.style.display = "none";
            btnRematch.style.display = "inline-block";
            btnRematch.innerText = amIPlayer1
              ? "🔄 Neues Spiel (Rematch)"
              : "Warte auf Host...";
            btnRematch.disabled = !amIPlayer1;

            btnRematch.onclick = async () => {
              await _supabase
                .from("live_matches")
                .update({
                  status: "playing",
                  player1_score: 501,
                  player2_score: 501,
                  player1_legs: 0,
                  player2_legs: 0,
                  player1_darts: 0,
                  player2_darts: 0,
                  player1_last_score: "-",
                  player2_last_score: "-",
                  current_turn: 1,
                })
                .eq("room_code", currentRoomCode);
            };

            // --- EIGENE ONLINE STATS SPEICHERN ---
            let amIWinner =
              (dbData.player1_score === 0 && amIPlayer1) ||
              (dbData.player2_score === 0 && !amIPlayer1);
            let myScoreThrown = amIPlayer1 ? p1TotalScore : p2TotalScore;
            let myDarts = amIPlayer1 ? p1Darts501 : p2Darts501;
            let myFinish =
              amIWinner && dbData.last_action.includes("Score: ")
                ? parseInt(dbData.last_action.replace("Score: ", ""))
                : 0;
            let myAvg =
              myDarts > 0 ? ((myScoreThrown / myDarts) * 3).toFixed(2) : "0.00";

            let totalLegs = dbData.player1_legs + dbData.player2_legs;
            let myLegsWon = amIPlayer1
              ? dbData.player1_legs
              : dbData.player2_legs;

            save501Stats(
              myOnlineName,
              myLegsWon,
              totalLegs,
              myDarts,
              myScoreThrown,
              myFinish,
              amIPlayer1 ? statsTracker.p1 : statsTracker.p2,
              currentMatchLog501
            );
            let oppName = amIPlayer1
              ? dbData.player2_name
              : dbData.player1_name;
            save501MatchHistory(
              myOnlineName,
              oppName,
              amIWinner,
              parseFloat(myAvg),
              myDarts,
              myFinish
            );
          } else {
            btnNext.style.display = "inline-block";
            btnRematch.style.display = "none";
            btnNext.innerText = amIPlayer1
              ? "Nächstes Leg (5s...)"
              : "Warte auf Host...";
            btnNext.disabled = !amIPlayer1;

            btnNext.onclick = async () => {
              let nextTurn =
                (dbData.player1_legs + dbData.player2_legs) % 2 === 0 ? 1 : 2;
              await _supabase
                .from("live_matches")
                .update({
                  status: "playing",
                  player1_score: 501,
                  player2_score: 501,
                  current_turn: nextTurn,
                  player1_last_score: "-",
                  player2_last_score: "-",
                })
                .eq("room_code", currentRoomCode);
            };

            // NEU: Automatischer Start nach 5 Sekunden (Nur der Host darf den Befehl senden!)
            if (amIPlayer1) {
              setTimeout(() => {
                if (
                  document.getElementById("win-overlay-501").style.display ===
                  "flex"
                ) {
                  btnNext.click(); // Simuliert den Klick auf den Button
                }
              }, 5000);
            }
          }
        }

        if (
          dbData.status === "playing" &&
          document.getElementById("win-overlay-501").style.display === "flex"
        ) {
          document.getElementById("win-overlay-501").style.display = "none";
          if (dbData.player1_legs === 0 && dbData.player2_legs === 0) {
            p1TotalScore = 0;
            p2TotalScore = 0;
            p1Darts501 = 0;
            p2Darts501 = 0;
            // NEU: Setzt die Leg-Averages und Pro-Stats beim Rematch auf 0!
            p1DartsAtLegStart = 0;
            p2DartsAtLegStart = 0;
            currentMatchLog501 = [];
            resetStatsTracker();
          }
          sync501UI(dbData);
        }

        if (dbData.status === "cancelled") {
          alert("⚠️ Dein Gegner hat das Spiel abgebrochen!");
          cancel501Game(true, false);
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "live_matches",
        filter: `room_code=eq.${roomCode}`,
      },
      (payload) => {
        alert("⚠️ Der Raum wurde geschlossen!");
        cancel501Game(true, false);
      }
    )
    .subscribe();
}

async function cancel501Game(force = false, broadcastToOpponent = true) {
  if (force || confirm("Spiel wirklich verlassen?")) {
    if (!isLocal501 && currentRoomCode && broadcastToOpponent) {
      await _supabase
        .from("live_matches")
        .update({ status: "cancelled" })
        .eq("room_code", currentRoomCode);
      await _supabase
        .from("live_matches")
        .delete()
        .eq("room_code", currentRoomCode);
    }
    isLocal501 = false;
    currentRoomCode = "";
    if (realtimeSubscription) {
      _supabase.removeChannel(realtimeSubscription);
      realtimeSubscription = null;
    }
    document.getElementById("game-501-screen").style.display = "none";
    document.getElementById("lobby-waiting").style.display = "none";
    document.getElementById("lobby-setup").style.display = "block";
    goHome();
  }
}

async function requestUndo() {
  if (isLocal501) {
    undo501Turn();
  } else {
    // 1. Aktuellen Status aus der Datenbank abrufen
    let { data: room } = await _supabase
      .from("live_matches")
      .select("prev_state")
      .eq("room_code", currentRoomCode)
      .single();

    if (room && room.prev_state) {
      // 2. Sicherheits-Check: Dürfen wir stornieren? (Nur wenn WIR den letzten Wurf gemacht haben)
      let wasMyTurn =
        (amIPlayer1 && room.prev_state.current_turn === 1) ||
        (!amIPlayer1 && room.prev_state.current_turn === 2);

      if (wasMyTurn) {
        // 3. Zustand sofort wiederherstellen (ohne den Gegner zu fragen!)
        let restore = room.prev_state;
        restore.undo_requested = false;
        restore.prev_state = null; // Verhindert doppeltes Undo in Folge

        await _supabase
          .from("live_matches")
          .update(restore)
          .eq("room_code", currentRoomCode);
        return;
      }
    }
    // Falls der Gegner in der Zwischenzeit schon geworfen hat:
    alert("⚠️ Undo nicht mehr möglich! Dein Gegner hat bereits geworfen.");
  }
}

function recordLegStat501(
  winnerName,
  p1Name,
  p2Name,
  p1Rest,
  p2Rest,
  finishScore
) {
  // Berechnet die exakt in diesem Leg geworfenen Darts
  let p1LegDarts = p1Darts501 - p1DartsAtLegStart;
  let p2LegDarts = p2Darts501 - p2DartsAtLegStart;

  let legObj = {
    leg_number: currentMatchLog501.length + 1,
    winner: winnerName,
    p1_name: p1Name,
    p2_name: p2Name,
    p1_darts: p1LegDarts,
    p2_darts: p2LegDarts,
    p1_rest: p1Rest,
    p2_rest: p2Rest,
    checkout: finishScore,
  };
  currentMatchLog501.push(legObj);

  // Startwerte für das nächste Leg setzen
  p1DartsAtLegStart = p1Darts501;
  p2DartsAtLegStart = p2Darts501;
}

function handleLegWinLocal(winnerName, playerNum, finishScore) {
  recordLegStat501(
    winnerName,
    localP1Name,
    localP2Name,
    localP1Score,
    localP2Score,
    finishScore
  );
  if (playerNum === 1) localP1Legs++;
  else localP2Legs++;
  update501QoL(localP1Score, localP2Score);

  let matchWon = false;
  const legsToWin = Math.ceil(bestOfLegs / 2);

  if (localP1Legs >= legsToWin || localP2Legs >= legsToWin) {
    matchWon = true;

    let totalLegs = localP1Legs + localP2Legs;
    // WICHTIG: Hier am Ende muss zwingend statsTracker.p1 / .p2 stehen!
    save501Stats(
      localP1Name,
      localP1Legs,
      totalLegs,
      p1Darts501,
      p1TotalScore,
      playerNum === 1 ? finishScore : 0,
      statsTracker.p1
    );
    save501Stats(
      localP2Name,
      localP2Legs,
      totalLegs,
      p2Darts501,
      p2TotalScore,
      playerNum === 2 ? finishScore : 0,
      statsTracker.p2
    );

    let p1Avg = ((p1TotalScore / p1Darts501) * 3).toFixed(2);
    let p2Avg = ((p2TotalScore / p2Darts501) * 3).toFixed(2);
    save501MatchHistory(
      localP1Name,
      localP2Name,
      playerNum === 1,
      parseFloat(p1Avg),
      p1Darts501,
      playerNum === 1 ? finishScore : 0
    );
    save501MatchHistory(
      localP2Name,
      localP1Name,
      playerNum === 2,
      parseFloat(p2Avg),
      p2Darts501,
      playerNum === 2 ? finishScore : 0
    );
  }

  const overlay = document.getElementById("win-overlay-501");
  document.getElementById("win-subtitle-501").innerText = matchWon
    ? `${winnerName} gewinnt das Match!`
    : `${winnerName} gewinnt das Leg!`;

  const btnNext = document.getElementById("btn-next-leg");
  const btnRematch = document.getElementById("btn-rematch");

  if (matchWon) {
    btnNext.style.display = "none";
    btnRematch.style.display = "inline-block";
  } else {
    btnNext.style.display = "inline-block";
    btnRematch.style.display = "none";
    btnNext.innerText = "Nächstes Leg startet...";

    setTimeout(() => {
      // Nur ausführen, wenn das Overlay noch offen ist (falls man nicht schon manuell geklickt hat)
      if (overlay.style.display === "flex" && isLocal501) {
        startNextLeg();
      }
    }, 1500);
  }

  overlay.style.display = "flex";
}

function startNextLeg() {
  if (isLocal501) resetLegLocal();
}

function triggerRematch() {
  if (isLocal501) startLocal501Game();
}

document.addEventListener("keydown", function (event) {
  if (document.getElementById("game-501-screen").style.display !== "block")
    return;
  if (document.activeElement.tagName === "INPUT") return;

  if (event.key === "Enter") {
    event.preventDefault(); // NEU: Verbietet dem Browser den Doppel-Klick!
    submit501Score();
  } else if (event.key >= "0" && event.key <= "9") {
    event.preventDefault();
    append501Input(event.key);
  } else if (event.key === "Backspace") {
    event.preventDefault();
    delete501Input();
  } else if (event.key === "Escape") {
    cancel501Game();
  }
});
