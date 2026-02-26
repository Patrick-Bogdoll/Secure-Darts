function addPlayer() {
  const input = document.getElementById("player-input");
  const name = input.value.trim();
  if (name) {
    players.push({
      isBot: false,
      name: name,
      score: 0,
      stats: { rounds: 0, secures: 0, doubles: 0, numberData: {} },
      matchLog: [],
    });
    document.getElementById(
      "player-list-setup"
    ).innerHTML += `<div style="background:#333; padding:5px; margin:5px; display:inline-block; border-radius:5px;">${name}</div>`;
    input.value = "";
  }
}

function addBot() {
  let choice = prompt(
    "Wähle Bot-Stärke:\n1 = Kneipen-Held\n2 = Liga-Spieler\n3 = THE NUKE"
  );
  let name = "Bot";
  let diff = 1;
  if (choice === "1") {
    name = botSvg + " Kneipen-Held [BOT]";
    diff = 1;
  } else if (choice === "2") {
    name = botSvg + " Liga-Spieler [BOT]";
    diff = 2;
  } else if (choice === "3") {
    name = botSvg + " THE NUKE [BOT]";
    diff = 3;
  } else return;
  players.push({
    isBot: true,
    difficulty: diff,
    name: name,
    score: 0,
    stats: { rounds: 0, secures: 0, doubles: 0, numberData: {} },
    matchLog: [],
  });
  document.getElementById(
    "player-list-setup"
  ).innerHTML += `<div style="background:#673ab7; padding:5px; margin:5px; display:inline-block; border-radius:5px;">${name}</div>`;
}

function startGame() {
  const chkTraining = document.getElementById("chk-training");
  isTrainingMode = chkTraining ? chkTraining.checked : false;

  if (players.length === 0) return alert("Bitte füge einen Spieler hinzu!");
  if (!isTrainingMode && players.length < 2) {
    return alert("Ein gewertetes Spiel benötigt mindestens 2 Teilnehmer!");
  }

  // 1. Reset variables safely
  currentAppMode = "secure";
  currentPlayerIndex = 0;
  globalTargetIndex = 0;

  if (isTrainingMode) {
    document.body.classList.add("training-active");
    const titleEl = document.getElementById("app-title");
    if (titleEl) titleEl.innerText = "🧪 TRAINING";
  } else {
    document.body.classList.remove("training-active");
    const titleEl = document.getElementById("app-title");
    if (titleEl) titleEl.innerText = "Secure-Darts";
  }

  // 2. Prevent WakeLock crashes (often fails on local/HTTP testing)
  try {
    if (typeof requestWakeLock === "function") {
      requestWakeLock();
    }
  } catch (e) {
    console.warn("WakeLock skipped/not supported:", e);
  }

  // 3. THE FIX: Manually hide all screens to bypass the 'showScreen("play")' ID crash!
  const allScreens = [
    "auth-screen",
    "secure-setup-screen",
    "online-lobby-screen",
    "game-501-screen",
    "highscore-screen",
    "secure-rules-screen",
    "party-setup-screen",
    "game-party-screen",
    "bobs-setup-screen",
    "game-bobs-screen",
    "rtw-setup-screen",
    "game-rtw-screen",
    "game-secure-screen",
  ];

  for (let i = 0; i < allScreens.length; i++) {
    const el = document.getElementById(allScreens[i]);
    if (el) el.style.display = "none";
  }

  // 4. Forcefully display the Secure game screen
  const secureScreen = document.getElementById("game-secure-screen");
  if (secureScreen) {
    secureScreen.style.display = "block";
  } else {
    console.error("Critical: The Game-Secure-Screen HTML element is missing!");
  }

  // 5. Safely load the UI
  try {
    updateUI();
    resetTurnInputs();
    checkBotTurn();
  } catch (error) {
    console.error("Error during UI update:", error);
  }
}

function checkBotTurn() {
  const p = players[currentPlayerIndex];
  if (p.isBot) {
    document.getElementById("bot-overlay").style.display = "flex";
    document.getElementById("bot-panic-btn").style.display = "block";
    document.getElementById("bot-status-text").innerText = `${pName(
      p
    )} zielt...`;
    document.getElementById("btn-undo").style.display = "none";
    if (botTimer) clearTimeout(botTimer);
    botTimer = setTimeout(() => {
      document.getElementById("bot-panic-btn").style.display = "none";
      playBot(p);
    }, 2500);
  } else {
    document.getElementById("bot-overlay").style.display = "none";
    updateUndoButtonVisibility();
  }
}

