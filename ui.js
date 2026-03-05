function toggleMenu() {
  const nav = document.getElementById("main-nav");
  const overlay = document.getElementById("sidebar-overlay");
  if (nav.classList.contains("open")) {
    nav.classList.remove("open");
    overlay.classList.remove("open");
  } else {
    nav.classList.add("open");
    overlay.classList.add("open");
  }
}

function closeStats(e) {
  if (e.target.id === "stats-modal" || e.target.className === "close-btn")
    document.getElementById("stats-modal").style.display = "none";
}

function switchModalTab(tab) {
  document
    .querySelectorAll(".modal-tab")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelectorAll(".modal-content-area")
    .forEach((c) => (c.style.display = "none"));

  if (tab === "overview") {
    document.querySelector(".modal-tab:nth-child(1)").classList.add("active");
    document.getElementById("tab-overview").style.display = "block";
  } else {
    document.querySelector(".modal-tab:nth-child(2)").classList.add("active");
    document.getElementById("tab-history").style.display = "block";

    // ---> NEU: Blockiert das Überschreiben bei Bob's und RTW <---
    if (
      typeof currentModalType !== "undefined" &&
      (currentModalType === "501" || currentModalType === "secure")
    ) {
      if (currentModalType === "501" || currentModalType === "secure") {
        if (typeof loadMatchHistory === "function") loadMatchHistory();
      }
    }
  }
}

