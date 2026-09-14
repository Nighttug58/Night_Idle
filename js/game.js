(() => {
  "use strict";

  const CONFIG = window.NightIdleConfig;
  const SAVE_KEY = "nightIdle.save.v1";
  const SYMBOLS = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

  const $ = (id) => document.getElementById(id);
  const ui = {
    points: $("pointsValue"),
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
    upgrades: $("upgradesList"),
    rolls: $("totalRollsValue"),
    earned: $("totalEarnedValue"),
    best: $("bestGainValue"),
    reset: $("resetButton")
  };

  function defaultUpgradeLevels() {
    return Object.fromEntries(CONFIG.upgrades.map((upgrade) => [upgrade.id, 0]));
  }

  function defaultComboUpgradeLevels() {
    return Object.fromEntries(CONFIG.combos.map((combo) => [combo.id, 0]));
  }

  const freshState = () => ({
    points: 0,
    diceCount: 1,
    totalRolls: 0,
    totalEarned: 0,
    bestGain: 0,
    lastRoll: [],
    lastResult: null,
    upgrades: defaultUpgradeLevels(),
    comboUpgrades: defaultComboUpgradeLevels()
  });

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved) return freshState();

      const base = freshState();
      return {
        ...base,
        ...saved,
        diceCount: Math.max(1, Math.min(CONFIG.maxDice, Number(saved.diceCount) || 1)),
        upgrades: { ...base.upgrades, ...(saved.upgrades || {}) },
        comboUpgrades: { ...base.comboUpgrades, ...(saved.comboUpgrades || {}) }
      };
    } catch {
      return freshState();
    }
  }

  let state = load();

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

  function upgradeLevel(id) {
    return Math.max(0, Number(state.upgrades[id]) || 0);
  }

  function comboUpgradeLevel(id) {
    return Math.max(0, Number(state.comboUpgrades[id]) || 0);
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
    if (!combo) return 1;
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

  function bestCombo(values) {
    const counts = countsOf(values);
    const groups = [...counts.values()];
    const pairGroups = groups.filter((n) => n >= 2).length;
    const tripleGroups = groups.filter((n) => n >= 3).length;
    const match = {
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

    return CONFIG.combos
      .filter((combo) => values.length >= combo.minDice && match[combo.id])
      .sort((a, b) => comboMultiplier(b) - comboMultiplier(a))[0] || null;
  }

  function roll() {
    const values = Array.from(
      { length: state.diceCount },
      () => Math.floor(Math.random() * CONFIG.dieFaces) + 1
    );
    const sum = values.reduce((a, b) => a + b, 0);
    const combo = bestCombo(values);
    const effectiveComboMultiplier = comboMultiplier(combo);
    const gain = roundGain(
      sum *
      dieValue() *
      effectiveComboMultiplier *
      upgradeFactor("global_power") *
      upgradeFactor("manual_power")
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
    state.totalEarned += gain;
    state.bestGain = Math.max(state.bestGain, gain);
    save();
    render(true);
  }

  function buyNextDie() {
    if (state.diceCount >= CONFIG.maxDice) return;
    const nextDie = state.diceCount + 1;
    const cost = CONFIG.dieUnlockCosts[nextDie];
    if (state.points < cost) return;

    state.points -= cost;
    state.diceCount = nextDie;
    save();
    render(false);
  }

  function buyUpgrade(id) {
    const upgrade = generalUpgrade(id);
    if (!upgrade) return;
    const cost = upgradeCost(upgrade);
    if (state.points < cost) return;

    state.points -= cost;
    state.upgrades[id] = upgradeLevel(id) + 1;
    save();
    render(false);
  }

  function buyComboUpgrade(id) {
    const combo = CONFIG.combos.find((entry) => entry.id === id);
    if (!combo || state.diceCount < combo.minDice) return;
    const cost = comboUpgradeCost(combo);
    if (state.points < cost) return;

    state.points -= cost;
    state.comboUpgrades[id] = comboUpgradeLevel(id) + 1;
    save();
    render(false);
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
    const cost = CONFIG.dieUnlockCosts[nextDie];
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

  function renderCombos() {
    ui.combos.replaceChildren();
    CONFIG.combos.forEach((combo) => {
      const unlocked = state.diceCount >= combo.minDice;
      const row = document.createElement("div");
      row.className = `combo-row${unlocked ? "" : " is-locked"}`;
      row.innerHTML = `<span class="combo-name">${combo.name}</span><span class="combo-example">${combo.example}</span><span class="combo-multiplier">×${fmt(comboMultiplier(combo))}</span>`;
      if (!unlocked) row.title = `Disponible à partir de ${combo.minDice} dés`;
      ui.combos.appendChild(row);
    });
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
    const unlocked = state.diceCount >= combo.minDice;
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
      <p>${unlocked ? `Multiplicateur actuel : ×${fmt(comboMultiplier(combo))}` : `Débloqué avec ${combo.minDice} dés`}</p>
      <div class="upgrade-effect">Bonus propre ×${fmt(currentOwnFactor)} → <strong>×${fmt(nextOwnFactor)}</strong></div>
    `;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "upgrade-buy";
    button.disabled = !affordable;
    button.innerHTML = unlocked
      ? `<span>AMÉLIORER</span><strong>${fmt(cost)} pts</strong>`
      : `<span>VERROUILLÉ</span><strong>${combo.minDice} dés</strong>`;
    button.addEventListener("click", () => buyComboUpgrade(combo.id));

    card.append(info, button);
    return card;
  }

  function renderUpgrades() {
    ui.upgrades.replaceChildren();

    const balance = document.createElement("div");
    balance.className = "upgrade-balance";
    balance.innerHTML = `<span>Points disponibles</span><strong>${fmt(state.points)}</strong>`;
    ui.upgrades.appendChild(balance);

    const generalTitle = document.createElement("div");
    generalTitle.className = "upgrade-section-title";
    generalTitle.textContent = "Améliorations générales";
    ui.upgrades.appendChild(generalTitle);

    const generalList = document.createElement("div");
    generalList.className = "upgrade-stack";
    CONFIG.upgrades.forEach((upgrade) => generalList.appendChild(makeUpgradeCard(upgrade)));
    ui.upgrades.appendChild(generalList);

    const comboTitle = document.createElement("div");
    comboTitle.className = "upgrade-section-title";
    comboTitle.textContent = "Maîtrises individuelles";
    ui.upgrades.appendChild(comboTitle);

    const comboList = document.createElement("div");
    comboList.className = "upgrade-stack";
    CONFIG.combos.forEach((combo) => comboList.appendChild(makeComboUpgradeCard(combo)));
    ui.upgrades.appendChild(comboList);
  }

  function render(animate) {
    ui.points.textContent = fmt(state.points);
    ui.diceCount.textContent = state.diceCount;
    renderDice(animate);

    const result = state.lastResult;
    ui.sum.textContent = result ? fmt(result.sum) : "—";
    ui.combo.textContent = result ? result.comboName : "Aucune";
    ui.multiplier.textContent = `×${fmt(result ? result.multiplier : 1)}`;
    ui.gain.textContent = `+${fmt(result ? result.gain : 0)}`;

    ui.rolls.textContent = fmt(state.totalRolls);
    ui.earned.textContent = fmt(state.totalEarned);
    ui.best.textContent = fmt(state.bestGain);
    renderCombos();
    renderUpgrades();
  }

  function bindModal(openButton, modal, closeButton) {
    openButton.addEventListener("click", () => modal.showModal());
    closeButton.addEventListener("click", () => modal.close());
    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.close();
    });
  }

  ui.roll.addEventListener("click", roll);
  bindModal(ui.combosButton, ui.combosModal, ui.closeCombos);
  bindModal(ui.upgradesButton, ui.upgradesModal, ui.closeUpgrades);
  ui.reset.addEventListener("click", () => {
    if (!window.confirm("Réinitialiser toute la progression ?")) return;
    state = freshState();
    save();
    render(false);
  });

  render(false);
})();
