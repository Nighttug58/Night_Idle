(() => {
  "use strict";

  const CONFIG = window.NightIdleConfig;
  const SAVE_KEY = "nightIdle.save.v1";
  const SYMBOLS = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

  const $ = (id) => document.getElementById(id);
  const ui = {
    points: $("pointsValue"),
    gems: $("gemsValue"),
    diceCount: $("diceCountValue"),
    diceTray: $("diceTray"),
    sum: $("sumValue"),
    combo: $("comboValue"),
    multiplier: $("multiplierValue"),
    gain: $("gainValue"),
    roll: $("rollButton"),

    combosButton: $("combosButton"),
    combosModal: $("combosModal"),
    closeCombos: $("closeCombosButton"),
    combos: $("combosList"),

    upgradesButton: $("upgradesButton"),
    upgradesModal: $("upgradesModal"),
    closeUpgrades: $("closeUpgradesButton"),
    upgradesBalance: $("upgradesBalanceValue"),
    generalUpgradesTab: $("generalUpgradesTab"),
    comboMasteriesTab: $("comboMasteriesTab"),
    generalUpgradesPanel: $("generalUpgradesPanel"),
    comboMasteriesPanel: $("comboMasteriesPanel"),
    generalUpgrades: $("generalUpgradesList"),
    comboUpgrades: $("comboUpgradesList"),
    upgradesScroll: document.querySelector(".upgrade-tabs-body"),

    rolls: $("totalRollsValue"),
    runPoints: $("runPointsValue"),
    best: $("bestGainValue"),

    prestigeStatus: $("prestigeStatusText"),
    prestigeButton: $("prestigeButton"),
    prestigeModal: $("prestigeModal"),
    closePrestige: $("closePrestigeButton"),
    prestigeInfoTab: $("prestigeInfoTab"),
    prestigeShopTab: $("prestigeShopTab"),
    prestigeInfoPanel: $("prestigeInfoPanel"),
    prestigeShopPanel: $("prestigeShopPanel"),
    prestigeTabsBody: document.querySelector(".prestige-tabs-body"),
    prestigeCurrentGems: $("prestigeCurrentGems"),
    prestigeCount: $("prestigeCountValue"),
    prestigeDiceStatus: $("prestigeDiceStatus"),
    prestigeCombosStatus: $("prestigeCombosStatus"),
    prestigeRunPoints: $("prestigeRunPointsValue"),
    prestigeReward: $("prestigeRewardValue"),
    confirmPrestige: $("confirmPrestigeButton"),
    prestigeShopGems: $("prestigeShopGemsValue"),
    prestigeShopList: $("prestigeShopList"),

    reset: $("resetButton")
  };

  function defaultUpgradeLevels() {
    return Object.fromEntries(CONFIG.upgrades.map((upgrade) => [upgrade.id, 0]));
  }

  function defaultComboUpgradeLevels() {
    return Object.fromEntries(CONFIG.combos.map((combo) => [combo.id, 0]));
  }

  function defaultComboUnlocks() {
    return Object.fromEntries(CONFIG.combos.map((combo) => [combo.id, false]));
  }

  function defaultPrestigeUpgradeLevels() {
    return Object.fromEntries(CONFIG.prestigeShop.map((upgrade) => [upgrade.id, 0]));
  }

  function prestigeUpgradeById(id) {
    return CONFIG.prestigeShop.find((upgrade) => upgrade.id === id);
  }

  function prestigeLevelFrom(levels, id) {
    const upgrade = prestigeUpgradeById(id);
    const raw = Math.max(0, Math.floor(Number(levels?.[id]) || 0));
    return upgrade ? Math.min(upgrade.maxLevel, raw) : 0;
  }

  function buildRunState(prestigeLevels = defaultPrestigeUpgradeLevels()) {
    const run = {
      points: 0,
      diceCount: 1,
      totalRolls: 0,
      runPointsEarned: 0,
      bestGain: 0,
      lastRoll: [],
      lastResult: null,
      upgrades: defaultUpgradeLevels(),
      comboUpgrades: defaultComboUpgradeLevels(),
      comboUnlocks: defaultComboUnlocks()
    };

    const startingPointsUpgrade = prestigeUpgradeById("starting_points");
    const startingPointsLevel = prestigeLevelFrom(prestigeLevels, "starting_points");
    if (startingPointsUpgrade) {
      run.points = startingPointsUpgrade.values[startingPointsLevel] || 0;
    }

    const startingDiceUpgrade = prestigeUpgradeById("starting_dice");
    const startingDiceLevel = prestigeLevelFrom(prestigeLevels, "starting_dice");
    if (startingDiceUpgrade) {
      run.diceCount = Math.min(
        CONFIG.maxDice,
        startingDiceUpgrade.startingDiceByLevel[startingDiceLevel] || 1
      );
    }

    const freeCombosUpgrade = prestigeUpgradeById("free_combos");
    const freeCombosLevel = prestigeLevelFrom(prestigeLevels, "free_combos");
    const freeComboCount = Math.min(
      CONFIG.combos.length,
      freeCombosLevel * (freeCombosUpgrade?.combosPerLevel || 0)
    );
    CONFIG.combos.slice(0, freeComboCount).forEach((combo) => {
      run.comboUnlocks[combo.id] = true;
    });

    return run;
  }

  function freshState() {
    const prestigeUpgrades = defaultPrestigeUpgradeLevels();
    return {
      ...buildRunState(prestigeUpgrades),
      gems: 0,
      prestigeCount: 0,
      prestigeUpgrades
    };
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved) return freshState();

      const prestigeDefaults = defaultPrestigeUpgradeLevels();
      const prestigeUpgrades = { ...prestigeDefaults, ...(saved.prestigeUpgrades || {}) };
      const baseRun = buildRunState(prestigeUpgrades);
      const comboUpgrades = { ...baseRun.comboUpgrades, ...(saved.comboUpgrades || {}) };
      const comboUnlocks = { ...baseRun.comboUnlocks, ...(saved.comboUnlocks || {}) };

      CONFIG.combos.forEach((combo) => {
        if ((Number(comboUpgrades[combo.id]) || 0) > 0) comboUnlocks[combo.id] = true;
      });

      return {
        points: Math.max(0, Number(saved.points) || 0),
        gems: Math.max(0, Math.floor(Number(saved.gems) || 0)),
        prestigeCount: Math.max(0, Math.floor(Number(saved.prestigeCount) || 0)),
        prestigeUpgrades,
        diceCount: Math.max(1, Math.min(CONFIG.maxDice, Number(saved.diceCount) || 1)),
        totalRolls: Math.max(0, Math.floor(Number(saved.totalRolls) || 0)),
        runPointsEarned: Math.max(0, Number(saved.runPointsEarned ?? saved.totalEarned) || 0),
        bestGain: Math.max(0, Number(saved.bestGain) || 0),
        lastRoll: Array.isArray(saved.lastRoll) ? saved.lastRoll : [],
        lastResult: saved.lastResult || null,
        upgrades: { ...baseRun.upgrades, ...(saved.upgrades || {}) },
        comboUpgrades,
        comboUnlocks
      };
    } catch {
      return freshState();
    }
  }

  let state = load();
  let activeUpgradeTab = "general";
  let activePrestigeTab = "prestige";
  let autoTimer = null;

  function save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function fmt(value) {
    return new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 2 }).format(value || 0);
  }

  function roundGain(value) {
    return Math.round(value * 100) / 100;
  }

  function generalUpgrade(id) {
    return CONFIG.upgrades.find((upgrade) => upgrade.id === id);
  }

  function comboById(id) {
    return CONFIG.combos.find((combo) => combo.id === id);
  }

  function prestigeUpgrade(id) {
    return prestigeUpgradeById(id);
  }

  function upgradeLevel(id) {
    return Math.max(0, Number(state.upgrades[id]) || 0);
  }

  function comboUpgradeLevel(id) {
    return Math.max(0, Number(state.comboUpgrades[id]) || 0);
  }

  function prestigeUpgradeLevel(id) {
    return prestigeLevelFrom(state.prestigeUpgrades, id);
  }

  function comboUnlocked(id) {
    return state.comboUnlocks[id] === true;
  }

  function unlockedComboCount() {
    return CONFIG.combos.filter((combo) => comboUnlocked(combo.id)).length;
  }

  function prestigeEligible() {
    return state.diceCount >= CONFIG.maxDice && unlockedComboCount() === CONFIG.combos.length;
  }

  function prestigeReward() {
    if (!prestigeEligible()) return 0;
    const scaledPoints = Math.max(0, state.runPointsEarned) / CONFIG.prestige.pointScale;
    const rawReward = CONFIG.prestige.gemCoefficient * Math.sqrt(scaledPoints);
    return Math.max(CONFIG.prestige.minimumGems, Math.floor(rawReward));
  }

  function prestigeUpgradeCost(upgrade) {
    const level = prestigeUpgradeLevel(upgrade.id);
    if (level >= upgrade.maxLevel) return null;
    return upgrade.costs[level] ?? null;
  }

  function prestigeDiscount(id) {
    const upgrade = prestigeUpgrade(id);
    if (!upgrade) return 0;
    return Math.min(
      upgrade.maxDiscount || 1,
      prestigeUpgradeLevel(id) * (upgrade.discountPerLevel || 0)
    );
  }

  function dieUnlockCost(dieNumber) {
    const baseCost = CONFIG.dieUnlockCosts[dieNumber];
    return Math.max(1, Math.ceil(baseCost * (1 - prestigeDiscount("dice_discount"))));
  }

  function comboUnlockCost(combo) {
    return Math.max(1, Math.ceil(combo.unlockCost * (1 - prestigeDiscount("combo_discount"))));
  }

  function gemPowerFactor() {
    const upgrade = prestigeUpgrade("gem_power");
    const level = prestigeUpgradeLevel("gem_power");
    if (!upgrade || level <= 0 || state.gems <= 0) return 1;
    return 1 + state.gems * level * upgrade.bonusPerGemPerLevel;
  }

  function autoClickInterval() {
    const upgrade = prestigeUpgrade("auto_clicker");
    const level = prestigeUpgradeLevel("auto_clicker");
    if (!upgrade || level <= 0) return 0;
    return upgrade.intervalsMs[level] || 0;
  }

  function fateChance() {
    const upgrade = prestigeUpgrade("fate_reroll");
    const level = prestigeUpgradeLevel("fate_reroll");
    return Math.min(1, level * (upgrade?.chancePerLevel || 0));
  }

  function upgradeCost(upgrade) {
    return Math.ceil(upgrade.baseCost * Math.pow(upgrade.costGrowth, upgradeLevel(upgrade.id)));
  }

  function comboUpgradeCost(combo) {
    return Math.ceil(
      combo.upgradeBaseCost *
      Math.pow(CONFIG.comboUpgrade.costGrowth, comboUpgradeLevel(combo.id))
    );
  }

  function upgradeFactor(id) {
    const upgrade = generalUpgrade(id);
    return 1 + upgradeLevel(id) * upgrade.effectPerLevel;
  }

  function dieValue() {
    const upgrade = generalUpgrade("die_value");
    return 1 + upgradeLevel(upgrade.id) * upgrade.effectPerLevel;
  }

  function comboMultiplier(combo) {
    if (!combo || !comboUnlocked(combo.id)) return 1;
    const globalMastery = upgradeFactor("combo_mastery");
    const individualMastery = 1 + comboUpgradeLevel(combo.id) * CONFIG.comboUpgrade.effectPerLevel;
    return combo.multiplier * globalMastery * individualMastery;
  }

  function countsOf(values) {
    const counts = new Map();
    values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    return counts;
  }

  function hasStraight(counts, length) {
    const faces = [...counts.keys()].sort((a, b) => a - b);
    let run = 1;
    for (let i = 1; i < faces.length; i += 1) {
      run = faces[i] === faces[i - 1] + 1 ? run + 1 : 1;
      if (run >= length) return true;
    }
    return false;
  }

  function hasFull(counts) {
    const groups = [...counts.values()];
    for (let i = 0; i < groups.length; i += 1) {
      if (groups[i] < 3) continue;
      for (let j = 0; j < groups.length; j += 1) {
        if (i !== j && groups[j] >= 2) return true;
      }
    }
    return false;
  }

  function comboMatches(values) {
    const counts = countsOf(values);
    const groups = [...counts.values()];
    const pairGroups = groups.filter((n) => n >= 2).length;
    const tripleGroups = groups.filter((n) => n >= 3).length;

    return {
      pair: pairGroups >= 1,
      double_pair: pairGroups >= 2,
      triple_pair: pairGroups >= 3,
      three_of_a_kind: tripleGroups >= 1,
      double_three: tripleGroups >= 2,
      full_house: hasFull(counts),
      four_of_a_kind: groups.some((n) => n >= 4),
      five_of_a_kind: groups.some((n) => n >= 5),
      six_of_a_kind: groups.some((n) => n >= 6),
      straight_4: hasStraight(counts, 4),
      straight_5: hasStraight(counts, 5),
      straight_6: hasStraight(counts, 6)
    };
  }

  function bestCombo(values) {
    const match = comboMatches(values);
    return CONFIG.combos
      .filter((combo) =>
        values.length >= combo.minDice &&
        comboUnlocked(combo.id) &&
        match[combo.id]
      )
      .sort((a, b) => comboMultiplier(b) - comboMultiplier(a))[0] || null;
  }

  function rollScore(values) {
    const sum = values.reduce((a, b) => a + b, 0);
    return sum * comboMultiplier(bestCombo(values));
  }

  function applyFateReroll(values) {
    const chance = fateChance();
    if (chance <= 0 || Math.random() >= chance || values.length === 0) return values;

    const originalScore = rollScore(values);
    let bestIndex = 0;
    let bestExpectedScore = -Infinity;

    for (let index = 0; index < values.length; index += 1) {
      let expected = 0;
      for (let face = 1; face <= CONFIG.dieFaces; face += 1) {
        const test = [...values];
        test[index] = face;
        expected += rollScore(test);
      }
      expected /= CONFIG.dieFaces;
      if (expected > bestExpectedScore) {
        bestExpectedScore = expected;
        bestIndex = index;
      }
    }

    const candidate = [...values];
    candidate[bestIndex] = Math.floor(Math.random() * CONFIG.dieFaces) + 1;
    return rollScore(candidate) > originalScore ? candidate : values;
  }

  function roll(isManual = true) {
    let values = Array.from(
      { length: state.diceCount },
      () => Math.floor(Math.random() * CONFIG.dieFaces) + 1
    );
    values = applyFateReroll(values);

    const sum = values.reduce((a, b) => a + b, 0);
    const combo = bestCombo(values);
    const effectiveComboMultiplier = comboMultiplier(combo);
    const manualFactor = isManual ? upgradeFactor("manual_power") : 1;
    const gain = roundGain(
      sum *
      dieValue() *
      effectiveComboMultiplier *
      upgradeFactor("global_power") *
      manualFactor *
      gemPowerFactor()
    );

    state.lastRoll = values;
    state.lastResult = {
      sum,
      comboName: combo ? combo.name : "Aucune",
      multiplier: effectiveComboMultiplier,
      gain
    };
    state.points += gain;
    state.totalRolls += 1;
    state.runPointsEarned += gain;
    state.bestGain = Math.max(state.bestGain, gain);
    save();
    render(isManual || autoClickInterval() >= 500, false);
  }

  function restartAutoClicker() {
    if (autoTimer) {
      window.clearTimeout(autoTimer);
      autoTimer = null;
    }

    const interval = autoClickInterval();
    if (interval <= 0) return;

    autoTimer = window.setTimeout(() => {
      roll(false);
      restartAutoClicker();
    }, interval);
  }

  function buyNextDie() {
    if (state.diceCount >= CONFIG.maxDice) return;
    const nextDie = state.diceCount + 1;
    const cost = dieUnlockCost(nextDie);
    if (state.points < cost) return;

    state.points -= cost;
    state.diceCount = nextDie;
    save();
    render(false, true);
  }

  function buyComboUnlock(id) {
    const combo = comboById(id);
    if (!combo || comboUnlocked(id) || state.diceCount < combo.minDice) return;
    const cost = comboUnlockCost(combo);
    if (state.points < cost) return;

    state.points -= cost;
    state.comboUnlocks[id] = true;
    save();
    render(false, true);
  }

  function buyUpgrade(id) {
    const upgrade = generalUpgrade(id);
    if (!upgrade) return;
    const cost = upgradeCost(upgrade);
    if (state.points < cost) return;

    state.points -= cost;
    state.upgrades[id] = upgradeLevel(id) + 1;
    save();
    render(false, true);
  }

  function buyComboUpgrade(id) {
    const combo = comboById(id);
    if (!combo || !comboUnlocked(id)) return;
    const cost = comboUpgradeCost(combo);
    if (state.points < cost) return;

    state.points -= cost;
    state.comboUpgrades[id] = comboUpgradeLevel(id) + 1;
    save();
    render(false, true);
  }

  function buyPrestigeUpgrade(id) {
    const upgrade = prestigeUpgrade(id);
    if (!upgrade) return;
    const level = prestigeUpgradeLevel(id);
    if (level >= upgrade.maxLevel) return;
    const cost = prestigeUpgradeCost(upgrade);
    if (cost === null || state.gems < cost) return;

    state.gems -= cost;
    state.prestigeUpgrades[id] = level + 1;
    save();
    render(false, true);
    restartAutoClicker();
  }

  function performPrestige() {
    if (!prestigeEligible()) return;

    const reward = prestigeReward();
    const preservedGems = state.gems + reward;
    const preservedPrestigeCount = state.prestigeCount + 1;
    const preservedPrestigeUpgrades = { ...state.prestigeUpgrades };

    state = {
      ...buildRunState(preservedPrestigeUpgrades),
      gems: preservedGems,
      prestigeCount: preservedPrestigeCount,
      prestigeUpgrades: preservedPrestigeUpgrades
    };

    activeUpgradeTab = "general";
    activePrestigeTab = "prestige";
    setUpgradeTab(activeUpgradeTab);
    setPrestigeTab(activePrestigeTab);
    save();
    render(false, true);
    restartAutoClicker();
    if (ui.prestigeModal.open) ui.prestigeModal.close();
  }

  function createOwnedDie(index, animate) {
    const die = document.createElement("div");
    die.className = `die${animate ? " is-rolling" : ""}`;
    die.setAttribute("aria-label", `Dé ${index + 1}`);
    const value = state.lastRoll[index];
    die.textContent = value ? SYMBOLS[value - 1] : "?";
    return die;
  }

  function createLockedDie() {
    const nextDie = state.diceCount + 1;
    const cost = dieUnlockCost(nextDie);
    const affordable = state.points >= cost;
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = `die locked-die${affordable ? " is-affordable" : ""}`;
    slot.disabled = !affordable;
    slot.setAttribute(
      "aria-label",
      affordable
        ? `Débloquer le dé ${nextDie} pour ${fmt(cost)} points`
        : `Dé ${nextDie} verrouillé, coût ${fmt(cost)} points`
    );
    slot.innerHTML = `<span class="lock-icon" aria-hidden="true">🔒</span><small>${fmt(cost)} pts</small>`;
    slot.addEventListener("click", buyNextDie);
    return slot;
  }

  function renderDice(animate) {
    ui.diceTray.replaceChildren();

    for (let i = 0; i < state.diceCount; i += 1) {
      ui.diceTray.appendChild(createOwnedDie(i, animate));
    }

    if (state.diceCount < CONFIG.maxDice) {
      ui.diceTray.appendChild(createLockedDie());
    }
  }

  function makeComboRow(combo) {
    const hasDice = state.diceCount >= combo.minDice;
    const unlocked = comboUnlocked(combo.id);
    const cost = comboUnlockCost(combo);
    const affordable = hasDice && !unlocked && state.points >= cost;
    const row = document.createElement("article");
    row.className = `combo-row${unlocked ? " is-unlocked" : " is-locked"}`;

    const details = document.createElement("div");
    details.className = "combo-details";
    details.innerHTML = `
      <div class="combo-title-line">
        <strong class="combo-name">${combo.name}</strong>
        <span class="combo-example">${combo.example}</span>
      </div>
      <div class="combo-meta">
        <span class="combo-multiplier">×${fmt(unlocked ? comboMultiplier(combo) : combo.multiplier)}</span>
        <span>${unlocked ? "Actif" : hasDice ? "À débloquer" : `${combo.minDice} dés requis`}</span>
        <span>Prix : ${fmt(cost)} pts</span>
      </div>
    `;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "combo-unlock-buy";
    button.disabled = unlocked || !affordable;

    if (unlocked) {
      button.innerHTML = `<span>DÉBLOQUÉ</span><strong>✓</strong>`;
    } else if (!hasDice) {
      button.innerHTML = `<span>VERROUILLÉ</span><strong>${combo.minDice} dés</strong>`;
    } else {
      button.innerHTML = `<span>DÉBLOQUER</span><strong>${fmt(cost)} pts</strong>`;
    }

    button.addEventListener("click", () => buyComboUnlock(combo.id));
    row.append(details, button);
    return row;
  }

  function renderCombos() {
    const scrollTop = ui.combos.scrollTop;
    ui.combos.replaceChildren();
    CONFIG.combos.forEach((combo) => ui.combos.appendChild(makeComboRow(combo)));
    ui.combos.scrollTop = scrollTop;
  }

  function effectLabel(upgrade, next = false) {
    const level = upgradeLevel(upgrade.id) + (next ? 1 : 0);
    const value = 1 + level * upgrade.effectPerLevel;
    return `×${fmt(value)}`;
  }

  function makeUpgradeCard(upgrade) {
    const level = upgradeLevel(upgrade.id);
    const cost = upgradeCost(upgrade);
    const affordable = state.points >= cost;
    const card = document.createElement("article");
    card.className = "upgrade-card";

    const info = document.createElement("div");
    info.className = "upgrade-info";
    info.innerHTML = `
      <div class="upgrade-title-row">
        <strong>${upgrade.name}</strong>
        <span>Niv. ${level}</span>
      </div>
      <p>${upgrade.description}</p>
      <div class="upgrade-effect">${effectLabel(upgrade)} → <strong>${effectLabel(upgrade, true)}</strong></div>
    `;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "upgrade-buy";
    button.disabled = !affordable;
    button.innerHTML = `<span>AMÉLIORER</span><strong>${fmt(cost)} pts</strong>`;
    button.addEventListener("click", () => buyUpgrade(upgrade.id));

    card.append(info, button);
    return card;
  }

  function makeComboUpgradeCard(combo) {
    const unlocked = comboUnlocked(combo.id);
    const level = comboUpgradeLevel(combo.id);
    const cost = comboUpgradeCost(combo);
    const affordable = unlocked && state.points >= cost;
    const currentOwnFactor = 1 + level * CONFIG.comboUpgrade.effectPerLevel;
    const nextOwnFactor = currentOwnFactor + CONFIG.comboUpgrade.effectPerLevel;
    const card = document.createElement("article");
    card.className = `upgrade-card compact${unlocked ? "" : " is-locked"}`;

    const info = document.createElement("div");
    info.className = "upgrade-info";
    info.innerHTML = `
      <div class="upgrade-title-row">
        <strong>${combo.name}</strong>
        <span>Niv. ${level}</span>
      </div>
      <p>${unlocked ? `Multiplicateur actuel : ×${fmt(comboMultiplier(combo))}` : "Débloque d'abord cette combinaison dans COMBOS."}</p>
      <div class="upgrade-effect">Bonus propre ×${fmt(currentOwnFactor)} → <strong>×${fmt(nextOwnFactor)}</strong></div>
    `;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "upgrade-buy";
    button.disabled = !affordable;
    button.innerHTML = unlocked
      ? `<span>AMÉLIORER</span><strong>${fmt(cost)} pts</strong>`
      : `<span>COMBO</span><strong>VERROUILLÉ</strong>`;
    button.addEventListener("click", () => buyComboUpgrade(combo.id));

    card.append(info, button);
    return card;
  }

  function renderUpgrades() {
    const scrollTop = ui.upgradesScroll.scrollTop;
    ui.upgradesBalance.textContent = fmt(state.points);

    ui.generalUpgrades.replaceChildren();
    CONFIG.upgrades.forEach((upgrade) => ui.generalUpgrades.appendChild(makeUpgradeCard(upgrade)));

    ui.comboUpgrades.replaceChildren();
    CONFIG.combos.forEach((combo) => ui.comboUpgrades.appendChild(makeComboUpgradeCard(combo)));

    ui.upgradesScroll.scrollTop = scrollTop;
  }

  function setUpgradeTab(tab) {
    activeUpgradeTab = tab === "masteries" ? "masteries" : "general";
    const showGeneral = activeUpgradeTab === "general";

    ui.generalUpgradesPanel.hidden = !showGeneral;
    ui.comboMasteriesPanel.hidden = showGeneral;
    ui.generalUpgradesTab.classList.toggle("is-active", showGeneral);
    ui.comboMasteriesTab.classList.toggle("is-active", !showGeneral);
    ui.generalUpgradesTab.setAttribute("aria-selected", String(showGeneral));
    ui.comboMasteriesTab.setAttribute("aria-selected", String(!showGeneral));
    ui.upgradesScroll.scrollTop = 0;
  }

  function prestigeEffectText(upgrade, level) {
    switch (upgrade.id) {
      case "auto_clicker": {
        if (level <= 0) return "Désactivé";
        const ms = upgrade.intervalsMs[level];
        if (ms >= 1000) return `1 lancer / ${fmt(ms / 1000)} s`;
        return `${fmt(1000 / ms)} lancers / s`;
      }
      case "fate_reroll":
        return `${fmt(level * upgrade.chancePerLevel * 100)} %`;
      case "starting_points":
        return `+${fmt(upgrade.values[level] || 0)} pts`;
      case "dice_discount":
      case "combo_discount":
        return `-${fmt(Math.min(upgrade.maxDiscount, level * upgrade.discountPerLevel) * 100)} %`;
      case "gem_power":
        return `+${fmt(level * upgrade.bonusPerGemPerLevel * 100)} % / Gemme`;
      case "free_combos":
        return `${level * upgrade.combosPerLevel} combo${level * upgrade.combosPerLevel === 1 ? "" : "s"}`;
      case "starting_dice":
        return `${upgrade.startingDiceByLevel[level] || 1} dé${(upgrade.startingDiceByLevel[level] || 1) > 1 ? "s" : ""}`;
      default:
        return `Niv. ${level}`;
    }
  }

  function makePrestigeShopCard(upgrade) {
    const level = prestigeUpgradeLevel(upgrade.id);
    const maxed = level >= upgrade.maxLevel;
    const cost = prestigeUpgradeCost(upgrade);
    const affordable = !maxed && cost !== null && state.gems >= cost;
    const nextLevel = Math.min(upgrade.maxLevel, level + 1);
    const card = document.createElement("article");
    card.className = `prestige-shop-card${maxed ? " is-maxed" : ""}`;

    const info = document.createElement("div");
    info.className = "prestige-shop-info";
    info.innerHTML = `
      <div class="upgrade-title-row">
        <strong>${upgrade.name}</strong>
        <span>Niv. ${level}/${upgrade.maxLevel}</span>
      </div>
      <p>${upgrade.description}</p>
      <div class="upgrade-effect">${prestigeEffectText(upgrade, level)}${maxed ? "" : ` → <strong>${prestigeEffectText(upgrade, nextLevel)}</strong>`}</div>
    `;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "prestige-shop-buy";
    button.disabled = !affordable;
    button.innerHTML = maxed
      ? `<span>MAX</span><strong>✓</strong>`
      : `<span>ACHETER</span><strong>${fmt(cost)} 💎</strong>`;
    button.addEventListener("click", () => buyPrestigeUpgrade(upgrade.id));

    card.append(info, button);
    return card;
  }

  function renderPrestigeShop() {
    const scrollTop = ui.prestigeTabsBody.scrollTop;
    ui.prestigeShopGems.textContent = fmt(state.gems);
    ui.prestigeShopList.replaceChildren();
    CONFIG.prestigeShop.forEach((upgrade) => {
      ui.prestigeShopList.appendChild(makePrestigeShopCard(upgrade));
    });
    ui.prestigeTabsBody.scrollTop = scrollTop;
  }

  function setPrestigeTab(tab) {
    activePrestigeTab = tab === "shop" ? "shop" : "prestige";
    const showPrestige = activePrestigeTab === "prestige";

    ui.prestigeInfoPanel.hidden = !showPrestige;
    ui.prestigeShopPanel.hidden = showPrestige;
    ui.prestigeInfoTab.classList.toggle("is-active", showPrestige);
    ui.prestigeShopTab.classList.toggle("is-active", !showPrestige);
    ui.prestigeInfoTab.setAttribute("aria-selected", String(showPrestige));
    ui.prestigeShopTab.setAttribute("aria-selected", String(!showPrestige));
    ui.prestigeTabsBody.scrollTop = 0;
  }

  function renderPrestige(renderShop = true) {
    const eligible = prestigeEligible();
    const reward = prestigeReward();
    const comboCount = unlockedComboCount();

    ui.gems.textContent = fmt(state.gems);
    ui.prestigeCurrentGems.textContent = fmt(state.gems);
    ui.prestigeCount.textContent = fmt(state.prestigeCount);
    ui.prestigeDiceStatus.textContent = `${state.diceCount}/${CONFIG.maxDice}`;
    ui.prestigeCombosStatus.textContent = `${comboCount}/${CONFIG.combos.length}`;
    ui.prestigeRunPoints.textContent = fmt(state.runPointsEarned);
    ui.prestigeReward.textContent = `+${fmt(reward)} ${reward === 1 ? "Gemme" : "Gemmes"}`;

    ui.prestigeDiceStatus.classList.toggle("is-complete", state.diceCount >= CONFIG.maxDice);
    ui.prestigeCombosStatus.classList.toggle("is-complete", comboCount === CONFIG.combos.length);
    ui.prestigeButton.classList.toggle("is-ready", eligible);
    ui.prestigeButton.textContent = eligible ? `PRESTIGE +${fmt(reward)}` : "PRESTIGE 🔒";
    ui.prestigeStatus.textContent = eligible
      ? `Prestige disponible : +${fmt(reward)} ${reward === 1 ? "Gemme" : "Gemmes"}`
      : `Prestige : ${state.diceCount}/${CONFIG.maxDice} dés · ${comboCount}/${CONFIG.combos.length} combos`;

    ui.confirmPrestige.disabled = !eligible;
    ui.confirmPrestige.textContent = eligible
      ? `PRESTIGE +${fmt(reward)} ${reward === 1 ? "GEMME" : "GEMMES"}`
      : "PRESTIGE VERROUILLÉ";

    if (renderShop) renderPrestigeShop();
  }

  function render(animate, full = true) {
    ui.points.textContent = fmt(state.points);
    ui.diceCount.textContent = state.diceCount;
    renderDice(animate);

    const result = state.lastResult;
    ui.sum.textContent = result ? fmt(result.sum) : "—";
    ui.combo.textContent = result ? result.comboName : "Aucune";
    ui.multiplier.textContent = `×${fmt(result ? result.multiplier : 1)}`;
    ui.gain.textContent = `+${fmt(result ? result.gain : 0)}`;

    ui.rolls.textContent = fmt(state.totalRolls);
    ui.runPoints.textContent = fmt(state.runPointsEarned);
    ui.best.textContent = fmt(state.bestGain);

    if (full || ui.combosModal.open) renderCombos();
    if (full || ui.upgradesModal.open) renderUpgrades();
    renderPrestige(full || ui.prestigeModal.open);
  }

  function bindModal(openButton, modal, closeButton) {
    openButton.addEventListener("click", () => {
      render(false, true);
      modal.showModal();
    });
    closeButton.addEventListener("click", () => modal.close());
    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.close();
    });
  }

  ui.roll.addEventListener("click", () => roll(true));
  ui.generalUpgradesTab.addEventListener("click", () => setUpgradeTab("general"));
  ui.comboMasteriesTab.addEventListener("click", () => setUpgradeTab("masteries"));
  ui.prestigeInfoTab.addEventListener("click", () => setPrestigeTab("prestige"));
  ui.prestigeShopTab.addEventListener("click", () => setPrestigeTab("shop"));
  ui.confirmPrestige.addEventListener("click", performPrestige);

  bindModal(ui.combosButton, ui.combosModal, ui.closeCombos);
  bindModal(ui.upgradesButton, ui.upgradesModal, ui.closeUpgrades);
  bindModal(ui.prestigeButton, ui.prestigeModal, ui.closePrestige);

  ui.reset.addEventListener("click", () => {
    if (!window.confirm("Réinitialiser toute la progression, Gemmes et améliorations Prestige comprises ?")) return;
    state = freshState();
    activeUpgradeTab = "general";
    activePrestigeTab = "prestige";
    setUpgradeTab(activeUpgradeTab);
    setPrestigeTab(activePrestigeTab);
    save();
    render(false, true);
    restartAutoClicker();
  });

  setUpgradeTab(activeUpgradeTab);
  setPrestigeTab(activePrestigeTab);
  render(false, true);
  restartAutoClicker();
})();
