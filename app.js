const SUPABASE_URL = "https://etzkulwnjhkoiklrohbt.supabase.co";
const SUPABASE_KEY = "sb_publishable_mSGY3nB8ivTaASBZQass3g_Ri4xOimy";
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const targets = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 50,
];
let players = [];
let currentPlayerIndex = 0;
let globalTargetIndex = 0;
let isTrainingMode = false;
let statsChart = null;
let currentModalPlayer = "";
let gameHistoryStack = [];
let botTimer = null;
let currentStatsMode = "littler";

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
  const screens = [
    "home-screen",
    "setup-screen",
    "game-screen",
    "online-lobby-screen",
    "game-501-screen",
    "highscore-screen",
    "rules-screen",
    "party-setup-screen",
    "game-party-screen",
    "bobs-setup-screen",
    "game-bobs-screen",
    "rtw-setup-screen",
    "game-rtw-screen",
  ];
  screens.forEach((s) => {
    let el = document.getElementById(s);
    if (el) el.style.display = "none";
  });
  document.getElementById("auth-screen").style.display = "block";
}

async function showMainApp() {
  if (isCompanionMode) return;

  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("top-header").style.display = "block";
  document.getElementById("main-container").style.display = "block";

  // Hide the setup screen by default to ensure it doesn't overlap the home menu
  document.getElementById("setup-screen").style.display = "none";

  let displayName = "";
  if (!isGuest && currentUser) {
    displayName =
      currentUser.user_metadata?.display_name ||
      currentUser.user_metadata?.full_name ||
      currentUser.email.split("@")[0];

    myOnlineName = displayName;

    let p1Input = document.getElementById("local-p1-name");
    let onlineInput = document.getElementById("online-player-name");
    if (p1Input) p1Input.value = displayName;
    if (onlineInput) onlineInput.value = displayName;
  }

  // --- DATABASE-BACKED RECONNECT ---
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

      // Ensure the lobby and setup are hidden, only show the game
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
    const { data, error } = await _supabase
      .from("stats_501")
      .select("is_admin")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (data && data.is_admin) {
      adminBtn.style.display = "block"; // Show button if DB says yes
    } else {
      adminBtn.style.display = "none";
    }
  }

  goHome();
}

function goHome() {
  // ---> NEU: Kameras und WebRTC-Tunnel sauber beenden!
  if (typeof cleanupWebRTC === "function") cleanupWebRTC();

  document.getElementById("hamburger-btn").style.display = "block";

  const screens = [
    "home-screen",
    "setup-screen",
    "game-screen",
    "online-lobby-screen",
    "game-501-screen",
    "highscore-screen",
    "rules-screen",
    "party-setup-screen",
    "game-party-screen",
    "bobs-setup-screen",
    "game-bobs-screen",
    "rtw-setup-screen",
    "game-rtw-screen",
  ];
  screens.forEach((s) => {
    let el = document.getElementById(s);
    if (el) el.style.display = "none";
  });

  // ---> NEU: Lobby-Container wieder auf "Setup" zurücksetzen
  let lobbySetup = document.getElementById("lobby-setup");
  if (lobbySetup) lobbySetup.style.display = "block";

  let lobbyActive = document.getElementById("lobby-active");
  if (lobbyActive) lobbyActive.style.display = "none";

  // ---> NEU: Online-Match Variablen leeren
  currentRoomCode = "";
  isOnlineHost = false;

  // Hauptmenü einblenden
  document.getElementById("home-screen").style.display = "block";
  document.getElementById("app-title").innerText = "🎯 SECURE-DARTS";
  document.body.classList.remove("training-active");

  // ---> NEU: Sicherstellen, dass das Cancel-Modal WIRKLICH zu ist
  let cancelModal = document.getElementById("cancel-modal");
  if (cancelModal) cancelModal.style.display = "none";
}

function enterMode(mode) {
  currentAppMode = mode;
  document.getElementById("home-screen").style.display = "none";
  document.getElementById("hamburger-btn").style.display = "block"; // Zeigt den Hamburger-Button an

  if (mode === "501") {
    document.getElementById("app-title").innerText = "🌍 501 DARTS";
  } else {
    document.getElementById("app-title").innerText = "🎯 SECURE-DARTS";
  }
  showScreen("play");
}

