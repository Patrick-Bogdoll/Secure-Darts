const SUPABASE_URL = "https://etzkulwnjhkoiklrohbt.supabase.co";
const SUPABASE_KEY = "sb_publishable_mSGY3nB8ivTaASBZQass3g_Ri4xOimy";
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const botSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8.01" y2="16"></line><line x1="16" y1="16" x2="16.01" y2="16"></line></svg>`;

// ==========================================
// GLOBALE DART-KONSTANTEN
// ==========================================
const targets = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 50,
];

// Die echte Reihenfolge auf einem Dartboard (im Uhrzeigersinn, startend bei 20)
const UNIVERSAL_BOARD_ORDER = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];
let players = [];
let currentPlayerIndex = 0;
let globalTargetIndex = 0;
let isTrainingMode = false;
let statsChart = null;
let currentModalPlayer = "";
let gameHistoryStack = [];
let botTimer = null;
let currentStatsMode = "secure";

let currentRawScore = 0;
let secureMultiplier = 0;
let isSecured = false;
let isDoubleHit = false;
let thrownScore = 0;
let thrownSecure = 0;
const MAX_DARTS = 3;

let currentAppMode = "";
let currentUser = null;
let isGuest = false;
let pendingCancelAction = null;
let isCompanionMode = false; // Blockiert das UI, wenn es eine Kamera ist

let myOnlineName = "";
let currentRoomCode = "";
let realtimeSubscription = null;
let amIPlayer1 = false;
let isMyTurn = false;
let current501Input = "";
let isLocal501 = false;
let localP1Name = "Spieler 1";
let localP2Name = "Spieler 2";
let localP1Score = 501;
let localP2Score = 501;
let localCurrentTurn = 1;
let bestOfLegs = 3;
let localP1Legs = 0;
let localP2Legs = 0;
let p1TotalScore = 0;
let p2TotalScore = 0;
let p1LastThrow = "-";
let p2LastThrow = "-";
let p1Darts501 = 0;
let p2Darts501 = 0;
let currentMatchLog501 = [];
let p1DartsAtLegStart = 0;
let p2DartsAtLegStart = 0;
let history501Stack = [];
let statsTracker = {
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

// ==========================================
// DRY HELPER LOGIK (Bildschirm-Steuerung)
// ==========================================
const ALL_SCREENS = [
  "auth-screen",
  "home-screen",
  "secure-setup-screen",
  "game-secure-screen",
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
];

function hideAllScreens() {
  ALL_SCREENS.forEach((s) => {
    let el = document.getElementById(s);
    if (el) el.style.display = "none";
  });
}

// Universeller Setup-Opener für Minigames
function openGameSetup(screenId, title, inputId = null) {
  hideAllScreens();
  document.getElementById(screenId).style.display = "block";
  let titleEl = document.getElementById("app-title");
  if (titleEl) titleEl.innerText = title;

  if (inputId) {
    let inputEl = document.getElementById(inputId);
    if (inputEl) inputEl.value = myOnlineName || "Spieler";
  }
}

// ==========================================
// INITIALISIERUNG & NAVIGATION
// ==========================================
async function initAuth() {
  const {
    data: { session },
  } = await _supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    isGuest = false;
    showMainApp();
  } else {
    showAuthScreen();
  }
}

function showAuthScreen() {
  if (isCompanionMode) return;
  document.getElementById("top-header").style.display = "none";
  document.getElementById("main-container").style.display = "none";
  hideAllScreens();
  document.getElementById("auth-screen").style.display = "block";
}

async function showMainApp() {
  if (isCompanionMode) return;

  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("top-header").style.display = "block";
  document.getElementById("main-container").style.display = "block";
  document.getElementById("secure-setup-screen").style.display = "none";

  let displayName = "";
  if (!isGuest && currentUser) {
    displayName =
      currentUser.user_metadata?.display_name ||
      currentUser.user_metadata?.full_name ||
      currentUser.email.split("@")[0];
    myOnlineName = displayName;
    let { data: myProfile } = await _supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (myProfile && myProfile.avatar_url) {
      if (!currentUser.user_metadata) currentUser.user_metadata = {};
      currentUser.user_metadata.avatar_url = myProfile.avatar_url;
    }
    let p1Input = document.getElementById("local-p1-name");
    let onlineInput = document.getElementById("online-player-name");
    if (p1Input) p1Input.value = displayName;
    if (onlineInput) onlineInput.value = displayName;
  }

  if (!isGuest && myOnlineName) {
    let { data: room, error } = await _supabase
      .from("live_matches")
      .select("*")
      .or(`player1_name.eq."${myOnlineName}",player2_name.eq."${myOnlineName}"`)
      .in("status", ["waiting", "playing", "leg_won"])
      .maybeSingle();

    if (room) {
      console.log("Active game found! Reconnecting...");
      currentRoomCode = room.room_code;
      amIPlayer1 = room.player1_name === myOnlineName;
      isLocal501 = false;
      currentAppMode = "501";

      document.getElementById("home-screen").style.display = "none";
      document.getElementById("online-lobby-screen").style.display = "none";
      document.getElementById("game-501-screen").style.display = "block";

      sync501UI(room);
      listenForOpponent(currentRoomCode);
      return;
    }
  }

  const adminBtn = document.getElementById("admin-btn");
  if (adminBtn && currentUser && !isGuest) {
    const { data } = await _supabase
      .from("stats_501")
      .select("is_admin")
      .eq("user_id", currentUser.id)
      .maybeSingle();
    adminBtn.style.display = data && data.is_admin ? "block" : "none";
  }

  goHome();
}

