async function handleGoogleLogin() {
  const { data, error } = await _supabase.auth.signInWithOAuth({
    provider: "google",
  });

  if (error) {
    showToast("Google Login fehlgeschlagen: " + error.message, "error");
    console.error(error);
  }
  // Supabase leitet den Browser jetzt automatisch zu Google weiter.
  // Nach erfolgreichem Login springt er zurück, initAuth() erkennt den User und startet das Spiel!
}

async function handleRegister() {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value.trim();
  if (!email || !password)
    return showToast("Bitte E-Mail und Passwort eingeben.", "error");

  const { data, error } = await _supabase.auth.signUp({
    email,
    password,
  });
  if (error)
    return showToast("Registrierung fehlgeschlagen: " + error.message, "error");

  showToast("Wir haben Dir eine Bestätigungs-Mail geschickt!", "success");
  currentUser = data.user;
  isGuest = false;
  initPresence();
  showMainApp();
}

function continueAsGuest() {
  isGuest = true;
  currentUser = null;
  showMainApp();
}

async function handleLogout() {
  // Beendet das Online-Tracking und verlässt den Channel
  if (presenceChannel) {
    await _supabase.removeChannel(presenceChannel);
    onlineUserIds.clear();
  }

  if (!isGuest) await _supabase.auth.signOut();
  isGuest = false;
  currentUser = null;
  document.getElementById("auth-email").value = "";
  document.getElementById("auth-password").value = "";
  showAuthScreen();
}

async function handleLogin() {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value.trim();
  if (!email || !password)
    return showToast("Bitte E-Mail und Passwort eingeben.", "error");

  const { data, error } = await _supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error)
    return showToast("Login fehlgeschlagen: " + error.message, "error");

  currentUser = data.user;
  isGuest = false;

  initPresence();
  showMainApp();
}

async function changeUsername() {
  if (isGuest || !currentUser) {
    if (typeof showToast === "function")
      return showToast("Als Gast kannst du keinen Namen speichern.", "error");
    return alert("Als Gast kannst du keinen Namen speichern.");
  }

  let currentName = currentUser.email.split("@")[0];
  if (currentUser.user_metadata && currentUser.user_metadata.display_name) {
    currentName = currentUser.user_metadata.display_name;
  } else if (currentUser.user_metadata && currentUser.user_metadata.full_name) {
    currentName = currentUser.user_metadata.full_name;
  }

  let newName = prompt("Wie lautet dein gewünschter Darts-Name?", currentName);

  if (newName && newName.trim() !== "" && newName !== currentName) {
    const cleanName = newName.trim();
    const lowerName = cleanName.toLowerCase();

    // 1. Prüfen, ob der Name ein verbotenes Wort enthält
    const forbiddenWords = [
      "admin",
      "administrator",
      "moderator",
      "system",
      "support",
    ];
    const isForbidden = forbiddenWords.some((word) => lowerName.includes(word));

    // 2. Wenn es ein verbotenes Wort ist, prüfen wir, ob der User wirklich Admin ist
    if (isForbidden) {
      // Admin-Status aus der DB holen (Passe den Tabellennamen an, falls nötig)
      const { data: adminData } = await _supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", currentUser.id)
        .maybeSingle();

      const isRealAdmin = adminData && adminData.is_admin === true;

      // Nur blockieren, wenn er das Wort nutzt UND KEIN echter Admin ist
      if (!isRealAdmin) {
        if (typeof showToast === "function")
          return showToast(
            "Dieser Name ist für Administratoren reserviert.",
            "error"
          );
        return alert("Dieser Name ist für Administratoren reserviert.");
      }
    }

    // 3. Wenn wir hier ankommen, ist alles okay (entweder sauberer Name oder echter Admin)
    const { data, error } = await _supabase.auth.updateUser({
      data: { display_name: cleanName },
    });

    if (error) {
      if (typeof showToast === "function")
        showToast("Fehler beim Speichern: " + error.message, "error");
      else alert("Fehler beim Speichern: " + error.message);
    } else {
      currentUser = data.user;
      if (typeof showToast === "function")
        showToast("Name erfolgreich geändert auf: " + cleanName, "success");
      else alert("Name erfolgreich geändert auf: " + cleanName);

      if (typeof showMainApp === "function") showMainApp();
    }
  }
}

// ==========================================
// PASSWORT VERGESSEN & RESET LOGIK
// ==========================================

async function handleForgotPassword() {
  const email = document.getElementById("auth-email").value.trim();

  if (!email) {
    if (typeof showToast === "function") {
      return showToast(
        "Bitte gib deine E-Mail oben ein, um das Passwort zurückzusetzen.",
        "error"
      );
    }
    return alert(
      "Bitte gib deine E-Mail oben ein, um das Passwort zurückzusetzen."
    );
  }

  const { data, error } = await _supabase.auth.resetPasswordForEmail(email, {
    // Leitet den Nutzer nach Klick auf den E-Mail-Link wieder auf die aktuelle URL der App zurück
    redirectTo: window.location.origin + window.location.pathname,
  });

  if (error) {
    if (typeof showToast === "function")
      showToast("Fehler: " + error.message, "error");
    else alert("Fehler: " + error.message);
  } else {
    if (typeof showToast === "function")
      showToast("Eine E-Mail zum Zurücksetzen wurde gesendet!", "success");
    else alert("Eine E-Mail zum Zurücksetzen wurde gesendet!");
  }
}

// Globaler Listener, der lauscht, ob jemand über einen "Passwort Reset Link" in die App kommt
_supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    // Der User hat auf den Link in der Mail geklickt und ist jetzt temporär authentifiziert
    const newPassword = prompt(
      "Bitte gib dein neues Passwort ein (min. 6 Zeichen):"
    );

    if (!newPassword || newPassword.length < 6) {
      alert(
        "Passwort war zu kurz oder Eingabe wurde abgebrochen. Bitte fordere den Link erneut an."
      );
      return;
    }

    // Neues Passwort in der Datenbank speichern
    const { data, error } = await _supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      alert("Fehler beim Speichern des neuen Passworts: " + error.message);
    } else {
      alert("Dein Passwort wurde erfolgreich aktualisiert!");
      // Danach ist der User normal eingeloggt
      currentUser = data.user;
      isGuest = false;
      if (typeof initPresence === "function") initPresence();
      if (typeof showMainApp === "function") showMainApp();
    }
  }
});

function requestAccountDeletion() {
  showConfirmModal(
    "Möchtest du deinen Account wirklich dauerhaft löschen? Dies kann nicht rückgängig gemacht werden!",
    async () => {
      if (!currentUser) return;

      // Button UI aktualisieren, damit der User merkt, dass etwas passiert
      const btn = document.querySelector(
        '.reset[onclick="requestAccountDeletion()"]'
      );
      if (btn) {
        btn.innerText = "Lösche Account...";
        btn.disabled = true;
      }

      try {
        // Die Edge Function aufrufen
        const { data, error } = await _supabase.functions.invoke(
          "delete-user",
          {
            method: "POST",
          }
        );

        if (error) {
          throw new Error(error.message);
        }

        showToast("Dein Account wurde erfolgreich gelöscht.", "success");

        // Modal schließen und ausloggen (Cookie & Session löschen)
        document.getElementById("settings-modal").style.display = "none";

        setTimeout(() => {
          handleLogout();
        }, 1500);
      } catch (err) {
        showToast("Fehler beim Löschen: " + err.message, "error");
        if (btn) {
          btn.innerText = "Account unwiderruflich löschen";
          btn.disabled = false;
        }
      }
    }
  );
}