// ==========================================
// TOAST NOTIFICATION SYSTEM
// ==========================================
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  const accentColor =
    type === "success" ? "var(--accent-green)" : "var(--accent-red)";

  // Icon Auswahl (SVG statt Emoji)
  const iconSvg =
    type === "success"
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

  toast.style.cssText = `
    background: var(--card-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: var(--text-main);
    border: 1px solid var(--glass-border);
    border-left: 4px solid ${accentColor};
    padding: 14px 24px;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    font-weight: 600;
    font-size: 0.9em;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
    transform: translateX(120%);
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;

  toast.innerHTML = `<span style="color: ${accentColor}; display: flex;">${iconSvg}</span> <span>${message.toUpperCase()}</span>`;

  container.appendChild(toast);
  requestAnimationFrame(() => (toast.style.transform = "translateX(0)"));

  setTimeout(() => {
    toast.style.transform = "translateX(120%)";
    setTimeout(() => toast.remove(), 400);
  }, 2500);
}

// GENIALER TRICK: Wir überschreiben die Standard-Alerts des Browsers!
window.alert = function (message) {
  showToast(message, "error");
};

// ==========================================
// CUSTOM CONFIRM MODAL
// ==========================================
let pendingConfirmAction = null;

function showConfirmModal(message, confirmCallback) {
  // Text anpassen
  document.getElementById("generic-confirm-text").innerText = message;
  // Funktion merken, die beim Klick auf "Ja" ausgeführt werden soll
  pendingConfirmAction = confirmCallback;
  // Modal anzeigen
  document.getElementById("generic-confirm-modal").style.display = "flex";

  // Klick-Event für den roten Button überschreiben
  document.getElementById("generic-confirm-yes-btn").onclick = function () {
    if (pendingConfirmAction) pendingConfirmAction(); // Führt die gemerkte Funktion aus
    closeConfirmModal(); // Schließt das Fenster danach
  };
}

function closeConfirmModal() {
  document.getElementById("generic-confirm-modal").style.display = "none";
  pendingConfirmAction = null;
}

// ==========================================
// UNIVERSAL DARTBOARD RENDERER
// ==========================================
function renderUniversalDartboard(containerId, activeTarget, mode = "single") {
  const container = document.getElementById(containerId);
  if (!container) return;

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

  // DEFINITION DER FARBEN & STROKE (Behebt den ReferenceError)
  const strokeColor = "#ffffff1a"; // Weiß mit 10% Deckkraft
  const glassWhite = "rgba(255, 255, 255, 0.05)";
  const glassDeep = "rgba(255, 255, 255, 0.02)";

  let slicesHTML = `
    <style>
      @keyframes flash-target {
        0%, 100% { fill: rgba(255, 255, 255, 0.4); stroke: #ffffff; stroke-width: 1px; }
        50% { fill: rgba(255, 255, 255, 0.1); stroke: rgba(255, 255, 255, 0.2); stroke-width: 0.5px; }
      }
      .blinking-target { animation: flash-target 0.8s infinite ease-in-out; }
    </style>
    <circle cx="${cx}" cy="${cy}" r="${rBoard}" fill="#0f172a" stroke="${strokeColor}" stroke-width="1" />
  `;

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

  UNIVERSAL_BOARD_ORDER.forEach((num, index) => {
    const startAngle = index * angleStep - angleStep / 2;
    const endAngle = startAngle + angleStep;
    const isRedBlack = index % 2 === 0;

    // Glass-Colors für die Segmente
    const colorSingle = isRedBlack ? glassWhite : glassDeep;
    const colorDoubleTriple = isRedBlack ? "#3b82f644" : "#10b98144"; // Blau & Grün transparent

    let innerSingleClass = "",
      tripleClass = "",
      outerSingleClass = "",
      doubleClass = "";

    if (num === activeTarget) {
      if (mode === "single") {
        innerSingleClass = ' class="blinking-target"';
        outerSingleClass = ' class="blinking-target"';
      } else if (mode === "double" || mode === "bobs") {
        doubleClass = ' class="blinking-target"';
      } else if (mode === "triple") {
        tripleClass = ' class="blinking-target"';
      } else if (mode === "all") {
        innerSingleClass = ' class="blinking-target"';
        outerSingleClass = ' class="blinking-target"';
        doubleClass = ' class="blinking-target"';
        tripleClass = ' class="blinking-target"';
      }
    }

    slicesHTML += `<path${innerSingleClass} d="${createArc(
      rOuterBull,
      rTripleInner,
      startAngle,
      endAngle
    )}" fill="${colorSingle}" stroke="${strokeColor}" stroke-width="0.5" />`;
    slicesHTML += `<path${tripleClass} d="${createArc(
      rTripleInner,
      rTripleOuter,
      startAngle,
      endAngle
    )}" fill="${colorDoubleTriple}" stroke="${strokeColor}" stroke-width="0.5" />`;
    slicesHTML += `<path${outerSingleClass} d="${createArc(
      rTripleOuter,
      rDoubleInner,
      startAngle,
      endAngle
    )}" fill="${colorSingle}" stroke="${strokeColor}" stroke-width="0.5" />`;
    slicesHTML += `<path${doubleClass} d="${createArc(
      rDoubleInner,
      rDoubleOuter,
      startAngle,
      endAngle
    )}" fill="${colorDoubleTriple}" stroke="${strokeColor}" stroke-width="0.5" />`;

    const textRad = ((startAngle + angleStep / 2 - 90) * Math.PI) / 180;
    const tx = cx + rText * Math.cos(textRad);
    const ty = cy + rText * Math.sin(textRad);
    slicesHTML += `<text x="${tx}" y="${ty}" fill="rgba(255,255,255,0.6)" font-size="12" font-weight="bold" font-family="Inter, sans-serif" text-anchor="middle" dominant-baseline="central">${num}</text>`;
  });

  // Bullseye Logic
  let outerBullClass = "",
    innerBullClass = "";
  if (activeTarget === 25 || activeTarget === 50) {
    if (mode === "single") {
      outerBullClass = ' class="blinking-target"';
    } else if (mode === "double" || mode === "triple") {
      innerBullClass = ' class="blinking-target"';
    } else if (mode === "bobs" || mode === "all") {
      outerBullClass = ' class="blinking-target"';
      innerBullClass = ' class="blinking-target"';
    }
  }

  slicesHTML += `<circle${outerBullClass} cx="${cx}" cy="${cy}" r="${rOuterBull}" fill="#10b98144" stroke="${strokeColor}" stroke-width="0.5" />`;
  slicesHTML += `<circle${innerBullClass} cx="${cx}" cy="${cy}" r="${rInnerBull}" fill="#ef444466" stroke="${strokeColor}" stroke-width="0.5" />`;

  container.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 300 300" style="max-width: 350px; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.4));">${slicesHTML}</svg>`;
}