function goHome() {
  if (typeof cleanupWebRTC === "function") cleanupWebRTC();
  document.getElementById("hamburger-btn").style.display = "block";

  hideAllScreens();

  let lobbySetup = document.getElementById("lobby-setup");
  if (lobbySetup) lobbySetup.style.display = "block";
  let lobbyActive = document.getElementById("lobby-active");
  if (lobbyActive) lobbyActive.style.display = "none";

  currentRoomCode = "";
  isOnlineHost = false;

  document.getElementById("home-screen").style.display = "block";
  document.getElementById("app-title").innerText = "SECURE-DARTS";
  document.body.classList.remove("training-active");

  let cancelModal = document.getElementById("cancel-modal");
  if (cancelModal) cancelModal.style.display = "none";
}

function enterMode(mode) {
  currentAppMode = mode;
  document.getElementById("home-screen").style.display = "none";
  document.getElementById("hamburger-btn").style.display = "block";

  if (mode === "501")
    document.getElementById("app-title").innerText = "501 DARTS";
  else document.getElementById("app-title").innerText = "SECURE-DARTS";

  showScreen("play");
}

function showScreen(screenType) {
  hideAllScreens();
  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.classList.remove("active"));

  if (screenType === "play") {
    document.getElementById("tab-play")?.classList.add("active");
    if (currentAppMode === "secure") {
      const screenId =
        players.length > 0 ? "game-secure-screen" : "secure-setup-screen";
      document.getElementById(screenId).style.display = "block";
    } else {
      const screenId =
        isLocal501 || currentRoomCode
          ? "game-501-screen"
          : "online-lobby-screen";
      document.getElementById(screenId).style.display = "block";
    }
  } else if (screenType === "stats") {
    document.getElementById("tab-stats").classList.add("active");
    document.getElementById("highscore-screen").style.display = "block";
  } else if (screenType === "rules") {
    document.getElementById("tab-rules").classList.add("active");
    document.getElementById("secure-rules-screen").style.display = "block";
  }
}

// DRY Setup Funktionen
function openPartySetup() {
  openGameSetup("party-setup-screen", "PARTY X01");
}
function openBobsSetup() {
  openGameSetup("bobs-setup-screen", "BOB'S 27", "bobs-player-input");
}
function openRtwSetup() {
  openGameSetup("rtw-setup-screen", "ROUND THE WORLD", "rtw-player-input");
}

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) await navigator.wakeLock.request("screen");
  } catch (err) {}
}

function showCancelModal(actionFunction) {
  pendingCancelAction = actionFunction;
  document.getElementById("cancel-modal").style.display = "flex";
}

function closeCancelModal() {
  document.getElementById("cancel-modal").style.display = "none";
  pendingCancelAction = null;
}

window.addEventListener("DOMContentLoaded", async (event) => {
  const urlParams = new URLSearchParams(window.location.search);
  const cameraRoom = urlParams.get("camera");
  const cameraRole = urlParams.get("role");

  if (cameraRoom && cameraRole) {
    isCompanionMode = true;
    document.body.style.background = "black";
    document.getElementById("top-header").style.display = "none";
    document
      .querySelectorAll(".container > div")
      .forEach((s) => (s.style.display = "none"));
    startCompanionMode(cameraRoom, cameraRole);
    return;
  }

  loadPlayerSuggestions();
  initAuth();

  const confirmBtn = document.getElementById("confirm-cancel-btn");
  if (confirmBtn) {
    confirmBtn.onclick = function () {
      if (pendingCancelAction) pendingCancelAction();
      closeCancelModal();
    };
  }
});

// ==========================================
// LOBBY & WEBRTC ENGINE
// ==========================================
let isOnlineHost = false;
const rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
let peerConnection = null;
let camChannel = null;
let localDronePeer = null;
let boardPeers = { host: null, guest: null };
let currentCameraStream = null;
let camStatusInterval = null;

function openOnlineLobby(roomCode, hostName, guestName = null, isHost = false) {
  isOnlineHost = isHost;
  document
    .querySelectorAll(".container > div")
    .forEach((s) => (s.style.display = "none"));
  document.getElementById("online-lobby-screen").style.display = "block";
  document.getElementById("lobby-setup").style.display = "none";
  document.getElementById("lobby-active").style.display = "block";
  document.getElementById("lobby-room-code-display").innerText = roomCode;

  const startBtn = document.getElementById("btn-start-online-match");
  if (isHost) {
    startBtn.style.display = "block";
    startBtn.disabled = true;
    startBtn.style.opacity = "0.5";
  } else {
    startBtn.style.display = "none";
  }
  updateLobbyPlayers(hostName, guestName);
  initCameraReceiver(roomCode, isHost ? "host" : "guest");
}

function updateLobbyPlayers(hostName, guestName) {
  document.getElementById("lobby-host-name").innerText = hostName || "Host";
  const guestEl = document.getElementById("lobby-guest-name");
  const startBtn = document.getElementById("btn-start-online-match");

  if (guestName) {
    guestEl.innerText = guestName;
    guestEl.style.color = "white";
    if (isOnlineHost) {
      startBtn.disabled = false;
      startBtn.style.opacity = "1";
    }
  } else {
    guestEl.innerText = "Wartet...";
    guestEl.style.color = "#888";
  }
}