function showScreen(screenType) {
  const screens = [
    "home-screen",
    "setup-screen",
    "game-screen",
    "online-lobby-screen",
    "game-501-screen",
    "highscore-screen",
    "rules-screen",
    "party-setup-screen",
    "game-party-screen",
    "bobs-setup-screen",
    "game-bobs-screen",
    "rtw-setup-screen",
    "game-rtw-screen",
  ];
  screens.forEach((s) => {
    let el = document.getElementById(s);
    if (el) el.style.display = "none";
  });
  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.classList.remove("active"));

  if (screenType === "play") {
    document.getElementById("tab-play")?.classList.add("active");
    if (currentAppMode === "littler") {
      if (players.length > 0) {
        // Safely check if the game screen exists before displaying it
        const gameScreen =
          document.getElementById("game-screen") ||
          document.getElementById("game-littler-screen");
        if (gameScreen) gameScreen.style.display = "block";
      } else {
        const setupScreen = document.getElementById("setup-screen");
        if (setupScreen) setupScreen.style.display = "block";
      }
    } else {
      if (isLocal501 || currentRoomCode)
        document.getElementById("game-501-screen").style.display = "block";
      else
        document.getElementById("online-lobby-screen").style.display = "block";
    }
  } else if (screenType === "stats") {
    document.getElementById("tab-stats").classList.add("active");
    document.getElementById("highscore-screen").style.display = "block";
    let toggle = document.getElementById("stats-toggle-container");
    if (toggle) toggle.style.display = "none";
    switchStatsMode(currentAppMode);
  } else if (screenType === "rules") {
    document.getElementById("tab-rules").classList.add("active");
    document.getElementById("rules-screen").style.display = "block";
  }
}

window.addEventListener("DOMContentLoaded", (event) => {
  loadPlayerSuggestions();
  initAuth(); // <--- NEU: Prüft Login statt direkt ins Home-Menü zu gehen
});

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) await navigator.wakeLock.request("screen");
  } catch (err) {}
}

function openPartySetup() {
  // 1. Hide all screens (using the array you just updated!)
  const screens = [
    "home-screen",
    "setup-screen",
    "game-screen",
    "online-lobby-screen",
    "game-501-screen",
    "highscore-screen",
    "rules-screen",
    "party-setup-screen",
    "game-party-screen",
    "bobs-setup-screen",
    "game-bobs-screen",
    "rtw-setup-screen",
    "game-rtw-screen",
  ];

  screens.forEach((s) => {
    let el = document.getElementById(s);
    if (el) el.style.display = "none";
  });

  // 2. Show the Party Setup Screen
  document.getElementById("party-setup-screen").style.display = "block";

  // 3. Update the App Title
  let titleEl = document.getElementById("app-title");
  if (titleEl) {
    titleEl.innerText = "🎉 PARTY X01";
  }
}

function openBobsSetup() {
  const screens = [
    "home-screen",
    "setup-screen",
    "game-screen",
    "online-lobby-screen",
    "game-501-screen",
    "highscore-screen",
    "rules-screen",
    "party-setup-screen",
    "game-party-screen",
    "bobs-setup-screen",
    "game-bobs-screen",
    "rtw-setup-screen",
    "game-rtw-screen",
  ];
  screens.forEach((s) => {
    let el = document.getElementById(s);
    if (el) el.style.display = "none";
  });

  document.getElementById("bobs-setup-screen").style.display = "block";

  let titleEl = document.getElementById("app-title");
  if (titleEl) titleEl.innerText = "🎯 BOB'S 27";

  // NEU: Namen vorausfüllen
  let inputEl = document.getElementById("bobs-player-input");
  if (inputEl) inputEl.value = myOnlineName || "Spieler";
}

