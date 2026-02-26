// ==========================================
// ONLINE-STATUS LOGIK (Presence)
// ==========================================

let onlineUserIds = new Set();
let presenceChannel = null;

async function initPresence() {
  if (!currentUser || isGuest) return;

  // Bestehenden Channel sicherheitshalber bereinigen
  if (presenceChannel) {
    _supabase.removeChannel(presenceChannel);
  }

  presenceChannel = _supabase.channel("online-users");

  presenceChannel
    .on("presence", { event: "sync" }, () => {
      const newState = presenceChannel.presenceState();
      updateOnlineUsers(newState);
    })
    .on("presence", { event: "join" }, ({ key, newPresences }) => {
      newPresences.forEach((p) => onlineUserIds.add(p.user_id));
      refreshFriendsUIIfOpen();
    })
    .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      leftPresences.forEach((p) => onlineUserIds.delete(p.user_id));
      refreshFriendsUIIfOpen();
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        // Meldet den aktuellen User als "online" im Channel an
        await presenceChannel.track({
          user_id: currentUser.id,
          online_at: new Date().toISOString(),
        });
      }
    });
}

function updateOnlineUsers(state) {
  onlineUserIds.clear();
  for (const id in state) {
    state[id].forEach((presence) => {
      onlineUserIds.add(presence.user_id);
    });
  }
  refreshFriendsUIIfOpen();
}

function refreshFriendsUIIfOpen() {
  const modal = document.getElementById("friends-modal");
  if (modal && modal.style.display === "flex") {
    fetchAndRenderFriends();
  }
}

// ==========================================
// FREUNDES-SYSTEM LOGIK
// ==========================================

let currentFriendsTab = "list";

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

        // --- NEU: Online Status prüfen & Farben setzen ---
        let isOnline = onlineUserIds.has(friendId);
        let statusColor = isOnline
          ? "var(--accent-green)"
          : "var(--text-muted)";
        let statusFill = isOnline ? "var(--accent-green)" : "none";
        let statusText = isOnline ? "Online" : "Offline";

        html += `
          <div style="display:flex; justify-content:space-between; align-items:center; background:var(--glass-bg); padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid var(--glass-border);">
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${friendProf.avatar_url}" style="width:40px; height:40px; border-radius:50%; background:#111; object-fit:cover;">
              <div>
                <div style="font-weight:bold; color:var(--text-main);">${friendProf.name}</div>
                <div style="font-size:0.8em; color:${statusColor}; display:flex; align-items:center; gap:4px;">
                  <svg width="8" height="8" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="${statusFill}" stroke="currentColor" stroke-width="2"/></svg> ${statusText}
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