function cancelBotAndUndo() {
  if (botTimer) clearTimeout(botTimer);
  document.getElementById("bot-overlay").style.display = "none";
  undoLastTurn();
}

function playBot(bot) {
  const diff = bot.difficulty;
  const targetVal = targets[globalTargetIndex];
  let botMultiplier = 0;
  for (let i = 0; i < 3; i++) {
    let rnd = Math.random();
    let hit = 0;
    if (targetVal >= 25) {
      if (diff === 1) {
        if (rnd > 0.6) hit = 1;
        if (rnd > 0.95) hit = 2;
      } else if (diff === 2) {
        if (rnd > 0.2) hit = 1;
        if (rnd > 0.8) hit = 2;
      } else {
        if (rnd > 0.05) hit = 1;
        if (rnd > 0.5) hit = 2;
      }
    } else {
      if (diff === 1) {
        if (rnd > 0.4) hit = 1;
        if (rnd > 0.9) hit = 2;
        if (rnd > 0.98) hit = 3;
      } else if (diff === 2) {
        if (rnd > 0.1) hit = 1;
        if (rnd > 0.7) hit = 2;
        if (rnd > 0.85) hit = 3;
      } else {
        if (rnd > 0.01) hit = 1;
        if (rnd > 0.2) hit = 2;
        if (rnd > 0.4) hit = 3;
      }
    }
    botMultiplier += hit;
  }
  currentRawScore = targetVal * botMultiplier;
  thrownScore = 3;
  updateTurnDisplay();
  if (currentRawScore === 0) {
    document.getElementById("bot-status-text").innerText = `${pName(
      bot
    )} wirft 0 Punkte!`;
    botTimer = setTimeout(() => nextTurn(), 2000);
  } else {
    document.getElementById("bot-status-text").innerText = `${pName(
      bot
    )} trifft ${currentRawScore} Punkte!`;
    botTimer = setTimeout(() => playBotSecure(bot), 1500);
  }
}

function playBotSecure(bot) {
  const diff = bot.difficulty;
  let tempMultiplier = 0;
  let tempSecured = false;
  for (let i = 0; i < 3; i++) {
    let rnd = Math.random();
    let secureType = 0;
    if (diff === 1) {
      if (rnd < 0.12) secureType = 1;
      else if (rnd < 0.15) secureType = 2;
    } else if (diff === 2) {
      if (rnd < 0.35) secureType = 1;
      else if (rnd < 0.45) secureType = 2;
    } else {
      if (rnd < 0.3) secureType = 1;
      else if (rnd < 0.65) secureType = 2;
    }
    if (secureType === 1) {
      tempSecured = true;
      if (tempMultiplier === 0) tempMultiplier = 1;
    }
    if (secureType === 2) {
      tempSecured = true;
      isDoubleHit = true;
      if (tempMultiplier === 0) tempMultiplier = 1;
      tempMultiplier *= 2;
    }
  }
  isSecured = tempSecured;
  secureMultiplier = tempMultiplier;
  thrownSecure = 3;
  updateTurnDisplay();
  let txt = "verfehlt Bull...";
  if (isSecured) txt = "SICHERT!";
  if (secureMultiplier > 1) txt = `BULLSEYE!! (x${secureMultiplier})`;
  document.getElementById("bot-status-text").innerText = `${pName(bot)} ${txt}`;
  botTimer = setTimeout(() => nextTurn(), 1500);
}

function pName(p) {
  return p.name.split(" ").slice(1).join(" ") || p.name;
}

function saveState() {
  const state = {
    players: JSON.parse(JSON.stringify(players)),
    currentPlayerIndex: currentPlayerIndex,
    globalTargetIndex: globalTargetIndex,
  };
  gameHistoryStack.push(state);
  if (gameHistoryStack.length > 10) gameHistoryStack.shift();
}

function undoLastTurn() {
  if (gameHistoryStack.length === 0) return;
  const lastState = gameHistoryStack.pop();
  players = lastState.players;
  currentPlayerIndex = lastState.currentPlayerIndex;
  globalTargetIndex = lastState.globalTargetIndex;
  resetTurnInputs();
  updateUI();
  updateUndoButtonVisibility();
  if (players[currentPlayerIndex].isBot) checkBotTurn();
}

