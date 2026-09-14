(() => {
  "use strict";

  const BUILD = "20260914-events2";
  const SAVE_KEY = "nightIdle.save.v1";
  const UNLOCK_SKILL_ID = "anomaly_unlock";
  const BASE_PROC_CHANCE = 0.005;
  const AUTO_CHANCE_FACTOR = 0.5;
  const PITY_START_ROLLS = 150;
  const PITY_NEAR_GUARANTEE_ROLLS = 425;
  const PITY_MAX_CHANCE = 0.95;
  const PROC_COOLDOWN_ROLLS = 6;
  const MAX_ACTIVE_SLOTS = 2;

  const DEFINITIONS = Object.freeze([
    Object.freeze({
      id: "golden_die",
      name: "Dé Doré",
      rarity: "common",
      weight: 38,
      slots: 1,
      durationType: "rolls",
      duration: 8,
      description: "Un dé compte ×3 pendant 8 lancers."
    }),
    Object.freeze({
      id: "frenzy_rush",
      name: "Rush Frénétique",
      rarity: "common",
      weight: 30,
      slots: 1,
      durationType: "time",
      durationMs: 12000,
      description: "La Frénésie se remplit ×3 pendant 12 secondes."
    }),
    Object.freeze({
      id: "combo_fever",
      name: "Combo Fever",
      rarity: "common",
      weight: 28,
      slots: 1,
      durationType: "rolls",
      duration: 10,
      description: "Tous les vrais combos valent ×2 pendant 10 lancers."
    }),
    Object.freeze({
      id: "jackpot",
      name: "Jackpot",
      rarity: "mythic",
      weight: 4,
      slots: 2,
      durationType: "rolls",
      duration: 1,
      description: "Le prochain lancer rapporte ×25."
    })
  ]);

  const rollCard = document.querySelector(".roll-card");
  const diceTray = document.getElementById("diceTray");

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = `events.css?v=${BUILD}`;
  document.head.appendChild(stylesheet);

  const layer = document.createElement("div");
  layer.id = "anomalyLayer";
  layer.className = "anomaly-layer";
  layer.innerHTML = `
    <div id="anomalyBanner" class="anomaly-banner" aria-live="polite" hidden>
      <span class="anomaly-kicker">ANOMALIE !</span>
      <strong id="anomalyBannerName"></strong>
      <span id="anomalyBannerDescription"></span>
    </div>
    <div id="anomalyActiveStrip" class="anomaly-active-strip" aria-live="polite"></div>
  `;
  rollCard?.appendChild(layer);

  const banner = document.getElementById("anomalyBanner");
  const bannerName = document.getElementById("anomalyBannerName");
  const bannerDescription = document.getElementById("anomalyBannerDescription");
  const activeStrip = document.getElementById("anomalyActiveStrip");

  let active = [];
  let rollsSinceProc = 0;
  let cooldownRolls = 0;
  let lastProcChance = 0;
  let bannerTimer = 0;

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function eventsUnlocked() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const save = raw ? JSON.parse(raw) : null;
      return Math.max(0, Math.floor(Number(save?.prestigeUpgrades?.[UNLOCK_SKILL_ID]) || 0)) >= 1;
    } catch {
      return false;
    }
  }

  function definition(id) {
    return DEFINITIONS.find((entry) => entry.id === id) || null;
  }

  function cleanupExpired(now = Date.now()) {
    const before = active.length;
    active = active.filter((entry) => {
      if (entry.durationType === "time") return Number(entry.expiresAt) > now;
      return Number(entry.remainingRolls) > 0;
    });
    if (active.length !== before) renderActive();
  }

  function activeEntry(id) {
    cleanupExpired();
    return active.find((entry) => entry.id === id) || null;
  }

  function activeSlots() {
    cleanupExpired();
    return active.reduce((total, entry) => total + (Number(entry.slots) || 1), 0);
  }

  function frenzyChanceFactor() {
    const multiplier = Math.max(1, Number(window.NightIdleFrenzy?.multiplier?.()) || 1);
    const points = [
      [1, 1],
      [5, 1.10],
      [10, 1.20],
      [20, 1.35],
      [30, 1.50]
    ];

    if (multiplier <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i += 1) {
      const [x1, y1] = points[i - 1];
      const [x2, y2] = points[i];
      if (multiplier <= x2) {
        const t = clamp01((multiplier - x1) / (x2 - x1));
        return y1 + (y2 - y1) * t;
      }
    }
    return 1.50;
  }

  function procChance(isManual) {
    if (!eventsUnlocked()) return 0;

    const modeFactor = isManual ? 1 : AUTO_CHANCE_FACTOR;
    const base = BASE_PROC_CHANCE * modeFactor * frenzyChanceFactor();

    if (rollsSinceProc <= PITY_START_ROLLS) return Math.min(PITY_MAX_CHANCE, base);

    const progress = clamp01(
      (rollsSinceProc - PITY_START_ROLLS) /
      (PITY_NEAR_GUARANTEE_ROLLS - PITY_START_ROLLS)
    );
    const pityCurve = Math.pow(progress, 1.65);
    return Math.min(
      PITY_MAX_CHANCE,
      base + (PITY_MAX_CHANCE - base) * pityCurve
    );
  }

  function candidates() {
    const used = activeSlots();
    const remainingSlots = MAX_ACTIVE_SLOTS - used;
    return DEFINITIONS.filter((entry) => {
      if (active.some((current) => current.id === entry.id)) return false;
      return entry.slots <= remainingSlots;
    });
  }

  function weightedChoice(entries) {
    const total = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
    if (total <= 0) return null;
    let roll = Math.random() * total;
    for (const entry of entries) {
      roll -= Math.max(0, Number(entry.weight) || 0);
      if (roll <= 0) return entry;
    }
    return entries[entries.length - 1] || null;
  }

  function announce(entry) {
    if (!banner) return;
    banner.hidden = false;
    banner.className = `anomaly-banner rarity-${entry.rarity}`;
    if (bannerName) bannerName.textContent = entry.name;
    if (bannerDescription) bannerDescription.textContent = entry.description;

    banner.classList.remove("is-showing");
    void banner.offsetWidth;
    banner.classList.add("is-showing");

    if (bannerTimer) window.clearTimeout(bannerTimer);
    bannerTimer = window.setTimeout(() => {
      banner.classList.remove("is-showing");
      window.setTimeout(() => {
        if (!banner.classList.contains("is-showing")) banner.hidden = true;
      }, 240);
    }, 2100);
  }

  function activate(entry, values) {
    const runtime = {
      ...entry,
      startedAt: Date.now()
    };

    if (entry.durationType === "time") {
      runtime.expiresAt = Date.now() + entry.durationMs;
    } else {
      runtime.remainingRolls = entry.duration;
    }

    if (entry.id === "golden_die") {
      const count = Math.max(1, Array.isArray(values) ? values.length : 1);
      runtime.dieIndex = Math.floor(Math.random() * count);
    }

    active.push(runtime);
    rollsSinceProc = 0;
    cooldownRolls = PROC_COOLDOWN_ROLLS;
    announce(entry);
    renderActive();
    syncDiceVisual();
  }

  function tryProc(isManual, values) {
    cleanupExpired();

    if (!eventsUnlocked()) {
      rollsSinceProc = 0;
      cooldownRolls = 0;
      lastProcChance = 0;
      return null;
    }

    rollsSinceProc += 1;

    if (cooldownRolls > 0) {
      cooldownRolls -= 1;
      lastProcChance = procChance(isManual);
      return null;
    }

    const available = candidates();
    if (!available.length) {
      lastProcChance = procChance(isManual);
      return null;
    }

    const chance = procChance(isManual);
    lastProcChance = chance;
    if (Math.random() >= chance) return null;

    const entry = weightedChoice(available);
    if (!entry) return null;
    activate(entry, values);
    return entry.id;
  }

  function consumeRollDurations() {
    active.forEach((entry) => {
      if (entry.durationType === "rolls") entry.remainingRolls -= 1;
    });
    cleanupExpired();
  }

  function effectiveSum(values, rawSum) {
    const golden = activeEntry("golden_die");
    if (!golden || !Array.isArray(values) || !values.length) return rawSum;
    const index = Math.max(0, Math.min(values.length - 1, Number(golden.dieIndex) || 0));
    return rawSum + (Number(values[index]) || 0) * 2;
  }

  function comboMultiplier() {
    return activeEntry("combo_fever") ? 2 : 1;
  }

  function gainMultiplier() {
    return activeEntry("jackpot") ? 25 : 1;
  }

  function frenzyChargeMultiplier() {
    return activeEntry("frenzy_rush") ? 3 : 1;
  }

  function onRollComplete(isManual, values) {
    consumeRollDurations();
    const proc = tryProc(Boolean(isManual), values);
    renderActive();
    syncDiceVisual();
    return proc;
  }

  function remainingLabel(entry) {
    if (entry.durationType === "time") {
      const seconds = Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
      return `${seconds}s`;
    }
    return `${Math.max(0, entry.remainingRolls)} lancer${entry.remainingRolls > 1 ? "s" : ""}`;
  }

  function renderActive() {
    if (!activeStrip) return;
    cleanupExpired(Date.now());
    activeStrip.replaceChildren();

    active.forEach((entry) => {
      const chip = document.createElement("div");
      chip.className = `anomaly-chip rarity-${entry.rarity}`;
      chip.innerHTML = `<strong>${entry.name}</strong><span>${remainingLabel(entry)}</span>`;
      activeStrip.appendChild(chip);
    });

    activeStrip.classList.toggle("has-events", active.length > 0);
  }

  function syncDiceVisual() {
    if (!diceTray) return;
    const golden = activeEntry("golden_die");
    const dice = [...diceTray.querySelectorAll(".die:not(.locked-die)")];
    dice.forEach((die, index) => {
      die.classList.toggle("is-anomaly-golden", Boolean(golden) && index === golden.dieIndex);
    });
  }

  function reset() {
    active = [];
    rollsSinceProc = 0;
    cooldownRolls = 0;
    lastProcChance = eventsUnlocked() ? BASE_PROC_CHANCE : 0;
    if (bannerTimer) window.clearTimeout(bannerTimer);
    bannerTimer = 0;
    if (banner) {
      banner.classList.remove("is-showing");
      banner.hidden = true;
    }
    renderActive();
    syncDiceVisual();
  }

  if (diceTray && typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(syncDiceVisual);
    observer.observe(diceTray, { childList: true, subtree: true });
  }

  document.getElementById("confirmPrestigeButton")?.addEventListener("click", reset, { capture: true });
  document.getElementById("resetButton")?.addEventListener("click", () => window.setTimeout(reset, 0), { capture: true });

  window.setInterval(() => {
    cleanupExpired();
    renderActive();
    syncDiceVisual();
  }, 250);

  renderActive();

  window.NightIdleEvents = Object.freeze({
    version: 2,
    definitions: DEFINITIONS,
    unlocked: eventsUnlocked,
    effectiveSum,
    comboMultiplier,
    gainMultiplier,
    frenzyChargeMultiplier,
    onRollComplete,
    reset,
    active: () => active.map((entry) => ({ ...entry })),
    rollsSinceProc: () => rollsSinceProc,
    currentProcChance: () => lastProcChance,
    frenzyChanceFactor
  });
})();
