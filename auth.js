async function handleGoogleLogin() {
  const { data, error } = await _supabase.auth.signInWithOAuth({
    provider: "google",
  });

  if (error) {
    alert("Google Login fehlgeschlagen: " + error.message);
    console.error(error);
  }
  // Supabase leitet den Browser jetzt automatisch zu Google weiter.
  // Nach erfolgreichem Login springt er zurück, initAuth() erkennt den User und startet das Spiel!
}

async function handleRegister() {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value.trim();
  if (!email || !password) return alert("Bitte E-Mail und Passwort eingeben.");

  const { data, error } = await _supabase.auth.signUp({
    email,
    password,
  });
  if (error) return alert("Registrierung fehlgeschlagen: " + error.message);

  alert("Erfolgreich registriert und eingeloggt!");
  currentUser = data.user;
  isGuest = false;
  showMainApp();
}

function continueAsGuest() {
  isGuest = true;
  currentUser = null;
  showMainApp();
}

async function handleLogout() {
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
  if (!email || !password) return alert("Bitte E-Mail und Passwort eingeben.");

  const { data, error } = await _supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return alert("Login fehlgeschlagen: " + error.message);

  currentUser = data.user;
  isGuest = false;
  showMainApp();
}

async function changeUsername() {
  if (isGuest || !currentUser)
    return alert("Als Gast kannst du keinen Namen speichern.");

  let currentName = currentUser.email.split("@")[0];
  if (currentUser.user_metadata && currentUser.user_metadata.display_name) {
    currentName = currentUser.user_metadata.display_name;
  } else if (currentUser.user_metadata && currentUser.user_metadata.full_name) {
    currentName = currentUser.user_metadata.full_name;
  }

  let newName = prompt("Wie lautet dein gewünschter Darts-Name?", currentName);

  if (newName && newName.trim() !== "" && newName !== currentName) {
    // Speichert den Namen im Hintergrund in deinem Account
    const { data, error } = await _supabase.auth.updateUser({
      data: { display_name: newName.trim() },
    });

    if (error) {
      alert("Fehler beim Speichern: " + error.message);
    } else {
      currentUser = data.user;
      alert("Name erfolgreich geändert auf: " + newName.trim());
      showMainApp(); // Refresht die Inputs sofort!
    }
  }
}
