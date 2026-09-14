(() => {
  "use strict";

  const BUILD = "20260914-frenzy4";
  const SAVE_KEY = "nightIdle.save.v1";
  const PRESTIGE_SKILL_ID = "frenzy_mastery";
  const ACTIVE_CPS = 3;
  const BASE_MAX_MULTIPLIER = 10;
  const BAR_MULTIPLIER_STEP = 0.5;
  const BAR_FILL_SLOWDOWN = 10 / 3;
  const CPS_WINDOW_MS = 1000;
  const SOFT_DECAY_DELAY_MS = 460;
  const HARD_DECAY_DELAY_MS = 900;
  const SOFT_DECAY_BARS_PER_SECOND = 0.02;
  const HARD_DECAY_BARS_PER_SECOND = 0.05;
  const MAX_TEMPO_MULTIPLIER = 1.32;

  const config = window.NightIdleConfig;
  const prestigeSkill = config?.prestigeShop?.find((upgrade) => upgrade.id === PRESTIGE_SKILL_ID) || null;
  const storageProto = window.Storage?.prototype;
  const inheritedSetItem = storageProto?.setItem;

  const appShell = document.querySelector(".app-shell");
  const rollCard = document.querySelector(".roll-card");
  const hiddenRollButton = document.getElementById("rollButton");
  const diceTray = document.getElementById("diceTray");

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = `frenzy.css?v=${BUILD}`;
  document.head.appendChild(stylesheet);

  let clickTimes = [];
  let barProgress = 0;
  let cps = 0;
  let tempoMultiplier = 1;
  let lastManualClickAt = 0;
  let lastFrameAt = performance.now();
  let lastUiAt = 0;
  let prestigeLevel = 0;

  function clampPrestigeLevel(value) {
    const maxLevel = Math.max(0, Number(prestigeSkill?.maxLevel) || 0);
    return Math.max(0, Math.min(maxLevel, Math.floor(Number(value) || 0)));
  }

  function readPrestigeLevel() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const save = raw ? JSON.parse(raw) : null;
      return clampPrestigeLevel(save?.prestigeUpgrades?.[PRESTIGE_SKILL_ID]);
    } catch {
      return 0;
    }
  }

  function maxMultiplier() {
    const base = Number(prestigeSkill?.baseMaxMultiplier) || BASE_MAX_MULTIPLIER;
    const perLevel = Number(prestigeSkill?.maxMultiplierPerLevel) || 0;
    return base + prestigeLevel * perLevel;
  }

  function maxBars() {
    return Math.max(0, Math.round((maxMultiplier() - 1) / BAR_MULTIPLIER_STEP));
  }

  function chargeSpeedMultiplier() {
    const perLevel = Number(prestigeSkill?.chargeSpeedPerLevel) || 0;
    return 1 + prestigeLevel * perLevel;
  }

  function clampBarProgress(value) {
    return Math.max(0, Math.min(maxBars(), Number(value) || 0));
  }

  prestigeLevel = readPrestigeLevel();

  const meter = document.createElement("div");
  meter.id = "frenzyMeter";
  meter.className = "frenzy-meter";
  meter.setAttribute("aria-live", "polite");
  meter.innerHTML = `
    <div class="frenzy-meta">
      <span class="frenzy-label">FRÉNÉSIE</span>
      <strong id="frenzyMultiplierValue">×1</strong>
      <span id="frenzyCpsValue" class="frenzy-cps">Barre 1 · 0 CPS</span>
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

  function completedBars() {
    return Math.min(maxBars(), Math.floor(barProgress + 1e-9));
  }

  function currentBarCharge() {
    if (barProgress >= maxBars()) return 1;
    return clamp01(barProgress - Math.floor(barProgress));
  }

  function currentMultiplier() {
    return Math.min(
      maxMultiplier(),
      1 + completedBars() * BAR_MULTIPLIER_STEP
    );
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

  function barGainForCps(value) {
    if (value < ACTIVE_CPS || barProgress >= maxBars()) return 0;

    // Même logique qu'avant, mais la vitesse de base est désormais ×3 par rapport à frenzy3.
    const oldGain = Math.min(0.064, 0.018 + (value - ACTIVE_CPS) * 0.009);
    return (oldGain / BAR_FILL_SLOWDOWN) * chargeSpeedMultiplier();
  }

  function recordManualClick(now = performance.now()) {
    clickTimes.push(now);
    lastManualClickAt = now;
    trimClicks(now);

    const gain = barGainForCps(cps);
    if (gain > 0) barProgress = clampBarProgress(barProgress + gain);

    updateTempo(true);
    render(true);
  }

  function resetFrenzy() {
    clickTimes = [];
    barProgress = 0;
    cps = 0;
    lastManualClickAt = 0;
    tempoMultiplier = 1;
    window.NightIdleMusic?.setTempoMultiplier?.(1);
    render(true);
  }

  function desiredTempoMultiplier() {
    const cpsBoost = Math.max(0, Math.min(0.24, (cps - 1) * 0.034));
    const progressionRatio = maxBars() > 0 ? barProgress / maxBars() : 0;
    const frenzyBoost = clamp01(progressionRatio) * 0.08;
    return Math.max(1, Math.min(MAX_TEMPO_MULTIPLIER, 1 + cpsBoost + frenzyBoost));
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
    const cap = maxMultiplier();
    const bars = maxBars();
    const done = completedBars();
    const maxed = done >= bars && bars > 0;
    const active = cps >= ACTIVE_CPS || barProgress > 0.001;
    const hot = multiplier >= 1 + (cap - 1) * 0.45;
    const shownBar = maxed ? bars : Math.min(bars, done + 1);

    meter.classList.toggle("is-active", active);
    meter.classList.toggle("is-hot", hot);
    meter.classList.toggle("is-maxed", maxed);
    meter.title = `Frénésie : +0,5× par barre · ${bars} barres jusqu'à ×${cap} · remplissage Prestige ×${chargeSpeedMultiplier().toFixed(2)}`;

    if (fill) fill.style.transform = `scaleX(${currentBarCharge()})`;
    if (multiplierNode) {
      multiplierNode.textContent = `×${Number.isInteger(multiplier) ? multiplier.toFixed(0) : multiplier.toFixed(1)}`;
    }
    if (cpsNode) {
      cpsNode.textContent = maxed
        ? `MAX · ${cps} CPS`
        : `Barre ${shownBar}/${bars} · ${cps} CPS`;
    }
  }

  function tick(now) {
    const dt = Math.min(0.1, Math.max(0, (now - lastFrameAt) / 1000));
    lastFrameAt = now;
    trimClicks(now);

    const idleMs = lastManualClickAt > 0 ? now - lastManualClickAt : Infinity;
    if (barProgress > 0) {
      let decay = 0;
      if (cps < ACTIVE_CPS || idleMs > SOFT_DECAY_DELAY_MS) decay = SOFT_DECAY_BARS_PER_SECOND;
      if (idleMs > HARD_DECAY_DELAY_MS) decay = HARD_DECAY_BARS_PER_SECOND;
      if (decay > 0) barProgress = clampBarProgress(barProgress - decay * dt);
    }

    updateTempo(false);
    render(false);
    requestAnimationFrame(tick);
  }

  function applyPrestigeLevel(level) {
    const next = clampPrestigeLevel(level);
    if (next === prestigeLevel) return;
    prestigeLevel = next;
    barProgress = clampBarProgress(barProgress);
    render(true);
  }

  if (storageProto && inheritedSetItem) {
    try {
      storageProto.setItem = function nightIdleFrenzySetItem(key, value) {
        let nextLevel = null;

        if (this === localStorage && key === SAVE_KEY) {
          try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === "object") {
              nextLevel = clampPrestigeLevel(parsed?.prestigeUpgrades?.[PRESTIGE_SKILL_ID]);
            }
          } catch {
          }
        }

        const result = inheritedSetItem.call(this, key, value);
        if (nextLevel !== null) applyPrestigeLevel(nextLevel);
        return result;
      };
    } catch (error) {
      console.warn("[Night Idle] Mise à jour dynamique de la Frénésie indisponible.", error);
    }
  }

  function prestigeEffectText(level) {
    const clamped = clampPrestigeLevel(level);
    const base = Number(prestigeSkill?.baseMaxMultiplier) || BASE_MAX_MULTIPLIER;
    const perMax = Number(prestigeSkill?.maxMultiplierPerLevel) || 0;
    const perSpeed = Number(prestigeSkill?.chargeSpeedPerLevel) || 0;
    const cap = base + clamped * perMax;
    const speedPercent = clamped * perSpeed * 100;
    const bars = Math.round((cap - 1) / BAR_MULTIPLIER_STEP);
    return `+0,5× / barre · ${bars} barres · Remplissage +${Math.round(speedPercent)} % · Max ×${cap}`;
  }

  function patchPrestigeCard() {
    if (!prestigeSkill) return;
    const list = document.getElementById("prestigeShopList");
    if (!list) return;

    for (const card of list.querySelectorAll(".prestige-shop-card")) {
      const title = card.querySelector(".upgrade-title-row strong")?.textContent?.trim();
      if (title !== prestigeSkill.name) continue;

      const levelText = card.querySelector(".upgrade-title-row span")?.textContent || "";
      const level = clampPrestigeLevel(levelText.match(/Niv\.\s*(\d+)/)?.[1]);
      const maxed = level >= prestigeSkill.maxLevel;
      const effect = card.querySelector(".upgrade-effect");
      if (!effect) return;

      const nextLevel = Math.min(prestigeSkill.maxLevel, level + 1);
      const html = `${prestigeEffectText(level)}${maxed ? "" : ` → <strong>${prestigeEffectText(nextLevel)}</strong>`}`;
      if (effect.innerHTML !== html) effect.innerHTML = html;
      return;
    }
  }

  function installShopObserver() {
    if (!prestigeSkill) return;
    const list = document.getElementById("prestigeShopList");
    if (!list || typeof MutationObserver === "undefined") return;

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        observer.disconnect();
        patchPrestigeCard();
        observer.observe(list, { childList: true, subtree: true });
      });
    });

    observer.observe(list, { childList: true, subtree: true });
    queueMicrotask(() => {
      observer.disconnect();
      patchPrestigeCard();
      observer.observe(list, { childList: true, subtree: true });
    });
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

  installShopObserver();
  render(true);
  requestAnimationFrame(tick);

  window.NightIdleFrenzy = Object.freeze({
    version: 4,
    multiplier: () => currentMultiplier(),
    maxMultiplier: () => maxMultiplier(),
    maxBars: () => maxBars(),
    completedBars: () => completedBars(),
    currentBarCharge: () => currentBarCharge(),
    prestigeLevel: () => prestigeLevel,
    chargeSpeedMultiplier: () => chargeSpeedMultiplier(),
    cps: () => cps,
    charge: () => currentBarCharge(),
    barProgress: () => barProgress,
    tempoMultiplier: () => tempoMultiplier,
    recordManualClick,
    reset: resetFrenzy
  });
})();