(() => {
  "use strict";

  const BUILD = "20260914-frenzy5";
  const SAVE_KEY = "nightIdle.save.v1";
  const FRENZY_SKILL_ID = "frenzy_mastery";
  const TIER_SKILL_ID = "frenzy_tier_power";
  const ACTIVE_CPS = 3;
  const BASE_MAX_MULTIPLIER = 10;
  const BASE_BAR_MULTIPLIER_STEP = 0.5;
  const BAR_FILL_SLOWDOWN = 10 / 3;
  const CPS_WINDOW_MS = 1000;
  const SOFT_DECAY_DELAY_MS = 460;
  const HARD_DECAY_DELAY_MS = 900;
  const SOFT_DECAY_BARS_PER_SECOND = 0.02;
  const HARD_DECAY_BARS_PER_SECOND = 0.05;
  const MAX_TEMPO_MULTIPLIER = 1.32;

  const config = window.NightIdleConfig;
  const frenzySkill = config?.prestigeShop?.find((upgrade) => upgrade.id === FRENZY_SKILL_ID) || null;
  const tierSkill = config?.prestigeShop?.find((upgrade) => upgrade.id === TIER_SKILL_ID) || null;
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
  let frenzyPrestigeLevel = 0;
  let tierPowerLevel = 0;

  function clampSkillLevel(skill, value) {
    const maxLevel = Math.max(0, Number(skill?.maxLevel) || 0);
    return Math.max(0, Math.min(maxLevel, Math.floor(Number(value) || 0)));
  }

  function readPrestigeLevels() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const save = raw ? JSON.parse(raw) : null;
      return {
        frenzy: clampSkillLevel(frenzySkill, save?.prestigeUpgrades?.[FRENZY_SKILL_ID]),
        tier: clampSkillLevel(tierSkill, save?.prestigeUpgrades?.[TIER_SKILL_ID])
      };
    } catch {
      return { frenzy: 0, tier: 0 };
    }
  }

  function maxMultiplier() {
    const base = Number(frenzySkill?.baseMaxMultiplier) || BASE_MAX_MULTIPLIER;
    const perLevel = Number(frenzySkill?.maxMultiplierPerLevel) || 0;
    return base + frenzyPrestigeLevel * perLevel;
  }

  function barMultiplierStep() {
    const base = Number(tierSkill?.baseStep) || BASE_BAR_MULTIPLIER_STEP;
    const perLevel = Number(tierSkill?.stepPerLevel) || 0;
    const maxBonus = Math.max(0, Number(tierSkill?.maxBonusStep) || 0);
    const bonus = Math.min(maxBonus, tierPowerLevel * perLevel);
    return Math.round((base + bonus) * 10) / 10;
  }

  function maxBars() {
    const step = Math.max(0.1, barMultiplierStep());
    return Math.max(0, Math.ceil((maxMultiplier() - 1) / step - 1e-9));
  }

  function chargeSpeedMultiplier() {
    const perLevel = Number(frenzySkill?.chargeSpeedPerLevel) || 0;
    return 1 + frenzyPrestigeLevel * perLevel;
  }

  function clampBarProgress(value) {
    return Math.max(0, Math.min(maxBars(), Number(value) || 0));
  }

  ({ frenzy: frenzyPrestigeLevel, tier: tierPowerLevel } = readPrestigeLevels());

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

  if (rollCard) rollCard.insertBefore(meter, hiddenRollButton || null);

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
      1 + completedBars() * barMultiplierStep()
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

  function formatStep(value) {
    return Number(value).toLocaleString("fr-CH", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  function render(force = false) {
    const now = performance.now();
    if (!force && now - lastUiAt < 65) return;
    lastUiAt = now;

    const multiplier = currentMultiplier();
    const cap = maxMultiplier();
    const bars = maxBars();
    const done = completedBars();
    const step = barMultiplierStep();
    const maxed = done >= bars && bars > 0;
    const active = cps >= ACTIVE_CPS || barProgress > 0.001;
    const hot = multiplier >= 1 + (cap - 1) * 0.45;
    const shownBar = maxed ? bars : Math.min(bars, done + 1);

    meter.classList.toggle("is-active", active);
    meter.classList.toggle("is-hot", hot);
    meter.classList.toggle("is-maxed", maxed);
    meter.title = `Frénésie : +${formatStep(step)}× par barre · ${bars} barres jusqu'à ×${cap} · remplissage ×${chargeSpeedMultiplier().toFixed(2)}`;

    if (fill) fill.style.transform = `scaleX(${currentBarCharge()})`;
    if (multiplierNode) {
      multiplierNode.textContent = `×${Number.isInteger(multiplier) ? multiplier.toFixed(0) : multiplier.toFixed(1)}`;
    }
    if (cpsNode) {
      cpsNode.textContent = maxed
        ? `MAX · ${cps} CPS`
        : `Barre ${shownBar}/${bars} · +${formatStep(step)}× · ${cps} CPS`;
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

  function applyPrestigeLevels(frenzyLevel, tierLevel) {
    const nextFrenzy = clampSkillLevel(frenzySkill, frenzyLevel);
    const nextTier = clampSkillLevel(tierSkill, tierLevel);
    if (nextFrenzy === frenzyPrestigeLevel && nextTier === tierPowerLevel) return;
    frenzyPrestigeLevel = nextFrenzy;
    tierPowerLevel = nextTier;
    barProgress = clampBarProgress(barProgress);
    render(true);
  }

  if (storageProto && inheritedSetItem) {
    try {
      storageProto.setItem = function nightIdleFrenzySetItem(key, value) {
        let nextLevels = null;

        if (this === localStorage && key === SAVE_KEY) {
          try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === "object") {
              nextLevels = {
                frenzy: clampSkillLevel(frenzySkill, parsed?.prestigeUpgrades?.[FRENZY_SKILL_ID]),
                tier: clampSkillLevel(tierSkill, parsed?.prestigeUpgrades?.[TIER_SKILL_ID])
              };
            }
          } catch {
            // La chaîne de sauvegarde existante garde son comportement normal.
          }
        }

        const result = inheritedSetItem.call(this, key, value);
        if (nextLevels) applyPrestigeLevels(nextLevels.frenzy, nextLevels.tier);
        return result;
      };
    } catch (error) {
      console.warn("[Night Idle] Mise à jour dynamique de la Frénésie indisponible.", error);
    }
  }

  function frenzyEffectText(level) {
    const clamped = clampSkillLevel(frenzySkill, level);
    const base = Number(frenzySkill?.baseMaxMultiplier) || BASE_MAX_MULTIPLIER;
    const perMax = Number(frenzySkill?.maxMultiplierPerLevel) || 0;
    const perSpeed = Number(frenzySkill?.chargeSpeedPerLevel) || 0;
    const cap = base + clamped * perMax;
    const speedPercent = clamped * perSpeed * 100;
    return `Remplissage +${Math.round(speedPercent)} % · Max ×${cap}`;
  }

  function tierEffectText(level) {
    const clamped = clampSkillLevel(tierSkill, level);
    const base = Number(tierSkill?.baseStep) || BASE_BAR_MULTIPLIER_STEP;
    const perLevel = Number(tierSkill?.stepPerLevel) || 0;
    const maxBonus = Math.max(0, Number(tierSkill?.maxBonusStep) || 0);
    const step = base + Math.min(maxBonus, clamped * perLevel);
    return `Gain par barre : +${formatStep(step)}×`;
  }

  function patchCard(card, skill, effectText) {
    if (!skill) return false;
    const title = card.querySelector(".upgrade-title-row strong")?.textContent?.trim();
    if (title !== skill.name) return false;

    const levelText = card.querySelector(".upgrade-title-row span")?.textContent || "";
    const level = clampSkillLevel(skill, levelText.match(/Niv\.\s*(\d+)/)?.[1]);
    const maxed = level >= skill.maxLevel;
    const effect = card.querySelector(".upgrade-effect");
    if (!effect) return true;

    const nextLevel = Math.min(skill.maxLevel, level + 1);
    const html = `${effectText(level)}${maxed ? "" : ` → <strong>${effectText(nextLevel)}</strong>`}`;
    if (effect.innerHTML !== html) effect.innerHTML = html;
    return true;
  }

  function patchPrestigeCards() {
    const list = document.getElementById("prestigeShopList");
    if (!list) return;

    for (const card of list.querySelectorAll(".prestige-shop-card")) {
      patchCard(card, frenzySkill, frenzyEffectText);
      patchCard(card, tierSkill, tierEffectText);
    }
  }

  function installShopObserver() {
    const list = document.getElementById("prestigeShopList");
    if (!list || typeof MutationObserver === "undefined") return;

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        observer.disconnect();
        patchPrestigeCards();
        observer.observe(list, { childList: true, subtree: true });
      });
    });

    observer.observe(list, { childList: true, subtree: true });
    queueMicrotask(() => {
      observer.disconnect();
      patchPrestigeCards();
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
    version: 5,
    multiplier: () => currentMultiplier(),
    maxMultiplier: () => maxMultiplier(),
    barMultiplierStep: () => barMultiplierStep(),
    maxBars: () => maxBars(),
    completedBars: () => completedBars(),
    currentBarCharge: () => currentBarCharge(),
    prestigeLevel: () => frenzyPrestigeLevel,
    tierPowerLevel: () => tierPowerLevel,
    chargeSpeedMultiplier: () => chargeSpeedMultiplier(),
    cps: () => cps,
    charge: () => currentBarCharge(),
    barProgress: () => barProgress,
    tempoMultiplier: () => tempoMultiplier,
    recordManualClick,
    reset: resetFrenzy
  });
})();