function updateLobbyCameraStatus(isHostCam, isConnected) {
  const el = isHostCam
    ? document.getElementById("lobby-host-cam")
    : document.getElementById("lobby-guest-cam");
  if (isConnected) {
    el.innerHTML = "✅ Kamera Aktiv";
    el.style.color = "var(--accent-green)";
  }
}

function generateCameraQR() {
  if (!currentRoomCode) return;
  const role = isOnlineHost ? "host" : "guest";
  const companionUrl = `${window.location.origin}${window.location.pathname}?camera=${currentRoomCode}&role=${role}`;

  const qrContainer = document.getElementById("qr-container");
  const qrImage = document.getElementById("qr-image");

  let canvasContainer = document.getElementById("qrcode-canvas");
  if (!canvasContainer) {
    canvasContainer = document.createElement("div");
    canvasContainer.id = "qrcode-canvas";
    canvasContainer.style.display = "flex";
    canvasContainer.style.justifyContent = "center";
    qrImage.parentNode.replaceChild(canvasContainer, qrImage);
  }

  canvasContainer.innerHTML = "";
  new QRCode(canvasContainer, {
    text: companionUrl,
    width: 150,
    height: 150,
    colorDark: "#ffffff",
    colorLight: "#2d2d2d",
    correctLevel: QRCode.CorrectLevel.H,
  });
  qrContainer.style.display = "block";
}

async function triggerOnlineMatchStart() {
  if (!isOnlineHost) return;
  document.getElementById("btn-start-online-match").innerText = "Starte...";
  document.getElementById("btn-start-online-match").disabled = true;
  await _supabase
    .from("live_matches")
    .update({ status: "playing", last_action: "Spiel gestartet!" })
    .eq("room_code", currentRoomCode);
}