// ==========================================
// UNIVERSAL CANCEL GAME (Für ALLE Modi)
// ==========================================
function cancelCurrentGame(screenIdToHide, skipConfirm = false) {
  const executeCancel = () => {
    // 1. Logik-Stop für 501/Bot aufrufen
    if (typeof stopLocalGameLogic === "function") {
      stopLocalGameLogic();
    }

    // 2. Bildschirm verstecken
    if (screenIdToHide) {
      document.getElementById(screenIdToHide).style.display = "none";
    }

    // 3. Variablen für Mini-Games zurücksetzen
    if (typeof rtwPlayer !== "undefined") rtwPlayer = null;
    if (typeof bobsPlayer !== "undefined") bobsPlayer = null;

    // 4. Overlays aufräumen
    const winOverlay501 = document.getElementById("win-overlay-501");
    if (winOverlay501) winOverlay501.style.display = "none";

    // 5. Kamera stoppen
    if (typeof stopCameraStream === "function") stopCameraStream();

    goHome();
  };

  if (skipConfirm) {
    executeCancel();
  } else {
    showCancelModal(executeCancel);
  }
}

// ==========================================
// GLOBALE TASTATUR-STEUERUNG (KEYSTROKES)
// ==========================================
document.addEventListener("keydown", function (event) {
  // 1. Ignoriere Tasten, wenn der User gerade in ein Textfeld tippt (z.B. Spielernamen)
  if (
    document.activeElement.tagName === "INPUT" ||
    document.activeElement.tagName === "TEXTAREA"
  ) {
    return;
  }

  // 2. Welcher Bildschirm ist gerade aktiv?
  const isRtw =
    document.getElementById("game-rtw-screen")?.style.display === "block";
  const isBobs =
    document.getElementById("game-bobs-screen")?.style.display === "block";
  const isSecure =
    document.getElementById("game-secure-screen")?.style.display === "block";
  const is501 =
    document.getElementById("game-501-screen")?.style.display === "block";
  const isParty =
    document.getElementById("game-party-screen")?.style.display === "block";

  const key = event.key;

  // ---------------------------------------------------------
  // MODUS: RTW & BOB'S 27 (Tasten: 0, 1, 2, 3)
  // ---------------------------------------------------------
  if (isRtw || isBobs) {
    if (["0", "1", "2", "3"].includes(key)) {
      const hits = parseInt(key);
      if (isRtw) submitRtwScore(hits);
      if (isBobs) submitBobsScore(hits);
    }
  }

  // ---------------------------------------------------------
  // MODUS: SECURE-DARTS (Tasten: 0, 1, 2, 3, Enter, Backspace)
  // ---------------------------------------------------------
  if (isSecure) {
    if (["0", "1", "2", "3"].includes(key)) {
      const val = parseInt(key);
      // Phase 1: Punkte werfen (3 Darts)
      if (typeof thrownScore !== "undefined" && thrownScore < 3) {
        addRawScore(val);
      }
      // Phase 2: Sichern auf Bull (nur 0, 1, 2 erlaubt)
      else if (
        typeof thrownSecure !== "undefined" &&
        thrownSecure < 3 &&
        currentRawScore > 0 &&
        val <= 2
      ) {
        addSecure(val);
      }
    } else if (key === "Enter") {
      // Enter = Bestätigen (nächster Zug)
      nextTurn();
    } else if (key === "Backspace") {
      // Backspace = Aktuelle Eingabe zurücksetzen (Reset)
      resetTurnInputs();
    }
  }

  // ---------------------------------------------------------
  // MODUS: 501 & PARTY X01 (Numpad: 0-9, Backspace, Enter)
  // ---------------------------------------------------------
  if (is501 || isParty) {
    const key = event.key;
    const checkoutOverlay = document.getElementById("checkout-overlay");
    if (checkoutOverlay && checkoutOverlay.style.display === "flex") {
      if (["0", "1", "2", "3"].includes(key)) {
        const buttons = document.querySelectorAll("#checkout-buttons .num-btn");

        buttons.forEach((btn) => {
          if (btn.innerText === key) {
            btn.click();
          }
        });

        event.preventDefault();
        return;
      }
    }
    if (/^[0-9]$/.test(key)) {
      // Zahlen tippen
      if (is501) append501Input(key);
      if (isParty) appendPartyInput(key);
    } else if (key === "Backspace") {
      // Letzte Ziffer löschen
      if (is501) delete501Input();
      if (isParty) deletePartyInput();
    } else if (key === "Enter") {
      // Score bestätigen
      if (is501) submit501Score();
      if (isParty) submitPartyScore(null);
    }
  }
});

