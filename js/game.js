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
    rolls: $("totalRollsValue"),
    earned: $("totalEarnedValue"),
    best: $("bestGainValue"),
    reset: $("resetButton")
  };

  const freshState = () => ({
    points: 0,
    diceCount: 1,
    totalRolls: 0,
    totalEarned: 0,
    bestGain: 0,
    lastRoll: [],
    lastResult: null
  });

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!saved) return freshState();
      return {
        ...freshState(),
        ...saved,
        diceCount: Math.max(1, Math.min(CONFIG.maxDice, Number(saved.diceCount) || 1))
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
      .sort((a, b) => b.multiplier - a.multiplier)[0] || null;
  }

  function roll() {
    const values = Array.from(
      { length: state.diceCount },
      () => Math.floor(Math.random() * CONFIG.dieFaces) + 1
    );
    const sum = values.reduce((a, b) => a + b, 0);
    const combo = bestCombo(values);
    const multiplier = combo ? combo.multiplier : 1;
    const gain = sum * multiplier;

    state.lastRoll = values;
    state.lastResult = {
      sum,
      comboName: combo ? combo.name : "Aucune",
      multiplier,
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
      row.innerHTML = `<span class="combo-name">${combo.name}</span><span class="combo-example">${combo.example}</span><span class="combo-multiplier">×${combo.multiplier}</span>`;
      if (!unlocked) row.title = `Disponible à partir de ${combo.minDice} dés`;
      ui.combos.appendChild(row);
    });
  }

  function render(animate) {
    ui.points.textContent = fmt(state.points);
    ui.diceCount.textContent = state.diceCount;
    renderDice(animate);

    const result = state.lastResult;
    ui.sum.textContent = result ? fmt(result.sum) : "—";
    ui.combo.textContent = result ? result.comboName : "Aucune";
    ui.multiplier.textContent = `×${result ? result.multiplier : 1}`;
    ui.gain.textContent = `+${fmt(result ? result.gain : 0)}`;

    ui.rolls.textContent = fmt(state.totalRolls);
    ui.earned.textContent = fmt(state.totalEarned);
    ui.best.textContent = fmt(state.bestGain);
    renderCombos();
  }

  ui.roll.addEventListener("click", roll);
  ui.combosButton.addEventListener("click", () => ui.combosModal.showModal());
  ui.closeCombos.addEventListener("click", () => ui.combosModal.close());
  ui.combosModal.addEventListener("click", (event) => {
    if (event.target === ui.combosModal) ui.combosModal.close();
  });
  ui.reset.addEventListener("click", () => {
    if (!window.confirm("Réinitialiser toute la progression ?")) return;
    state = freshState();
    save();
    render(false);
  });

  render(false);
})();