// Handy-Kamera Sender
async function startCompanionMode(roomCode, role) {
  // ==========================================
  // 1. RIGOROSES AUFRÄUMEN (Login-Screen blockieren)
  // ==========================================
  if (typeof hideAllScreens === "function") hideAllScreens();

  const authScreen = document.getElementById("auth-screen");
  if (authScreen) authScreen.remove(); // Zerstört den Login-Screen komplett für die Kamera!

  const topHeader = document.getElementById("top-header");
  if (topHeader) topHeader.style.display = "none";

  const companionScreen = document.getElementById("companion-screen");
  companionScreen.style.display = "block";
  companionScreen.style.position = "fixed";
  companionScreen.style.top = "0";
  companionScreen.style.left = "0";
  companionScreen.style.width = "100vw";
  // FIX: Wir nehmen die ECHTE, sichtbare Höhe des Handys, nicht 100vh!
  companionScreen.style.height = window.innerHeight + "px";
  companionScreen.style.zIndex = "99999";
  companionScreen.style.backgroundColor = "black";
  companionScreen.style.overflow = "hidden";

  // --- DEN SCHLIESSEN-BUTTON IMMER SICHTBAR MACHEN ---
  const closeBtn = companionScreen.querySelector("button");
  if (closeBtn) {
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "30px"; // 30px von ganz oben
    closeBtn.style.left = "50%";
    closeBtn.style.transform = "translateX(-50%)"; // Perfekt zentriert
    closeBtn.style.zIndex = "100000"; // GANZ nach vorne!
    // Optional: Ein bisschen hübscher machen, damit man ihn gut sieht
    closeBtn.style.padding = "12px 24px";
    closeBtn.style.backgroundColor = "#ff4a4a";
    closeBtn.style.color = "white";
    closeBtn.style.border = "none";
    closeBtn.style.borderRadius = "20px";
    closeBtn.style.fontWeight = "bold";
    closeBtn.style.boxShadow = "0px 4px 10px rgba(0,0,0,0.6)";
  }

  try {
    // --- WAKELOCK ERZINGEN (Benötigt eine Berührung) ---
    document.addEventListener("touchstart", requestWakeLock, { once: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") requestWakeLock();
    });
    // ---------------------------------------------------

    // 1. MAXIMALE AUFLÖSUNG ANFORDERN (Macht digitalen Zoom extrem scharf!)
    currentCameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { ideal: 1920 }, // Zwingt den Browser zu Full-HD (oder höher)
        height: { ideal: 1080 },
      },
      audio: false,
    });

    const videoPreview = document.getElementById("local-camera-preview");
    videoPreview.srcObject = currentCameraStream;

    // --- VIDEO STRIKT IN DEN HINTERGRUND LEGEN ---
    videoPreview.style.position = "absolute";
    videoPreview.style.top = "0";
    videoPreview.style.left = "0";
    videoPreview.style.width = "100%";
    videoPreview.style.height = "100%";
    videoPreview.style.objectFit = "cover";
    videoPreview.style.touchAction = "none";
    videoPreview.style.transformOrigin = "center center";
    videoPreview.style.zIndex = "1";

    // --- NEU: HARDWARE ZOOM CAPABILITIES AUSLESEN ---
    const videoTrack = currentCameraStream.getVideoTracks()[0];
    const capabilities =
      typeof videoTrack.getCapabilities === "function"
        ? videoTrack.getCapabilities()
        : {};
    const hasHwZoom = "zoom" in capabilities;
    const hwZoomMin = hasHwZoom ? capabilities.zoom.min : 1;
    const hwZoomMax = hasHwZoom ? capabilities.zoom.max : 1;

    // ==========================================
    // 2. DIGITALE PAN & ZOOM LOGIK
    // ==========================================
    let isDragging = false;
    let startPixelX = 0,
      startPixelY = 0;
    let startPercentX = 0,
      startPercentY = 0;
    let percentX = 0,
      percentY = 0;
    let currentDigitalZoom = 1;

    const getBaseDims = () => ({
      w: videoPreview.offsetWidth || window.innerWidth,
      h: videoPreview.offsetHeight || window.innerHeight,
    });

    function updateCameraView() {
      // Grenzen werden IMMER durch den digitalen Zoom definiert
      const maxPercent = (currentDigitalZoom - 1) * 50;

      percentX = Math.max(-maxPercent, Math.min(maxPercent, percentX));
      percentY = Math.max(-maxPercent, Math.min(maxPercent, percentY));

      videoPreview.style.transform = `translate(${percentX}%, ${percentY}%) scale(${currentDigitalZoom})`;

      if (camChannel) {
        camChannel.send({
          type: "broadcast",
          event: "cam-transform",
          payload: {
            role: role,
            zoom: currentDigitalZoom,
            px: percentX,
            py: percentY,
          },
        });
      }
    }

    videoPreview.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        startPixelX = e.touches[0].clientX;
        startPixelY = e.touches[0].clientY;
        startPercentX = percentX;
        startPercentY = percentY;
      }
    });

    videoPreview.addEventListener("touchmove", (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      e.preventDefault();
      const { w, h } = getBaseDims();

      let deltaPixelX = e.touches[0].clientX - startPixelX;
      let deltaPixelY = e.touches[0].clientY - startPixelY;

      percentX = startPercentX + (deltaPixelX / w) * 100;
      percentY = startPercentY + (deltaPixelY / h) * 100;

      updateCameraView();
    });

    videoPreview.addEventListener("touchend", () => {
      isDragging = false;
    });

    // ==========================================
    // 3. HYBRID ZOOM SLIDER (HW + DIGITAL)
    // ==========================================
    const existingSlider = document.getElementById("camera-zoom-slider");
    if (existingSlider) existingSlider.remove();

    const zoomControl = document.createElement("input");
    zoomControl.type = "range";
    zoomControl.id = "camera-zoom-slider";

    zoomControl.style.cssText = `
      position: absolute; 
      bottom: 15%; 
      left: 10%; 
      width: 80%; 
      height: 40px; 
      z-index: 100000;
      opacity: 0.9;
    `;

    const maxTotalZoom = Math.max(5, hwZoomMax * 2);

    zoomControl.min = 1;
    zoomControl.max = maxTotalZoom;
    zoomControl.step = 0.05;
    zoomControl.value = 1;

    zoomControl.oninput = async (e) => {
      let totalZoom = parseFloat(e.target.value);

      // HYBRID-LOGIK:
      // Wir lassen den digitalen Zoom bis max 2.5x laufen (garantiert perfekten Panning-Spielraum).
      // Alles, was darüber hinausgeht, übernimmt die Hardware-Linse!
      let desiredDigital = Math.min(totalZoom, 2);
      let desiredHw = totalZoom / desiredDigital;

      // Wenn das Handy Hardware-Zoom hat, wenden wir ihn an
      if (hasHwZoom) {
        desiredHw = Math.max(hwZoomMin, Math.min(desiredHw, hwZoomMax));
        try {
          await videoTrack.applyConstraints({
            advanced: [{ zoom: desiredHw }],
          });
        } catch (err) {
          console.warn("Hardware Zoom Limit erreicht", err);
        }
      } else {
        desiredHw = 1; // Fallback für ältere Handys (reiner Digital-Zoom)
      }

      // Wir berechnen den echten digitalen Zoom-Wert für unser Panning und Senden an PC
      currentDigitalZoom = totalZoom / desiredHw;
      updateCameraView();
    };

    companionScreen.appendChild(zoomControl);

    // ==========================================
    // 4. WEBRTC & SIGNALING LOGIK (Verbindung zur Lobby)
    // ==========================================
    camChannel = _supabase.channel(`camera-${roomCode}`, {
      config: { broadcast: { self: true } },
    });

    camChannel
      .on("broadcast", { event: "webrtc-signal" }, async (payload) => {
        const data = payload.payload;
        if (data.target !== role) return;

        if (data.type === "request-offer") {
          localDronePeer = new RTCPeerConnection(rtcConfig);
          currentCameraStream
            .getTracks()
            .forEach((track) =>
              localDronePeer.addTrack(track, currentCameraStream)
            );

          localDronePeer.onicecandidate = (e) => {
            if (e.candidate)
              camChannel.send({
                type: "broadcast",
                event: "webrtc-signal",
                payload: {
                  target: data.from,
                  type: "ice-candidate",
                  candidate: e.candidate,
                  from: role,
                },
              });
          };
          const offer = await localDronePeer.createOffer();
          await localDronePeer.setLocalDescription(offer);
          camChannel.send({
            type: "broadcast",
            event: "webrtc-signal",
            payload: {
              target: data.from,
              type: "offer",
              offer: offer,
              from: role,
            },
          });
        } else if (data.type === "answer") {
          await localDronePeer.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );

          // Sofortiges Syncen an den PC, wenn die Verbindung steht
          setTimeout(() => updateCameraView(), 1000);
        } else if (data.type === "ice-candidate" && localDronePeer) {
          await localDronePeer.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Das ist der Herzschlag (Ping), der der PC-Lobby sagt: "Ich bin da!"
          camStatusInterval = setInterval(() => {
            if (camChannel) {
              camChannel.send({
                type: "broadcast",
                event: "cam-status",
                payload: { role: role },
              });
            }
          }, 3000);

          // Ein sofortiger Ping direkt beim Start
          camChannel.send({
            type: "broadcast",
            event: "cam-status",
            payload: { role: role },
          });
        }
      });
  } catch (err) {
    if (typeof showToast === "function")
      showToast("Kamera blockiert: " + err.message, "error");
    else alert("Kamera blockiert: " + err.message);
  }
}

