let isOnlineHost = false;
let camChannel = null;
let currentCameraStream = null;

// --- NEU: LiveKit Variablen ---
let livekitRoom = null;
let livekitLobbyRoom = null;

// ==========================================
// HILFSFUNKTION: LIVEKIT TOKEN HOLEN
// ==========================================
// Diese Funktion ruft dein Token von deinem Backend/Supabase Edge Function ab.
// ==========================================
// HILFSFUNKTION: LIVEKIT TOKEN HOLEN (via Supabase)
// ==========================================
async function fetchLiveKitToken(roomCode, participantName, isCamera) {
  try {
    // _supabase.functions.invoke hängt automatisch deine sicheren Keys an!
    const { data, error } = await _supabase.functions.invoke("accesslivekit", {
      body: {
        roomName: roomCode,
        participantName: participantName,
        isCamera: isCamera,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.token;
  } catch (err) {
    console.error("Fehler beim Abrufen des LiveKit Tokens:", err);
    return null;
  }
}

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
  } else {
    el.innerHTML = "❌ Offline";
    el.style.color = "#ff4a4a";
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

// ==========================================
// HANDY-KAMERA SENDER (LIVEKIT)
// ==========================================
async function startCompanionMode(roomCode, role) {
  if (typeof hideAllScreens === "function") hideAllScreens();

  const authScreen = document.getElementById("auth-screen");
  if (authScreen) authScreen.remove();

  const topHeader = document.getElementById("top-header");
  if (topHeader) topHeader.style.display = "none";

  const companionScreen = document.getElementById("companion-screen");
  companionScreen.style.display = "block";
  companionScreen.style.position = "fixed";
  companionScreen.style.top = "0";
  companionScreen.style.left = "0";
  companionScreen.style.width = "100vw";
  companionScreen.style.height = window.innerHeight + "px";
  companionScreen.style.zIndex = "99999";
  companionScreen.style.backgroundColor = "black";
  companionScreen.style.overflow = "hidden";

  const closeBtn = companionScreen.querySelector("button");
  if (closeBtn) {
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "30px";
    closeBtn.style.left = "50%";
    closeBtn.style.transform = "translateX(-50%)";
    closeBtn.style.zIndex = "100000";
    closeBtn.style.padding = "12px 24px";
    closeBtn.style.backgroundColor = "#ff4a4a";
    closeBtn.style.color = "white";
    closeBtn.style.border = "none";
    closeBtn.style.borderRadius = "20px";
    closeBtn.style.fontWeight = "bold";
    closeBtn.style.boxShadow = "0px 4px 10px rgba(0,0,0,0.6)";
  }

  try {
    document.addEventListener("touchstart", requestWakeLock, { once: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") requestWakeLock();
    });

    // 1. KAMERA STARTEN
    currentCameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width: { min: 1280, ideal: 1920 },
        height: { min: 720, ideal: 1080 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: false,
    });

    const videoPreview = document.getElementById("local-camera-preview");
    videoPreview.srcObject = currentCameraStream;

    videoPreview.style.position = "absolute";
    videoPreview.style.top = "0";
    videoPreview.style.left = "0";
    videoPreview.style.width = "100%";
    videoPreview.style.height = "100%";
    videoPreview.style.objectFit = "cover";
    videoPreview.style.touchAction = "none";
    videoPreview.style.transformOrigin = "center center";
    videoPreview.style.zIndex = "1";

    const videoTrack = currentCameraStream.getVideoTracks()[0];
    if ("contentHint" in videoTrack) {
      videoTrack.contentHint = "detail";
    }
    const capabilities =
      typeof videoTrack.getCapabilities === "function"
        ? videoTrack.getCapabilities()
        : {};
    const hasHwZoom = "zoom" in capabilities;
    const hwZoomMin = hasHwZoom ? capabilities.zoom.min : 1;
    const hwZoomMax = hasHwZoom ? capabilities.zoom.max : 1;

    // 2. SUPABASE CHANNEL NUR NOCH FÜR ZOOM-SYNC
    camChannel = _supabase.channel(`camera-${roomCode}`, {
      config: { broadcast: { self: true } },
    });
    camChannel.subscribe();

    // 3. DIGITALE PAN & ZOOM LOGIK
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

    // 4. HYBRID ZOOM SLIDER
    const existingSlider = document.getElementById("camera-zoom-slider");
    if (existingSlider) existingSlider.remove();

    const zoomControl = document.createElement("input");
    zoomControl.type = "range";
    zoomControl.id = "camera-zoom-slider";
    zoomControl.style.cssText = `position: absolute; bottom: 15%; left: 10%; width: 80%; height: 40px; z-index: 100000; opacity: 0.9;`;

    const maxTotalZoom = Math.max(5, hwZoomMax * 2);
    zoomControl.min = 1;
    zoomControl.max = maxTotalZoom;
    zoomControl.step = 0.05;
    zoomControl.value = 1;

    zoomControl.oninput = async (e) => {
      let totalZoom = parseFloat(e.target.value);
      let desiredDigital = Math.min(totalZoom, 2);
      let desiredHw = totalZoom / desiredDigital;

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
        desiredHw = 1;
      }
      currentDigitalZoom = totalZoom / desiredHw;
      updateCameraView();
    };
    companionScreen.appendChild(zoomControl);

    // ==========================================
    // 5. LIVEKIT VERBINDUNG (SENDEN)
    // ==========================================
    const token = await fetchLiveKitToken(roomCode, role + "_camera", true);
    if (!token) throw new Error("Konnte kein LiveKit Token abrufen.");

    livekitRoom = new LivekitClient.Room();
    await livekitRoom.connect(
      "wss://secure-darts-2dyhbs8x.livekit.cloud",
      token
    );

    // Video an LiveKit senden
    await livekitRoom.localParticipant.publishTrack(videoTrack, {
      name: role, // wichtig: so erkennt der PC, wer sendet (host oder guest)
    });
    console.log("Kamera ist über LiveKit online!");
  } catch (err) {
    if (typeof showToast === "function")
      showToast("Kamera Fehler: " + err.message, "error");
    else alert("Kamera Fehler: " + err.message);
  }
}

// DRY Helper für Kamera-UI im Dashboard
function toggleVideoAvatar(playerId, showVideo) {
  const videoEl = document.getElementById(`video-${playerId}`);
  const avatarEl = document.getElementById(`avatar-${playerId}`);
  if (videoEl) videoEl.style.display = showVideo ? "block" : "none";
  if (avatarEl) avatarEl.style.display = showVideo ? "none" : "block";
}

// ==========================================
// PC LOBBY EMPFÄNGER (LIVEKIT)
// ==========================================
async function initCameraReceiver(roomCode, myRole) {
  // 1. Supabase Channel für den Zoom-Sync beibehalten
  if (camChannel) _supabase.removeChannel(camChannel);
  camChannel = _supabase.channel(`camera-${roomCode}`, {
    config: { broadcast: { self: true } },
  });

  camChannel
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

  // 2. LIVEKIT VERBINDUNG (EMPFANGEN)
  try {
    const token = await fetchLiveKitToken(roomCode, myRole + "_lobby", false);
    if (!token) return console.error("Konnte kein Receiver-Token laden.");

    livekitLobbyRoom = new LivekitClient.Room();

    // Event: Wenn eine Kamera (Host oder Guest) online kommt
    livekitLobbyRoom.on(
      LivekitClient.RoomEvent.TrackSubscribed,
      (track, publication, participant) => {
        console.log("STREAM ANGEKOMMEN VON:", participant.identity);

        if (track.kind === "video") {
          // NEU: .includes() nutzen, weil der Name jetzt "host_camera" oder "guest_camera" ist
          const isHostCam = participant.identity.includes("host");

          const videoId = isHostCam ? "video-p1" : "video-p2";
          const videoEl = document.getElementById(videoId);

          if (videoEl) {
            track.attach(videoEl);
            updateLobbyCameraStatus(isHostCam, true);
            toggleVideoAvatar(isHostCam ? "p1" : "p2", true);
          }
        }
      }
    );

    // Event: Wenn jemand die Kamera zumacht oder das Internet verliert
    livekitLobbyRoom.on(
      LivekitClient.RoomEvent.TrackUnsubscribed,
      (track, publication, participant) => {
        const isHostCam = participant.identity.includes("host");
        track.detach();
        updateLobbyCameraStatus(isHostCam, false);
        toggleVideoAvatar(isHostCam ? "p1" : "p2", false);
      }
    );

    await livekitLobbyRoom.connect(
      "wss://secure-darts-2dyhbs8x.livekit.cloud",
      token
    );
    console.log("Lobby empfängt jetzt via LiveKit!");
  } catch (error) {
    console.error("LiveKit Lobby Fehler:", error);
  }
}

function cleanupWebRTC() {
  if (camChannel) {
    _supabase.removeChannel(camChannel);
    camChannel = null;
  }
  if (livekitLobbyRoom) {
    livekitLobbyRoom.disconnect();
    livekitLobbyRoom = null;
  }
  let v1 = document.getElementById("video-p1");
  let v2 = document.getElementById("video-p2");
  if (v1) v1.srcObject = null;
  if (v2) v2.srcObject = null;
}

// ==========================================
// AVATAR UPLOAD & COMPRESSION ENGINE
// ==========================================
let isUploadingAvatar = false;

async function handleAvatarUpload(event) {
  if (isUploadingAvatar) return;

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
        const minSize = Math.min(img.width, img.height);
        const startX = (img.width - minSize) / 2;
        const startY = (img.height - minSize) / 2;
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(
          img,
          startX,
          startY,
          minSize,
          minSize,
          0,
          0,
          targetSize,
          targetSize
        );
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
      };
    };
    reader.onerror = (error) => reject(error);
  });
}

async function stopCameraStream() {
  if (currentCameraStream) {
    currentCameraStream.getTracks().forEach((track) => track.stop());
    currentCameraStream = null;
  }

  // LiveKit Verbindung der Kamera trennen
  if (livekitRoom) {
    livekitRoom.disconnect();
    livekitRoom = null;
  }

  const videoEl = document.getElementById("local-camera-preview");
  if (videoEl) videoEl.srcObject = null;

  if (camChannel) {
    await _supabase.removeChannel(camChannel);
    camChannel = null;
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
