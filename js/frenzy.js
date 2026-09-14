(() => {
  "use strict";

  const BUILD = "20260914-frenzy1";
  const ACTIVE_CPS = 3;
  const MAX_MULTIPLIER = 10;
  const CPS_WINDOW_MS = 1000;
  const SOFT_DECAY_DELAY_MS = 460;
  const HARD_DECAY_DELAY_MS = 900;
  const MAX_TEMPO_MULTIPLIER = 1.32;

  const appShell = document.querySelector(".app-shell");
  const rollCard = document.querySelector(".roll-card");
  const hiddenRollButton = document.getElementById("rollButton");
  const diceTray = document.getElementById("diceTray");

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = `frenzy.css?v=${BUILD}`;
  document.head.appendChild(stylesheet);

  let clickTimes = [];
  let charge = 0;
  let cps = 0;
  let tempoMultiplier = 1;
  let lastManualClickAt = 0;
  let lastFrameAt = performance.now();
  let lastUiAt = 0;

  const meter = document.createElement("div");
  meter.id = "frenzyMeter";
  meter.className = "frenzy-meter";
  meter.setAttribute("aria-live", "polite");
  meter.innerHTML = `
    <div class="frenzy-meta">
      <span class="frenzy-label">FRÉNÉSIE</span>
      <strong id="frenzyMultiplierValue">×1</strong>
      <span id="frenzyCpsValue" class="frenzy-cps">0 CPS</span>
    </div>
    <div class="frenzy-track" aria-hidden="true">
      <div id="frenzyFill" class="frenzy-fill"></div>
    </div>
  `;

  if (rollCard) {
    rollCard.insertBefore(meter, hiddenRollButton || null);
  }

  const fill = document.getElementById("frenzyFill");
  const multiplierNode = document.getElementById("frenzyMultiplierValue");
  const cpsNode = document.getElementById("frenzyCpsValue");

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function currentMultiplier() {
    if (charge <= 0.001) return 1;
    return 1 + (MAX_MULTIPLIER - 1) * Math.pow(clamp01(charge), 1.08);
  }

  function trimClicks(now) {
    const cutoff = now - CPS_WINDOW_MS;
    while (clickTimes.length && clickTimes[0] < cutoff) clickTimes.shift();
    cps = clickTimes.length;
  }

  function isManualRollTarget(target) {
    if (!(target instanceof Element)) return false;
    if (target.closest(".topbar")) return false;
    if (target.closest(".footer-actions")) return false;
    if (target.closest("dialog")) return false;
    if (target.closest("button, a, input, select, textarea, label")) return false;
    if (target.closest(".locked-die")) return false;
    return true;
  }

  function chargeGainForCps(value) {
    if (value < ACTIVE_CPS) return 0;
    return Math.min(0.064, 0.018 + (value - ACTIVE_CPS) * 0.009);
  }

  function recordManualClick(now = performance.now()) {
    clickTimes.push(now);
    lastManualClickAt = now;
    trimClicks(now);

    const gain = chargeGainForCps(cps);
    if (gain > 0) charge = clamp01(charge + gain);

    updateTempo(true);
    render(true);
  }

  function resetFrenzy() {
    clickTimes = [];
    charge = 0;
    cps = 0;
    lastManualClickAt = 0;
    tempoMultiplier = 1;
    window.NightIdleMusic?.setTempoMultiplier?.(1);
    render(true);
  }

  function desiredTempoMultiplier() {
    const cpsBoost = Math.max(0, Math.min(0.24, (cps - 1) * 0.034));
    const chargeBoost = charge * 0.08;
    return Math.max(1, Math.min(MAX_TEMPO_MULTIPLIER, 1 + cpsBoost + chargeBoost));
  }

  function updateTempo(immediate = false) {
    const target = desiredTempoMultiplier();
    const smoothing = immediate ? 0.48 : 0.18;
    tempoMultiplier += (target - tempoMultiplier) * smoothing;
    if (Math.abs(target - tempoMultiplier) < 0.002) tempoMultiplier = target;
    window.NightIdleMusic?.setTempoMultiplier?.(tempoMultiplier);
  }

  function render(force = false) {
    const now = performance.now();
    if (!force && now - lastUiAt < 65) return;
    lastUiAt = now;

    const multiplier = currentMultiplier();
    const active = cps >= ACTIVE_CPS || charge > 0.025;
    const hot = multiplier >= 5;
    const maxed = multiplier >= 9.95;

    meter.classList.toggle("is-active", active);
    meter.classList.toggle("is-hot", hot);
    meter.classList.toggle("is-maxed", maxed);

    if (fill) fill.style.transform = `scaleX(${clamp01(charge)})`;
    if (multiplierNode) {
      multiplierNode.textContent = multiplier <= 1.005 ? "×1" : `×${multiplier.toFixed(multiplier >= 9.95 ? 0 : 2)}`;
    }
    if (cpsNode) cpsNode.textContent = `${cps} CPS`;
  }

  function tick(now) {
    const dt = Math.min(0.1, Math.max(0, (now - lastFrameAt) / 1000));
    lastFrameAt = now;
    trimClicks(now);

    const idleMs = lastManualClickAt > 0 ? now - lastManualClickAt : Infinity;
    if (charge > 0) {
      let decay = 0;
      if (cps < ACTIVE_CPS || idleMs > SOFT_DECAY_DELAY_MS) decay = 0.15;
      if (idleMs > HARD_DECAY_DELAY_MS) decay = 0.30;
      if (decay > 0) charge = clamp01(charge - decay * dt);
    }

    updateTempo(false);
    render(false);
    requestAnimationFrame(tick);
  }

  appShell?.addEventListener("click", (event) => {
    if (!isManualRollTarget(event.target)) return;
    recordManualClick(performance.now());
  }, { capture: true });

  document.addEventListener("keydown", (event) => {
    if ((event.key !== "Enter" && event.key !== " ") || document.activeElement !== diceTray) return;
    recordManualClick(performance.now());
  }, { capture: true });

  document.getElementById("confirmPrestigeButton")?.addEventListener("click", resetFrenzy, { capture: true });
  document.getElementById("resetButton")?.addEventListener("click", () => {
    window.setTimeout(resetFrenzy, 0);
  }, { capture: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) resetFrenzy();
  });

  render(true);
  requestAnimationFrame(tick);

  window.NightIdleFrenzy = Object.freeze({
    version: 1,
    multiplier: () => currentMultiplier(),
    cps: () => cps,
    charge: () => charge,
    tempoMultiplier: () => tempoMultiplier,
    recordManualClick,
    reset: resetFrenzy
  });
})();