// DRY Helper für Kamera-UI im Dashboard
function toggleVideoAvatar(playerId, showVideo) {
  const videoEl = document.getElementById(`video-${playerId}`);
  const avatarEl = document.getElementById(`avatar-${playerId}`);
  if (videoEl) videoEl.style.display = showVideo ? "block" : "none";
  if (avatarEl) avatarEl.style.display = showVideo ? "none" : "block";
}

// Globale Variable für die Timer, damit sie nicht den Scope verlieren
window.camWatchdogs = window.camWatchdogs || { host: null, guest: null };

function initCameraReceiver(roomCode, myRole) {
  if (camChannel) _supabase.removeChannel(camChannel);
  boardPeers = { host: null, guest: null };

  // --- NEUE HILFSFUNKTION FÜR DEN HARTEN ABBRUCH ---
  const forceDropCamera = (camRole) => {
    console.log(`Verbindung zu ${camRole} abgerissen (Timeout/Drop).`);
    const isHost = camRole === "host";
    const activeId = isHost ? "p1" : "p2";

    // 1. UI auf Avatar zurücksetzen
    toggleVideoAvatar(activeId, false);
    updateLobbyCameraStatus(isHost, false);

    // 2. Eingefrorenes Bild zwingend löschen
    const videoEl = document.getElementById(isHost ? "video-p1" : "video-p2");
    if (videoEl) {
      videoEl.srcObject = null;
      videoEl.style.transform = "none";
    }

    // 3. WebRTC Peer sauber schließen
    if (boardPeers[camRole]) {
      boardPeers[camRole].close();
      boardPeers[camRole] = null;
    }
  };

  camChannel = _supabase.channel(`camera-${roomCode}`, {
    config: { broadcast: { self: true } },
  });

  camChannel
    .on("broadcast", { event: "cam-status" }, (payload) => {
      const data = payload.payload;
      const camRole = data.role;

      // --- WATCHDOG RESET ---
      if (camRole && window.camWatchdogs[camRole]) {
        clearTimeout(window.camWatchdogs[camRole]);
      }

      if (data.offline || !camRole) {
        if (camRole) forceDropCamera(camRole);
        return;
      }

      const isHost = camRole === "host";
      const activeId = isHost ? "p1" : "p2";
      updateLobbyCameraStatus(isHost, true);
      toggleVideoAvatar(activeId, true);

      // --- WATCHDOG START (30 Sekunden) ---
      window.camWatchdogs[camRole] = setTimeout(() => {
        forceDropCamera(camRole);
      }, 30000);

      if (
        !boardPeers[camRole] ||
        boardPeers[camRole].connectionState !== "connected"
      ) {
        if (!boardPeers[camRole])
          boardPeers[camRole] = { connectionState: "connecting" };
        camChannel.send({
          type: "broadcast",
          event: "webrtc-signal",
          payload: { target: camRole, type: "request-offer", from: myRole },
        });
      }
    })
    .on("broadcast", { event: "webrtc-signal" }, async (payload) => {
      const data = payload.payload;
      if (data.target !== myRole) return;
      const fromCam = data.from;

      if (data.type === "offer") {
        const peer = new RTCPeerConnection(rtcConfig);
        boardPeers[fromCam] = peer;

        // --- SOFORT-ABBRUCH WENN DIE LEITUNG REISST ---
        peer.onconnectionstatechange = () => {
          if (
            ["disconnected", "failed", "closed"].includes(peer.connectionState)
          ) {
            forceDropCamera(fromCam);
          }
        };
        // Backup: Reagiert manchmal sogar noch schneller als connectionState
        peer.oniceconnectionstatechange = () => {
          if (
            ["disconnected", "failed", "closed"].includes(
              peer.iceConnectionState
            )
          ) {
            forceDropCamera(fromCam);
          }
        };

        peer.ontrack = (event) => {
          const videoId = fromCam === "host" ? "video-p1" : "video-p2";
          const videoEl = document.getElementById(videoId);
          if (videoEl) {
            videoEl.srcObject = event.streams[0];
            toggleVideoAvatar(fromCam === "host" ? "p1" : "p2", true);
          }
        };

        peer.onicecandidate = (e) => {
          if (e.candidate)
            camChannel.send({
              type: "broadcast",
              event: "webrtc-signal",
              payload: {
                target: fromCam,
                type: "ice-candidate",
                candidate: e.candidate,
                from: myRole,
              },
            });
        };

        await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        camChannel.send({
          type: "broadcast",
          event: "webrtc-signal",
          payload: {
            target: fromCam,
            type: "answer",
            answer: answer,
            from: myRole,
          },
        });
      } else if (
        data.type === "ice-candidate" &&
        boardPeers[fromCam] &&
        boardPeers[fromCam].addIceCandidate
      ) {
        await boardPeers[fromCam].addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      }
    })
    .on("broadcast", { event: "cam-transform" }, (payload) => {
      const data = payload.payload;
      const videoId = data.role === "host" ? "video-p1" : "video-p2";
      const videoEl = document.getElementById(videoId);

      if (videoEl) {
        if (videoEl.parentElement) {
          videoEl.parentElement.style.overflow = "hidden";
          videoEl.parentElement.style.position = "relative";
        }
        videoEl.style.width = "100%";
        videoEl.style.height = "100%";
        videoEl.style.objectFit = "cover";
        videoEl.style.transformOrigin = "center center";
        videoEl.style.transform = `translate(${data.px}%, ${data.py}%) scale(${data.zoom})`;
      }
    })
    .subscribe();
}