// ==========================================
// UNIVERSAL MINI-GAME HISTORY UI (Bob's & RTW)
// ==========================================
function renderUniversalMiniGameHistory(
  containerId,
  nameLabelId,
  playerName,
  pointsTable,
  mode
) {
  const container = document.getElementById(containerId);
  const nameLabel = document.getElementById(nameLabelId);
  if (!container) return;

  if (nameLabel && playerName) nameLabel.innerText = playerName;

  let html = "";
  if (pointsTable) {
    pointsTable.forEach((entry) => {
      // Unterscheidung der Beschriftung je nach Modus
      let fieldName =
        entry.target === 25
          ? "BULL"
          : mode === "bobs"
          ? `D${entry.target}`
          : entry.target;
      let hitColor =
        entry.hits > 0
          ? "var(--accent-green)"
          : mode === "bobs"
          ? "var(--accent-red)"
          : "#888";

      // Bei Bob's zeigen wir die Punkte an (+40), bei RTW die Treffer (2 Treffer)
      let suffix =
        mode === "bobs"
          ? `${entry.points > 0 ? "+" : ""}${entry.points}`
          : `${entry.hits} Treffer`;

      html += `
          <div style="display:flex; justify-content:space-between; padding:10px 14px; background:var(--glass-bg); border: 1px solid var(--glass-border); margin-bottom:6px; border-radius:8px; font-size: 0.85em; color:var(--text-main);">
            <span style="color:var(--text-muted);">FELD <b style="color:var(--text-main); margin-left:4px;">${fieldName}</b></span>
            <span style="color:${hitColor}; font-weight:800; letter-spacing:0.5px;">${suffix.toUpperCase()}</span>
          </div>`;
    });
  }

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

// ==========================================
// FRIENDS MODAL UI
// ==========================================
function openFriendsModal() {
  console.log("BUTTON GEKLICKT! Prüfe User-Status...");
  console.log("isGuest:", isGuest, "| currentUser:", currentUser); // <-- Das verrät uns den Täter

  if (isGuest || !currentUser) {
    showToast("Bitte logge dich ein, um Freunde zu sehen.", "error");
    return;
  }

  console.log("Status okay! Mache Modal sichtbar...");
  document.getElementById("friends-modal").style.display = "flex";

  if (typeof fetchAndRenderFriends === "function") {
    fetchAndRenderFriends();
  }
}

function closeFriendsModal(e) {
  if (e.target.id === "friends-modal" || e.target.className === "close-btn") {
    document.getElementById("friends-modal").style.display = "none";
  }
}

function openOpenLobbiesModal() {
  if (isGuest || !currentUser) {
    showToast("Bitte logge dich ein, um offene Lobbies zu sehen.", "error");
    return;
  }
  document.getElementById("open-lobbies-modal").style.display = "flex";
  loadOpenLobbies();
}

function closeOpenLobbiesModal(e) {
  if (
    e.target.id === "open-lobbies-modal" ||
    e.target.className === "close-btn"
  ) {
    document.getElementById("open-lobbies-modal").style.display = "none";
  }
}

async function loadOpenLobbies() {
  const container = document.getElementById("open-lobbies-list");
  container.innerHTML =
    '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Lade Lobbies...</div>';

  // Lade alle Lobbies im Status 'waiting', bei denen noch kein Spieler 2 existiert
  const { data, error } = await _supabase
    .from("live_matches")
    .select(
      "room_code, player1_name, best_of_legs, starting_score, camera_required, host_avg, created_at"
    )
    .eq("status", "waiting")
    .is("player2_name", null)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML =
      '<div style="text-align: center; color: var(--accent-red); padding: 20px;">Fehler beim Laden der Lobbies.</div>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML =
      '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Aktuell keine offenen Lobbies verfügbar.</div>';
    return;
  }

  let html = "";
  data.forEach((lobby) => {
    // 1. Kamera-Badge formatieren
    let camBadge = lobby.camera_required
      ? `<span style="background: var(--accent-red); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; margin-left: 8px; font-weight: bold;">Kamera Req.</span>`
      : "";

    // 2. Average robust formatieren (Fängt null, undefined und 0 sauber ab)
    let avgDisplay =
      lobby.host_avg !== null && lobby.host_avg !== undefined
        ? `<span style="color: var(--accent-blue); font-size: 0.85em; margin-left: 8px; font-weight: bold;">(Avg: ${Number(
            lobby.host_avg
          ).toFixed(2)})</span>`
        : `<span style="color: var(--text-muted); font-size: 0.85em; margin-left: 8px;">(Avg: -)</span>`;

    // 3. Eigene Lobby Check (damit man sich nicht selbst joint)
    let isMyLobby = lobby.player1_name === myOnlineName;

    let actionButton = isMyLobby
      ? `<button class="reset" style="margin: 0; padding: 10px 20px; width: auto; font-size: 0.9em; opacity: 0.6; cursor: not-allowed;" disabled>Eigene Lobby</button>`
      : `<button class="primary accent-green" style="margin: 0; padding: 10px 20px; width: auto; font-size: 0.9em;" onclick="joinSpecificLobby('${lobby.room_code}')">Join</button>`;

    html += `
      <div class="glass-panel" style="padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-color: var(--glass-border);">
        <div style="text-align: left;">
          <div style="font-weight: bold; font-size: 1.1em; display: flex; align-items: center;">
            <a href="#" onclick="event.preventDefault(); openPlayerStatsFromName('${
              lobby.player1_name
            }')" style="color: white; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='var(--accent-blue)'" onmouseout="this.style.color='white'">
              ${lobby.player1_name}
            </a> 
            ${avgDisplay}
          </div>
          <div style="font-size: 0.85em; color: var(--text-muted); margin-top: 5px; display: flex; align-items: center;">
            ${lobby.starting_score || 501} - Bo${
      lobby.best_of_legs
    } ${camBadge} </div>
        </div>
        ${actionButton}
      </div>
    `;
  });

  container.innerHTML = html;
}