function updateUndoButtonVisibility() {
  const btn = document.getElementById("btn-undo");
  if (gameHistoryStack.length === 0 || players[currentPlayerIndex].isBot) {
    btn.style.display = "none";
    return;
  }
  const lastState = gameHistoryStack[gameHistoryStack.length - 1];
  const previousPlayer = lastState.players[lastState.currentPlayerIndex];
  if (previousPlayer.isBot) {
    btn.style.display = "none";
  } else {
    btn.style.display = "block";
  }
}

async function nextTurn() {
  saveState();
  const p = players[currentPlayerIndex];
  p.stats.rounds++;
  if (isSecured) p.stats.secures++;
  if (isDoubleHit) p.stats.doubles++;
  let tVal = targets[globalTargetIndex];
  let key = tVal.toString();
  if (!p.stats.numberData[key])
    p.stats.numberData[key] = { points: 0, count: 0 };
  p.stats.numberData[key].points += currentRawScore;
  p.stats.numberData[key].count += 1;
  let final = isSecured ? currentRawScore * secureMultiplier : 0;
  p.matchLog.push({
    target: tVal,
    raw_score: currentRawScore,
    secured: isSecured,
    multiplier: secureMultiplier,
    final_points: final,
  });
  if (isSecured) {
    if (globalTargetIndex < targets.length - 1) globalTargetIndex++;
    else {
      p.score += final;
      await handleGameEnd();
      return;
    }
  }
  p.score += final;
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  resetTurnInputs();
  updateUI();
  checkBotTurn();
}

async function handleGameEnd() {
  const winner = players[currentPlayerIndex];
  document.getElementById("bot-overlay").style.display = "none";
  alert(`🏆 ${winner.name} hat gewonnen!`);
  for (let p of players) {
    if (p.isBot) continue;

    let dbName = p.name;
    if (isTrainingMode) dbName = `${p.name} (Training)`;
    let isWin = p.name === winner.name;

    await saveProStats(dbName, p, isWin);
    await saveMatchHistory(dbName, p, isWin);
  }
  location.reload();
}

async function saveProStats(name, pObj, isWin) {
  let { data: ex } = await _supabase
    .from("stats_secure")
    .select("*")
    .eq("name", name)
    .single();
  if (!ex) {
    await _supabase.from("stats_secure").insert([
      {
        name: name,
        wins: isWin ? 1 : 0,
        highscore: pObj.score,
        games_played: 1,
        total_points: pObj.score,
        rounds_played: pObj.stats.rounds,
        secure_count: pObj.stats.secures,
        double_count: pObj.stats.doubles,
        number_stats: pObj.stats.numberData,
      },
    ]);
  } else {
    let mStats = ex.number_stats || {};
    let cStats = pObj.stats.numberData;
    for (let k in cStats) {
      if (!mStats[k]) mStats[k] = { points: 0, count: 0 };
      mStats[k].points += cStats[k].points;
      mStats[k].count += cStats[k].count;
    }
    await _supabase
      .from("stats_secure")
      .update({
        wins: ex.wins + (isWin ? 1 : 0),
        highscore: Math.max(ex.highscore, pObj.score),
        games_played: (ex.games_played || 0) + 1,
        total_points: (ex.total_points || 0) + pObj.score,
        rounds_played: (ex.rounds_played || 0) + pObj.stats.rounds,
        secure_count: (ex.secure_count || 0) + pObj.stats.secures,
        double_count: (ex.double_count || 0) + pObj.stats.doubles,
        number_stats: mStats,
      })
      .eq("name", name);
  }
}

async function saveMatchHistory(name, pObj, isWin) {
  // Paket für die Datenbank schnüren
  let payload = {
    player_name: name,
    is_training: isTrainingMode,
    is_win: isWin,
    final_score: pObj.score,
    match_details: pObj.matchLog,
  };

  // NEU: user_id anhängen, falls ein Nutzer eingeloggt ist
  if (!isGuest && currentUser) {
    payload.user_id = currentUser.id;
  }

  const { error } = await _supabase
    .from("match_history_secure")
    .insert([payload]);

  if (error) {
    console.error("Fehler beim Speichern der Secure-History:", error.message);
  }
}