function cleanupWebRTC() {
  if (camChannel) {
    _supabase.removeChannel(camChannel);
    camChannel = null;
  }
  if (typeof boardPeers !== "undefined") {
    if (boardPeers.host && boardPeers.host.close) boardPeers.host.close();
    if (boardPeers.guest && boardPeers.guest.close) boardPeers.guest.close();
    boardPeers = { host: null, guest: null };
  }
  if (typeof localDronePeer !== "undefined" && localDronePeer) {
    localDronePeer.close();
    localDronePeer = null;
  }
  let v1 = document.getElementById("video-p1");
  let v2 = document.getElementById("video-p2");
  if (v1) v1.srcObject = null;
  if (v2) v2.srcObject = null;
}

// ==========================================
// AVATAR UPLOAD & COMPRESSION ENGINE
// ==========================================

let isUploadingAvatar = false; // Verhindert doppelte Uploads durch Klick-Spam

async function handleAvatarUpload(event) {
  if (isUploadingAvatar) return; // Blockiert, wenn schon ein Upload läuft

  const file = event.target.files[0];
  if (!file) return;

  isUploadingAvatar = true;
  document.getElementById("btn-edit-avatar").innerText = "LÄDT...";

  try {
    const {
      data: { session },
      error: sessionError,
    } = await _supabase.auth.getSession();

    if (!session || sessionError)
      throw new Error(
        "Deine Login-Sitzung ist ungültig. Bitte logge dich einmal aus und wieder ein!"
      );

    const compressedImageBlob = await compressImage(file, 500);

    // FIX 1: Fester Dateiname, damit 'upsert' das alte Bild überschreibt!
    const fileName = `${currentUser.id}.jpg`;

    const { data: uploadData, error: uploadError } = await _supabase.storage
      .from("avatars")
      .upload(fileName, compressedImageBlob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) throw new Error("Storage Error: " + uploadError.message);

    const {
      data: { publicUrl },
    } = _supabase.storage.from("avatars").getPublicUrl(fileName);

    // FIX 2: Cache-Buster an die URL hängen, damit das UI sofort updatet
    const freshUrl = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await _supabase.auth.updateUser({
      data: { avatar_url: freshUrl },
    });
    if (updateError)
      throw new Error("Auth Update Error: " + updateError.message);

    const { error: profileError } = await _supabase.from("profiles").upsert({
      id: currentUser.id,
      name: myOnlineName,
      avatar_url: freshUrl,
    });
    if (profileError)
      throw new Error("Profile Update Error: " + profileError.message);

    document.getElementById("modal-avatar-preview").src = freshUrl;
    currentUser.user_metadata.avatar_url = freshUrl;

    if (typeof showToast === "function")
      showToast("Profilbild erfolgreich aktualisiert!", "success");
    else alert("Profilbild erfolgreich aktualisiert!");
  } catch (error) {
    if (typeof showToast === "function") showToast(error.message, "error");
    else alert(error.message);
  } finally {
    document.getElementById("btn-edit-avatar").innerText = "EDIT";

    // FIX 3: Setzt das Input-Feld zurück, damit man dasselbe Bild nochmal wählen kann
    event.target.value = "";
    isUploadingAvatar = false;
  }
}

function compressImage(file, targetSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");

        // 1. Die kürzere Seite des Originals finden, um ein perfektes Quadrat zu bilden
        const minSize = Math.min(img.width, img.height);

        // 2. Den perfekten Mittelpunkt für den Zuschnitt berechnen (Center-Crop)
        const startX = (img.width - minSize) / 2;
        const startY = (img.height - minSize) / 2;

        // 3. Das Canvas starr auf dein Wunschmaß (500x500) nageln
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext("2d");

        // 4. Zeichnen: Nimm aus dem Original das Quadrat ab startX/Y
        // und skaliere es exakt in das Canvas
        ctx.drawImage(
          img,
          startX,
          startY,
          minSize,
          minSize, // Wo im Original ausgeschnitten wird
          0,
          0,
          targetSize,
          targetSize // Wo auf dem Canvas gezeichnet wird
        );

        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          0.85 // Qualität leicht angehoben für die 500x500 Auflösung
        );
      };
    };
    reader.onerror = (error) => reject(error);
  });
}

async function stopCameraStream() {
  if (camStatusInterval) {
    clearInterval(camStatusInterval);
    camStatusInterval = null;
  }
  if (localDronePeer) {
    localDronePeer.close();
    localDronePeer = null;
  }
  if (currentCameraStream) {
    currentCameraStream.getTracks().forEach((track) => track.stop());
    currentCameraStream = null;
  }

  const videoEl = document.getElementById("local-camera-preview");
  if (videoEl) videoEl.srcObject = null;

  if (camChannel) {
    await camChannel.send({
      type: "broadcast",
      event: "cam-status",
      payload: { role: null, offline: true },
    });
    setTimeout(async () => {
      await _supabase.removeChannel(camChannel);
      camChannel = null;
    }, 500);
  }

  document.getElementById("companion-screen").innerHTML = `
    <div style="height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #1a1a1a; color: white; font-family: sans-serif; text-align: center; padding: 20px;">
        <div style="margin-bottom: 20px;">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        <h2 style="color: var(--accent-red); margin-top:0;">Kamera geschlossen</h2>
        <p style="color: #888; line-height: 1.5;">Die Verbindung wurde sicher getrennt.<br>Du kannst diesen Tab jetzt schließen.</p>
    </div>
  `;
}

