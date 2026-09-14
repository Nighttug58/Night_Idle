(() => {
  "use strict";

  const CONFIG = window.NightIdleConfig;
  const SYSTEM = CONFIG?.achievementSystem;
  if (!CONFIG || !SYSTEM) return;

  const SAVE_KEY = "nightIdle.save.v1";
  const BUILD = "20260914-achievements1";
  const STATE_VERSION = 1;
  const TIER_COUNT = 10;
  const TIER_REWARDS = [...SYSTEM.tierRewards];
  const MULTIPLIER_COSTS = [...SYSTEM.multiplierCosts];
  const MAX_MULTIPLIER_LEVEL = Number(SYSTEM.multiplierMaxLevel) || 10;
  const MULTIPLIER_PER_LEVEL = Number(SYSTEM.multiplierPerLevel) || 0.9;

  const CATEGORIES = Object.freeze([
    Object.freeze({ id: "progression", name: "PROGRESSION" }),
    Object.freeze({ id: "combos", name: "COMBOS" }),
    Object.freeze({ id: "anomalies", name: "ANOMALIES" }),
    Object.freeze({ id: "frenzy", name: "FRÉNÉSIE" }),
    Object.freeze({ id: "prestige", name: "PRESTIGE" })
  ]);

  const A = (id, name, category, description, thresholds, source, key = null, format = "number") => Object.freeze({
    id, name, category, description, thresholds: Object.freeze(thresholds), source, key, format
  });

  const DEFINITIONS = Object.freeze([
    A("total_rolls", "Lanceur infatigable", "progression", "Effectuer des lancers au total.", [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000], "stat", "totalRolls"),
    A("manual_rolls", "Main du hasard", "progression", "Effectuer des lancers manuels.", [50, 125, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000], "stat", "manualRolls"),
    A("auto_rolls", "Machine lancée", "progression", "Effectuer des lancers avec l'Auto Clicker.", [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000], "stat", "autoRolls"),
    A("offline_rolls", "Pendant ton absence", "progression", "Accumuler des lancers théoriques hors ligne.", [50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000], "stat", "offlineRolls"),
    A("total_points", "Fortune nocturne", "progression", "Gagner des Points au total.", [10000, 50000, 200000, 1000000, 5000000, 20000000, 100000000, 500000000, 2000000000, 10000000000], "stat", "totalPointsEarned", "compact"),
    A("best_gain", "Coup de maître", "progression", "Atteindre un gain record sur un seul lancer.", [100, 500, 2500, 10000, 50000, 250000, 1000000, 5000000, 25000000, 100000000], "stat", "bestGain", "compact"),
    A("prestige_count", "Éternel recommencement", "progression", "Effectuer des Prestiges.", [1, 2, 3, 5, 8, 12, 18, 25, 35, 50], "save", "prestigeCount"),
    A("total_gems", "Collectionneur de Gemmes", "progression", "Gagner des Gemmes au total.", [5, 10, 20, 40, 75, 125, 200, 350, 600, 1000], "stat", "totalGemsEarned"),
    A("best_prestige", "Prestige lucratif", "progression", "Améliorer le meilleur gain de Gemmes sur un Prestige.", [1, 2, 3, 5, 8, 12, 18, 25, 35, 50], "stat", "bestPrestigeGems"),
    A("max_gems_held", "Trésor de Gemmes", "progression", "Détenir simultanément un nombre croissant de Gemmes.", [5, 10, 25, 50, 100, 200, 350, 600, 1000, 2000], "metric", "maxGemsHeld"),

    A("all_combos", "Combinateur", "combos", "Obtenir des combinaisons de n'importe quel type.", [25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000], "comboTotal"),
    A("combo_pair", "Duo", "combos", "Obtenir des Paires.", [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000], "combo", "pair"),
    A("combo_three", "Trinité", "combos", "Obtenir des Brelans.", [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000], "combo", "three_of_a_kind"),
    A("combo_double_pair", "Deux par deux", "combos", "Obtenir des Doubles paires.", [3, 5, 10, 25, 50, 100, 250, 500, 1000, 2500], "combo", "double_pair"),
    A("combo_straight4", "Quatre à la suite", "combos", "Obtenir des Suites de 4.", [3, 5, 10, 25, 50, 100, 250, 500, 1000, 2500], "combo", "straight_4"),
    A("combo_four", "Carré parfait", "combos", "Obtenir des Carrés.", [1, 2, 3, 5, 10, 20, 40, 75, 125, 200], "combo", "four_of_a_kind"),
    A("combo_full", "Maison pleine", "combos", "Obtenir des Fulls.", [2, 5, 10, 20, 40, 75, 150, 300, 600, 1000], "combo", "full_house"),
    A("combo_straight5", "Cinq à la suite", "combos", "Obtenir des Suites de 5.", [1, 2, 5, 10, 20, 40, 75, 150, 300, 600], "combo", "straight_5"),
    A("combo_five", "Quintessence", "combos", "Obtenir des Quintuples.", [1, 2, 3, 5, 8, 12, 20, 35, 60, 100], "combo", "five_of_a_kind"),
    A("combo_triple_pair", "Trois duos", "combos", "Obtenir des Triples paires.", [1, 2, 5, 10, 20, 40, 75, 150, 300, 600], "combo", "triple_pair"),
    A("combo_double_three", "Double trinité", "combos", "Obtenir des Doubles brelans.", [1, 2, 3, 5, 10, 20, 40, 75, 125, 200], "combo", "double_three"),
    A("combo_straight6", "Suite parfaite", "combos", "Obtenir des Suites de 6.", [1, 2, 3, 5, 10, 20, 40, 75, 125, 200], "combo", "straight_6"),
    A("combo_six", "Six absolu", "combos", "Obtenir des Sextuples.", [1, 2, 3, 5, 8, 12, 20, 30, 50, 75], "combo", "six_of_a_kind"),

    A("anomaly_total", "Anomaliste", "anomalies", "Déclencher des Anomalies de n'importe quel type.", [1, 2, 3, 5, 8, 12, 20, 30, 50, 75], "anomalyTotal"),
    A("anomaly_golden", "Fièvre dorée", "anomalies", "Déclencher le Dé Doré.", [1, 2, 3, 5, 8, 12, 20, 30, 50, 75], "anomaly", "golden_die"),
    A("anomaly_rush", "Rush nocturne", "anomalies", "Déclencher Rush Frénétique.", [1, 2, 3, 5, 8, 12, 20, 30, 50, 75], "anomaly", "frenzy_rush"),
    A("anomaly_combo", "Fièvre combinatoire", "anomalies", "Déclencher Combo Fever.", [1, 2, 3, 5, 8, 12, 20, 30, 50, 75], "anomaly", "combo_fever"),
    A("anomaly_jackpot", "Jackpot mythique", "anomalies", "Déclencher l'Anomalie Jackpot.", [1, 2, 3, 4, 5, 7, 10, 15, 20, 30], "anomaly", "jackpot"),

    A("frenzy_peak", "Montée en Frénésie", "frenzy", "Atteindre un multiplicateur de Frénésie toujours plus élevé.", [2, 3, 4, 5, 7, 10, 15, 20, 25, 30], "metric", "frenzyPeak", "multiplier"),
    A("frenzy_mastery", "Maître de la Frénésie", "frenzy", "Améliorer Maîtrise de la Frénésie.", [2, 4, 6, 8, 10, 12, 14, 16, 18, 20], "prestigeLevel", "frenzy_mastery"),
    A("frenzy_tier_power", "Paliers surchargés", "frenzy", "Améliorer Puissance des paliers.", [1, 2, 3, 4, 5, 7, 9, 11, 13, 15], "prestigeLevel", "frenzy_tier_power"),

    A("gem_power_level", "Résonance des Gemmes", "prestige", "Améliorer Puissance des Gemmes.", [1, 2, 3, 5, 8, 12, 18, 25, 35, 50], "prestigeLevel", "gem_power"),
    A("economy_level", "Économiste", "prestige", "Améliorer Économie d'échelle.", [5, 10, 15, 20, 25, 30, 35, 40, 45, 50], "prestigeLevel", "cost_curve_mastery"),
    A("auto_clicker_level", "Automatisation", "prestige", "Améliorer l'Auto Clicker.", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "prestigeLevel", "auto_clicker")
  ]);

  const MAX_AP = DEFINITIONS.length * TIER_REWARDS.reduce((sum, value) => sum + value, 0);
  const MAX_SHOP_COST = MULTIPLIER_COSTS.reduce((sum, value) => sum + value, 0);
  const MAX_MILESTONES = DEFINITIONS.length * TIER_COUNT;

  if (DEFINITIONS.length !== Number(SYSTEM.expectedFamilyCount) || MAX_AP !== MAX_SHOP_COST) {
    console.error("[Night Idle] Budget Achievements incohérent", {
      families: DEFINITIONS.length,
      expectedFamilies: SYSTEM.expectedFamilyCount,
      maxAP: MAX_AP,
      shopCost: MAX_SHOP_COST
    });
  }

  const storageProto = window.Storage?.prototype;
  const inheritedSetItem = storageProto?.setItem;
  let resetIntent = false;
  let evaluateQueued = false;
  let initialized = false;
  let latestSave = null;
  let activeCategory = "progression";
  let activeView = "achievements";
  let toastTimer = 0;
  const seenAnomalies = new Set();

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function integer(value) {
    return Math.max(0, Math.floor(number(value)));
  }

  function readSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function emptyAnomalyCounts() {
    return { golden_die: 0, frenzy_rush: 0, combo_fever: 0, jackpot: 0 };
  }

  function freshState(save = null) {
    return {
      version: STATE_VERSION,
      earnedAP: 0,
      spentAP: 0,
      multiplierLevel: 0,
      completed: {},
      metrics: {
        maxGemsHeld: integer(save?.gems),
        frenzyPeak: 1,
        anomalyCounts: emptyAnomalyCounts()
      },
      updatedAt: Date.now()
    };
  }

  function normalizeState(raw, save) {
    const base = freshState(save);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;

    const normalized = {
      ...base,
      ...raw,
      version: STATE_VERSION,
      completed: { ...(raw.completed || {}) },
      metrics: {
        ...base.metrics,
        ...(raw.metrics || {}),
        anomalyCounts: {
          ...base.metrics.anomalyCounts,
          ...(raw.metrics?.anomalyCounts || {})
        }
      }
    };

    normalized.earnedAP = Math.max(0, integer(normalized.earnedAP));
    normalized.spentAP = Math.max(0, Math.min(normalized.earnedAP, integer(normalized.spentAP)));
    normalized.multiplierLevel = Math.max(0, Math.min(MAX_MULTIPLIER_LEVEL, integer(normalized.multiplierLevel)));
    normalized.metrics.maxGemsHeld = Math.max(integer(save?.gems), integer(normalized.metrics.maxGemsHeld));
    normalized.metrics.frenzyPeak = Math.max(1, number(normalized.metrics.frenzyPeak));

    Object.keys(normalized.metrics.anomalyCounts).forEach((id) => {
      normalized.metrics.anomalyCounts[id] = integer(normalized.metrics.anomalyCounts[id]);
    });

    DEFINITIONS.forEach((definition) => {
      normalized.completed[definition.id] = Math.max(0, Math.min(TIER_COUNT, integer(normalized.completed[definition.id])));
    });

    return normalized;
  }

  latestSave = readSave();
  let state = normalizeState(latestSave?.achievementState, latestSave);

  function availableAP() {
    return Math.max(0, state.earnedAP - state.spentAP);
  }

  function gainMultiplier() {
    const value = 1 + state.multiplierLevel * MULTIPLIER_PER_LEVEL;
    return Math.min(Number(SYSTEM.maxMultiplier) || 10, Math.round(value * 10) / 10);
  }

  function prestigeLevel(save, id) {
    return integer(save?.prestigeUpgrades?.[id]);
  }

  function anomalyTotal() {
    return Object.values(state.metrics.anomalyCounts).reduce((sum, value) => sum + integer(value), 0);
  }

  function comboTotal(stats) {
    return Object.values(stats?.comboCounts || {}).reduce((sum, value) => sum + Math.max(0, number(value)), 0);
  }

  function metricValue(definition, save) {
    const stats = save?.globalStats || {};

    switch (definition.source) {
      case "stat":
        return Math.max(0, number(stats?.[definition.key]));
      case "save":
        return Math.max(0, number(save?.[definition.key]));
      case "metric":
        return Math.max(0, number(state.metrics?.[definition.key]));
      case "comboTotal":
        return comboTotal(stats);
      case "combo":
        return Math.max(0, number(stats?.comboCounts?.[definition.key]));
      case "anomalyTotal":
        return anomalyTotal();
      case "anomaly":
        return integer(state.metrics.anomalyCounts?.[definition.key]);
      case "prestigeLevel":
        return prestigeLevel(save, definition.key);
      default:
        return 0;
    }
  }

  function persistState() {
    if (!inheritedSetItem) return;
    try {
      const save = readSave();
      if (!save || typeof save !== "object") return;
      state.updatedAt = Date.now();
      save.achievementState = state;
      inheritedSetItem.call(localStorage, SAVE_KEY, JSON.stringify(save));
      latestSave = readSave() || save;
    } catch (error) {
      console.warn("[Night Idle] Sauvegarde Achievements impossible", error);
    }
  }

  function showToast(definition, tier, reward) {
    const toast = document.getElementById("achievementToast");
    if (!toast || !initialized) return;
    toast.innerHTML = `<span>SUCCÈS · PALIER ${tier}</span><strong>${definition.name}</strong><em>+${reward} AP</em>`;
    toast.classList.remove("is-showing");
    void toast.offsetWidth;
    toast.classList.add("is-showing");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-showing"), 2200);
  }

  function evaluateAchievements({ notify = true, persist = true } = {}) {
    const save = readSave() || latestSave || {};
    latestSave = save;
    state.metrics.maxGemsHeld = Math.max(state.metrics.maxGemsHeld, integer(save.gems));

    let changed = false;
    let lastUnlock = null;

    DEFINITIONS.forEach((definition) => {
      const value = metricValue(definition, save);
      let reached = 0;
      while (reached < TIER_COUNT && value >= definition.thresholds[reached]) reached += 1;

      const previous = Math.max(0, Math.min(TIER_COUNT, integer(state.completed[definition.id])));
      if (reached <= previous) return;

      let reward = 0;
      for (let index = previous; index < reached; index += 1) reward += TIER_REWARDS[index];
      state.completed[definition.id] = reached;
      state.earnedAP += reward;
      changed = true;
      lastUnlock = { definition, tier: reached, reward };
    });

    if (changed && persist) persistState();
    if (changed && notify && lastUnlock) showToast(lastUnlock.definition, lastUnlock.tier, lastUnlock.reward);
    if (achievementModal?.open) renderModal();
    return changed;
  }

  function scheduleEvaluation(notify = true) {
    if (evaluateQueued) return;
    evaluateQueued = true;
    queueMicrotask(() => {
      evaluateQueued = false;
      evaluateAchievements({ notify, persist: true });
    });
  }

  if (storageProto && inheritedSetItem) {
    storageProto.setItem = function nightIdleAchievementSetItem(key, value) {
      if (this === localStorage && key === SAVE_KEY) {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === "object") {
            if (resetIntent) {
              state = freshState(parsed);
              seenAnomalies.clear();
              resetIntent = false;
            } else {
              state.metrics.maxGemsHeld = Math.max(state.metrics.maxGemsHeld, integer(parsed.gems));
            }
            parsed.achievementState = state;
            const result = inheritedSetItem.call(this, key, JSON.stringify(parsed));
            latestSave = readSave() || parsed;
            scheduleEvaluation(true);
            return result;
          }
        } catch (error) {
          console.warn("[Night Idle] Injection Achievements ignorée", error);
        }
      }
      return inheritedSetItem.call(this, key, value);
    };
  }

  document.getElementById("resetButton")?.addEventListener("click", () => {
    resetIntent = true;
    window.setTimeout(() => {
      resetIntent = false;
    }, 0);
  }, { capture: true });

  function captureActiveAnomalies() {
    const active = window.NightIdleEvents?.active?.();
    if (!Array.isArray(active)) return;
    let changed = false;

    active.forEach((entry) => {
      const key = `${entry.id}:${entry.startedAt || 0}`;
      if (seenAnomalies.has(key)) return;
      seenAnomalies.add(key);
      if (!(entry.id in state.metrics.anomalyCounts)) state.metrics.anomalyCounts[entry.id] = 0;
      state.metrics.anomalyCounts[entry.id] = integer(state.metrics.anomalyCounts[entry.id]) + 1;
      changed = true;
    });

    if (changed) {
      persistState();
      evaluateAchievements({ notify: true, persist: true });
    }
  }

  function wrapEventsApi() {
    const base = window.NightIdleEvents;
    if (!base || base.__achievementWrapped) return;

    window.NightIdleEvents = Object.freeze({
      ...base,
      __achievementWrapped: true,
      onRollComplete: (...args) => {
        const result = base.onRollComplete(...args);
        captureActiveAnomalies();
        return result;
      }
    });
    captureActiveAnomalies();
  }

  wrapEventsApi();

  window.setInterval(() => {
    const current = Math.max(1, number(window.NightIdleFrenzy?.multiplier?.()));
    if (current > state.metrics.frenzyPeak + 1e-9) {
      state.metrics.frenzyPeak = current;
      persistState();
      evaluateAchievements({ notify: true, persist: true });
    }
  }, 250);

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = `achievements.css?v=${BUILD}`;
  document.head.appendChild(stylesheet);

  const toast = document.createElement("div");
  toast.id = "achievementToast";
  toast.className = "achievement-toast";
  toast.setAttribute("aria-live", "polite");
  document.body.appendChild(toast);

  const footerButtons = document.querySelector(".footer-buttons");
  const statsButton = document.getElementById("statsButton");
  const prestigeButton = document.getElementById("prestigeButton");
  let achievementButton = document.getElementById("achievementButton");

  if (footerButtons && !achievementButton) {
    achievementButton = document.createElement("button");
    achievementButton.id = "achievementButton";
    achievementButton.className = "prestige-button achievement-button";
    achievementButton.type = "button";
    achievementButton.textContent = "SUCCÈS";
    achievementButton.setAttribute("aria-haspopup", "dialog");
    footerButtons.insertBefore(achievementButton, statsButton || prestigeButton || footerButtons.firstChild);
  }

  let achievementModal = document.getElementById("achievementModal");
  if (!achievementModal) {
    achievementModal = document.createElement("dialog");
    achievementModal.id = "achievementModal";
    achievementModal.className = "modal achievement-modal";
    achievementModal.setAttribute("aria-labelledby", "achievementTitle");
    achievementModal.innerHTML = `
      <div class="modal-card achievement-modal-card">
        <div class="modal-header">
          <div>
            <p class="eyebrow">PROGRESSION PERMANENTE</p>
            <h2 id="achievementTitle">Succès & AP</h2>
          </div>
          <button id="closeAchievementButton" class="modal-close" type="button" aria-label="Fermer">×</button>
        </div>

        <div id="achievementSummary" class="achievement-summary"></div>

        <div class="modal-tabs achievement-main-tabs" role="tablist" aria-label="Succès et boutique AP">
          <button id="achievementListTab" class="modal-tab is-active" type="button" role="tab" aria-selected="true">SUCCÈS</button>
          <button id="achievementShopTab" class="modal-tab" type="button" role="tab" aria-selected="false">BOUTIQUE AP</button>
        </div>

        <div class="achievement-body modal-scroll">
          <section id="achievementListPanel">
            <div id="achievementCategoryTabs" class="achievement-category-tabs"></div>
            <div id="achievementList" class="achievement-list"></div>
          </section>
          <section id="achievementShopPanel" hidden>
            <div id="achievementShop"></div>
          </section>
        </div>
      </div>`;
    document.body.appendChild(achievementModal);
  }

  function fmt(value, compact = false) {
    const options = compact
      ? { notation: "compact", maximumFractionDigits: 1 }
      : { maximumFractionDigits: 2 };
    return new Intl.NumberFormat("fr-CH", options).format(number(value));
  }

  function fmtValue(definition, value) {
    if (definition.format === "multiplier") return `×${fmt(value)}`;
    if (definition.format === "compact") return fmt(value, true);
    return fmt(value);
  }

  function completedMilestones() {
    return DEFINITIONS.reduce((sum, definition) => sum + integer(state.completed[definition.id]), 0);
  }

  function renderSummary() {
    const node = document.getElementById("achievementSummary");
    if (!node) return;
    node.innerHTML = `
      <div><span>AP disponibles</span><strong>${fmt(availableAP())}</strong></div>
      <div><span>AP gagnés</span><strong>${fmt(state.earnedAP)} / ${fmt(MAX_AP)}</strong></div>
      <div><span>Bonus total</span><strong>×${fmt(gainMultiplier())}</strong></div>
      <div><span>Paliers</span><strong>${fmt(completedMilestones())} / ${fmt(MAX_MILESTONES)}</strong></div>`;
  }

  function renderCategoryTabs() {
    const node = document.getElementById("achievementCategoryTabs");
    if (!node) return;
    node.replaceChildren();

    CATEGORIES.forEach((category) => {
      const count = DEFINITIONS.filter((definition) => definition.category === category.id)
        .reduce((sum, definition) => sum + integer(state.completed[definition.id]), 0);
      const max = DEFINITIONS.filter((definition) => definition.category === category.id).length * TIER_COUNT;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `achievement-category${activeCategory === category.id ? " is-active" : ""}`;
      button.innerHTML = `<strong>${category.name}</strong><span>${count}/${max}</span>`;
      button.addEventListener("click", () => {
        activeCategory = category.id;
        renderCategoryTabs();
        renderAchievementList();
      });
      node.appendChild(button);
    });
  }

  function renderAchievementList() {
    const list = document.getElementById("achievementList");
    if (!list) return;
    const save = readSave() || latestSave || {};
    list.replaceChildren();

    DEFINITIONS.filter((definition) => definition.category === activeCategory).forEach((definition) => {
      const tier = Math.max(0, Math.min(TIER_COUNT, integer(state.completed[definition.id])));
      const value = metricValue(definition, save);
      const maxed = tier >= TIER_COUNT;
      const target = maxed ? definition.thresholds[TIER_COUNT - 1] : definition.thresholds[tier];
      const previousTarget = tier > 0 ? definition.thresholds[tier - 1] : 0;
      const range = Math.max(1e-9, target - previousTarget);
      const progress = maxed ? 1 : Math.max(0, Math.min(1, (value - previousTarget) / range));
      const reward = maxed ? TIER_REWARDS[TIER_COUNT - 1] : TIER_REWARDS[tier];

      const card = document.createElement("article");
      card.className = `achievement-card${maxed ? " is-complete" : ""}`;
      card.innerHTML = `
        <div class="achievement-card-head">
          <div>
            <strong>${definition.name}</strong>
            <span>Palier ${tier}/${TIER_COUNT}</span>
          </div>
          <b>${maxed ? "COMPLET" : `+${reward} AP`}</b>
        </div>
        <p>${definition.description}</p>
        <div class="achievement-progress-line">
          <span>${fmtValue(definition, value)}</span>
          <strong>${maxed ? fmtValue(definition, target) : fmtValue(definition, target)}</strong>
        </div>
        <div class="achievement-progress"><i style="transform:scaleX(${progress})"></i></div>`;
      list.appendChild(card);
    });
  }

  function buyAchievementMultiplier() {
    const level = state.multiplierLevel;
    if (level >= MAX_MULTIPLIER_LEVEL) return;
    const cost = MULTIPLIER_COSTS[level];
    if (availableAP() < cost) return;
    state.spentAP += cost;
    state.multiplierLevel += 1;
    persistState();
    renderModal();
  }

  function renderShop() {
    const node = document.getElementById("achievementShop");
    if (!node) return;
    const level = state.multiplierLevel;
    const maxed = level >= MAX_MULTIPLIER_LEVEL;
    const cost = maxed ? 0 : MULTIPLIER_COSTS[level];
    const current = gainMultiplier();
    const next = maxed ? current : Math.min(SYSTEM.maxMultiplier, 1 + (level + 1) * MULTIPLIER_PER_LEVEL);

    node.innerHTML = `
      <article class="achievement-shop-card${maxed ? " is-maxed" : ""}">
        <div class="achievement-shop-title">
          <div>
            <span>MULTIPLICATEUR DE SUCCÈS</span>
            <strong>Puissance des Achievements</strong>
          </div>
          <b>Niv. ${level}/${MAX_MULTIPLIER_LEVEL}</b>
        </div>
        <p>Bonus final appliqué à tous les gains. Chaque niveau ajoute directement +${fmt(MULTIPLIER_PER_LEVEL)}× au multiplicateur Achievement, sans composition entre ses propres niveaux.</p>
        <div class="achievement-shop-effect">×${fmt(current)}${maxed ? "" : ` → <strong>×${fmt(next)}</strong>`}</div>
        <button id="buyAchievementMultiplier" class="prestige-shop-buy" type="button" ${maxed || availableAP() < cost ? "disabled" : ""}>
          ${maxed ? `<span>MAX</span><strong>×${fmt(current)}</strong>` : `<span>AMÉLIORER</span><strong>${fmt(cost)} AP</strong>`}
        </button>
      </article>
      <div class="achievement-budget-note">
        <strong>Budget parfaitement fermé</strong>
        <span>${fmt(MAX_AP)} AP maximum dans les ${MAX_MILESTONES} paliers.</span>
        <span>${fmt(MAX_SHOP_COST)} AP nécessaires pour atteindre ×${fmt(SYSTEM.maxMultiplier)}.</span>
      </div>`;

    document.getElementById("buyAchievementMultiplier")?.addEventListener("click", buyAchievementMultiplier);
  }

  function setView(view) {
    activeView = view === "shop" ? "shop" : "achievements";
    const showList = activeView === "achievements";
    const listPanel = document.getElementById("achievementListPanel");
    const shopPanel = document.getElementById("achievementShopPanel");
    const listTab = document.getElementById("achievementListTab");
    const shopTab = document.getElementById("achievementShopTab");
    if (listPanel) listPanel.hidden = !showList;
    if (shopPanel) shopPanel.hidden = showList;
    listTab?.classList.toggle("is-active", showList);
    shopTab?.classList.toggle("is-active", !showList);
    listTab?.setAttribute("aria-selected", String(showList));
    shopTab?.setAttribute("aria-selected", String(!showList));
    if (showList) {
      renderCategoryTabs();
      renderAchievementList();
    } else {
      renderShop();
    }
  }

  function renderModal() {
    renderSummary();
    setView(activeView);
  }

  achievementButton?.addEventListener("click", () => {
    evaluateAchievements({ notify: false, persist: true });
    renderModal();
    if (!achievementModal.open) achievementModal.showModal();
  });

  document.getElementById("closeAchievementButton")?.addEventListener("click", () => achievementModal.close());
  achievementModal?.addEventListener("click", (event) => {
    if (event.target === achievementModal) achievementModal.close();
  });
  document.getElementById("achievementListTab")?.addEventListener("click", () => setView("achievements"));
  document.getElementById("achievementShopTab")?.addEventListener("click", () => setView("shop"));

  evaluateAchievements({ notify: false, persist: true });
  initialized = true;
  renderModal();

  window.NightIdleAchievements = Object.freeze({
    version: STATE_VERSION,
    definitions: DEFINITIONS,
    maxAP: MAX_AP,
    maxMilestones: MAX_MILESTONES,
    availableAP,
    earnedAP: () => state.earnedAP,
    spentAP: () => state.spentAP,
    multiplierLevel: () => state.multiplierLevel,
    gainMultiplier,
    completedMilestones,
    evaluate: () => evaluateAchievements({ notify: false, persist: true })
  });
})();