function addRawScore(m) {
  const currentTarget = targets[globalTargetIndex];

  // --- NEU: Sicherheits-Check für Bull (25) und Bullseye (50) ---
  // Blockiert ungültige Multiplikatoren von Tastatur oder Sprachsteuerung
  if (currentTarget === 25 && m > 2) return; // Kein Triple Single-Bull (max 2)
  if (currentTarget === 50 && m > 1) return; // Kein Double/Triple Bullseye (max 1)

  if (thrownScore < MAX_DARTS) {
    currentRawScore += currentTarget * m;
    thrownScore++;
    updateTurnDisplay();
  }
}

function addSecure(t) {
  if (currentRawScore === 0)
    return alert("Du hast 0 Punkte geworfen! Du darfst nicht Sichern.");
  if (thrownSecure < MAX_DARTS) {
    if (t === 1) {
      if (!isSecured) {
        isSecured = true;
        if (secureMultiplier === 0) secureMultiplier = 1;
      }
    } else if (t === 2) {
      isSecured = true;
      isDoubleHit = true;
      if (secureMultiplier === 0) secureMultiplier = 1;
      secureMultiplier *= 2;
    }
    thrownSecure++;
    updateTurnDisplay();
  }
}

function updateTurnDisplay() {
  const rawScoreEl = document.getElementById("raw-score");
  if (rawScoreEl) rawScoreEl.innerText = currentRawScore;

  const scoreDartsEl = document.getElementById("score-darts-count");
  if (scoreDartsEl) scoreDartsEl.innerText = `${thrownScore}/${MAX_DARTS}`;

  const secureDartsEl = document.getElementById("secure-darts-count");
  if (secureDartsEl) secureDartsEl.innerText = `${thrownSecure}/${MAX_DARTS}`;

  const currentTarget = targets[globalTargetIndex];
  const controlsScore = document.getElementById("controls-score");
  const noDartsLeft = thrownScore >= MAX_DARTS;

  if (controlsScore) {
    const scoreButtons = controlsScore.children;
    // SICHERHEITS-FIX: Klassische For-Schleife (100% kompatibel mit allen Browsern)
    for (let i = 0; i < scoreButtons.length; i++) {
      scoreButtons[i].disabled = noDartsLeft;
    }

    if (!noDartsLeft && scoreButtons.length >= 4) {
      if (currentTarget === 25) {
        scoreButtons[3].disabled = true;
      } else if (currentTarget === 50) {
        scoreButtons[2].disabled = true;
        scoreButtons[3].disabled = true;
      }
    }
  }

  let allowSecure =
    thrownScore >= MAX_DARTS && currentRawScore > 0 && thrownSecure < MAX_DARTS;
  const controlsSecure = document.getElementById("controls-secure");

  if (controlsSecure) {
    const secureButtons = controlsSecure.children;
    // SICHERHEITS-FIX: Klassische For-Schleife
    for (let i = 0; i < secureButtons.length; i++) {
      secureButtons[i].disabled = !allowSecure;
    }
  }

  let txt = isSecured ? `Gesichert (x${secureMultiplier})` : "Offen";
  if (thrownScore >= MAX_DARTS && currentRawScore === 0) {
    txt = "0 Punkte (Kein Sichern möglich)";
  }

  const secureStatusEl = document.getElementById("secure-status");
  if (secureStatusEl) {
    secureStatusEl.innerText = txt;
    secureStatusEl.style.color = isSecured ? "var(--accent-green)" : "#aaa";
  }

  const roundResultEl = document.getElementById("round-result");
  if (roundResultEl) {
    roundResultEl.innerText = isSecured
      ? currentRawScore * secureMultiplier
      : 0;
  }
}

function resetTurnInputs() {
  currentRawScore = 0;
  secureMultiplier = 0;
  isSecured = false;
  isDoubleHit = false;
  thrownScore = 0;
  thrownSecure = 0;
  updateTurnDisplay();
}

function toggleVoice() {
  if (!recognition) return;
  const btn = document.getElementById("mic-btn");
  if (isVoiceActive) {
    recognition.stop();
    isVoiceActive = false;
    btn.innerHTML = "🎤 Sprachsteuerung: AUS";
    btn.classList.remove("mic-active");
  } else {
    recognition.start();
    isVoiceActive = true;
    btn.innerHTML = "🔴 Höre zu...";
    btn.classList.add("mic-active");
  }
}

