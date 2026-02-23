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

  // Only show the mode selection
  document.getElementById("home-screen").style.display = "block";
  document.getElementById("app-title").innerText = "🎯 SECURE-DARTS";
  document.body.classList.remove("training-active");
}

function enterMode(mode) {
  currentAppMode = mode;
  document.getElementById("home-screen").style.display = "none";
  document.getElementById("hamburger-btn").style.display = "block"; // Zeigt den Hamburger-Button an

  if (mode === "501") {
    document.getElementById("tab-rules").style.display = "none";
    document.getElementById("app-title").innerText = "🌍 501 DARTS";
  } else {
    document.getElementById("tab-rules").style.display = "block";
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
    document.getElementById("tab-play").classList.add("active");
    if (currentAppMode === "littler") {
      if (players.length > 0)
        document.getElementById("game-screen").style.display = "block";
      else document.getElementById("setup-screen").style.display = "block";
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
