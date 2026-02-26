let p1LegThrows = [];
let p2LegThrows = [];
let botTimer501 = null;

function resetStatsTracker() {
  statsTracker = {
    p1: {
      dartsCurrentLeg: 0,
      bestLeg: 0,
      highestFinish: 0,
      t100: 0,
      t140: 0,
      t180: 0,
      busts: 0,
      checkoutAttempts: 0,
      checkoutHits: 0,
      scoreFrequencies: {},
    },
    p2: {
      dartsCurrentLeg: 0,
      bestLeg: 0,
      highestFinish: 0,
      t100: 0,
      t140: 0,
      t180: 0,
      busts: 0,
      checkoutAttempts: 0,
      checkoutHits: 0,
      scoreFrequencies: {},
    },
  };
}

function startLocal501Game() {
  bestOfLegs = parseInt(document.getElementById("best-of-legs").value || 3);
  localP1Name =
    document.getElementById("local-p1-name").value.trim() || "Spieler 1";
  localP2Name =
    document.getElementById("local-p2-name").value.trim() || "Spieler 2";
  isP2Bot = localP2Name.includes("[BOT]");
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

  // 1. ZUERST DIE NAMEN UND AVATARE SETZEN!
  document.getElementById("p1-name").innerText = localP1Name;
  document.getElementById("p2-name").innerText = localP2Name;

  let avatarP1 = document.getElementById("avatar-p1");
  let avatarP2 = document.getElementById("avatar-p2");

  if (avatarP1) {
    let p1Img =
      !isGuest && currentUser && localP1Name === myOnlineName
        ? currentUser.user_metadata?.avatar_url
        : null;
    avatarP1.src =
      p1Img || `https://api.dicebear.com/7.x/avataaars/svg?seed=${localP1Name}`;
  }
  if (avatarP2) {
    avatarP2.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${localP2Name}`;
  }

  // 2. DANN ERST DIE HISTORIE LADEN!
  updateThrowHistoryUI();

  history501Stack = [];
  localCurrentTurn = (localP1Legs + localP2Legs) % 2 === 0 ? 1 : 2;
  isMyTurn = true;
  statsTracker.p1.dartsCurrentLeg = 0;
  statsTracker.p2.dartsCurrentLeg = 0;
  document.getElementById("win-overlay-501").style.display = "none";

  updateLocalTurnHighlight();
  update501QoL(localP1Score, localP2Score);

  // Wenn Spieler 2 ein Bot ist und er anfangen darf, spielt er automatisch los!
  if (localCurrentTurn === 2 && isP2Bot) {
    setTimeout(() => play501BotTurn(), 800);
  }
}

function update501QoL(p1Score, p2Score) {
  document.getElementById("p1-score").innerText = p1Score;
  document.getElementById("p2-score").innerText = p2Score;

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
    // NEU: Spezielle Wege für ungerade Reste unter 40
    39: "7 D16",
    37: "5 D16",
    35: "3 D16",
    33: "1 D16",
    31: "15 D8",
    29: "13 D8",
    27: "11 D8",
    25: "9 D8",
    23: "7 D8",
    21: "5 D8",
    19: "3 D8",
    17: "1 D8",
    15: "7 D4",
    13: "5 D4",
    11: "3 D4",
    9: "1 D4",
    7: "3 D2",
    5: "1 D2",
    3: "1 D1",
  };

  if (checkouts[score]) return checkouts[score];

  // Automatischer Fallback für alle geraden Zahlen bis 40
  if (score <= 40 && score % 2 === 0) return `D${score / 2}`;

  return "";
}

function undo501Turn() {
  if (history501Stack.length === 0) return;

  // 1. Bot sofort stoppen, bevor wir den State ändern
  if (botTimer501) {
    clearTimeout(botTimer501);
    botTimer501 = null;
  }

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

  // UI entsperren
  const numpad = document.querySelector(".numpad-grid");
  if (numpad) numpad.style.pointerEvents = "auto";

  // Falls nach dem Undo wieder der Bot dran ist -> neu triggern
  if (localCurrentTurn === 2 && isP2Bot && isLocal501) {
    play501BotTurn();
  }
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
  let myAvatar = null;
  if (!isGuest && currentUser && currentUser.user_metadata?.avatar_url) {
    myAvatar = currentUser.user_metadata.avatar_url;
  }

  const { error } = await _supabase.from("live_matches").insert([
    {
      room_code: currentRoomCode,
      player1_name: myOnlineName,
      player1_avatar: myAvatar,
      status: "waiting",
      best_of_legs: bestOfLegs,
      player1_legs: 0,
      player2_legs: 0,
      player1_last_score: "-",
      player2_last_score: "-",
    },
  ]);

  if (error) return alert("Fehler:\n" + error.message);

  openOnlineLobby(currentRoomCode, myOnlineName, null, true);
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
  let myAvatar = null;
  if (!isGuest && currentUser && currentUser.user_metadata?.avatar_url) {
    myAvatar = currentUser.user_metadata.avatar_url;
  }

  await _supabase
    .from("live_matches")
    .update({
      player2_name: myOnlineName,
      player2_avatar: myAvatar,
      last_action: "Gast ist beigetreten!",
    })
    .eq("room_code", codeInput);

  // ---> NEU: Setzt den Gast in die Lobby
  openOnlineLobby(codeInput, room.player1_name, myOnlineName, false);
  listenForOpponent(currentRoomCode);
}

async function cancelLobby() {
  await cancel501Game(true);
}

function sync501UI(dbData) {
  // 1. ZUERST DIE NAMEN UND AVATARE SETZEN!
  document.getElementById("p1-name").innerText = dbData.player1_name;
  document.getElementById("p2-name").innerText = dbData.player2_name;

  let avatarP1 = document.getElementById("avatar-p1");
  let avatarP2 = document.getElementById("avatar-p2");

  if (avatarP1) {
    avatarP1.src =
      dbData.player1_avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${dbData.player1_name}`;
  }
  if (avatarP2) {
    avatarP2.src =
      dbData.player2_avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${dbData.player2_name}`;
  }

  // 2. DANN WÜRFE BERECHNEN UND HISTORIE LADEN
  if (!isLocal501) {
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
  if (parseInt(current501Input) > 180) {
    showToast("Ungültige Eingabe!", "error");
    current501Input = "";
    update501Display();
    return;
  }
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

function askCheckoutOverlay(question, minVal, maxVal, allowCancel = false) {
  return new Promise((resolve) => {
    // Auto-Skip nur, wenn man NICHT abbrechen darf (z.B. bei der Folgefrage)
    if (minVal === maxVal && !allowCancel) return resolve(minVal);

    // Numpad verstecken
    document.querySelector(".preset-grid").style.display = "none";
    document.querySelector(".numpad-grid").style.display = "none";

    const overlay = document.getElementById("checkout-overlay");
    document.getElementById("checkout-question").innerText = question;

    const btnContainer = document.getElementById("checkout-buttons");
    btnContainer.innerHTML = "";
    btnContainer.style.display = "flex";
    btnContainer.style.flexWrap = "wrap"; // Erlaubt den Umbruch für den Cancel-Button
    btnContainer.style.gap = "10px";

    // Standard Nummern-Buttons generieren
    for (let i = minVal; i <= maxVal; i++) {
      let btn = document.createElement("button");
      btn.className = "num-btn";
      btn.style.background = "var(--accent-green)";
      btn.style.color = "black";
      btn.style.flex = "1";
      btn.style.minWidth = "60px";
      btn.innerText = i;
      btn.onclick = () => {
        overlay.style.display = "none";
        document.querySelector(".preset-grid").style.display = "grid";
        document.querySelector(".numpad-grid").style.display = "grid";
        resolve(i);
      };
      btnContainer.appendChild(btn);
    }

    // NEU: Den roten "Verrechnet" Button hinzufügen
    if (allowCancel) {
      let cancelBtn = document.createElement("button");
      cancelBtn.className = "num-btn";
      cancelBtn.style.background = "var(--accent-red)";
      cancelBtn.style.color = "white";
      cancelBtn.style.flexBasis = "100%"; // Nimmt die komplette untere Zeile ein
      cancelBtn.style.padding = "15px";
      cancelBtn.style.fontSize = "1.1em";
      cancelBtn.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Halt, verrechnet!';
      cancelBtn.onclick = () => {
        overlay.style.display = "none";
        document.querySelector(".preset-grid").style.display = "grid";
        document.querySelector(".numpad-grid").style.display = "grid";
        resolve("CANCEL"); // Spezielles Signal zum Abbruch
      };
      btnContainer.appendChild(cancelBtn);
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

  // --- HISTORIE P1 KÜRZEN AUF MAX. 5 ---
  let displayP1 = p1LegThrows;
  if (displayP1.length > 5) {
    displayP1 = displayP1.slice(-5); // Schneidet alles bis auf die letzten 5 Würfe ab
  }

  let html1 = "";
  for (let t of displayP1) {
    html1 += `<div style="display:flex; justify-content:space-between; padding:8px 10px; background:#2a2a2a; margin-bottom:5px; border-radius:6px; font-size: 0.9em; color:#ccc;">
                <span>${t.old} &rarr; <b style="color:white;">${t.new}</b></span>
                <span style="color:var(--accent-blue); font-weight:bold;">[${t.thrown}]</span>
              </div>`;
  }
  p1Container.innerHTML = html1;

  // --- HISTORIE P2 KÜRZEN AUF MAX. 5 ---
  let displayP2 = p2LegThrows;
  if (displayP2.length > 5) {
    displayP2 = displayP2.slice(-5);
  }

  // Liste für Spieler 2 (Rechts) aufbauen
  let html2 = "";
  for (let t of displayP2) {
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

async function submit501Score(presetScore = null) {
  // 1. NEU: Erlaubt Preset-Buttons (falls du welche nutzt) und fängt das Double-Click-Problem stumm ab!
  let scoreStr =
    presetScore !== null ? presetScore.toString() : current501Input;
  if (scoreStr === "" || scoreStr === null) return;

  if (!isLocal501 && !isMyTurn) return;

  let score = parseInt(scoreStr);

  // Fängt wirkliche Fehleingaben ab (z.B. Buchstaben)
  if (isNaN(score)) {
    showToast("Ungültige Eingabe!", "error");
    current501Input = "";
    update501Display();
    return;
  }

  if (score < 0 || score > 180) {
    showToast("Score muss zwischen 0 und 180 liegen!", "error");
    current501Input = "";
    update501Display();
    return;
  }

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
  let doubleDarts = 0;
  let pStats = isLocal501
    ? localCurrentTurn === 1
      ? statsTracker.p1
      : statsTracker.p2
    : amIPlayer1
    ? statsTracker.p1
    : statsTracker.p2;
  let isBotThrow = isLocal501 && localCurrentTurn === 2 && isP2Bot;

  // 1. ZUERST POPUPS FRAGEN (mit Möglichkeit zum Abbrechen!)
  if (isBust) {
    if (isOnFinish) {
      let ans = isBotThrow
        ? botDoubleAttempts
        : await askCheckoutOverlay(
            "Bust! Wie viele Darts gingen aufs Doppel?",
            0,
            3,
            true
          );

      if (ans === "CANCEL") {
        current501Input = "";
        update501Display();
        return; // Bricht den Wurf lautlos ab!
      }
      doubleDarts = ans;
    }
  } else if (isFinished) {
    let ansDarts = isBotThrow
      ? botDartsThrownThisTurn
      : await askCheckoutOverlay(
          "GAME SHOT!\nMit dem wievielten Dart gecheckt?",
          1,
          3,
          true
        );

    if (ansDarts === "CANCEL") {
      current501Input = "";
      update501Display();
      return; // Bricht den Wurf lautlos ab!
    }
    dartsThrownThisTurn = ansDarts;

    // Folgefrage (Hier kein Cancel mehr nötig, da der User den Game Shot schon bestätigt hat)
    let ansDouble = isBotThrow
      ? botDoubleAttempts
      : await askCheckoutOverlay(
          `Checkout Attempts:\nWie viele der ${dartsThrownThisTurn} Darts waren aufs Doppel?`,
          1,
          dartsThrownThisTurn,
          false
        );
    doubleDarts = ansDouble;
  } else {
    let isDirectDouble =
      (currentPoints <= 40 && currentPoints % 2 === 0) || currentPoints === 50;
    if (isOnFinish && (score > 0 || isDirectDouble)) {
      let ans = isBotThrow
        ? botDoubleAttempts
        : await askCheckoutOverlay(
            "Kein Finish! Wie viele Darts gingen aufs Doppel?",
            0,
            3,
            true
          );

      if (ans === "CANCEL") {
        current501Input = "";
        update501Display();
        return; // Bricht den Wurf lautlos ab!
      }
      doubleDarts = ans;
    }
  }

  // 2. WENN WIR HIER SIND: DER WURF IST GÜLTIG & BESTÄTIGT! JETZT STATS SPEICHERN!
  if (score === 180) pStats.t180++;
  else if (score >= 140) pStats.t140++;
  else if (score >= 100) pStats.t100++;

  let thrownVal = isBust ? 0 : score;
  if (thrownVal > 0) {
    pStats.scoreFrequencies[thrownVal] =
      (pStats.scoreFrequencies[thrownVal] || 0) + 1;
  }

  if (isBust) {
    pStats.busts++;
    pStats.checkoutAttempts += doubleDarts;
  } else if (isFinished) {
    pStats.checkoutHits++;
    if (currentPoints > (pStats.highestFinish || 0)) {
      pStats.highestFinish = currentPoints;
    }
    pStats.checkoutAttempts += doubleDarts;
  } else {
    pStats.checkoutAttempts += doubleDarts;
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
    if (localCurrentTurn === 2 && isP2Bot) play501BotTurn();
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
      });
      p1Darts501 += dartsThrownThisTurn;
      p1TotalScore += currentPoints - newScore;
    } else {
      p2LegThrows.push({
        old: currentPoints,
        thrown: throwText,
        new: newScore,
      }); // <--- NEU
      p2Darts501 += dartsThrownThisTurn;
      p2TotalScore += currentPoints - newScore;
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

  // Eindeutiger Channel pro Raum für bessere Stabilität
  realtimeSubscription = _supabase
    .channel(`room-${roomCode}`)
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
        if (!dbData) return;

        // --- Abbruch-Check (Status-basiert) ---
        if (dbData.status === "cancelled") {
          let cancelerName = dbData.last_action || "Ein Spieler";
          if (cancelerName !== myOnlineName) {
            showToast(`${cancelerName} hat das Spiel abgebrochen!`, "info");
          }
          // Wichtig: Wir rufen hier die UI-Löschung auf
          cancelCurrentGame("game-501-screen", true);
          return;
        }

        // --- Lobby Update ---
        if (dbData.status === "waiting") {
          if (typeof updateLobbyPlayers === "function") {
            updateLobbyPlayers(dbData.player1_name, dbData.player2_name);
          }
        }

        // --- Spielstart ---
        if (
          dbData.status === "playing" &&
          document.getElementById("game-501-screen").style.display === "none"
        ) {
          document.getElementById("online-lobby-screen").style.display = "none";
          let activeLobby = document.getElementById("lobby-active");
          if (activeLobby) activeLobby.style.display = "none";
          document.getElementById("game-501-screen").style.display = "block";
        }

        if (dbData.status === "playing") sync501UI(dbData);

        // --- Sieg-Logik (Leg/Match) ---
        if (dbData.status === "leg_won" || dbData.status === "match_won") {
          sync501UI(dbData); // Zwingt die UI, die 0 beim Gegner anzuzeigen!

          let p1WonLeg = dbData.player1_score === 0;
          let winnerName = p1WonLeg ? dbData.player1_name : dbData.player2_name;
          let isMatchWon = dbData.status === "match_won";

          const overlay = document.getElementById("win-overlay-501");
          const btnNext = document.getElementById("btn-next-leg");
          const btnRematch = document.getElementById("btn-rematch");

          document.getElementById("win-subtitle-501").innerText = isMatchWon
            ? `${winnerName} gewinnt das Match!`
            : `${winnerName} gewinnt das Leg!`;

          if (isMatchWon) {
            btnNext.style.display = "none";

            // Nur der Host darf das Rematch triggern
            if (isOnlineHost) {
              btnRematch.style.display = "inline-block";
            } else {
              btnRematch.style.display = "none";
              document.getElementById("win-subtitle-501").innerText +=
                "\n(Warte auf Host für Rematch...)";
            }

            // Stats nur 1x speichern, wenn sich das Overlay öffnet
            if (overlay.style.display !== "flex" && !isGuest && currentUser) {
              let totalLegs = dbData.player1_legs + dbData.player2_legs;
              let myLegs = amIPlayer1
                ? dbData.player1_legs
                : dbData.player2_legs;
              let myScore = amIPlayer1 ? p1TotalScore : p2TotalScore;
              let myDarts = amIPlayer1
                ? dbData.player1_darts
                : dbData.player2_darts;
              let myAvg =
                myDarts > 0 ? ((myScore / myDarts) * 3).toFixed(2) : 0;
              let p1WonLeg = dbData.player1_score === 0;

              let myStatsObj = amIPlayer1 ? statsTracker.p1 : statsTracker.p2;

              // ---> KORREKTUR: Nur noch das neue, sichere System nutzen! <---
              let finalScore = myStatsObj.highestFinish || 0;

              save501Stats(
                myOnlineName,
                myLegs,
                totalLegs,
                myDarts,
                myScore,
                finalScore, // isNaN-Check ist nicht mehr nötig, da highestFinish immer eine Zahl ist
                myStatsObj
              );

              save501MatchHistory(
                myOnlineName,
                amIPlayer1 ? dbData.player2_name : dbData.player1_name,
                (amIPlayer1 && p1WonLeg) || (!amIPlayer1 && !p1WonLeg),
                parseFloat(myAvg),
                myDarts,
                finalScore,
                currentMatchLog501
              );
            }
          } else {
            btnRematch.style.display = "none";

            // ---> NEU: Automatischer Start durch den Host <---
            if (isOnlineHost) {
              btnNext.style.display = "inline-block";
              btnNext.innerText = "Nächstes Leg startet...";
              btnNext.disabled = false; // Falls man manuell schneller klicken will

              // Wartet 3 Sekunden und startet das nächste Leg
              setTimeout(() => {
                // Nur ausführen, falls das Overlay noch offen ist
                if (overlay.style.display === "flex") {
                  startNextLeg();
                }
              }, 3000);
            } else {
              btnNext.style.display = "inline-block";
              btnNext.innerText = "Nächstes Leg startet...";
              btnNext.disabled = true;
            }
          }

          // Leg-Historie aufzeichnen (nur 1x)
          if (overlay.style.display !== "flex") {
            let finishPoints =
              parseInt((dbData.last_action || "0").replace(/\D/g, "")) || 0;
            recordLegStat501(
              winnerName,
              dbData.player1_name,
              dbData.player2_name,
              dbData.player1_score,
              dbData.player2_score,
              finishPoints
            );
          }

          overlay.style.display = "flex";
        }

        // Reset bei neuem Leg / Rematch
        if (
          dbData.status === "playing" &&
          document.getElementById("win-overlay-501").style.display === "flex"
        ) {
          document.getElementById("win-overlay-501").style.display = "none";
          if (dbData.player1_legs === 0 && dbData.player2_legs === 0) {
            resetStatsTracker();
            p1TotalScore = 0;
            p2TotalScore = 0;
            currentMatchLog501 = [];
          }

          // ---> NEU: Darts-Counter für das neue Leg zwingend nullen! (Online Bug Fix)
          statsTracker.p1.dartsCurrentLeg = 0;
          statsTracker.p2.dartsCurrentLeg = 0;

          p1DartsAtLegStart = dbData.player1_darts;
          p2DartsAtLegStart = dbData.player2_darts;
          p1LegThrows = [];
          p2LegThrows = [];

          sync501UI(dbData);
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
        // HINWEIS: Dieser Filter funktioniert oft nur, wenn room_code der PK ist!
      },
      (payload) => {
        // Wenn die Zeile weg ist, gehen wir sicherheitshalber immer raus

        if (
          payload.old &&
          payload.old.room_code &&
          payload.old.room_code !== roomCode
        ) {
          return;
        }
        showToast("Der Raum wurde geschlossen!");
        cancelCurrentGame("game-501-screen", true);
      }
    )
    .subscribe();
}

async function cancel501Game(skipConfirm = false) {
  const roomToDelete = currentRoomCode;

  const execute = async () => {
    if (!isLocal501 && roomToDelete) {
      // 1. Status auf "cancelled" setzen (Benachrichtigt den Gegner via UPDATE)
      await _supabase
        .from("live_matches")
        .update({
          status: "cancelled",
          last_action: myOnlineName,
        })
        .eq("room_code", roomToDelete);

      // 2. Kurz warten und dann erst ganz löschen
      setTimeout(async () => {
        await _supabase
          .from("live_matches")
          .delete()
          .eq("room_code", roomToDelete);
      }, 1000);
    }
    cancelCurrentGame("game-501-screen", true);
  };

  if (skipConfirm) await execute();
  else showCancelModal(execute);
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
    alert("Undo nicht mehr möglich! Dein Gegner hat bereits geworfen.");
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
  let p1LegDarts = p1Darts501 - p1DartsAtLegStart;
  let p2LegDarts = p2Darts501 - p2DartsAtLegStart;

  // NEU: Wir speichern die kompletten Wurflisten für dieses Leg
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
    // Diese Listen enthalten {old, thrown, new} für jeden Wurf
    p1_history: [...p1LegThrows],
    p2_history: [...p2LegThrows],
  };
  currentMatchLog501.push(legObj);

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

    // Stats speichern (Nutzt trackerObj statt undefinierter p1FinalScore)
    save501Stats(
      localP1Name,
      localP1Legs,
      totalLegs,
      p1Darts501,
      p1TotalScore,
      statsTracker.p1.highestFinish || 0,
      statsTracker.p1
    );

    if (!isP2Bot) {
      save501Stats(
        localP2Name,
        localP2Legs,
        totalLegs,
        p2Darts501,
        p2TotalScore,
        statsTracker.p2.highestFinish || 0,
        statsTracker.p2
      );
    }

    let p1Avg =
      p1Darts501 > 0 ? ((p1TotalScore / p1Darts501) * 3).toFixed(2) : 0;
    let p2Avg =
      p2Darts501 > 0 ? ((p2TotalScore / p2Darts501) * 3).toFixed(2) : 0;

    save501MatchHistory(
      localP1Name,
      localP2Name,
      localP1Legs >= legsToWin,
      parseFloat(p1Avg),
      p1Darts501,
      statsTracker.p1.highestFinish || 0,
      currentMatchLog501
    );
    save501MatchHistory(
      localP2Name,
      localP1Name,
      localP2Legs >= legsToWin,
      parseFloat(p2Avg),
      p2Darts501,
      statsTracker.p2.highestFinish || 0,
      currentMatchLog501
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

    botTimer501 = setTimeout(() => {
      if (overlay.style.display === "flex" && isLocal501) {
        startNextLeg();
      }
    }, 1500);
  }
  overlay.style.display = "flex";
}

async function startNextLeg() {
  if (isLocal501) {
    resetLegLocal();
  } else if (isOnlineHost) {
    // Nächstes Leg für beide Spieler über die Datenbank einläuten
    let totalLegs =
      parseInt(document.getElementById("p1-legs-display").innerText) +
      parseInt(document.getElementById("p2-legs-display").innerText);
    let starter = totalLegs % 2 === 0 ? 1 : 2; // Wer das Leg beginnt, wechselt sich ab

    await _supabase
      .from("live_matches")
      .update({
        status: "playing",
        player1_score: 501,
        player2_score: 501,
        player1_last_score: "-",
        player2_last_score: "-",
        current_turn: starter,
        last_action: "Neues Leg gestartet!",
        prev_state: null,
      })
      .eq("room_code", currentRoomCode);
  }
}

async function triggerRematch() {
  if (isLocal501) {
    startLocal501Game();
  } else if (isOnlineHost) {
    // Komplettes Spiel resetten über die Datenbank
    await _supabase
      .from("live_matches")
      .update({
        status: "playing",
        player1_score: 501,
        player2_score: 501,
        player1_darts: 0,
        player2_darts: 0,
        player1_legs: 0,
        player2_legs: 0,
        player1_last_score: "-",
        player2_last_score: "-",
        player1_avg: 0,
        player2_avg: 0,
        current_turn: 1,
        last_action: "Neues Match gestartet!",
        prev_state: null,
      })
      .eq("room_code", currentRoomCode);
  }
}

// --- BOT VARIABLEN ---
let isP2Bot = false;
let botDifficulty501 = 40;
let botDartsThrownThisTurn = 0;
let botDoubleAttempts = 0;
let currentBotAvgSelection = 40;

// Öffnet das neue Menü
function add501Bot() {
  currentBotAvgSelection = 40;
  document.getElementById("bot-avg-display").innerText = currentBotAvgSelection;
  document.getElementById("bot-setup-overlay").style.display = "flex";
}

// Steuert die Plus/Minus Buttons
function changeBotAvg(delta) {
  currentBotAvgSelection += delta;
  if (currentBotAvgSelection < 20) currentBotAvgSelection = 20;
  if (currentBotAvgSelection > 120) currentBotAvgSelection = 120;
  document.getElementById("bot-avg-display").innerText = currentBotAvgSelection;
}

function cancelBotSetup() {
  document.getElementById("bot-setup-overlay").style.display = "none";
}

function confirmBotSetup() {
  document.getElementById("bot-setup-overlay").style.display = "none";
  localP2Name = `[BOT] (Avg: ${currentBotAvgSelection})`;
  document.getElementById("local-p2-name").value = localP2Name;
  isP2Bot = true;
  botDifficulty501 = currentBotAvgSelection;
}

async function play501BotTurn() {
  if (localP2Score <= 0 || !isP2Bot || !isLocal501) return;

  // UI sperren während der Bot wirft
  const numpad = document.querySelector(".numpad-grid");
  const presets = document.querySelector(".preset-grid");
  if (numpad) numpad.style.pointerEvents = "none";
  if (presets) presets.style.pointerEvents = "none";

  // Kurze Denkpause vor dem ersten Dart
  await new Promise((r) => (botTimer501 = setTimeout(r, 600)));
  if (!isLocal501) return; // Falls in der Pause abgebrochen wurde

  botDartsThrownThisTurn = 0;
  botDoubleAttempts = 0;
  let totalTurnScore = 0;

  for (let i = 0; i < 3; i++) {
    botDartsThrownThisTurn++;
    let currentRest = localP2Score - totalTurnScore;
    let target = getBotTarget(currentRest);

    if ((currentRest <= 40 && currentRest % 2 === 0) || currentRest === 50) {
      botDoubleAttempts++;
    }

    let hit = calculateBotHit(target, botDifficulty501);
    totalTurnScore += hit;

    document.getElementById(
      "input-display-501"
    ).innerText = `Bot wirft: ${hit}...`;

    // Pause zwischen den Darts
    await new Promise((r) => (botTimer501 = setTimeout(r, 800)));
    if (!isLocal501) return; // Falls währenddessen abgebrochen wurde

    let tempScore = localP2Score - totalTurnScore;
    if (tempScore <= 1 || tempScore === 0) break;
  }

  // UI wieder freigeben und Score absenden
  if (isLocal501) {
    if (numpad) numpad.style.pointerEvents = "auto";
    if (presets) presets.style.pointerEvents = "auto";
    current501Input = totalTurnScore.toString();
    submit501Score();
  }
}

function getBotTarget(remaining) {
  // 1. Scoring Phase
  if (remaining > 170) return 60; // Immer T20

  // 2. Spezielle Finish-Bereiche (High-Outs)
  if (remaining === 170) return 60; // T20 -> T20 -> Bull
  if (remaining > 50 && remaining <= 60) return remaining; // z.B. 52 -> D26 (wenn Bot das kann) oder Single 12
  if (remaining === 50) return 50; // Bullseye-Finish

  // 3. Setup Phase (Der "46-Rest" Fix)
  // Wenn wir über 40 sind, wollen wir uns auf ein schönes Doppel stellen (meistens D20 = 40)
  if (remaining > 40 && remaining < 170) {
    // Wir versuchen den Rest so zu reduzieren, dass 40 (D20) oder 32 (D16) übrig bleibt
    if (remaining > 60) return 60; // Weiter T20 bis wir im Bereich 41-60 sind

    let setupTarget = remaining - 40; // Ziel, um 40 Rest zu lassen
    // Falls das Setup-Ziel ungerade ist (z.B. bei 41 Rest -> Ziel 1), ist das okay.
    return setupTarget;
  }

  // 4. Checkout Phase (Rest <= 40)
  if (remaining <= 40 && remaining % 2 === 0) {
    return remaining; // Das Ziel ist das Doppel (z.B. 40 für D20)
  }

  // 5. Notlösung für ungerade Reste unter 40
  if (remaining < 40 && remaining % 2 !== 0) {
    return 1; // 1 werfen, um auf ein Doppel zu kommen
  }

  return 60; // Fallback
}

function calculateBotHit(target, avg) {
  let rnd = Math.random() * 100;

  // Wir ermitteln, ob der Bot gerade auf ein DOPPEL wirft (Checkout-Versuch)
  // Ein Wurf ist ein Checkout-Versuch, wenn das Ziel dem aktuellen Rest entspricht
  let isCheckoutAttempt = (target <= 40 && target % 2 === 0) || target === 50;

  // --- LOGIK FÜR DOPPEL (CHECKOUT) ---
  if (isCheckoutAttempt) {
    // Ein 120er Bot hat eine massive Checkout-Quote (ca. 70-80%)
    let doubleChance = Math.max(5, (avg - 20) * 0.7);
    if (rnd < doubleChance) return target; // Treffer!

    if (rnd < doubleChance + 15) return target / 2; // Trifft Single statt Doppel (Inside)
    return 0; // Wirft knapp vorbei (Outside/Bust)
  }

  // --- LOGIK FÜR SCORING (TRIPLES) ---
  if (target === 60 || (target > 40 && target % 3 === 0)) {
    let single = target / 3;
    let chanceTriple = Math.max(0, (avg - 30) * 0.65);
    let chanceSingle = Math.min(100 - chanceTriple, 20 + avg * 0.7);

    if (rnd < chanceTriple) return target; // T20
    if (rnd < chanceTriple + chanceSingle) return single; // S20
    return 1; // Abgerutscht in die 1
  }

  // --- LOGIK FÜR SETUP-WÜRFE (SINGLES) ---
  // Wenn der Bot z.B. eine 6 braucht, um von 46 auf 40 zu kommen.
  let singleHitChance = Math.min(99, 40 + avg * 0.5); // Ein 120er Bot trifft Singles zu 99%
  if (rnd < singleHitChance) return target;

  return Math.floor(Math.random() * 20) + 1; // Kompletter Fail (sehr selten bei 120 Avg)
}

async function triggerOnlineMatchStart() {
  if (!isOnlineHost) return;

  document.getElementById("btn-start-online-match").innerText = "Starte...";
  document.getElementById("btn-start-online-match").disabled = true;

  // Ändert den Status auf "playing", was bei beiden Spielern das Spiel öffnet
  await _supabase
    .from("live_matches")
    .update({
      status: "playing",
      last_action: "Spiel gestartet!",
    })
    .eq("room_code", currentRoomCode);
}

function stopLocalGameLogic() {
  if (botTimer501) {
    clearTimeout(botTimer501);
    botTimer501 = null;
  }
  isLocal501 = false;
  isP2Bot = false;

  // UI sicherheitshalber entsperren
  const numpad = document.querySelector(".numpad-grid");
  const presets = document.querySelector(".preset-grid");
  if (numpad) numpad.style.pointerEvents = "auto";
  if (presets) presets.style.pointerEvents = "auto";
}
