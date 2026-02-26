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
    initPresence();
    if (typeof initNotifications === "function") initNotifications();
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