async function openPlayerStatsFromName(playerName) {
  // 1. Versuche zuerst die 501 Stats zu laden (da wir uns im 501 Modus befinden)
  let { data: stats501 } = await _supabase
    .from("stats_501")
    .select("*")
    .eq("name", playerName)
    .maybeSingle();

  if (stats501) {
    // Öffnet das 501-Stats-Modal mit den geladenen Daten
    open501Stats(encodeURIComponent(JSON.stringify(stats501)));
  } else {
    // 2. Fallback: Falls der Spieler noch nie 501 gespielt hat, probiere Secure Darts
    let { data: statsSecure } = await _supabase
      .from("stats_secure")
      .select("*")
      .eq("name", playerName)
      .maybeSingle();

    if (statsSecure) {
      openProStats(encodeURIComponent(JSON.stringify(statsSecure)));
    } else {
      // 3. Wenn gar keine Daten existieren
      showToast("Dieser Spieler hat noch keine Statistiken.", "info");
    }
  }
}

function joinSpecificLobby(roomCode) {
  let nameInput = document.getElementById("online-player-name");

  // Modal schließen
  document.getElementById("open-lobbies-modal").style.display = "none";

  // Sicherstellen, dass der Nutzer seinen Namen eingetragen hat
  if (!nameInput.value.trim()) {
    showToast("Bitte gib zuerst deinen Namen ein!", "error");
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("online-lobby-screen").style.display = "block";
    nameInput.focus();
    return;
  }

  // Raumcode in das Feld setzen und die existierende Join-Funktion auslösen
  let codeInput = document.getElementById("join-room-code");
  if (codeInput) {
    codeInput.value = roomCode;
  }
  joinOnlineGame();
}

// ==========================================
// SETTINGS / EINSTELLUNGEN LOGIK
// ==========================================

