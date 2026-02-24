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
      (currentModalType === "501" || currentModalType === "littler")
    ) {
      if (typeof loadMatchHistory === "function") loadMatchHistory();
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
  const bgColor =
    type === "success" ? "var(--accent-green)" : "var(--accent-red)";
  const color = type === "success" ? "black" : "white";
  const icon = type === "success" ? "✅" : "⚠️";

  toast.style.cssText = `
    background: ${bgColor};
    color: ${color};
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.6);
    font-weight: bold;
    font-size: 0.9em;
    display: flex;
    align-items: center;
    gap: 10px;
    transform: translateX(120%);
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;
  toast.innerHTML = `<span style="font-size: 1.2em;">${icon}</span> <span>${message}</span>`;

  container.appendChild(toast);

  // Rein-Animieren
  requestAnimationFrame(() => {
    toast.style.transform = "translateX(0)";
  });

  // Raus-Animieren und nach 2.5 Sekunden löschen
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
// INLINE NAME EDITING
// ==========================================
function enableInlineNameEdit() {
  const nameEl = document.getElementById("modal-name");
  const currentName = currentModalPlayer; // Nimmt den Namen aus der stats.js

  // Tauscht den Text gegen ein cooles Input-Feld aus
  nameEl.innerHTML = `<input type="text" id="inline-name-input" value="${currentName}" 
    style="background: #111; color: white; border: 1px solid var(--accent-blue); padding: 5px 10px; border-radius: 6px; font-size: 0.9em; width: 140px; outline: none;" 
    onblur="saveInlineName()" 
    onkeydown="if(event.key === 'Enter') { this.blur(); }">`;

  document.getElementById("inline-name-input").focus();
  document.getElementById("btn-edit-name").style.display = "none";
}

async function saveInlineName() {
  const inputEl = document.getElementById("inline-name-input");
  if (!inputEl) return;
  const newName = inputEl.value.trim();
  const nameEl = document.getElementById("modal-name");

  // Wenn leer oder unverändert, einfach abbrechen und zurücksetzen
  if (!newName || newName === currentModalPlayer) {
    nameEl.innerText =
      currentModalPlayer + (currentModalType === "501" ? " (501)" : "");
    document.getElementById("btn-edit-name").style.display = "block";
    return;
  }

  // UI kurz auf Ladezustand setzen
  nameEl.innerHTML = `<span style="color: #888; font-size: 0.8em;">Speichert...</span>`;

  try {
    // 1. Auth Metadata updaten
    const { error: authErr } = await _supabase.auth.updateUser({
      data: { display_name: newName, full_name: newName },
    });
    if (authErr) throw authErr;

    // 2. Datenbanken updaten (501 und Littler)
    await _supabase
      .from("stats_501")
      .update({ name: newName })
      .eq("user_id", currentUser.id);
    await _supabase
      .from("highscores")
      .update({ name: newName })
      .eq("name", currentModalPlayer);

    // 3. Lokale Variablen aktualisieren
    myOnlineName = newName;
    currentModalPlayer = newName;

    // 4. Erfolgsmeldung!
    showToast("Name erfolgreich geändert!", "success");
  } catch (e) {
    showToast("Fehler beim Speichern: " + e.message, "error");
  } finally {
    // UI wiederherstellen
    nameEl.innerText =
      currentModalPlayer + (currentModalType === "501" ? " (501)" : "");
    document.getElementById("btn-edit-name").style.display = "block";
  }
}

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
