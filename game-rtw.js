// ==========================================
// ROUND THE WORLD LOGIK (Doubles)
// ==========================================

let rtwPlayer = null;
let rtwHistoryStack = [];

const rtwTargets = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 25,
];
const rtwBoardOrder = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];

function startRtwGame() {
  const nameInput =
    document.getElementById("rtw-player-input").value.trim() || "Spieler";

  rtwPlayer = { name: nameInput, targetIndex: 0, dartsThrown: 0 };
  rtwHistoryStack = [];

  document.getElementById("btn-undo-rtw").style.display = "none";
  document.getElementById("rtw-setup-screen").style.display = "none";
  document.getElementById("game-rtw-screen").style.display = "block";

  updateRtwUI();
}

function cancelRtwGame() {
  if (confirm("Spiel wirklich abbrechen?")) {
    document.getElementById("game-rtw-screen").style.display = "none";
    goHome();
  }
}

function updateRtwUI() {
  const targetVal = rtwTargets[rtwPlayer.targetIndex];

  document.getElementById(
    "rtw-turn-indicator"
  ).innerText = `🎯 ${rtwPlayer.name} wirft...`;
  document.getElementById("rtw-darts-count").innerText = rtwPlayer.dartsThrown;

  let targetDisplay = targetVal === 25 ? "BULL" : `D${targetVal}`;
  document.getElementById("rtw-target-display").innerText = targetDisplay;

  renderDynamicDartboardRTW(targetVal);
}

function submitRtwScore(hits) {
  rtwHistoryStack.push({
    targetIndex: rtwPlayer.targetIndex,
    dartsThrown: rtwPlayer.dartsThrown,
  });
  document.getElementById("btn-undo-rtw").style.display = "block";

  rtwPlayer.dartsThrown += 3;
  rtwPlayer.targetIndex += hits;

  if (rtwPlayer.targetIndex >= rtwTargets.length) {
    rtwPlayer.targetIndex = rtwTargets.length - 1;
    updateRtwUI();

    setTimeout(() => {
      alert(
        `🎉 GESCHAFFT! 🎉\n\nDu bist einmal um die Welt gereist!\nBenötigte Darts: ${rtwPlayer.dartsThrown}`
      );
      document.getElementById("game-rtw-screen").style.display = "none";
      goHome();
    }, 300);
    return;
  }

  updateRtwUI();
}

function undoRtwTurn() {
  if (rtwHistoryStack.length === 0) return;
  const lastState = rtwHistoryStack.pop();

  rtwPlayer.targetIndex = lastState.targetIndex;
  rtwPlayer.dartsThrown = lastState.dartsThrown;

  if (rtwHistoryStack.length === 0)
    document.getElementById("btn-undo-rtw").style.display = "none";

  updateRtwUI();
}

// --- SVG DARTBOARD GENERATOR (RTW Doubles) ---
function renderDynamicDartboardRTW(activeTarget) {
  const container = document.getElementById("rtw-dartboard-container");

  const cx = 150,
    cy = 150;
  const rBoard = 145;
  const rDoubleOuter = 115;
  const rDoubleInner = 105;
  const rTripleOuter = 65;
  const rTripleInner = 55;
  const rOuterBull = 16;
  const rInnerBull = 7;
  const rText = 130;

  let slicesHTML = `
    <style>
      @keyframes flash-target {
        0%, 100% { fill: var(--accent-green) !important; stroke: #ffffff !important; }
        50% { fill: #ffffff !important; stroke: var(--accent-green) !important; stroke-width: 2px !important; }
      }
      .blinking-target {
        animation: flash-target 0.8s infinite ease-in-out;
      }
    </style>
  `;

  slicesHTML += `<circle cx="${cx}" cy="${cy}" r="${rBoard}" fill="#1c1c1c" />`;

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

  rtwBoardOrder.forEach((num, index) => {
    const startAngle = index * angleStep - angleStep / 2;
    const endAngle = startAngle + angleStep;

    const isRedBlack = index % 2 === 0;
    const colorSingle = isRedBlack ? "#222222" : "#5d554a";
    const colorDoubleTriple = isRedBlack ? "#a82b2b" : "#1a5d38";

    const isActive = num === activeTarget;
    const doubleColor = isActive ? "var(--accent-green)" : colorDoubleTriple;
    const strokeWidth = isActive ? "1.5" : "0.5";
    const strokeColor = isActive ? "#fff" : "#aaa";

    // Die Blinking-Klasse kommt NUR an das Doppel
    const activeClass = isActive ? ' class="blinking-target"' : "";

    slicesHTML += `<path d="${createArc(
      rOuterBull,
      rTripleInner,
      startAngle,
      endAngle
    )}" fill="${colorSingle}" stroke="#aaa" stroke-width="0.5" />`;
    slicesHTML += `<path d="${createArc(
      rTripleInner,
      rTripleOuter,
      startAngle,
      endAngle
    )}" fill="${colorDoubleTriple}" stroke="#aaa" stroke-width="0.5" />`;
    slicesHTML += `<path d="${createArc(
      rTripleOuter,
      rDoubleInner,
      startAngle,
      endAngle
    )}" fill="${colorSingle}" stroke="#aaa" stroke-width="0.5" />`;

    // Nur der äußere Doppel-Ring blinkt
    slicesHTML += `<path${activeClass} d="${createArc(
      rDoubleInner,
      rDoubleOuter,
      startAngle,
      endAngle
    )}" fill="${doubleColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`;

    const textRad = ((startAngle + angleStep / 2 - 90) * Math.PI) / 180;
    const tx = cx + rText * Math.cos(textRad);
    const ty = cy + rText * Math.sin(textRad);
    slicesHTML += `<text x="${tx}" y="${ty}" fill="white" font-size="14" font-weight="bold" font-family="sans-serif" text-anchor="middle" dominant-baseline="central">${num}</text>`;
  });

  const isBullTarget = activeTarget === 25 || activeTarget === 50;
  const bullClass = isBullTarget ? ' class="blinking-target"' : "";
  const outerBullColor = isBullTarget ? "var(--accent-green)" : "#1a5d38";
  const innerBullColor = isBullTarget ? "var(--accent-green)" : "#a82b2b";

  slicesHTML += `<circle${bullClass} cx="${cx}" cy="${cy}" r="${rOuterBull}" fill="${outerBullColor}" stroke="#aaa" stroke-width="0.5" />`;
  slicesHTML += `<circle${bullClass} cx="${cx}" cy="${cy}" r="${rInnerBull}" fill="${innerBullColor}" stroke="#aaa" stroke-width="0.5" />`;

  container.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 300 300" style="max-width: 350px; filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));">${slicesHTML}</svg>`;
}
