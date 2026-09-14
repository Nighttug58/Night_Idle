(() => {
  "use strict";

  const CONFIG = window.NightIdleConfig;
  const DATA = window.NightIdleChallengeData;
  if (!CONFIG || !DATA) return;

  const SAVE_KEY = "nightIdle.save.v1";
  const BUILD = "20260914-contracts1";
  const STATE_VERSION = 1;
  const RECENT_LIMIT = 24;
  const storageProto = window.Storage?.prototype;
  const inheritedSetItem = storageProto?.setItem;
  const comboByName = new Map(CONFIG.combos.map((combo) => [combo.name, combo.id]));
  const contractById = new Map(DATA.contracts.map((contract) => [contract.id, contract]));
  const difficultyById = new Map(DATA.difficulties.map((difficulty) => [difficulty.id, difficulty]));

  function num(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function int(value) {
    return Math.max(0, Math.floor(num(value)));
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

  function emptyComboCounts() {
    return Object.fromEntries(CONFIG.combos.map((combo) => [combo.id, 0]));
  }

  function freshRunMetrics() {
    return {
      rolls: 0,
      manualRolls: 0,
      autoRolls: 0,
      offlineRolls: 0,
      combosTotal: 0,
      comboCounts: emptyComboCounts(),
      anomalies: 0,
      mutations: 0,
      doubleMutationRolls: 0,
      frenzyPeak: 1,
      frenzy10Rolls: 0,
      frenzy20Rolls: 0
    };
  }

  function freshState(save = null) {
    return {
      version: STATE_VERSION,
      tokens: 0,
      totalTokensEarned: 0,
      active: null,
      offers: [],
      recentIds: [],
      completed: {},
      completedByDifficulty: Object.fromEntries(DATA.difficulties.map((difficulty) => [difficulty.id, 0])),
      failed: 0,
      runPrestige: int(save?.prestigeCount),
      run: freshRunMetrics(),
      updatedAt: Date.now()
    };
  }

  function normalize(raw, save) {
    const base = freshState(save);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
    const state = {
      ...base,
      ...raw,
      version: STATE_VERSION,
      active: raw.active && typeof raw.active === "object" ? { ...raw.active } : null,
      offers: Array.isArray(raw.offers) ? raw.offers.filter((id) => contractById.has(id)) : [],
      recentIds: Array.isArray(raw.recentIds) ? raw.recentIds.filter((id) => contractById.has(id)).slice(-RECENT_LIMIT) : [],
      completed: { ...(raw.completed || {}) },
      completedByDifficulty: { ...base.completedByDifficulty, ...(raw.completedByDifficulty || {}) },
      run: {
        ...base.run,
        ...(raw.run || {}),
        comboCounts: { ...base.run.comboCounts, ...(raw.run?.comboCounts || {}) }
      }
    };
    state.tokens = int(state.tokens);
    state.totalTokensEarned = int(state.totalTokensEarned);
    state.failed = int(state.failed);
    state.runPrestige = int(state.runPrestige);
    Object.keys(state.completed).forEach((id) => { state.completed[id] = int(state.completed[id]); });
    DATA.difficulties.forEach((difficulty) => {
      state.completedByDifficulty[difficulty.id] = int(state.completedByDifficulty[difficulty.id]);
    });
    Object.keys(state.run.comboCounts).forEach((id) => { state.run.comboCounts[id] = int(state.run.comboCounts[id]); });
    ["rolls", "manualRolls", "autoRolls", "offlineRolls", "combosTotal", "anomalies", "mutations", "doubleMutationRolls", "frenzy10Rolls", "frenzy20Rolls"].forEach((key) => {
      state.run[key] = int(state.run[key]);
    });
    state.run.frenzyPeak = Math.max(1, num(state.run.frenzyPeak));
    if (state.active && !contractById.has(state.active.id)) state.active = null;
    return state;
  }

  let lastSave = readSave();
  let state = normalize(lastSave?.challengeState, lastSave);
  let manualIntent = false;
  let integrationsInstalled = false;
  let mutationWrapped = false;
  let eventsWrapped = false;
  let toastTimer = 0;

  function difficulty(id) {
    return difficultyById.get(id) || DATA.difficulties[0];
  }

  function generateOffers() {
    const recent = new Set(state.recentIds);
    const offers = [];

    DATA.difficulties.forEach((tier) => {
      const all = DATA.contracts.filter((contract) => contract.difficulty === tier.id);
      let pool = all.filter((contract) => !recent.has(contract.id));
      if (!pool.length) pool = all;
      const picked = pool[Math.floor(Math.random() * pool.length)];
      if (picked) offers.push(picked.id);
    });

    state.offers = offers;
    state.recentIds = [...state.recentIds, ...offers].slice(-RECENT_LIMIT);
    return offers;
  }

  function totalUpgradeLevels(save) {
    const general = Object.values(save?.upgrades || {}).reduce((sum, value) => sum + Math.max(0, num(value)), 0);
    const masteries = Object.values(save?.comboUpgrades || {}).reduce((sum, value) => sum + Math.max(0, num(value)), 0);
    return general + masteries;
  }

  function comboMasteryTotal(save) {
    return Object.values(save?.comboUpgrades || {}).reduce((sum, value) => sum + Math.max(0, num(value)), 0);
  }

  function comboGroupValue(key) {
    return (DATA.comboGroups[key] || []).reduce((sum, id) => sum + int(state.run.comboCounts[id]), 0);
  }

  function distinctCombos() {
    return CONFIG.combos.filter((combo) => int(state.run.comboCounts[combo.id]) > 0).length;
  }

  function constraintBlocked(contract) {
    if (contract?.constraint === "noAuto") {
      return state.run.autoRolls > 0 || state.run.offlineRolls > 0;
    }
    return false;
  }

  function metricValue(contract, save) {
    switch (contract.source) {
      case "rolls": return state.run.rolls;
      case "manualRolls": return state.run.manualRolls;
      case "autoRolls": return state.run.autoRolls;
      case "combosTotal": return state.run.combosTotal;
      case "combo": return int(state.run.comboCounts[contract.key]);
      case "comboGroup": return comboGroupValue(contract.key);
      case "distinctCombos": return distinctCombos();
      case "runPoints": return Math.max(0, num(save?.runPointsEarned ?? save?.totalEarned));
      case "frenzyPeak": return state.run.frenzyPeak;
      case "anomalies": return state.run.anomalies;
      case "mutations": return state.run.mutations;
      case "doubleMutationRolls": return state.run.doubleMutationRolls;
      case "frenzy10Rolls": return state.run.frenzy10Rolls;
      case "frenzy20Rolls": return state.run.frenzy20Rolls;
      case "upgradeTotal": return totalUpgradeLevels(save);
      case "comboMasteryTotal": return comboMasteryTotal(save);
      default: return 0;
    }
  }

  function progressFor(contract, save) {
    const value = metricValue(contract, save);
    const blocked = constraintBlocked(contract);
    return {
      value,
      target: contract.target,
      blocked,
      ratio: blocked ? 0 : Math.max(0, Math.min(1, value / Math.max(1e-9, contract.target)))
    };
  }

  function showToast(title, subtitle, type = "complete") {
    const toast = document.getElementById("challengeToast");
    if (!toast) return;
    toast.className = `challenge-toast ${type}`;
    toast.innerHTML = `<strong>${title}</strong><span>${subtitle}</span>`;
    toast.classList.remove("is-showing");
    void toast.offsetWidth;
    toast.classList.add("is-showing");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-showing"), 2600);
  }

  function evaluate(save = readSave(), notify = true) {
    if (!state.active || state.active.completed || !save) return false;
    const contract = contractById.get(state.active.id);
    if (!contract) return false;
    const progress = progressFor(contract, save);
    if (progress.blocked || progress.value < contract.target) return false;

    const tier = difficulty(contract.difficulty);
    state.active.completed = true;
    state.active.completedAt = Date.now();
    state.active.reward = tier.reward;
    state.tokens += tier.reward;
    state.totalTokensEarned += tier.reward;
    state.completed[contract.id] = int(state.completed[contract.id]) + 1;
    state.completedByDifficulty[contract.difficulty] = int(state.completedByDifficulty[contract.difficulty]) + 1;
    state.updatedAt = Date.now();
    if (notify) showToast("CONTRAT TERMINÉ", `${contract.name} · +${tier.reward} DT`);
    window.dispatchEvent(new CustomEvent("nightidle:challenge-complete", { detail: { contract, reward: tier.reward } }));
    return true;
  }

  function persistDirect() {
    if (!inheritedSetItem) return;
    try {
      const save = readSave();
      if (!save) return;
      evaluate(save, true);
      state.updatedAt = Date.now();
      save.challengeState = state;
      inheritedSetItem.call(localStorage, SAVE_KEY, JSON.stringify(save));
      lastSave = save;
      renderAll();
    } catch (error) {
      console.warn("[Night Idle] Sauvegarde des Défis impossible", error);
    }
  }

  function failCurrentContract() {
    if (state.active && !state.active.completed) {
      const contract = contractById.get(state.active.id);
      state.failed += 1;
      if (contract) showToast("CONTRAT ÉCHOUÉ", contract.name, "failed");
    }
    state.active = null;
  }

  function handlePrestige(nextSave) {
    failCurrentContract();
    state.run = freshRunMetrics();
    state.runPrestige = int(nextSave.prestigeCount);
    generateOffers();
    state.updatedAt = Date.now();
    setTimeout(() => {
      renderAll();
      openModal();
    }, 70);
  }

  function trackRollDelta(previous, next) {
    const prevRolls = int(previous?.totalRolls);
    const nextRolls = int(next?.totalRolls);
    const delta = nextRolls - prevRolls;
    if (delta <= 0) {
      manualIntent = false;
      return;
    }

    if (delta === 1) {
      state.run.rolls += 1;
      if (manualIntent) state.run.manualRolls += 1;
      else state.run.autoRolls += 1;

      const comboId = comboByName.get(next?.lastResult?.comboName);
      if (comboId) {
        state.run.comboCounts[comboId] = int(state.run.comboCounts[comboId]) + 1;
        state.run.combosTotal += 1;
      }

      const frenzy = Math.max(1, num(window.NightIdleFrenzy?.multiplier?.()));
      state.run.frenzyPeak = Math.max(state.run.frenzyPeak, frenzy);
      if (frenzy >= 10) state.run.frenzy10Rolls += 1;
      if (frenzy >= 20) state.run.frenzy20Rolls += 1;
    } else {
      state.run.offlineRolls += delta;
    }
    manualIntent = false;
  }

  if (storageProto && inheritedSetItem) {
    storageProto.setItem = function nightIdleChallengeSetItem(key, value) {
      if (this === localStorage && key === SAVE_KEY) {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === "object") {
            const previous = lastSave || readSave() || {};
            const prevPrestige = int(previous.prestigeCount);
            const nextPrestige = int(parsed.prestigeCount);

            if (nextPrestige > prevPrestige) {
              handlePrestige(parsed);
            } else {
              trackRollDelta(previous, parsed);
            }

            evaluate(parsed, true);
            parsed.challengeState = state;
            const result = inheritedSetItem.call(this, key, JSON.stringify(parsed));
            lastSave = parsed;
            renderAll();
            return result;
          }
        } catch (error) {
          console.warn("[Night Idle] Tracking des Défis ignoré", error);
        }
      }
      return inheritedSetItem.call(this, key, value);
    };
  }

  document.getElementById("rollButton")?.addEventListener("click", () => {
    manualIntent = true;
  }, { capture: true });

  function installEventWrapper() {
    const base = window.NightIdleEvents;
    if (!base || base.__challengeWrapped) return;
    window.NightIdleEvents = Object.freeze({
      ...base,
      __challengeWrapped: true,
      onRollComplete: (...args) => {
        const result = base.onRollComplete(...args);
        if (result) {
          state.run.anomalies += 1;
          evaluate(readSave(), true);
        }
        return result;
      }
    });
    eventsWrapped = true;
  }

  function installMutationWrapper() {
    const base = window.NightIdleMutations;
    if (!base || base.__challengeWrapped) return;
    window.NightIdleMutations = Object.freeze({
      ...base,
      __challengeWrapped: true,
      beforeRoll: (...args) => {
        const result = base.beforeRoll(...args);
        const current = base.active?.() || [];
        if (Array.isArray(current) && current.length >= 2) state.run.doubleMutationRolls += 1;
        return result;
      }
    });
    mutationWrapped = true;
  }

  window.addEventListener("nightidle:mutation-spawn", () => {
    state.run.mutations += 1;
    evaluate(readSave(), true);
  });

  const integrationTimer = setInterval(() => {
    installEventWrapper();
    installMutationWrapper();
    if (eventsWrapped && mutationWrapped) {
      integrationsInstalled = true;
      clearInterval(integrationTimer);
    }
  }, 40);

  setInterval(() => {
    const frenzy = Math.max(1, num(window.NightIdleFrenzy?.multiplier?.()));
    if (frenzy > state.run.frenzyPeak) {
      state.run.frenzyPeak = frenzy;
      persistDirect();
    }
  }, 500);

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = `challenges.css?v=${BUILD}`;
  document.head.appendChild(stylesheet);

  const toast = document.createElement("div");
  toast.id = "challengeToast";
  toast.className = "challenge-toast";
  toast.setAttribute("aria-live", "polite");
  document.body.appendChild(toast);

  const footerButtons = document.querySelector(".footer-buttons");
  const prestigeButton = document.getElementById("prestigeButton");
  let challengeButton = document.getElementById("challengeButton");
  if (footerButtons && !challengeButton) {
    challengeButton = document.createElement("button");
    challengeButton.id = "challengeButton";
    challengeButton.className = "prestige-button challenge-button";
    challengeButton.type = "button";
    challengeButton.textContent = "DÉFIS";
    challengeButton.setAttribute("aria-haspopup", "dialog");
    footerButtons.insertBefore(challengeButton, prestigeButton || footerButtons.firstChild);
  }

  let modal = document.getElementById("challengeModal");
  if (!modal) {
    modal = document.createElement("dialog");
    modal.id = "challengeModal";
    modal.className = "modal challenge-modal";
    modal.setAttribute("aria-labelledby", "challengeTitle");
    modal.innerHTML = `
      <div class="modal-card challenge-modal-card">
        <div class="modal-header">
          <div>
            <p class="eyebrow">CONTRATS DE RUN</p>
            <h2 id="challengeTitle">Défis</h2>
          </div>
          <button id="closeChallengeButton" class="modal-close" type="button" aria-label="Fermer">×</button>
        </div>
        <div id="challengeSummary" class="challenge-summary"></div>
        <div id="challengeBody" class="challenge-body modal-scroll"></div>
      </div>`;
    document.body.appendChild(modal);
  }

  function fmt(value, compact = false) {
    return new Intl.NumberFormat("fr-CH", compact ? { notation: "compact", maximumFractionDigits: 1 } : { maximumFractionDigits: 2 }).format(num(value));
  }

  function formatMetric(contract, value) {
    if (contract.source === "runPoints") return fmt(value, true);
    if (contract.source === "frenzyPeak") return `×${fmt(value)}`;
    return fmt(value);
  }

  function totalCompletions() {
    return Object.values(state.completed).reduce((sum, value) => sum + int(value), 0);
  }

  function renderSummary() {
    const node = document.getElementById("challengeSummary");
    if (!node) return;
    node.innerHTML = `
      <div><span>Tokens de Défi</span><strong>${fmt(state.tokens)} DT</strong></div>
      <div><span>DT gagnés</span><strong>${fmt(state.totalTokensEarned)}</strong></div>
      <div><span>Contrats terminés</span><strong>${fmt(totalCompletions())}</strong></div>
      <div><span>Contrats échoués</span><strong>${fmt(state.failed)}</strong></div>`;
  }

  function activeCard(save) {
    const contract = contractById.get(state.active?.id);
    if (!contract) return "";
    const tier = difficulty(contract.difficulty);
    const progress = progressFor(contract, save);
    const complete = Boolean(state.active.completed);
    return `
      <section class="challenge-active difficulty-${tier.id}${complete ? " is-complete" : progress.blocked ? " is-failed" : ""}">
        <div class="challenge-tier-line"><span>${tier.name}</span><strong>+${tier.reward} DT</strong></div>
        <h3>${contract.name}</h3>
        <p>${contract.description}</p>
        <div class="challenge-progress-line">
          <span>${complete ? "TERMINÉ" : progress.blocked ? "CONDITION BRISÉE" : formatMetric(contract, progress.value)}</span>
          <strong>${formatMetric(contract, contract.target)}</strong>
        </div>
        <div class="challenge-progress"><i style="transform:scaleX(${complete ? 1 : progress.ratio})"></i></div>
        ${contract.constraint === "noAuto" ? `<small>⚠ Aucun Auto Clicker ni revenu hors ligne autorisé pendant ce contrat.</small>` : ""}
      </section>`;
  }

  function selectContract(id) {
    if (state.active || !state.offers.includes(id)) return;
    const contract = contractById.get(id);
    if (!contract) return;
    state.active = {
      id,
      startedAt: Date.now(),
      startedPrestige: state.runPrestige,
      completed: false
    };
    state.offers = [];
    persistDirect();
    showToast("CONTRAT ACCEPTÉ", `${difficulty(contract.difficulty).name} · ${contract.name}`, "accepted");
    renderAll();
  }

  function offerCards() {
    return state.offers.map((id) => {
      const contract = contractById.get(id);
      if (!contract) return "";
      const tier = difficulty(contract.difficulty);
      return `
        <article class="challenge-offer difficulty-${tier.id}">
          <div class="challenge-tier-line"><span>${tier.name}</span><strong>+${tier.reward} DT</strong></div>
          <h3>${contract.name}</h3>
          <p>${contract.description}</p>
          ${contract.constraint === "noAuto" ? `<small>Sans Auto Clicker ni revenu hors ligne.</small>` : ""}
          <button class="challenge-accept" type="button" data-contract-id="${contract.id}">ACCEPTER</button>
        </article>`;
    }).join("");
  }

  function renderBody() {
    const body = document.getElementById("challengeBody");
    if (!body) return;
    const save = readSave() || lastSave || {};

    if (state.active) {
      body.innerHTML = `
        <p class="challenge-note">Un seul contrat peut être actif par run. Il doit être terminé avant ton prochain Prestige.</p>
        ${activeCard(save)}`;
      return;
    }

    if (state.offers.length) {
      body.innerHTML = `
        <p class="challenge-note">Choisis une difficulté pour ce run. Tu ne pourras plus changer de contrat jusqu'au prochain Prestige.</p>
        <div class="challenge-offers">${offerCards()}</div>`;
      body.querySelectorAll("[data-contract-id]").forEach((button) => {
        button.addEventListener("click", () => selectContract(button.dataset.contractId));
      });
      return;
    }

    body.innerHTML = `
      <div class="challenge-empty">
        <strong>Aucun contrat disponible</strong>
        <span>Effectue un Prestige pour recevoir 6 nouvelles propositions, une par difficulté.</span>
      </div>`;
  }

  function renderButton() {
    if (!challengeButton) return;
    const save = readSave() || lastSave || {};
    if (state.active) {
      const contract = contractById.get(state.active.id);
      const progress = contract ? progressFor(contract, save) : { ratio: 0 };
      challengeButton.textContent = state.active.completed ? "DÉFI ✓" : `DÉFI ${Math.floor(progress.ratio * 100)}%`;
    } else if (state.offers.length) {
      challengeButton.textContent = "DÉFIS !";
    } else {
      challengeButton.textContent = "DÉFIS";
    }
  }

  function renderAll() {
    renderSummary();
    renderBody();
    renderButton();
  }

  function openModal() {
    renderAll();
    if (modal && !modal.open) modal.showModal();
  }

  challengeButton?.addEventListener("click", openModal);
  document.getElementById("closeChallengeButton")?.addEventListener("click", () => modal.close());
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });

  if (!state.active && !state.offers.length && int(lastSave?.prestigeCount) > 0) {
    state.runPrestige = int(lastSave.prestigeCount);
    generateOffers();
    persistDirect();
  }

  renderAll();

  window.NightIdleChallenges = Object.freeze({
    version: STATE_VERSION,
    data: DATA,
    tokens: () => state.tokens,
    totalTokensEarned: () => state.totalTokensEarned,
    active: () => state.active ? { ...state.active } : null,
    offers: () => [...state.offers],
    progress: () => {
      const contract = contractById.get(state.active?.id);
      return contract ? progressFor(contract, readSave() || lastSave || {}) : null;
    },
    evaluate: () => evaluate(readSave(), false),
    open: openModal
  });
})();
