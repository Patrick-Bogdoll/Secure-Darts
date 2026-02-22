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
    loadMatchHistory();
  }
}