function openSettingsModal() {
  if (isGuest || !currentUser) {
    if (typeof showToast === "function")
      showToast("Einstellungen sind als Gast nicht verfügbar.", "error");
    return;
  }

  // Werte vorladen
  document.getElementById("settings-name").value = myOnlineName || "";

  const emailInput = document.getElementById("settings-email");
  const passwordInput = document.getElementById("settings-password");

  emailInput.value = currentUser.email || "";
  passwordInput.value = "";

  // --- NEU: Prüfen, ob der User über Google eingeloggt ist ---
  const isGoogleUser =
    currentUser.app_metadata &&
    currentUser.app_metadata.providers &&
    currentUser.app_metadata.providers.includes("google");

  if (isGoogleUser) {
    // Felder für Google-Nutzer blockieren
    passwordInput.disabled = true;
    passwordInput.placeholder = "Bei Google-Login nicht verfügbar";
    passwordInput.style.opacity = "0.5";
    passwordInput.style.cursor = "not-allowed";

    emailInput.disabled = true;
    emailInput.style.opacity = "0.5";
    emailInput.style.cursor = "not-allowed";
  } else {
    // Felder für normale E-Mail-Nutzer freigeben
    passwordInput.disabled = false;
    passwordInput.placeholder =
      "Mind. 6 Zeichen (Leer lassen wenn unverändert)";
    passwordInput.style.opacity = "1";
    passwordInput.style.cursor = "text";

    emailInput.disabled = false;
    emailInput.style.opacity = "1";
    emailInput.style.cursor = "text";
  }
  // ------------------------------------------------------------

  // Avatar Bild vorladen (holt sich das Bild aus dem Haupt-Modal, falls bereits geladen)
  const currentAvatarSrc = document.getElementById("modal-avatar-preview").src;
  document.getElementById("settings-avatar-preview").src = currentAvatarSrc;

  document.getElementById("settings-modal").style.display = "flex";
}

function closeSettingsModal(e) {
  if (e.target.id === "settings-modal") {
    document.getElementById("settings-modal").style.display = "none";
  }
}