// ==========================================
// FREUNDES-SYSTEM LOGIK (Phase 1)
// ==========================================

let currentFriendsTab = "list";

// Öffnet das Modal und lädt die Daten
async function openFriendsModal() {
  if (isGuest || !currentUser) {
    alert("Bitte logge dich ein, um das Freundes-System zu nutzen.");
    return;
  }
  document.getElementById("friends-modal").style.display = "flex";
  await fetchAndRenderFriends();
}

// Wechselt zwischen "Meine Freunde" und "Anfragen"
function switchFriendsTab(tab) {
  currentFriendsTab = tab;

  const btnList = document.getElementById("tab-friends-list");
  const btnReq = document.getElementById("tab-friends-req");

  if (tab === "list") {
    btnList.style.background = "var(--accent-blue)";
    btnList.style.color = "white";
    btnReq.style.background = "#333";
    btnReq.style.color = "#aaa";
  } else {
    btnReq.style.background = "var(--accent-blue)";
    btnReq.style.color = "white";
    btnList.style.background = "#333";
    btnList.style.color = "#aaa";
  }

  fetchAndRenderFriends(); // Liste neu zeichnen
}

// 1. Freundschaftsanfrage senden
// 1. Spieler in der Datenbank suchen und als Liste anzeigen
async function searchPlayers() {
  const input = document.getElementById("friend-search-input");
  const searchName = input.value.trim();
  const resultsContainer = document.getElementById("friend-search-results");

  if (!searchName) {
    resultsContainer.innerHTML = "";
    return;
  }

  resultsContainer.innerHTML = `<div style="color: #888; font-size: 0.9em; text-align: center; padding: 10px;">Suche läuft...</div>`;

  // Finde ALLE Spieler, in deren Namen der Suchbegriff vorkommt
  const { data: profiles, error } = await _supabase
    .from("profiles")
    .select("id, name, avatar_url")
    .ilike("name", `%${searchName}%`)
    .limit(10); // Wir cappen bei 10 Ergebnissen, damit es nicht überläuft

  if (error || !profiles || profiles.length === 0) {
    resultsContainer.innerHTML = `<div style="color: var(--accent-red); font-size: 0.9em; text-align: center; padding: 10px;">Keine Spieler gefunden.</div>`;
    return;
  }

  let html = "";
  profiles.forEach((p) => {
    // Sich selbst aus den Suchergebnissen filtern
    if (p.id === currentUser.id) return;

    let avatar =
      p.avatar_url ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`;

    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; background: #222; padding: 8px 12px; border-radius: 8px; margin-top: 5px; border: 1px solid #333;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${avatar}" style="width: 32px; height: 32px; border-radius: 50%; background: #111; object-fit: cover;">
          <span style="color: white; font-weight: bold;">${p.name}</span>
        </div>
        <button onclick="sendFriendRequestById('${p.id}', '${p.name}')" style="background: var(--accent-green); color: black; border: none; border-radius: 6px; padding: 6px 12px; font-weight: bold; cursor: pointer; font-size: 0.85em;">Hinzufügen</button>
      </div>
    `;
  });

  if (html === "") {
    html = `<div style="color: #888; font-size: 0.9em; text-align: center; padding: 10px;">Keine anderen Spieler gefunden.</div>`;
  }

  resultsContainer.innerHTML = html;
}

// 1b. Anfrage gezielt über die ID senden
async function sendFriendRequestById(targetId, targetName) {
  const { error: insertErr } = await _supabase
    .from("friends")
    .insert([
      { sender_id: currentUser.id, receiver_id: targetId, status: "pending" },
    ]);

  if (insertErr) {
    if (insertErr.code === "23505") {
      showToast(
        "Ihr seid bereits befreundet oder es gibt schon eine offene Anfrage.",
        "error"
      );
    } else {
      showToast("Fehler beim Senden: " + insertErr.message, "error");
    }
  } else {
    showToast(`Anfrage an ${targetName} wurde gesendet!`, "success");
    // Suchfeld und Ergebnisse nach erfolgreicher Anfrage leeren
    document.getElementById("friend-search-input").value = "";
    document.getElementById("friend-search-results").innerHTML = "";

    fetchAndRenderFriends(); // Tab-Ansicht aktualisieren
  }
}

