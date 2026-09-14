(() => {
  "use strict";

  const rollButton = document.getElementById("rollButton");
  const diceTray = document.getElementById("diceTray");

  function triggerRoll(event) {
    if (!rollButton || !diceTray) return;
    if (event?.target?.closest?.(".locked-die")) return;
    rollButton.click();
  }

  if (diceTray && rollButton) {
    diceTray.tabIndex = 0;
    diceTray.setAttribute("role", "button");
    diceTray.setAttribute("aria-label", "Lancer les dés");
    diceTray.addEventListener("click", triggerRoll);
    diceTray.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target?.closest?.(".locked-die")) return;
      event.preventDefault();
      triggerRoll(event);
    });
  }

  const root = document.documentElement;
  const topbar = document.querySelector(".topbar");
  const requestFullscreen = root?.requestFullscreen || root?.webkitRequestFullscreen;
  const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
  let fullscreenButton = document.getElementById("fullscreenButton");

  function currentFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function renderFullscreenButton() {
    if (!fullscreenButton) return;
    const active = Boolean(currentFullscreenElement());
    fullscreenButton.classList.toggle("is-active", active);
    fullscreenButton.textContent = active ? "↙" : "⛶";
    fullscreenButton.setAttribute("aria-label", active ? "Quitter le plein écran" : "Passer en plein écran");
    fullscreenButton.title = active ? "Quitter le plein écran" : "Plein écran";
  }

  async function toggleFullscreen() {
    try {
      if (currentFullscreenElement()) {
        if (typeof exitFullscreen === "function") await exitFullscreen.call(document);
      } else if (typeof requestFullscreen === "function") {
        await requestFullscreen.call(root);
      }
    } catch (error) {
      console.warn("[Night Idle] Plein écran indisponible", error);
    }
    renderFullscreenButton();
  }

  if (topbar && typeof requestFullscreen === "function") {
    if (!fullscreenButton) {
      fullscreenButton = document.createElement("button");
      fullscreenButton.id = "fullscreenButton";
      fullscreenButton.className = "fullscreen-button";
      fullscreenButton.type = "button";
      topbar.prepend(fullscreenButton);
    }

    fullscreenButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFullscreen();
    });
    renderFullscreenButton();

    document.addEventListener("fullscreenchange", renderFullscreenButton);
    document.addEventListener("webkitfullscreenchange", renderFullscreenButton);
  } else if (fullscreenButton) {
    fullscreenButton.hidden = true;
  }

  function alphabeticSuffix(index) {
    let value = Math.max(0, Math.floor(index));
    let result = "";

    do {
      result = String.fromCharCode(65 + (value % 26)) + result;
      value = Math.floor(value / 26) - 1;
    } while (value >= 0);

    return result;
  }

  function suffixForGroup(group) {
    if (group === 2) return "M";
    if (group === 3) return "B";
    if (group === 4) return "T";
    if (group === 5) return "Q";
    if (group === 6) return "QQ";
    if (group >= 7) return alphabeticSuffix(group - 7);
    return "";
  }

  function parseDisplayedNumber(text) {
    if (typeof text !== "string") return NaN;
    const cleaned = text
      .replace(/[’'\u00a0\u202f\s]/g, "")
      .replace(",", ".")
      .replace(/[^0-9.\-]/g, "");
    const value = Number(cleaned);
    return Number.isFinite(value) ? value : NaN;
  }

  function compactNumber(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;

    const absolute = Math.abs(numeric);
    if (absolute < 1e6) return null;

    const group = Math.floor(Math.log10(absolute) / 3);
    const divisor = Math.pow(10, group * 3);
    const suffix = suffixForGroup(group);
    const scaled = numeric / divisor;
    const digits = Math.abs(scaled) < 10 ? 2 : Math.abs(scaled) < 100 ? 1 : 0;
    const formatted = new Intl.NumberFormat("fr-CH", {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0
    }).format(scaled);

    return `${formatted}${suffix}`;
  }

  const compactTargets = [
    document.getElementById("pointsValue"),
    document.getElementById("gemsValue"),
    document.getElementById("totalRollsValue"),
    document.getElementById("runPointsValue"),
    document.getElementById("bestGainValue")
  ].filter(Boolean);

  function compactNode(node) {
    if (!node) return;
    const value = parseDisplayedNumber(node.textContent || "");
    if (!Number.isFinite(value)) return;
    const compact = compactNumber(value);
    if (!compact || node.textContent === compact) return;
    node.title = new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 2 }).format(value);
    node.textContent = compact;
  }

  compactTargets.forEach((node) => {
    const observer = new MutationObserver(() => compactNode(node));
    observer.observe(node, { childList: true, characterData: true, subtree: true });
    compactNode(node);
  });

  function verifyHudIntegrity() {
    const required = [
      "pointsValue",
      "gemsValue",
      "upgradesButton",
      "combosButton",
      "diceCountValue",
      "diceTray",
      "sumValue",
      "comboValue",
      "multiplierValue",
      "gainValue",
      "totalRollsValue",
      "runPointsValue",
      "bestGainValue",
      "prestigeButton"
    ];

    const missing = required.filter((id) => !document.getElementById(id));
    if (missing.length > 0) {
      console.error("[Night Idle] HUD incomplet :", missing.join(", "));
      return false;
    }
    return true;
  }

  verifyHudIntegrity();

  window.NightIdleMainUI = Object.freeze({
    compactNumber,
    alphabeticSuffix,
    verifyHudIntegrity
  });
})();
