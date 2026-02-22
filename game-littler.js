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
    "Wähle Bot-Stärke:\n1 = Kneipen-Held\n2 = Liga-Spieler\n3 = THE LITTLER"
  );
  let name = "Bot";
  let diff = 1;
  if (choice === "1") {
    name = "🤖 Kneipen-Held";
    diff = 1;
  } else if (choice === "2") {
    name = "🤖 Liga-Spieler";
    diff = 2;
  } else if (choice === "3") {
    name = "🔥 THE LITTLER";
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
  isTrainingMode = document.getElementById("chk-training").checked;
  if (players.length === 0) return alert("Bitte füge einen Spieler hinzu!");
  if (!isTrainingMode && players.length < 2)
    return alert("⚠️ Ein gewertetes Spiel benötigt mindestens 2 Teilnehmer!");
  if (isTrainingMode) {
    document.body.classList.add("training-active");
    document.getElementById("app-title").innerText = "🧪 TRAINING";
  } else {
    document.body.classList.remove("training-active");
    document.getElementById("app-title").innerText = "🎯 Schlag den Littler";
  }
  requestWakeLock();
  showScreen("play");
  updateUI();
  resetTurnInputs();
  checkBotTurn();
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
    let dbName = p.name;
    if (!p.isBot && isTrainingMode) dbName = `${p.name} (Training)`;
    let isWin = p.name === winner.name;
    await saveProStats(dbName, p, isWin);
    await saveMatchHistory(dbName, p, isWin);
  }
  location.reload();
}

async function saveProStats(name, pObj, isWin) {
  let { data: ex } = await _supabase
    .from("highscores")
    .select("*")
    .eq("name", name)
    .single();
  if (!ex) {
    await _supabase.from("highscores").insert([
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
      .from("highscores")
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
  await _supabase.from("match_history").insert([
    {
      player_name: name,
      is_training: isTrainingMode,
      is_win: isWin,
      final_score: pObj.score,
      match_details: pObj.matchLog,
    },
  ]);
}

function addRawScore(m) {
  if (thrownScore < MAX_DARTS) {
    currentRawScore += targets[globalTargetIndex] * m;
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
  document.getElementById("raw-score").innerText = currentRawScore;
  document.getElementById(
    "score-darts-count"
  ).innerText = `${thrownScore}/${MAX_DARTS}`;
  document.getElementById(
    "secure-darts-count"
  ).innerText = `${thrownSecure}/${MAX_DARTS}`;
  const currentTarget = targets[globalTargetIndex];
  const scoreButtons = document.getElementById("controls-score").children;
  const noDartsLeft = thrownScore >= MAX_DARTS;
  for (let btn of scoreButtons) {
    btn.disabled = noDartsLeft;
  }
  if (!noDartsLeft) {
    if (currentTarget === 25) {
      scoreButtons[3].disabled = true;
    } else if (currentTarget === 50) {
      scoreButtons[2].disabled = true;
      scoreButtons[3].disabled = true;
    }
  }
  let allowSecure =
    thrownScore >= MAX_DARTS && currentRawScore > 0 && thrownSecure < MAX_DARTS;
  [...document.getElementById("controls-secure").children].forEach(
    (b) => (b.disabled = !allowSecure)
  );
  let txt = isSecured ? `Gesichert (x${secureMultiplier})` : "Offen";
  if (thrownScore >= MAX_DARTS && currentRawScore === 0) {
    txt = "0 Punkte (Kein Sichern möglich)";
  }
  document.getElementById("secure-status").innerText = txt;
  document.getElementById("secure-status").style.color = isSecured
    ? "var(--accent-green)"
    : "#aaa";
  document.getElementById("round-result").innerText = isSecured
    ? currentRawScore * secureMultiplier
    : 0;
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
  document.getElementById("current-player-name").innerText = player.name;
  document.getElementById("current-player-score").innerText = player.score;
  let t = targets[globalTargetIndex];
  document.getElementById("current-target").innerText =
    t === 25 ? "BULL" : t === 50 ? "BULLSEYE" : t;
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
