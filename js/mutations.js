(() => {
  "use strict";

  const CONFIG = window.NightIdleConfig;
  const SYSTEM = CONFIG?.mutationSystem;
  if (!CONFIG || !SYSTEM) return;

  const BUILD = "20260914-mutations1";
  const SAVE_KEY = "nightIdle.save.v1";
  const AUTO_CHANCE_FACTOR = 0.5;
  const PITY_MAX_CHANCE = 0.80;
  const COOLDOWN_ROLLS = 30;

  const DEFINITIONS = Object.freeze([
    Object.freeze({ id: "golden", name: "Dé Doré", rarity: "common", weight: 28, description: "Sa contribution à la somme est fortement multipliée." }),
    Object.freeze({ id: "lucky", name: "Dé Chanceux", rarity: "common", weight: 24, description: "Ne peut obtenir que 4, 5 ou 6." }),
    Object.freeze({ id: "unstable", name: "Dé Instable", rarity: "rare", weight: 16, description: "Sa contribution oscille entre un malus et un puissant bonus." }),
    Object.freeze({ id: "echo", name: "Dé Écho", rarity: "rare", weight: 14, description: "Peut copier la valeur d'un autre dé du lancer." }),
    Object.freeze({ id: "astral", name: "Dé Astral", rarity: "epic", weight: 9, description: "Renforce fortement le multiplicateur lorsqu'un combo est obtenu." }),
    Object.freeze({ id: "prismatic", name: "Dé Prismatique", rarity: "mythic", weight: 5, description: "Choisit automatiquement la face offrant le meilleur potentiel de combo." }),
    Object.freeze({ id: "cursed", name: "Dé Maudit", rarity: "mythic", weight: 4, description: "Peut démultiplier le gain du lancer, mais risque de l'annuler." })
  ]);

  const rollCard = document.querySelector(".roll-card");
  const diceTray = document.getElementById("diceTray");

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = `mutations.css?v=${BUILD}`;
  document.head.appendChild(stylesheet);

  const layer = document.createElement("div");
  layer.id = "mutationLayer";
  layer.className = "mutation-layer";
  layer.innerHTML = `
    <div id="mutationBanner" class="mutation-banner" aria-live="polite" hidden>
      <span class="mutation-kicker">DÉ MUTANT !</span>
      <strong id="mutationBannerName"></strong>
      <span id="mutationBannerDescription"></span>
    </div>
    <div id="mutationActiveStack" class="mutation-active-stack" aria-live="polite"></div>
  `;
  rollCard?.appendChild(layer);

  const banner = document.getElementById("mutationBanner");
  const bannerName = document.getElementById("mutationBannerName");
  const bannerDescription = document.getElementById("mutationBannerDescription");
  const activeStack = document.getElementById("mutationActiveStack");

  let active = [];
  let rollsSinceMutation = 0;
  let cooldownRolls = 0;
  let lastProcChance = 0;
  let bannerTimer = 0;
  let spawnedThisRoll = [];

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const save = raw ? JSON.parse(raw) : null;
      return save && typeof save === "object" ? save : null;
    } catch {
      return null;
    }
  }

  function prestigeLevel(id) {
    const save = readSave();
    return Math.max(0, Math.floor(Number(save?.prestigeUpgrades?.[id]) || 0));
  }

  function unlocked() {
    return prestigeLevel("mutation_unlock") >= 1;
  }

  function chanceLevel() {
    return prestigeLevel("mutation_chance");
  }

  function durationLevel() {
    return prestigeLevel("mutation_duration");
  }

  function powerLevel() {
    return prestigeLevel("mutation_power");
  }

  function maxSlots() {
    return 1 + Math.min(1, prestigeLevel("mutation_slots"));
  }

  function powerScale() {
    return 1 + powerLevel() * (Number(SYSTEM.powerPerLevel) || 0.05);
  }

  function procChance(isManual) {
    if (!unlocked()) return 0;
    const mode = isManual ? 1 : AUTO_CHANCE_FACTOR;
    const base = (Number(SYSTEM.baseProcChance) || 0.0012) * mode *
      (1 + chanceLevel() * (Number(SYSTEM.chancePerLevel) || 0.10));

    const pityStart = Number(SYSTEM.pityStartRolls) || 750;
    const pityEnd = Math.max(pityStart + 1, Number(SYSTEM.pityNearGuaranteeRolls) || 2500);
    if (rollsSinceMutation <= pityStart) return Math.min(PITY_MAX_CHANCE, base);

    const progress = clamp01((rollsSinceMutation - pityStart) / (pityEnd - pityStart));
    const pity = Math.pow(progress, 2.1);
    return Math.min(PITY_MAX_CHANCE, base + (PITY_MAX_CHANCE - base) * pity);
  }

  function definition(id) {
    return DEFINITIONS.find((entry) => entry.id === id) || null;
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

  function randomDuration() {
    const min = Math.max(1, Number(SYSTEM.baseMinDuration) || 3);
    const baseMax = Math.max(min, Number(SYSTEM.baseMaxDuration) || 5);
    const max = Math.min(Number(SYSTEM.absoluteMaxDuration) || 10, baseMax + durationLevel());
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function announce(entry) {
    if (!banner) return;
    banner.hidden = false;
    banner.className = `mutation-banner rarity-${entry.rarity}`;
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
    }, 2300);
  }

  function availableDieIndices(diceCount) {
    const used = new Set(active.map((entry) => Number(entry.dieIndex)));
    const result = [];
    for (let i = 0; i < diceCount; i += 1) if (!used.has(i)) result.push(i);
    return result;
  }

  function candidates() {
    return DEFINITIONS.filter((entry) => !active.some((current) => current.id === entry.id));
  }

  function spawnMutation(diceCount) {
    const indices = availableDieIndices(diceCount);
    const choices = candidates();
    if (!indices.length || !choices.length || active.length >= maxSlots()) return null;

    const picked = weightedChoice(choices);
    if (!picked) return null;
    const dieIndex = indices[Math.floor(Math.random() * indices.length)];
    const runtime = {
      ...picked,
      dieIndex,
      remainingRolls: randomDuration(),
      startedAt: Date.now(),
      rollState: {}
    };
    active.push(runtime);
    spawnedThisRoll.push(runtime.id);
    rollsSinceMutation = 0;
    cooldownRolls = COOLDOWN_ROLLS;
    announce(runtime);
    renderActive();
    syncDiceVisual();
    window.dispatchEvent(new CustomEvent("nightidle:mutation-spawn", { detail: { ...runtime } }));
    return runtime;
  }

  function beforeRoll({ isManual = true, diceCount = 1 } = {}) {
    spawnedThisRoll = [];
    if (!unlocked()) {
      rollsSinceMutation = 0;
      cooldownRolls = 0;
      lastProcChance = 0;
      return null;
    }

    if (active.length >= maxSlots() || availableDieIndices(Math.max(1, diceCount)).length === 0) {
      lastProcChance = procChance(Boolean(isManual));
      return null;
    }

    rollsSinceMutation += 1;
    if (cooldownRolls > 0) {
      cooldownRolls -= 1;
      lastProcChance = procChance(Boolean(isManual));
      return null;
    }

    const chance = procChance(Boolean(isManual));
    lastProcChance = chance;
    if (Math.random() >= chance) return null;
    return spawnMutation(Math.max(1, diceCount));
  }

  function applyValues(values, { score } = {}) {
    if (!Array.isArray(values) || !values.length || !active.length) return values;
    const result = [...values];
    const pLevel = powerLevel();

    active.forEach((entry) => {
      const index = Math.max(0, Math.min(result.length - 1, Number(entry.dieIndex) || 0));
      entry.rollState = {};

      switch (entry.id) {
        case "lucky":
          result[index] = 4 + Math.floor(Math.random() * 3);
          entry.rollState.sumMultiplier = 1 + pLevel * 0.03;
          break;
        case "prismatic": {
          if (typeof score !== "function") break;
          let bestFace = result[index];
          let bestScore = -Infinity;
          for (let face = 1; face <= CONFIG.dieFaces; face += 1) {
            const test = [...result];
            test[index] = face;
            const value = Number(score(test)) || 0;
            if (value > bestScore || (value === bestScore && face > bestFace)) {
              bestScore = value;
              bestFace = face;
            }
          }
          result[index] = bestFace;
          entry.rollState.comboMultiplier = 1 + pLevel * 0.04;
          break;
        }
        case "echo": {
          if (result.length <= 1) break;
          const chance = Math.min(0.80, 0.45 + pLevel * 0.015);
          if (Math.random() < chance) {
            const others = result.map((_, i) => i).filter((i) => i !== index);
            const sourceIndex = others[Math.floor(Math.random() * others.length)];
            result[index] = result[sourceIndex];
            entry.rollState.echoed = true;
          }
          break;
        }
        case "unstable": {
          const positiveChance = Math.min(0.80, 0.60 + pLevel * 0.01);
          const positive = Math.random() < positiveChance;
          entry.rollState.sumMultiplier = positive
            ? 1 + (2 - 1) * powerScale()
            : Math.min(0.80, 0.50 + pLevel * 0.02);
          entry.rollState.positive = positive;
          break;
        }
        case "golden":
          entry.rollState.sumMultiplier = 1 + (3 - 1) * powerScale();
          break;
        case "astral":
          entry.rollState.comboMultiplier = 1 + (2 - 1) * powerScale();
          break;
        case "cursed": {
          const bustChance = Math.max(0.15, 0.30 - pLevel * 0.01);
          const bust = Math.random() < bustChance;
          entry.rollState.gainMultiplier = bust ? 0 : 1 + (4 - 1) * powerScale();
          entry.rollState.bust = bust;
          break;
        }
        default:
          break;
      }
    });

    return result;
  }

  function effectiveSum(values, rawSum) {
    if (!Array.isArray(values) || !values.length) return rawSum;
    let sum = Number(rawSum) || 0;
    active.forEach((entry) => {
      const multiplier = Number(entry.rollState?.sumMultiplier) || 1;
      if (multiplier === 1) return;
      const index = Math.max(0, Math.min(values.length - 1, Number(entry.dieIndex) || 0));
      const face = Number(values[index]) || 0;
      sum += face * (multiplier - 1);
    });
    return sum;
  }

  function comboMultiplier(hasCombo) {
    if (!hasCombo) return 1;
    return active.reduce((factor, entry) => factor * (Number(entry.rollState?.comboMultiplier) || 1), 1);
  }

  function gainMultiplier() {
    return active.reduce((factor, entry) => factor * (entry.rollState?.gainMultiplier === undefined ? 1 : Number(entry.rollState.gainMultiplier)), 1);
  }

  function consumeDurations() {
    active.forEach((entry) => { entry.remainingRolls -= 1; });
    const expired = active.filter((entry) => entry.remainingRolls <= 0);
    active = active.filter((entry) => entry.remainingRolls > 0);
    expired.forEach((entry) => window.dispatchEvent(new CustomEvent("nightidle:mutation-expire", { detail: { ...entry } })));
  }

  function onRollComplete() {
    consumeDurations();
    renderActive();
    syncDiceVisual();
  }

  function renderActive() {
    if (!activeStack) return;
    activeStack.replaceChildren();
    active.forEach((entry) => {
      const chip = document.createElement("div");
      chip.className = `mutation-chip mutation-${entry.id} rarity-${entry.rarity}`;
      chip.innerHTML = `<strong>${entry.name}</strong><span>Dé ${entry.dieIndex + 1} · ${Math.max(0, entry.remainingRolls)} lancer${entry.remainingRolls > 1 ? "s" : ""}</span>`;
      activeStack.appendChild(chip);
    });
    activeStack.classList.toggle("has-mutations", active.length > 0);
  }

  function syncDiceVisual() {
    if (!diceTray) return;
    const dice = [...diceTray.querySelectorAll(".die:not(.locked-die)")];
    const ids = DEFINITIONS.map((entry) => entry.id);
    dice.forEach((die, index) => {
      ids.forEach((id) => die.classList.remove(`is-mutant-${id}`));
      die.removeAttribute("data-mutation");
      const mutation = active.find((entry) => Number(entry.dieIndex) === index);
      if (!mutation) return;
      die.classList.add(`is-mutant-${mutation.id}`);
      die.dataset.mutation = mutation.name;
      die.title = `${mutation.name} · ${mutation.remainingRolls} lancer${mutation.remainingRolls > 1 ? "s" : ""}`;
      const baseLabel = die.getAttribute("aria-label") || `Dé ${index + 1}`;
      if (!baseLabel.includes(mutation.name)) die.setAttribute("aria-label", `${baseLabel} · ${mutation.name}`);
    });
  }

  function reset() {
    active = [];
    rollsSinceMutation = 0;
    cooldownRolls = 0;
    lastProcChance = unlocked() ? Number(SYSTEM.baseProcChance) || 0.0012 : 0;
    spawnedThisRoll = [];
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

  renderActive();

  window.NightIdleMutations = Object.freeze({
    version: 1,
    definitions: DEFINITIONS,
    unlocked,
    beforeRoll,
    applyValues,
    effectiveSum,
    comboMultiplier,
    gainMultiplier,
    onRollComplete,
    reset,
    active: () => active.map((entry) => ({ ...entry, rollState: { ...(entry.rollState || {}) } })),
    maxSlots,
    powerScale,
    rollsSinceMutation: () => rollsSinceMutation,
    currentProcChance: () => lastProcChance,
    spawnedThisRoll: () => [...spawnedThisRoll]
  });
})();
