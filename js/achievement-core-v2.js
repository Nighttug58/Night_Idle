(() => {
  "use strict";

  const CONFIG = window.NightIdleConfig;
  const SYSTEM = CONFIG?.achievementSystem;
  const DATA = window.NightIdleAchievementDataV2;
  if (!CONFIG || !SYSTEM || !DATA) return;

  const SAVE_KEY = "nightIdle.save.v1";
  const VERSION = 2;
  const TIER_COUNT = 10;
  const TIER_REWARDS = [...SYSTEM.tierRewards];
  const COSTS = [...SYSTEM.multiplierCosts];
  const MAX_LEVEL = Number(SYSTEM.multiplierMaxLevel) || 10;
  const PER_LEVEL = Number(SYSTEM.multiplierPerLevel) || 0.9;
  const CATEGORIES = Object.freeze(DATA.c.map(([id, name]) => Object.freeze({ id, name })));
  const COMBO_GROUPS = Object.freeze(DATA.g || {});
  const PRESTIGE_GROUPS = Object.freeze(DATA.p || {});
  const DEFINITIONS = Object.freeze(DATA.d.map(([id, name, category, description, thresholds, source, key, format]) =>
    Object.freeze({ id, name, category, description, thresholds: Object.freeze(thresholds), source, key, format })
  ));

  const MAX_AP = DEFINITIONS.length * TIER_REWARDS.reduce((a, b) => a + b, 0);
  const MAX_COST = COSTS.reduce((a, b) => a + b, 0);
  const MAX_MILESTONES = DEFINITIONS.length * TIER_COUNT;
  if (DEFINITIONS.length !== Number(SYSTEM.expectedFamilyCount) || MAX_AP !== MAX_COST) {
    console.error("[Night Idle] Budget Achievements incohérent", { families: DEFINITIONS.length, maxAP: MAX_AP, maxCost: MAX_COST });
  }

  const storageProto = window.Storage?.prototype;
  const inheritedSetItem = storageProto?.setItem;
  let latestSave = readSave();
  let resetIntent = false;
  let evalQueued = false;
  let lastFrenzyBars = 0;
  let frenzySecondsDirty = 0;

  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function int(v) { return Math.max(0, Math.floor(num(v))); }
  function readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch { return null; }
  }

  function emptyAnomalies() { return { golden_die: 0, frenzy_rush: 0, combo_fever: 0, jackpot: 0 }; }
  function emptyGeneral() { return Object.fromEntries(CONFIG.upgrades.map((u) => [u.id, 0])); }
  function emptyMasteries() { return Object.fromEntries(CONFIG.combos.map((c) => [c.id, 0])); }
  function comboUnlockCount(save) { return CONFIG.combos.filter((c) => save?.comboUnlocks?.[c.id] === true).length; }

  function generalFactor(save, id) {
    const upgrade = CONFIG.upgrades.find((u) => u.id === id);
    return 1 + Math.max(0, num(save?.upgrades?.[id])) * num(upgrade?.effectPerLevel);
  }

  function captureSaveMetrics(m, save) {
    if (!save || typeof save !== "object") return;
    m.maxGemsHeld = Math.max(int(m.maxGemsHeld), int(save.gems));
    m.maxPointsHeld = Math.max(num(m.maxPointsHeld), Math.max(0, num(save.points)));
    m.maxRunPoints = Math.max(num(m.maxRunPoints), Math.max(0, num(save.runPointsEarned ?? save.totalEarned)));
    m.maxRunRolls = Math.max(int(m.maxRunRolls), int(save.totalRolls));
    m.maxUnlockedCombos = Math.max(int(m.maxUnlockedCombos), comboUnlockCount(save));

    let generalTotal = 0, comboTotal = 0, highestGeneral = 0, highestCombo = 0;
    CONFIG.upgrades.forEach((u) => {
      const level = Math.max(0, num(save?.upgrades?.[u.id]));
      generalTotal += level;
      highestGeneral = Math.max(highestGeneral, level);
      m.maxGeneralUpgradeLevels[u.id] = Math.max(num(m.maxGeneralUpgradeLevels[u.id]), level);
    });
    CONFIG.combos.forEach((c) => {
      const level = Math.max(0, num(save?.comboUpgrades?.[c.id]));
      comboTotal += level;
      highestCombo = Math.max(highestCombo, level);
      m.maxComboMasteryLevels[c.id] = Math.max(num(m.maxComboMasteryLevels[c.id]), level);
    });

    m.maxGeneralLevelTotal = Math.max(num(m.maxGeneralLevelTotal), generalTotal);
    m.maxComboMasteryTotal = Math.max(num(m.maxComboMasteryTotal), comboTotal);
    m.maxRunUpgradeTotal = Math.max(num(m.maxRunUpgradeTotal), generalTotal + comboTotal);
    m.highestGeneralLevel = Math.max(num(m.highestGeneralLevel), highestGeneral);
    m.highestComboMastery = Math.max(num(m.highestComboMastery), highestCombo);
    m.highestAnyUpgrade = Math.max(num(m.highestAnyUpgrade), highestGeneral, highestCombo);

    const gp = CONFIG.prestigeShop.find((u) => u.id === "gem_power");
    const gemFactor = 1 + int(save.gems) * Math.max(0, num(save?.prestigeUpgrades?.gem_power)) * num(gp?.bonusPerGemPerLevel);
    m.maxGemPowerFactor = Math.max(num(m.maxGemPowerFactor) || 1, gemFactor);
    const core = generalFactor(save, "die_value") * generalFactor(save, "manual_power") *
      generalFactor(save, "global_power") * generalFactor(save, "combo_mastery");
    m.maxCorePower = Math.max(num(m.maxCorePower) || 1, core);
  }

  function freshState(save = null) {
    const state = {
      version: VERSION, earnedAP: 0, spentAP: 0, multiplierLevel: 0, completed: {},
      metrics: {
        maxGemsHeld: int(save?.gems), maxPointsHeld: Math.max(0, num(save?.points)),
        maxRunPoints: Math.max(0, num(save?.runPointsEarned ?? save?.totalEarned)), maxRunRolls: int(save?.totalRolls),
        maxUnlockedCombos: comboUnlockCount(save), maxGeneralLevelTotal: 0, maxComboMasteryTotal: 0,
        maxRunUpgradeTotal: 0, highestGeneralLevel: 0, highestComboMastery: 0, highestAnyUpgrade: 0,
        maxGemPowerFactor: 1, maxCorePower: 1, maxGeneralUpgradeLevels: emptyGeneral(),
        maxComboMasteryLevels: emptyMasteries(), frenzyPeak: 1, totalFrenzyBars: 0, frenzyActiveRolls: 0,
        frenzyManualRolls: 0, frenzy5xRolls: 0, frenzy10xRolls: 0, frenzy20xRolls: 0, frenzyActiveSeconds: 0,
        anomalyCounts: emptyAnomalies(), manualAnomalyProcs: 0, autoAnomalyProcs: 0, doubleAnomalyStacks: 0,
        frenzyAnomalyProcs: 0, highFrenzyAnomalyProcs: 0, anomalyAffectedRolls: 0
      },
      updatedAt: Date.now()
    };
    captureSaveMetrics(state.metrics, save);
    return state;
  }

  function earnedFromCompleted(completed) {
    return DEFINITIONS.reduce((total, d) => {
      const tiers = Math.min(TIER_COUNT, int(completed?.[d.id]));
      for (let i = 0; i < tiers; i += 1) total += TIER_REWARDS[i];
      return total;
    }, 0);
  }
  function spentForLevel(level) {
    let total = 0;
    for (let i = 0; i < Math.min(MAX_LEVEL, int(level)); i += 1) total += COSTS[i];
    return total;
  }

  function normalize(raw, save) {
    const base = freshState(save);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
    const s = {
      ...base, ...raw, version: VERSION, completed: { ...(raw.completed || {}) },
      metrics: {
        ...base.metrics, ...(raw.metrics || {}),
        maxGeneralUpgradeLevels: { ...base.metrics.maxGeneralUpgradeLevels, ...(raw.metrics?.maxGeneralUpgradeLevels || {}) },
        maxComboMasteryLevels: { ...base.metrics.maxComboMasteryLevels, ...(raw.metrics?.maxComboMasteryLevels || {}) },
        anomalyCounts: { ...base.metrics.anomalyCounts, ...(raw.metrics?.anomalyCounts || {}) }
      }
    };
    DEFINITIONS.forEach((d) => { s.completed[d.id] = Math.min(TIER_COUNT, int(s.completed[d.id])); });
    s.multiplierLevel = Math.min(MAX_LEVEL, int(s.multiplierLevel));
    s.earnedAP = earnedFromCompleted(s.completed);
    s.spentAP = spentForLevel(s.multiplierLevel);
    s.metrics.frenzyPeak = Math.max(1, num(s.metrics.frenzyPeak));
    s.metrics.maxGemPowerFactor = Math.max(1, num(s.metrics.maxGemPowerFactor));
    s.metrics.maxCorePower = Math.max(1, num(s.metrics.maxCorePower));
    Object.keys(s.metrics.anomalyCounts).forEach((id) => { s.metrics.anomalyCounts[id] = int(s.metrics.anomalyCounts[id]); });
    captureSaveMetrics(s.metrics, save);
    return s;
  }

  let state = normalize(latestSave?.achievementState, latestSave);

  function availableAP() { return Math.max(0, state.earnedAP - state.spentAP); }
  function gainMultiplier() { return Math.min(Number(SYSTEM.maxMultiplier) || 10, Math.round((1 + state.multiplierLevel * PER_LEVEL) * 10) / 10); }
  function prestigeLevel(save, id) { return int(save?.prestigeUpgrades?.[id]); }
  function comboTotal(stats) { return Object.values(stats?.comboCounts || {}).reduce((s, v) => s + Math.max(0, num(v)), 0); }
  function comboGroup(stats, id) { return (COMBO_GROUPS[id] || []).reduce((s, k) => s + Math.max(0, num(stats?.comboCounts?.[k])), 0); }
  function comboDiversity(stats) { return CONFIG.combos.filter((c) => num(stats?.comboCounts?.[c.id]) > 0).length; }
  function anomalyTotal() { return Object.values(state.metrics.anomalyCounts).reduce((s, v) => s + int(v), 0); }
  function prestigeTotal(save) { return CONFIG.prestigeShop.reduce((s, u) => s + prestigeLevel(save, u.id), 0); }
  function prestigeMaxed(save) {
    return CONFIG.prestigeShop.filter((u) => !u.unlimited && Number.isFinite(Number(u.maxLevel)) && prestigeLevel(save, u.id) >= Number(u.maxLevel)).length;
  }
  function prestigeGroup(save, id) { return (PRESTIGE_GROUPS[id] || []).reduce((s, k) => s + prestigeLevel(save, k), 0); }

  function valueOf(d, save) {
    const stats = save?.globalStats || {};
    switch (d.source) {
      case "stat": return Math.max(0, num(stats?.[d.key]));
      case "save": return Math.max(0, num(save?.[d.key]));
      case "metric": return Math.max(0, num(state.metrics?.[d.key]));
      case "comboTotal": return comboTotal(stats);
      case "combo": return Math.max(0, num(stats?.comboCounts?.[d.key]));
      case "comboGroup": return comboGroup(stats, d.key);
      case "comboDiversity": return comboDiversity(stats);
      case "anomalyTotal": return anomalyTotal();
      case "anomaly": return int(state.metrics.anomalyCounts?.[d.key]);
      case "anomalyGroup": return d.key === "common" ? ["golden_die","frenzy_rush","combo_fever"].reduce((s,k)=>s+int(state.metrics.anomalyCounts[k]),0) : 0;
      case "prestigeLevel": return prestigeLevel(save, d.key);
      case "prestigeTotalLevels": return prestigeTotal(save);
      case "prestigeMaxedSkills": return prestigeMaxed(save);
      case "prestigeGroup": return prestigeGroup(save, d.key);
      case "generalUpgradeMetric": return Math.max(0, num(state.metrics.maxGeneralUpgradeLevels?.[d.key]));
      case "comboMasteryMetric": return Math.max(0, num(state.metrics.maxComboMasteryLevels?.[d.key]));
      case "gemsSpent": return Math.max(0, int(stats.totalGemsEarned) - int(save?.gems));
      case "classifiedRolls": return int(stats.manualRolls) + int(stats.autoRolls);
      default: return 0;
    }
  }

  function persist() {
    if (!inheritedSetItem) return;
    try {
      const save = readSave();
      if (!save) return;
      captureSaveMetrics(state.metrics, save);
      state.updatedAt = Date.now();
      save.achievementState = state;
      inheritedSetItem.call(localStorage, SAVE_KEY, JSON.stringify(save));
      latestSave = readSave() || save;
    } catch (e) { console.warn("[Night Idle] Sauvegarde Achievements impossible", e); }
  }

  function emit(name, detail = {}) { window.dispatchEvent(new CustomEvent(name, { detail })); }

  function evaluate({ notify = true, persistChanges = true } = {}) {
    const save = readSave() || latestSave || {};
    latestSave = save;
    captureSaveMetrics(state.metrics, save);
    let changed = false, last = null;
    DEFINITIONS.forEach((d) => {
      const value = valueOf(d, save);
      let reached = 0;
      while (reached < TIER_COUNT && value >= d.thresholds[reached]) reached += 1;
      const previous = Math.min(TIER_COUNT, int(state.completed[d.id]));
      if (reached <= previous) return;
      let reward = 0;
      for (let i = previous; i < reached; i += 1) reward += TIER_REWARDS[i];
      state.completed[d.id] = reached;
      state.earnedAP += reward;
      changed = true;
      last = { definition: d, tier: reached, reward };
    });
    if (changed && persistChanges) persist();
    if (changed) {
      if (notify && last) emit("nightidle:achievement-unlock", last);
      emit("nightidle:achievement-change", snapshot());
    }
    return changed;
  }

  function scheduleEval() {
    if (evalQueued) return;
    evalQueued = true;
    queueMicrotask(() => { evalQueued = false; evaluate({ notify: true, persistChanges: true }); });
  }

  if (storageProto && inheritedSetItem) {
    storageProto.setItem = function achievementSetItem(key, value) {
      if (this === localStorage && key === SAVE_KEY) {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === "object") {
            if (resetIntent) {
              state = freshState(parsed);
              lastFrenzyBars = 0;
              frenzySecondsDirty = 0;
              resetIntent = false;
            } else captureSaveMetrics(state.metrics, parsed);
            parsed.achievementState = state;
            const result = inheritedSetItem.call(this, key, JSON.stringify(parsed));
            latestSave = readSave() || parsed;
            scheduleEval();
            return result;
          }
        } catch (e) { console.warn("[Night Idle] Injection Achievements ignorée", e); }
      }
      return inheritedSetItem.call(this, key, value);
    };
  }

  document.getElementById("resetButton")?.addEventListener("click", () => {
    resetIntent = true;
    setTimeout(() => { resetIntent = false; }, 0);
  }, { capture: true });

  const events = window.NightIdleEvents;
  if (events && !events.__achievementWrapped) {
    window.NightIdleEvents = Object.freeze({
      ...events,
      __achievementWrapped: true,
      onRollComplete: (...args) => {
        const manual = Boolean(args[0]);
        const before = Array.isArray(events.active?.()) ? events.active() : [];
        const frenzy = Math.max(1, num(window.NightIdleFrenzy?.multiplier?.()));
        if (before.length) state.metrics.anomalyAffectedRolls += 1;
        if (frenzy > 1) {
          state.metrics.frenzyActiveRolls += 1;
          if (manual) state.metrics.frenzyManualRolls += 1;
          if (frenzy >= 5) state.metrics.frenzy5xRolls += 1;
          if (frenzy >= 10) state.metrics.frenzy10xRolls += 1;
          if (frenzy >= 20) state.metrics.frenzy20xRolls += 1;
        }
        const proc = events.onRollComplete(...args);
        if (proc) {
          state.metrics.anomalyCounts[proc] = int(state.metrics.anomalyCounts[proc]) + 1;
          if (manual) state.metrics.manualAnomalyProcs += 1; else state.metrics.autoAnomalyProcs += 1;
          if (frenzy > 1) state.metrics.frenzyAnomalyProcs += 1;
          if (frenzy >= 10) state.metrics.highFrenzyAnomalyProcs += 1;
          const after = Array.isArray(events.active?.()) ? events.active() : [];
          if (after.length >= 2) state.metrics.doubleAnomalyStacks += 1;
        }
        if (proc || before.length || frenzy > 1) { persist(); evaluate({ notify: true, persistChanges: true }); }
        return proc;
      }
    });
  }

  setInterval(() => {
    const frenzy = Math.max(1, num(window.NightIdleFrenzy?.multiplier?.()));
    const bars = int(window.NightIdleFrenzy?.completedBars?.());
    let changed = false;
    if (frenzy > state.metrics.frenzyPeak) { state.metrics.frenzyPeak = frenzy; changed = true; }
    if (bars > lastFrenzyBars) { state.metrics.totalFrenzyBars += bars - lastFrenzyBars; changed = true; }
    lastFrenzyBars = bars;
    if (changed) { persist(); evaluate({ notify: true, persistChanges: true }); }
  }, 250);

  setInterval(() => {
    if (document.hidden || Math.max(1, num(window.NightIdleFrenzy?.multiplier?.())) <= 1) return;
    state.metrics.frenzyActiveSeconds += 1;
    frenzySecondsDirty += 1;
    if (frenzySecondsDirty >= 5) {
      frenzySecondsDirty = 0;
      persist();
      evaluate({ notify: true, persistChanges: true });
    }
  }, 1000);

  function buyMultiplier() {
    if (state.multiplierLevel >= MAX_LEVEL) return false;
    const cost = COSTS[state.multiplierLevel];
    if (availableAP() < cost) return false;
    state.multiplierLevel += 1;
    state.spentAP = spentForLevel(state.multiplierLevel);
    persist();
    emit("nightidle:achievement-change", snapshot());
    return true;
  }

  function completedMilestones() {
    return DEFINITIONS.reduce((s, d) => s + int(state.completed[d.id]), 0);
  }
  function snapshot() {
    return {
      earnedAP: state.earnedAP, spentAP: state.spentAP, availableAP: availableAP(),
      multiplierLevel: state.multiplierLevel, gainMultiplier: gainMultiplier(),
      completedMilestones: completedMilestones(), maxAP: MAX_AP, maxCost: MAX_COST,
      maxMilestones: MAX_MILESTONES
    };
  }

  evaluate({ notify: false, persistChanges: true });

  window.NightIdleAchievements = Object.freeze({
    version: VERSION, categories: CATEGORIES, definitions: DEFINITIONS, tierRewards: TIER_REWARDS,
    multiplierCosts: COSTS, maxAP: MAX_AP, maxMilestones: MAX_MILESTONES,
    availableAP, earnedAP: () => state.earnedAP, spentAP: () => state.spentAP,
    multiplierLevel: () => state.multiplierLevel, gainMultiplier, completedMilestones,
    metricValue: (d) => valueOf(d, readSave() || latestSave || {}),
    evaluate: () => evaluate({ notify: false, persistChanges: true }),
    buyMultiplier, snapshot
  });
})();