// 2. Freunde und Anfragen aus der DB laden
async function fetchAndRenderFriends() {
  const container = document.getElementById("friends-list-container");
  container.innerHTML = `<div style="text-align:center; color:#888; padding:20px;">Lade Daten...</div>`;

  // Holt alle Beziehungen, an denen ich beteiligt bin (als Sender oder Empfänger)
  const { data: relations, error } = await _supabase
    .from("friends")
    .select("*")
    .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

  if (error) {
    container.innerHTML = `<div style="color:var(--accent-red); padding:10px;">Fehler: ${error.message}</div>`;
    return;
  }

  // Daten sortieren
  const pendingIncoming = relations.filter(
    (r) => r.status === "pending" && r.receiver_id === currentUser.id
  );
  const pendingOutgoing = relations.filter(
    (r) => r.status === "pending" && r.sender_id === currentUser.id
  );
  const accepted = relations.filter((r) => r.status === "accepted");

  // Rotes Badge für offene Anfragen updaten
  const badge = document.getElementById("req-badge");
  if (pendingIncoming.length > 0) {
    badge.style.display = "inline-block";
    badge.innerText = pendingIncoming.length;
  } else {
    badge.style.display = "none";
  }

  // IDs aller beteiligten User sammeln, um deren Namen/Avatare zu holen
  let userIdsToFetch = new Set();
  relations.forEach((r) => {
    userIdsToFetch.add(
      r.sender_id === currentUser.id ? r.receiver_id : r.sender_id
    );
  });

  let profilesMap = {};
  if (userIdsToFetch.size > 0) {
    const { data: profiles } = await _supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .in("id", Array.from(userIdsToFetch));

    if (profiles) {
      profiles.forEach((p) => (profilesMap[p.id] = p));
    }
  }

  // 3. UI Rendern basierend auf aktivem Tab
  let html = "";

  if (currentFriendsTab === "list") {
    if (accepted.length === 0) {
      html = `<div style="text-align:center; color:#888; padding:20px;">Du hast noch keine Freunde hinzugefügt.</div>`;
    } else {
      accepted.forEach((rel) => {
        let friendId =
          rel.sender_id === currentUser.id ? rel.receiver_id : rel.sender_id;
        let friendProf = profilesMap[friendId] || {
          name: "Unbekannt",
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${friendId}`,
        };

        html += `
          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--glass-bg); padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid var(--glass-border);">
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${friendProf.avatar_url}" style="width:40px; height:40px; border-radius:50%; background:#111; object-fit:cover;">
              <div>
                <div style="font-weight:bold; color:var(--text-main);">${friendProf.name}</div>
                <div style="font-size:0.8em; color:var(--text-muted); display:flex; align-items:center; gap:4px;">
                  <svg width="8" height="8" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" stroke-width="2"/></svg> Offline
                </div> 
              </div>
            </div>
            <div style="display:flex; gap:8px;">
              <button onclick="challengeFriend('${friendProf.name}')" style="background:var(--accent-purple); color:white; border:none; border-radius:6px; padding:6px 12px; cursor:pointer; font-weight:bold; display:flex; align-items:center; gap:5px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Spielen
              </button>
              <button onclick="removeFriend('${rel.id}')" style="background:transparent; color:var(--text-muted); border:1px solid var(--glass-border); border-radius:6px; padding:6px 10px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        `;
      });
    }
  } else if (currentFriendsTab === "requests") {
    html += `<h4 style="color:#aaa; margin-bottom:10px;">Erhaltene Anfragen (${pendingIncoming.length})</h4>`;
    if (pendingIncoming.length === 0)
      html += `<div style="color:#666; font-size:0.9em; margin-bottom:20px;">Keine offenen Anfragen.</div>`;

    pendingIncoming.forEach((rel) => {
      let friendProf = profilesMap[rel.sender_id] || { name: "Unbekannt" };
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#2a2a2a; padding:10px; border-radius:8px; margin-bottom:8px; border-left:3px solid var(--accent-blue);">
          <span style="color:white; font-weight:bold;">${friendProf.name}</span>
          <div>
            <button onclick="respondToRequest('${rel.id}', 'accepted')" style="background:var(--accent-green); color:black; border:none; border-radius:6px; padding:6px 12px; font-weight:bold; cursor:pointer; margin-right:5px;">Annehmen</button>
            <button onclick="removeFriend('${rel.id}')" style="background:transparent; color:#ff5252; border:1px solid #ff5252; border-radius:6px; padding:6px 12px; cursor:pointer;">Ablehnen</button>
          </div>
        </div>
      `;
    });

    html += `<h4 style="color:#aaa; margin-top:20px; margin-bottom:10px;">Gesendete Anfragen (${pendingOutgoing.length})</h4>`;
    pendingOutgoing.forEach((rel) => {
      let friendProf = profilesMap[rel.receiver_id] || { name: "Unbekannt" };
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#1a1a1a; padding:10px; border-radius:8px; margin-bottom:8px;">
          <span style="color:#888;">Warte auf ${friendProf.name}...</span>
          <button onclick="removeFriend('${rel.id}')" style="background:transparent; color:var(--text-muted); border:none; cursor:pointer; display:flex; align-items:center; gap:5px;">
            Abbrechen <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `;
    });
  }

  container.innerHTML = html;
}

// 4. Anfrage annehmen
async function respondToRequest(relationId, newStatus) {
  const { error } = await _supabase
    .from("friends")
    .update({ status: newStatus })
    .eq("id", relationId);

  if (!error) {
    showToast("Freundschaftsanfrage angenommen!", "success");
    fetchAndRenderFriends();
  }
}

// 5. Freund löschen oder Anfrage ablehnen/abbrechen
async function removeFriend(relationId) {
  if (!confirm("Bist du sicher?")) return;
  const { error } = await _supabase
    .from("friends")
    .delete()
    .eq("id", relationId);

  if (!error) fetchAndRenderFriends();
}

// Platzhalter für Phase 2 (Live-Herausforderung)
function challengeFriend(friendName) {
  alert(`Du forderst ${friendName} heraus! (Das Live-System kommt in Phase 2)`);
}