function openRtwSetup() {
  const screens = [
    "home-screen",
    "setup-screen",
    "game-screen",
    "online-lobby-screen",
    "game-501-screen",
    "highscore-screen",
    "rules-screen",
    "party-setup-screen",
    "game-party-screen",
    "bobs-setup-screen",
    "game-bobs-screen",
    "rtw-setup-screen",
    "game-rtw-screen",
  ];
  screens.forEach((s) => {
    let el = document.getElementById(s);
    if (el) el.style.display = "none";
  });

  document.getElementById("rtw-setup-screen").style.display = "block";

  let titleEl = document.getElementById("app-title");
  if (titleEl) titleEl.innerText = "🌍 ROUND THE WORLD";

  // NEU: Namen vorausfüllen
  let inputEl = document.getElementById("rtw-player-input");
  if (inputEl) inputEl.value = myOnlineName || "Spieler";
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

  // === DER KUGELSICHERE KAMERA-CHECK ===
  if (cameraRoom && cameraRole) {
    isCompanionMode = true; // Sagt dem restlichen Code: HALT STOPP!
    document.body.style.background = "black";
    document.getElementById("top-header").style.display = "none";
    document
      .querySelectorAll(".container > div")
      .forEach((s) => (s.style.display = "none"));

    startCompanionMode(cameraRoom, cameraRole);
    return; // Bricht hier sofort ab. Auth wird gar nicht erst geladen!
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

// 1. Lobby öffnen
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

  // Da wir kein <img> Tag mehr brauchen, sondern ein <div> für die Library:
  // Wir prüfen, ob qr-image ein <img> ist und tauschen es ggf. gegen ein <div> aus
  let canvasContainer = document.getElementById("qrcode-canvas");
  if (!canvasContainer) {
    canvasContainer = document.createElement("div");
    canvasContainer.id = "qrcode-canvas";
    canvasContainer.style.display = "flex";
    canvasContainer.style.justifyContent = "center";
    // Ersetzt das alte img-Tag durch das neue div-Tag
    qrImage.parentNode.replaceChild(canvasContainer, qrImage);
  }

  // Alten QR-Code Inhalt löschen
  canvasContainer.innerHTML = "";

  // QR-Code sofort lokal generieren
  new QRCode(canvasContainer, {
    text: companionUrl,
    width: 150,
    height: 150,
    colorDark: "#ffffff", // Code Farbe: Weiß
    colorLight: "#2d2d2d", // Hintergrund Farbe: Grau (passend zum Container)
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

// 2. Kamera auf dem Handy starten
async function startCompanionMode(roomCode, role) {
  document.getElementById("companion-screen").style.display = "block";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    const videoTrack = stream.getVideoTracks()[0];
    document.getElementById("local-camera-preview").srcObject = stream;

    // --- NEU: ZOOM UI HINZUFÜGEN ---
    const capabilities = videoTrack.getCapabilities();
    if (capabilities.zoom) {
      // Erstelle einen Slider für den Zoom
      const zoomControl = document.createElement("input");
      zoomControl.type = "range";
      zoomControl.min = capabilities.zoom.min;
      zoomControl.max = capabilities.zoom.max;
      zoomControl.step = capabilities.zoom.step;
      zoomControl.value = capabilities.zoom.min;
      zoomControl.style.cssText = "width: 80%; margin-top: 20px; height: 30px;";

      zoomControl.oninput = async () => {
        try {
          await videoTrack.applyConstraints({
            advanced: [{ zoom: zoomControl.value }],
          });
        } catch (e) {
          console.error("Zoom nicht unterstützt", e);
        }
      };
      document.getElementById("companion-screen").appendChild(zoomControl);
    }

    camChannel = _supabase.channel(`camera-${roomCode}`, {
      config: { broadcast: { self: true } },
    });

    camChannel
      .on("broadcast", { event: "webrtc-signal" }, async (payload) => {
        const data = payload.payload;
        if (data.target !== role) return;

        if (data.type === "request-offer") {
          localDronePeer = new RTCPeerConnection(rtcConfig);
          stream
            .getTracks()
            .forEach((track) => localDronePeer.addTrack(track, stream));

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
        } else if (data.type === "ice-candidate" && localDronePeer) {
          await localDronePeer.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setInterval(() => {
            camChannel.send({
              type: "broadcast",
              event: "cam-status",
              payload: { role: role },
            });
          }, 3000);
        }
      });
  } catch (err) {
    alert("Kamera blockiert: " + err.message);
  }
}

// 3. Receiver auf dem PC
function initCameraReceiver(roomCode, myRole) {
  if (camChannel) _supabase.removeChannel(camChannel);
  boardPeers = { host: null, guest: null };

  camChannel = _supabase.channel(`camera-${roomCode}`, {
    config: { broadcast: { self: true } },
  });

  camChannel
    .on("broadcast", { event: "cam-status" }, (payload) => {
      const camRole = payload.payload.role; // Ist entweder 'host' oder 'guest'

      if (camRole === "host") updateLobbyCameraStatus(true, true);
      if (camRole === "guest") updateLobbyCameraStatus(false, true);

      // Fordere das Bild von JEDER Kamera an, mit der wir noch nicht verbunden sind!
      if (
        !boardPeers[camRole] ||
        boardPeers[camRole].connectionState !== "connected"
      ) {
        if (!boardPeers[camRole])
          boardPeers[camRole] = { connectionState: "connecting" }; // Spam-Schutz
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

      const fromCam = data.from; // Von wem kommt das Video? ('host' oder 'guest')

      if (data.type === "offer") {
        const peer = new RTCPeerConnection(rtcConfig);
        boardPeers[fromCam] = peer;

        peer.ontrack = (event) => {
          // Zuweisung: Host = P1, Guest = P2
          const videoId = fromCam === "host" ? "video-p1" : "video-p2";
          const videoEl = document.getElementById(videoId);
          if (videoEl) videoEl.srcObject = event.streams[0];
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
    .subscribe();
}

function cleanupWebRTC() {
  // 1. Supabase-Kanal verlassen
  if (camChannel) {
    _supabase.removeChannel(camChannel);
    camChannel = null;
  }

  // 2. PC-Verbindungen (Board-Kameras) schließen
  if (typeof boardPeers !== "undefined") {
    if (boardPeers.host && boardPeers.host.close) boardPeers.host.close();
    if (boardPeers.guest && boardPeers.guest.close) boardPeers.guest.close();
    boardPeers = { host: null, guest: null };
  }

  // 3. Handy-Verbindung (Drohne) schließen
  if (typeof localDronePeer !== "undefined" && localDronePeer) {
    localDronePeer.close();
    localDronePeer = null;
  }

  // 4. Video-Elemente schwarz schalten
  let v1 = document.getElementById("video-p1");
  let v2 = document.getElementById("video-p2");
  if (v1) v1.srcObject = null;
  if (v2) v2.srcObject = null;
}

// ==========================================
// AVATAR UPLOAD & COMPRESSION ENGINE
// ==========================================

async function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // UI Feedback
  document.getElementById("btn-edit-avatar").innerText = "LÄDT...";

  try {
    // 1. Bild komprimieren (Client-Side Resize auf 200x200px)
    const compressedImageBlob = await compressImage(file, 200, 200);

    // 2. Dateinamen generieren (Nutzer ID + Zeitstempel gegen Caching)
    const fileName = `${currentUser.id}_${Date.now()}.jpg`;

    // 3. In den Supabase "avatars" Bucket hochladen
    const { data: uploadData, error: uploadError } = await _supabase.storage
      .from("avatars")
      .upload(fileName, compressedImageBlob, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 4. Öffentliche URL abrufen
    const {
      data: { publicUrl },
    } = _supabase.storage.from("avatars").getPublicUrl(fileName);

    // 5. URL in den User Metadata speichern (Supabase Auth)
    const { error: updateError } = await _supabase.auth.updateUser({
      data: { avatar_url: publicUrl },
    });

    if (updateError) throw updateError;

    // 6. UI sofort updaten
    document.getElementById("modal-avatar-preview").src = publicUrl;
    currentUser.user_metadata.avatar_url = publicUrl; // Lokal updaten
    alert("Profilbild erfolgreich aktualisiert!");
  } catch (error) {
    alert("Fehler beim Upload: " + error.message);
  } finally {
    document.getElementById("btn-edit-avatar").innerText = "EDIT";
  }
}

// Hilfsfunktion: Schrumpft das Bild per HTML5 Canvas auf Mini-Größe
function compressImage(file, maxWidth, maxHeight) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Seitenverhältnis beibehalten und zuschneiden
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Gibt ein hochkomprimiertes JPEG (Qualität 80%) als Blob zurück
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          0.8
        );
      };
    };
    reader.onerror = (error) => reject(error);
  });
}
