(() => {
  "use strict";

  const CONFIG = window.NightIdleConfig;
  if (!CONFIG) return;

  const SAVE_KEY = "nightIdle.save.v1";
  const STATS_VERSION = 1;
  const BUILD = "20260914-stats1";
  const storageProto = window.Storage?.prototype;
  const inheritedSetItem = storageProto?.setItem;

  function number(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }

  function integer(value) {
    return Math.max(0, Math.floor(number(value)));
  }

  function runPoints(save) {
    return Math.max(0, number(save?.runPointsEarned ?? save?.totalEarned));
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

  function freshStats(save = null, seedLegacy = false) {
    const rolls = seedLegacy ? integer(save?.totalRolls) : 0;
    const points = seedLegacy ? runPoints(save) : 0;
    const gems = seedLegacy ? integer(save?.gems) : 0;
    const best = seedLegacy ? Math.max(0, number(save?.bestGain)) : 0;

    return {
      statsVersion: STATS_VERSION,
      createdAt: Date.now(),
      totalRolls: rolls,
      manualRolls: 0,
      autoRolls: 0,
      offlineRolls: 0,
      unclassifiedRolls: rolls,
      totalPointsEarned: points,
      offlinePoints: 0,
      totalGemsEarned: gems,
      bestPrestigeGems: 0,
      bestGain: best,
      noComboRolls: 0,
      comboCounts: emptyComboCounts(),
      trackedRunRolls: integer(save?.totalRolls),
      trackedRunPoints: runPoints(save),
      trackedPrestigeCount: integer(save?.prestigeCount),
      lastUpdatedAt: Date.now()
    };
  }

  function normalizeExistingStats(raw, save) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return freshStats(save, true);
    }

    const base = freshStats(null, false);
    const stats = {
      ...base,
      ...raw,
      statsVersion: STATS_VERSION,
      comboCounts: { ...base.comboCounts, ...(raw.comboCounts || {}) }
    };

    const currentPrestige = integer(save?.prestigeCount);
    const trackedPrestige = integer(stats.trackedPrestigeCount);

    // offline.js s'exécute avant ce module. S'il a ajouté une période hors ligne,
    // les compteurs du run ont avancé alors que les marqueurs globaux sont restés
    // sur la sauvegarde de départ. On récupère donc exactement ce delta ici.
    if (trackedPrestige === currentPrestige) {
      const rollDelta = Math.max(0, integer(save?.totalRolls) - integer(stats.trackedRunRolls));
      const pointDelta = Math.max(0, runPoints(save) - number(stats.trackedRunPoints));

      if (rollDelta > 0 || pointDelta > 0) {
        stats.totalRolls = integer(stats.totalRolls) + rollDelta;
        stats.offlineRolls = integer(stats.offlineRolls) + rollDelta;
        stats.totalPointsEarned = Math.max(0, number(stats.totalPointsEarned)) + pointDelta;
        stats.offlinePoints = Math.max(0, number(stats.offlinePoints)) + pointDelta;
      }
    }

    CONFIG.combos.forEach((combo) => {
      stats.comboCounts[combo.id] = Math.max(0, number(stats.comboCounts[combo.id]));
    });

    stats.totalRolls = integer(stats.totalRolls);
    stats.manualRolls = integer(stats.manualRolls);
    stats.autoRolls = integer(stats.autoRolls);
    stats.offlineRolls = integer(stats.offlineRolls);
    stats.unclassifiedRolls = integer(stats.unclassifiedRolls);
    stats.noComboRolls = integer(stats.noComboRolls);
    stats.totalPointsEarned = Math.max(0, number(stats.totalPointsEarned));
    stats.offlinePoints = Math.max(0, number(stats.offlinePoints));
    stats.totalGemsEarned = integer(stats.totalGemsEarned);
    stats.bestPrestigeGems = integer(stats.bestPrestigeGems);
    stats.bestGain = Math.max(0, number(stats.bestGain));
    stats.trackedRunRolls = integer(save?.totalRolls);
    stats.trackedRunPoints = runPoints(save);
    stats.trackedPrestigeCount = currentPrestige;
    stats.lastUpdatedAt = Date.now();
    return stats;
  }

  let previousSave = readSave();
  let stats = normalizeExistingStats(previousSave?.globalStats, previousSave);
  let manualIntent = false;
  let resetIntent = false;
  let latestSave = previousSave;

  function comboIdFromName(name) {
    return CONFIG.combos.find((combo) => combo.name === name)?.id || null;
  }

  function cloneForTracking(save) {
    if (!save || typeof save !== "object") return null;
    return {
      points: number(save.points),
      gems: integer(save.gems),
      prestigeCount: integer(save.prestigeCount),
      totalRolls: integer(save.totalRolls),
      runPointsEarned: runPoints(save),
      bestGain: Math.max(0, number(save.bestGain)),
      lastResult: save.lastResult ? { ...save.lastResult } : null,
      globalStats: save.globalStats
    };
  }

  function processSave(nextSave) {
    const prev = previousSave || {};

    if (resetIntent) {
      stats = freshStats(nextSave, false);
      resetIntent = false;
      manualIntent = false;
    } else {
      const previousPrestige = integer(prev.prestigeCount);
      const nextPrestige = integer(nextSave.prestigeCount);
      const rollDelta = integer(nextSave.totalRolls) - integer(prev.totalRolls);
      const pointDelta = runPoints(nextSave) - runPoints(prev);

      if (rollDelta > 0) {
        stats.totalRolls += rollDelta;
        if (pointDelta > 0) stats.totalPointsEarned += pointDelta;

        if (rollDelta === 1) {
          if (manualIntent) stats.manualRolls += 1;
          else stats.autoRolls += 1;

          const comboName = nextSave.lastResult?.comboName;
          const comboId = comboIdFromName(comboName);
          if (comboId) stats.comboCounts[comboId] = number(stats.comboCounts[comboId]) + 1;
          else stats.noComboRolls += 1;
        } else {
          // Un delta groupé hors du boot n'est normalement pas attendu. On le garde
          // séparé plutôt que d'inventer une origine.
          stats.unclassifiedRolls += rollDelta;
        }
      }

      if (nextPrestige > previousPrestige) {
        const gemReward = Math.max(0, integer(nextSave.gems) - integer(prev.gems));
        stats.totalGemsEarned += gemReward;
        stats.bestPrestigeGems = Math.max(stats.bestPrestigeGems, gemReward);
      }

      stats.bestGain = Math.max(stats.bestGain, Math.max(0, number(nextSave.bestGain)), Math.max(0, number(nextSave.lastResult?.gain)));
      manualIntent = false;
    }

    stats.trackedRunRolls = integer(nextSave.totalRolls);
    stats.trackedRunPoints = runPoints(nextSave);
    stats.trackedPrestigeCount = integer(nextSave.prestigeCount);
    stats.lastUpdatedAt = Date.now();
    nextSave.globalStats = stats;
    latestSave = nextSave;
  }

  function persistStatsIntoCurrentSave() {
    if (!previousSave || !inheritedSetItem) return;
    try {
      previousSave.globalStats = stats;
      inheritedSetItem.call(localStorage, SAVE_KEY, JSON.stringify(previousSave));
      latestSave = previousSave;
    } catch (error) {
      console.warn("[Night Idle] Initialisation des statistiques impossible", error);
    }
  }

  persistStatsIntoCurrentSave();

  if (storageProto && inheritedSetItem) {
    storageProto.setItem = function nightIdleStatsSetItem(key, value) {
      if (this === localStorage && key === SAVE_KEY) {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === "object") {
            processSave(parsed);
            previousSave = cloneForTracking(parsed);
            const result = inheritedSetItem.call(this, key, JSON.stringify(parsed));
            if (statsModal?.open) renderStats();
            return result;
          }
        } catch (error) {
          console.warn("[Night Idle] Tracking statistiques ignoré pour cette sauvegarde", error);
        }
      }
      return inheritedSetItem.call(this, key, value);
    };
  }

  const rollButton = document.getElementById("rollButton");
  rollButton?.addEventListener("click", () => {
    manualIntent = true;
  }, { capture: true });

  const resetButton = document.getElementById("resetButton");
  resetButton?.addEventListener("click", () => {
    resetIntent = true;
  }, { capture: true });

  // --- UI statistiques ----------------------------------------------------
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = `stats.css?v=${BUILD}`;
  document.head.appendChild(stylesheet);

  const footerButtons = document.querySelector(".footer-buttons");
  const prestigeButton = document.getElementById("prestigeButton");
  let statsButton = null;
  let statsModal = null;

  if (footerButtons && !document.getElementById("statsButton")) {
    statsButton = document.createElement("button");
    statsButton.id = "statsButton";
    statsButton.className = "prestige-button stats-button";
    statsButton.type = "button";
    statsButton.textContent = "STATS";
    statsButton.setAttribute("aria-haspopup", "dialog");
    footerButtons.insertBefore(statsButton, prestigeButton || footerButtons.firstChild);
  }

  if (!document.getElementById("statsModal")) {
    statsModal = document.createElement("dialog");
    statsModal.id = "statsModal";
    statsModal.className = "modal stats-modal";
    statsModal.setAttribute("aria-labelledby", "statsTitle");
    statsModal.innerHTML = `
      <div class="modal-card stats-modal-card">
        <div class="modal-header">
          <div>
            <p class="eyebrow">PROGRESSION GLOBALE</p>
            <h2 id="statsTitle">Statistiques</h2>
          </div>
          <button id="closeStatsButton" class="modal-close" type="button" aria-label="Fermer">×</button>
        </div>
        <div class="stats-modal-scroll modal-scroll">
          <div id="lifetimeStatsGrid" class="lifetime-stats-grid"></div>
          <h3 class="stats-subtitle">Origine des lancers</h3>
          <div id="rollStatsGrid" class="lifetime-stats-grid compact"></div>
          <h3 class="stats-subtitle">Combinaisons obtenues</h3>
          <p class="stats-note">Les occurrences de combos comptent uniquement les lancers réellement joués. Le revenu hors ligne utilise une espérance statistique et n'invente donc pas de combos individuels.</p>
          <div id="comboStatsList" class="combo-stats-list"></div>
        </div>
      </div>`;
    document.body.appendChild(statsModal);
  } else {
    statsModal = document.getElementById("statsModal");
  }

  function fmt(value) {
    return new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 2 }).format(number(value));
  }

  function statCard(label, value) {
    return `<div class="lifetime-stat-card"><span>${label}</span><strong>${value}</strong></div>`;
  }

  function renderStats() {
    const save = latestSave || readSave() || {};
    const lifetimeGrid = document.getElementById("lifetimeStatsGrid");
    const rollGrid = document.getElementById("rollStatsGrid");
    const comboList = document.getElementById("comboStatsList");
    if (!lifetimeGrid || !rollGrid || !comboList) return;

    const gemsSpent = Math.max(0, integer(stats.totalGemsEarned) - integer(save.gems));

    lifetimeGrid.innerHTML = [
      statCard("Lancers totaux", fmt(stats.totalRolls)),
      statCard("Points gagnés", fmt(stats.totalPointsEarned)),
      statCard("Prestiges", fmt(save.prestigeCount)),
      statCard("Gemmes gagnées", fmt(stats.totalGemsEarned)),
      statCard("Gemmes dépensées", fmt(gemsSpent)),
      statCard("Meilleur Prestige", `+${fmt(stats.bestPrestigeGems)} 💎`),
      statCard("Meilleur gain", fmt(stats.bestGain)),
      statCard("Points hors ligne", fmt(stats.offlinePoints))
    ].join("");

    rollGrid.innerHTML = [
      statCard("Manuels", fmt(stats.manualRolls)),
      statCard("Auto Clicker", fmt(stats.autoRolls)),
      statCard("Hors ligne", fmt(stats.offlineRolls)),
      statCard("Anciens / non classés", fmt(stats.unclassifiedRolls))
    ].join("");

    comboList.replaceChildren();
    CONFIG.combos.forEach((combo) => {
      const row = document.createElement("div");
      row.className = "combo-stat-row";
      row.innerHTML = `<span>${combo.name}</span><strong>${fmt(stats.comboCounts[combo.id])}</strong>`;
      comboList.appendChild(row);
    });

    const noCombo = document.createElement("div");
    noCombo.className = "combo-stat-row muted-row";
    noCombo.innerHTML = `<span>Sans combinaison</span><strong>${fmt(stats.noComboRolls)}</strong>`;
    comboList.appendChild(noCombo);
  }

  statsButton?.addEventListener("click", () => {
    renderStats();
    if (!statsModal.open) statsModal.showModal();
  });

  document.getElementById("closeStatsButton")?.addEventListener("click", () => statsModal.close());
  statsModal?.addEventListener("click", (event) => {
    if (event.target === statsModal) statsModal.close();
  });

  renderStats();
  window.NightIdleStats = Object.freeze({ version: STATS_VERSION, render: renderStats });
})();