function processVoiceCommand(cmd) {
  if (
    cmd.includes("weiter") ||
    cmd.includes("bestätigen") ||
    cmd.includes("nächster") ||
    cmd.includes("set") ||
    cmd.includes("next")
  ) {
    nextTurn();
    return;
  }
  if (
    cmd.includes("reset") ||
    cmd.includes("zurück") ||
    cmd.includes("löschen")
  ) {
    resetTurnInputs();
    return;
  }
  if (
    cmd.includes("korrektur") ||
    cmd.includes("undo") ||
    cmd.includes("rückgängig")
  ) {
    undoLastTurn();
    return;
  }
  const isPhase1 = thrownScore < MAX_DARTS;
  const isPhase2 = !isPhase1 && thrownSecure < MAX_DARTS;
  if (isPhase1) {
    if (
      cmd.includes("single") ||
      cmd.includes("einfach") ||
      cmd.includes("eins")
    )
      addRawScore(1);
    else if (
      cmd.includes("double") ||
      cmd.includes("doppel") ||
      cmd.includes("zwei")
    )
      addRawScore(2);
    else if (
      cmd.includes("triple") ||
      cmd.includes("tripple") ||
      cmd.includes("dreifach") ||
      cmd.includes("drei")
    )
      addRawScore(3);
    else if (
      cmd.includes("miss") ||
      cmd.includes("daneben") ||
      cmd.includes("null") ||
      cmd.includes("nichts")
    )
      addRawScore(0);
  } else if (isPhase2) {
    if (currentRawScore === 0) return;
    if (
      cmd.includes("single") ||
      cmd.includes("einfach") ||
      cmd.includes("25") ||
      cmd.includes("grün")
    )
      addSecure(1);
    else if (
      cmd.includes("bullseye") ||
      cmd.includes("bulls eye") ||
      cmd.includes("50") ||
      cmd.includes("rot") ||
      cmd.includes("doppel")
    )
      addSecure(2);
    else if (
      cmd.includes("miss") ||
      cmd.includes("daneben") ||
      cmd.includes("null")
    )
      addSecure(0);
  }
}

function updateUI() {
  const player = players[currentPlayerIndex];
  if (!player) return; // Prevent crash if player isn't loaded yet

  const nameEl = document.getElementById("current-player-name");
  if (nameEl) nameEl.innerText = player.name;

  const scoreEl = document.getElementById("current-player-score");
  if (scoreEl) scoreEl.innerText = player.score;

  let t = targets[globalTargetIndex];
  const targetDisplay = document.getElementById("current-target");
  if (targetDisplay) {
    targetDisplay.innerText = t === 25 ? "BULL" : t === 50 ? "BULLSEYE" : t;
  }

  updateLiveLeaderboard();
  updateUndoButtonVisibility();
}

function updateLiveLeaderboard() {
  const list = document.getElementById("live-leaderboard-list");
  list.innerHTML = "";
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  sortedPlayers.forEach((p, index) => {
    const isLeader = index === 0 && p.score > 0;
    const isActive = p === players[currentPlayerIndex];
    const row = document.createElement("div");
    row.className = `live-row ${isActive ? "active" : ""}`;
    let nameDisplay = p.name;
    if (isLeader) nameDisplay = `👑 ${nameDisplay}`;
    row.innerHTML = `<span class="live-name">${nameDisplay}</span><span class="live-score">${p.score}</span>`;
    list.appendChild(row);
  });
}

let recognition;
let isVoiceActive = false;
if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.lang = "de-DE";
  recognition.interimResults = false;
  recognition.onresult = function (event) {
    const last = event.results.length - 1;
    const command = event.results[last][0].transcript.trim().toLowerCase();
    processVoiceCommand(command);
  };
  recognition.onend = function () {
    if (isVoiceActive) recognition.start();
  };
  recognition.onerror = function (event) {
    console.log("Sprach-Fehler:", event.error);
  };
} else {
  document.getElementById("mic-btn").innerText =
    "❌ Browser unterstützt keine Sprache";
  document.getElementById("mic-btn").disabled = true;
}

function cancelSecureGame() {
  cancelCurrentGame("game-secure-screen");
}