async function saveSettings() {
  const newName = document.getElementById("settings-name").value.trim();
  const newEmail = document.getElementById("settings-email").value.trim();
  const newPassword = document.getElementById("settings-password").value.trim();

  // Die ausgewählte Datei aus dem versteckten Input holen
  const avatarInput = document.getElementById("avatar-upload");
  const avatarFile = avatarInput.files && avatarInput.files[0];

  let updates = { data: {} };
  let requiresUpdate = false;

  // 1. Namen Update prüfen
  if (newName && newName !== myOnlineName) {
    updates.data.display_name = newName;
    updates.data.full_name = newName;
    requiresUpdate = true;
  }

  // 2. E-Mail Update prüfen
  if (newEmail && newEmail !== currentUser.email) {
    updates.email = newEmail;
    requiresUpdate = true;
  }

  // 3. Passwort Update prüfen
  if (newPassword && newPassword.length >= 6) {
    updates.password = newPassword;
    requiresUpdate = true;
  } else if (newPassword.length > 0 && newPassword.length < 6) {
    showToast("Das Passwort muss mindestens 6 Zeichen lang sein.", "error");
    return;
  }

  // 4. Avatar Update prüfen
  if (avatarFile) {
    requiresUpdate = true;
  }

  // Abbruch, wenn nichts geändert wurde
  if (!requiresUpdate) {
    showToast("Keine Änderungen vorgenommen.", "info");
    document.getElementById("settings-modal").style.display = "none";
    return;
  }

  // UI auf "Laden" setzen
  const btn = document.querySelector("#settings-modal .primary");
  const originalText = btn.innerText;
  btn.innerText = "Speichert...";
  btn.disabled = true;

  try {
    // --- NEU: BILD IN SUPABASE HOCHLADEN ---
    if (avatarFile) {
      // Generiere einen eindeutigen Dateinamen (z.B. user-id-12345678.jpg)
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;

      // Lade das Bild in den Supabase Storage (Bucket-Name: 'avatars')
      const { error: uploadError } = await _supabase.storage
        .from("avatars")
        .upload(fileName, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Hole die öffentliche URL des hochgeladenen Bildes
      const { data: publicUrlData } = _supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Füge die neue URL den Profil-Updates hinzu
      updates.data.avatar_url = publicUrlData.publicUrl;
    }
    // ----------------------------------------

    // Auth-Daten & Metadaten (inkl. neuer Bild-URL) aktualisieren
    const { data, error } = await _supabase.auth.updateUser(updates);
    if (error) throw error;

    // Profil-Tabelle aktualisieren (Name & Avatar)
    let profileUpdates = {};
    if (updates.data.display_name) profileUpdates.name = newName;
    if (updates.data.avatar_url)
      profileUpdates.avatar_url = updates.data.avatar_url;

    if (Object.keys(profileUpdates).length > 0) {
      await _supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", currentUser.id);
    }

    // Wenn der Name geändert wurde, auch in den alten Tabellen updaten
    if (updates.data.display_name) {
      await _supabase
        .from("stats_501")
        .update({ name: newName })
        .eq("user_id", currentUser.id);
      await _supabase
        .from("highscores")
        .update({ name: newName })
        .eq("name", myOnlineName);

      myOnlineName = newName;
      currentModalPlayer = newName;
      document.getElementById("modal-name").innerText = newName;
    }

    // Das Bild auch im Profil im Hintergrund austauschen und den File-Input leeren
    if (updates.data.avatar_url) {
      document.getElementById("modal-avatar-preview").src =
        updates.data.avatar_url;
      avatarInput.value = ""; // Input zurücksetzen, damit es beim nächsten Mal wieder reagiert
    }

    showToast("Einstellungen erfolgreich gespeichert!", "success");
    document.getElementById("settings-modal").style.display = "none";

    if (updates.email) {
      showToast(
        "Bitte überprüfe deine neue E-Mail-Adresse für den Bestätigungslink.",
        "info"
      );
    }
  } catch (error) {
    showToast("Fehler beim Speichern: " + error.message, "error");
  } finally {
    // UI wiederherstellen
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

// Aktualisiert das Bild in den Settings sofort lokal (ohne auf den Server-Upload zu warten)
const avatarInput = document.getElementById("avatar-upload");
if (avatarInput) {
  avatarInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        // Die Vorschau in den Einstellungen sofort aktualisieren
        const settingsPreview = document.getElementById(
          "settings-avatar-preview"
        );
        if (settingsPreview) {
          settingsPreview.src = e.target.result;
        }
      };
      reader.readAsDataURL(file);
    }
  });
}

async function generatePairingCode() {
  if (isGuest || !currentUser) {
    showToast?.("Du musst eingeloggt sein!", "error");
    return;
  }

  const { data, error } = await _supabase.rpc("create_pairing_code");
  if (error || !data || data.length === 0) {
    console.error(error);
    showToast?.("Fehler: Code konnte nicht erstellt werden.", "error");
    return;
  }

  const row = data[0];
  document.getElementById("pairing-code-display").innerText = row.code;
  document.getElementById("pairing-display-modal").style.display = "flex";
}

// Diese Funktion MUSS im Code existieren, sonst passiert beim Klick nichts!
function openPairingInputModal(callback) {
  const modal = document.getElementById("pairing-input-modal");
  const input = document.getElementById("pairing-code-input");
  const submitBtn = document.getElementById("btn-submit-pairing");

  if (!modal || !input || !submitBtn) {
    console.error("Fehler: Modal-HTML Elemente nicht gefunden!");
    return;
  }

  // Feld leeren und Modal anzeigen
  input.value = "";
  modal.style.display = "flex";
  input.focus();

  // Klick-Event für den "Verifizieren"-Button
  submitBtn.onclick = async () => {
    const code = input.value.trim();
    if (!code || code.length !== 6) {
      if (typeof showToast === "function")
        showToast("Bitte einen 6-stelligen Code eingeben.", "error");
      else alert("Bitte einen 6-stelligen Code eingeben.");
      return;
    }

    // Modal schließen und den eingegebenen Code an die Hauptfunktion zurückgeben
    modal.style.display = "none";
    if (callback) callback(code);
  };
}

//
