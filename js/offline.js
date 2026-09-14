(() => {
  "use strict";

  const CONFIG = window.NightIdleConfig;
  if (!CONFIG) return;

  const SAVE_KEY = "nightIdle.save.v1";
  const SNAPSHOT_KEY = "nightIdle.offline.snapshot.v1";
  const PENDING_KEY = "nightIdle.offline.pending.v1";
  const minimumOfflineMs = Math.max(0, Number(CONFIG?.prestige?.minimumOfflineMs) || 0);

  const storageProto = window.Storage?.prototype;
  const nativeSetItem = storageProto?.setItem;
  const nativeRemoveItem = storageProto?.removeItem;

  function nativeWrite(storage, key, value) {
    if (nativeSetItem) return nativeSetItem.call(storage, key, value);
    return storage.setItem(key, value);
  }

  function nativeRemove(storage, key) {
    if (nativeRemoveItem) return nativeRemoveItem.call(storage, key);
    return storage.removeItem(key);
  }

  function readJson(storage, key) {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("[Night Idle] Lecture stockage offline impossible", error);
      return null;
    }
  }

  function writeSave(save, timestamp = Date.now()) {
    if (!save || typeof save !== "object") return false;
    try {
      const payload = { ...save, lastSaveAt: timestamp };
      nativeWrite(localStorage, SAVE_KEY, JSON.stringify(payload));
      return true;
    } catch (error) {
      console.warn("[Night Idle] Écriture sauvegarde offline impossible", error);
      return false;
    }
  }

  function prestigeUpgrade(id) {
    return CONFIG.prestigeShop.find((upgrade) => upgrade.id === id);
  }

  function prestigeLevel(save, id) {
    const upgrade = prestigeUpgrade(id);
    if (!upgrade) return 0;
    const raw = Math.max(0, Math.floor(Number(save?.prestigeUpgrades?.[id]) || 0));
    return Math.min(upgrade.maxLevel, raw);
  }

  function generalLevel(save, id) {
    return Math.max(0, Number(save?.upgrades?.[id]) || 0);
  }

  function comboLevel(save, id) {
    return Math.max(0, Number(save?.comboUpgrades?.[id]) || 0);
  }

  function comboUnlocked(save, id) {
    return save?.comboUnlocks?.[id] === true;
  }

  function autoClickInterval(save) {
    const upgrade = prestigeUpgrade("auto_clicker");
    const level = prestigeLevel(save, "auto_clicker");
    return level > 0 ? Number(upgrade?.intervalsMs?.[level]) || 0 : 0;
  }

  function offlineEfficiency(save) {
    const upgrade = prestigeUpgrade("offline_income");
    const level = prestigeLevel(save, "offline_income");
    return Math.min(1, level * (Number(upgrade?.efficiencyPerLevel) || 0));
  }

  function reserveMinutes(save) {
    const upgrade = prestigeUpgrade("time_reserve");
    const level = prestigeLevel(save, "time_reserve");
    return Math.max(10, Number(upgrade?.valuesMinutes?.[level]) || 10);
  }

  function fateChance(save) {
    const upgrade = prestigeUpgrade("fate_reroll");
    const level = prestigeLevel(save, "fate_reroll");
    return Math.min(1, level * (Number(upgrade?.chancePerLevel) || 0));
  }

  function dieValue(save) {
    const upgrade = CONFIG.upgrades.find((entry) => entry.id === "die_value");
    return 1 + generalLevel(save, "die_value") * (Number(upgrade?.effectPerLevel) || 0);
  }

  function globalPower(save) {
    const upgrade = CONFIG.upgrades.find((entry) => entry.id === "global_power");
    return 1 + generalLevel(save, "global_power") * (Number(upgrade?.effectPerLevel) || 0);
  }

  function globalComboMastery(save) {
    const upgrade = CONFIG.upgrades.find((entry) => entry.id === "combo_mastery");
    return 1 + generalLevel(save, "combo_mastery") * (Number(upgrade?.effectPerLevel) || 0);
  }

  function gemPower(save) {
    const upgrade = prestigeUpgrade("gem_power");
    const level = prestigeLevel(save, "gem_power");
    const gems = Math.max(0, Number(save?.gems) || 0);
    if (!upgrade || level <= 0 || gems <= 0) return 1;
    return 1 + gems * level * (Number(upgrade.bonusPerGemPerLevel) || 0);
  }

  function comboMultiplier(save, combo) {
    if (!combo || !comboUnlocked(save, combo.id)) return 1;
    const individual = 1 + comboLevel(save, combo.id) * (Number(CONFIG.comboUpgrade.effectPerLevel) || 0);
    return combo.multiplier * globalComboMastery(save) * individual;
  }

  function countsOf(values) {
    const counts = new Map();
    values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    return counts;
  }

  function hasStraight(counts, length) {
    const faces = [...counts.keys()].sort((a, b) => a - b);
    let run = 1;
    for (let index = 1; index < faces.length; index += 1) {
      run = faces[index] === faces[index - 1] + 1 ? run + 1 : 1;
      if (run >= length) return true;
    }
    return false;
  }

  function hasFull(counts) {
    const groups = [...counts.values()];
    for (let first = 0; first < groups.length; first += 1) {
      if (groups[first] < 3) continue;
      for (let second = 0; second < groups.length; second += 1) {
        if (first !== second && groups[second] >= 2) return true;
      }
    }
    return false;
  }

  function comboMatches(values) {
    const counts = countsOf(values);
    const groups = [...counts.values()];
    const pairGroups = groups.filter((count) => count >= 2).length;
    const tripleGroups = groups.filter((count) => count >= 3).length;

    return {
      pair: pairGroups >= 1,
      double_pair: pairGroups >= 2,
      triple_pair: pairGroups >= 3,
      three_of_a_kind: tripleGroups >= 1,
      double_three: tripleGroups >= 2,
      full_house: hasFull(counts),
      four_of_a_kind: groups.some((count) => count >= 4),
      five_of_a_kind: groups.some((count) => count >= 5),
      six_of_a_kind: groups.some((count) => count >= 6),
      straight_4: hasStraight(counts, 4),
      straight_5: hasStraight(counts, 5),
      straight_6: hasStraight(counts, 6)
    };
  }

  function bestCombo(save, values) {
    const matches = comboMatches(values);
    let best = null;
    let bestMultiplier = -Infinity;

    CONFIG.combos.forEach((combo) => {
      if (values.length < combo.minDice || !comboUnlocked(save, combo.id) || !matches[combo.id]) return;
      const multiplier = comboMultiplier(save, combo);
      if (multiplier > bestMultiplier) {
        best = combo;
        bestMultiplier = multiplier;
      }
    });

    return best;
  }

  function encodeRoll(values) {
    let key = 0;
    for (let index = 0; index < values.length; index += 1) key = key * 7 + values[index];
    return key;
  }

  function expectedGainPerAutoRoll(save) {
    const diceCount = Math.max(1, Math.min(CONFIG.maxDice, Number(save?.diceCount) || 1));
    const faces = CONFIG.dieFaces;
    const fate = fateChance(save);
    const gainFactor = dieValue(save) * globalPower(save) * gemPower(save);
    const maxCacheKey = Math.pow(7, diceCount + 1);
    const scoreCache = new Float64Array(maxCacheKey);
    const scoreKnown = new Uint8Array(maxCacheKey);

    function score(values) {
      const key = encodeRoll(values);
      if (scoreKnown[key]) return scoreCache[key];
      const sum = values.reduce((total, value) => total + value, 0);
      const combo = bestCombo(save, values);
      const result = sum * comboMultiplier(save, combo);
      scoreKnown[key] = 1;
      scoreCache[key] = result;
      return result;
    }

    function roundedGain(rawScore) {
      return Math.round(rawScore * gainFactor * 100) / 100;
    }

    let totalExpectedGain = 0;
    let outcomes = 0;
    const values = Array(diceCount).fill(1);

    function evaluateCurrentRoll() {
      outcomes += 1;
      const originalScore = score(values);
      const originalGain = roundedGain(originalScore);

      if (fate <= 0) {
        totalExpectedGain += originalGain;
        return;
      }

      let bestIndex = 0;
      let bestExpectedScore = -Infinity;

      for (let dieIndex = 0; dieIndex < diceCount; dieIndex += 1) {
        let candidateScoreTotal = 0;
        const originalFace = values[dieIndex];
        for (let face = 1; face <= faces; face += 1) {
          values[dieIndex] = face;
          candidateScoreTotal += score(values);
        }
        values[dieIndex] = originalFace;
        const expected = candidateScoreTotal / faces;
        if (expected > bestExpectedScore) {
          bestExpectedScore = expected;
          bestIndex = dieIndex;
        }
      }

      let procGainTotal = 0;
      const originalFace = values[bestIndex];
      for (let face = 1; face <= faces; face += 1) {
        values[bestIndex] = face;
        const candidateScore = score(values);
        procGainTotal += candidateScore > originalScore ? roundedGain(candidateScore) : originalGain;
      }
      values[bestIndex] = originalFace;

      const expectedProcGain = procGainTotal / faces;
      totalExpectedGain += originalGain * (1 - fate) + expectedProcGain * fate;
    }

    function enumerate(depth) {
      if (depth >= diceCount) {
        evaluateCurrentRoll();
        return;
      }
      for (let face = 1; face <= faces; face += 1) {
        values[depth] = face;
        enumerate(depth + 1);
      }
    }

    enumerate(0);
    return outcomes > 0 ? totalExpectedGain / outcomes : 0;
  }

  function calculateOffline(save, now, departureTimestamp) {
    const intervalMs = autoClickInterval(save);
    const efficiency = offlineEfficiency(save);
    const reserveMs = reserveMinutes(save) * 60 * 1000;
    const awayMs = Math.max(0, now - departureTimestamp);

    if (awayMs < minimumOfflineMs || intervalMs <= 0 || efficiency <= 0) return null;

    const countedMs = Math.min(awayMs, reserveMs);
    const rolls = Math.floor(countedMs / intervalMs);
    if (rolls <= 0) return null;

    const averageGain = expectedGainPerAutoRoll(save);
    const gain = Math.round(rolls * averageGain * efficiency * 100) / 100;
    if (!Number.isFinite(gain) || gain <= 0) return null;

    return {
      awayMs,
      countedMs,
      reserveMs,
      efficiency,
      rolls,
      averageGain,
      gain,
      intervalMs,
      diceCount: Math.max(1, Math.min(CONFIG.maxDice, Number(save?.diceCount) || 1)),
      fateChance: fateChance(save)
    };
  }

  function validPending(value) {
    return Boolean(
      value &&
      value.version === 1 &&
      value.report &&
      Number(value.report.gain) > 0 &&
      Number(value.report.rolls) > 0
    );
  }

  function prepareOfflineClaim() {
    try {
      const existing = readJson(localStorage, PENDING_KEY);
      if (validPending(existing)) return existing;
      if (existing) nativeRemove(localStorage, PENDING_KEY);

      const now = Date.now();
      let save = readJson(localStorage, SAVE_KEY);
      const snapshot = readJson(localStorage, SNAPSHOT_KEY);
      let departureTimestamp = Number(save?.lastSaveAt) || now;

      if (snapshot?.save && Number(snapshot.hiddenAt) > 0 && now >= Number(snapshot.hiddenAt)) {
        save = snapshot.save;
        departureTimestamp = Number(snapshot.hiddenAt);
        nativeRemove(localStorage, SNAPSHOT_KEY);
      }

      if (!save) return null;

      const report = calculateOffline(save, now, departureTimestamp);

      // La période est consommée maintenant pour éviter tout double calcul au refresh,
      // mais les Points restent volontairement non crédités jusqu'au bouton OK.
      if (!writeSave(save, now)) return null;
      if (!report) return null;

      const pending = {
        version: 1,
        createdAt: now,
        report
      };
      nativeWrite(localStorage, PENDING_KEY, JSON.stringify(pending));
      return pending;
    } catch (error) {
      console.error("[Night Idle] Préparation du revenu hors ligne impossible", error);
      return null;
    }
  }

  let pendingClaim = prepareOfflineClaim();
  let claimInProgress = false;
  let resolveOfflineReady;

  window.NightIdleOfflineReady = new Promise((resolve) => {
    resolveOfflineReady = resolve;
  });

  function finishOfflineBoot(payload = null) {
    if (!resolveOfflineReady) return;
    const resolve = resolveOfflineReady;
    resolveOfflineReady = null;
    resolve(payload);
  }

  // Timestamp automatique sur toutes les futures sauvegardes.
  if (storageProto && nativeSetItem) {
    try {
      storageProto.setItem = function patchedSetItem(key, value) {
        if (this === localStorage && key === SAVE_KEY) {
          try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === "object") {
              parsed.lastSaveAt = Date.now();
              return nativeSetItem.call(this, key, JSON.stringify(parsed));
            }
          } catch {
            // Valeur non JSON : conserver le comportement natif.
          }
        }
        return nativeSetItem.call(this, key, value);
      };
    } catch (error) {
      console.warn("[Night Idle] Timestamp automatique indisponible", error);
    }
  }

  function captureOfflineSnapshot() {
    if (pendingClaim) return;
    try {
      const save = readJson(localStorage, SAVE_KEY);
      if (!save) return;
      const hiddenAt = Date.now();
      const snapshot = { save: { ...save, lastSaveAt: hiddenAt }, hiddenAt };
      nativeWrite(localStorage, SNAPSHOT_KEY, JSON.stringify(snapshot));
      writeSave(save, hiddenAt);
    } catch (error) {
      console.warn("[Night Idle] Snapshot offline impossible", error);
    }
  }

  function clearSnapshot() {
    try {
      nativeRemove(localStorage, SNAPSHOT_KEY);
    } catch {
      // Rien à faire.
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (pendingClaim) return;

    if (document.hidden) {
      captureOfflineSnapshot();
      return;
    }

    const snapshot = readJson(localStorage, SNAPSHOT_KEY);
    if (!snapshot?.save || !snapshot.hiddenAt) return;
    const awayMs = Date.now() - Number(snapshot.hiddenAt);

    if (
      awayMs >= minimumOfflineMs &&
      autoClickInterval(snapshot.save) > 0 &&
      offlineEfficiency(snapshot.save) > 0
    ) {
      writeSave(snapshot.save, Number(snapshot.hiddenAt));
      clearSnapshot();
      window.location.reload();
      return;
    }

    clearSnapshot();
  });

  window.addEventListener("pagehide", captureOfflineSnapshot);

  function formatNumber(value) {
    return new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 2 }).format(Number(value) || 0);
  }

  function formatDuration(ms) {
    const totalMinutes = Math.max(0, Math.floor((Number(ms) || 0) / 60000));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    const parts = [];
    if (days > 0) parts.push(`${days} j`);
    if (hours > 0) parts.push(`${hours} h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes} min`);
    return parts.join(" ");
  }

  function formatReserveMinutes(minutes) {
    return formatDuration(minutes * 60000);
  }

  function formatCadence(intervalMs) {
    const ms = Math.max(1, Number(intervalMs) || 1);
    if (ms >= 1000) return `1 lancer / ${formatNumber(ms / 1000)} s`;
    return `${formatNumber(1000 / ms)} lancers / s`;
  }

  function patchPrestigeShopLabels() {
    const list = document.getElementById("prestigeShopList");
    if (!list) return;

    list.querySelectorAll(".prestige-shop-card").forEach((card) => {
      const name = card.querySelector(".upgrade-title-row strong")?.textContent?.trim();
      const levelText = card.querySelector(".upgrade-title-row span")?.textContent || "";
      const level = Math.max(0, Number(levelText.match(/Niv\.\s*(\d+)/)?.[1]) || 0);
      const effect = card.querySelector(".upgrade-effect");
      if (!effect) return;

      if (name === "Revenu hors ligne") {
        const upgrade = prestigeUpgrade("offline_income");
        if (!upgrade) return;
        const current = Math.min(1, level * (upgrade.efficiencyPerLevel || 0));
        const next = Math.min(1, (level + 1) * (upgrade.efficiencyPerLevel || 0));
        const html = `${formatNumber(current * 100)} %${level >= upgrade.maxLevel ? "" : ` → <strong>${formatNumber(next * 100)} %</strong>`}`;
        if (effect.innerHTML !== html) effect.innerHTML = html;
      }

      if (name === "Réserve temporelle") {
        const upgrade = prestigeUpgrade("time_reserve");
        if (!upgrade) return;
        const current = upgrade.valuesMinutes?.[level] || 10;
        const next = upgrade.valuesMinutes?.[Math.min(level + 1, upgrade.maxLevel)] || current;
        const html = `${formatReserveMinutes(current)}${level >= upgrade.maxLevel ? "" : ` → <strong>${formatReserveMinutes(next)}</strong>`}`;
        if (effect.innerHTML !== html) effect.innerHTML = html;
      }
    });
  }

  function installSafeShopObserver() {
    const list = document.getElementById("prestigeShopList");
    if (!list || typeof MutationObserver === "undefined") return;

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        observer.disconnect();
        patchPrestigeShopLabels();
        observer.observe(list, { childList: true, subtree: true });
      });
    });

    observer.observe(list, { childList: true, subtree: true });
    queueMicrotask(() => {
      observer.disconnect();
      patchPrestigeShopLabels();
      observer.observe(list, { childList: true, subtree: true });
    });
  }

  function ensureDetailRow(grid, id, label) {
    let value = document.getElementById(id);
    if (value) return value;
    const row = document.createElement("div");
    row.innerHTML = `<span>${label}</span><strong id="${id}">—</strong>`;
    grid.appendChild(row);
    return row.querySelector("strong");
  }

  function showOfflineReport(pending) {
    if (!validPending(pending)) {
      finishOfflineBoot(null);
      return;
    }

    const report = pending.report;
    const modal = document.getElementById("offlineModal");
    if (!modal) {
      console.warn("[Night Idle] Modale offline absente : revenu conservé en attente.");
      finishOfflineBoot(null);
      return;
    }

    const setText = (id, value) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    };

    setText("offlineGainValue", `+${formatNumber(report.gain)}`);
    setText("offlineAwayValue", formatDuration(report.awayMs));
    setText("offlineCountedValue", formatDuration(report.countedMs));
    setText("offlineReserveValue", formatDuration(report.reserveMs));
    setText("offlineEfficiencyValue", `${formatNumber(report.efficiency * 100)} %`);
    setText("offlineRollsValue", formatNumber(report.rolls));
    setText("offlineAverageValue", formatNumber(report.averageGain));

    const grid = modal.querySelector(".offline-grid");
    if (grid) {
      ensureDetailRow(grid, "offlineCadenceValue", "Cadence Auto Clicker").textContent = formatCadence(report.intervalMs);
      ensureDetailRow(grid, "offlineDiceValue", "Dés actifs").textContent = `${report.diceCount}/${CONFIG.maxDice}`;
      ensureDetailRow(grid, "offlineFateValue", "Chance du Destin").textContent = `${formatNumber(report.fateChance * 100)} %`;
    }

    const note = modal.querySelector(".offline-note");
    if (note) {
      note.innerHTML = `
        <strong>Calcul :</strong> ${formatNumber(report.rolls)} auto-lancers × ${formatNumber(report.averageGain)} pts moyens × ${formatNumber(report.efficiency * 100)} % d'efficacité = <strong>${formatNumber(report.gain)} pts</strong>.<br>
        Les probabilités réelles des combos et Chance du Destin sont incluses. <strong>Ces Points sont encore en attente et seront ajoutés seulement après validation.</strong>
      `;
    }

    const closeButton = document.getElementById("closeOfflineButton");
    if (closeButton) {
      closeButton.hidden = true;
      closeButton.disabled = true;
    }

    const claimButton = document.getElementById("claimOfflineButton");
    if (claimButton) {
      claimButton.textContent = `OK — RÉCUPÉRER +${formatNumber(report.gain)} PTS`;
    }

    modal.addEventListener("cancel", (event) => event.preventDefault());

    const claim = () => {
      if (claimInProgress) return;
      claimInProgress = true;
      if (claimButton) {
        claimButton.disabled = true;
        claimButton.textContent = "CRÉDIT EN COURS…";
      }

      try {
        const storedPending = readJson(localStorage, PENDING_KEY);
        if (!validPending(storedPending)) {
          pendingClaim = null;
          if (modal.open) modal.close();
          finishOfflineBoot(null);
          return;
        }

        const save = readJson(localStorage, SAVE_KEY);
        if (!save) throw new Error("Sauvegarde introuvable au moment du crédit.");

        const reward = storedPending.report;
        save.points = Math.max(0, Number(save.points) || 0) + reward.gain;
        save.runPointsEarned = Math.max(0, Number(save.runPointsEarned ?? save.totalEarned) || 0) + reward.gain;
        save.totalRolls = Math.max(0, Math.floor(Number(save.totalRolls) || 0)) + reward.rolls;

        if (!writeSave(save, Date.now())) throw new Error("Impossible d'écrire la récompense dans la sauvegarde.");
        nativeRemove(localStorage, PENDING_KEY);
        pendingClaim = null;

        if (modal.open) modal.close();
        finishOfflineBoot(reward);
      } catch (error) {
        console.error("[Night Idle] Crédit offline impossible", error);
        claimInProgress = false;
        if (claimButton) {
          claimButton.disabled = false;
          claimButton.textContent = "ERREUR — RÉESSAYER";
        }
      }
    };

    claimButton?.addEventListener("click", claim, { once: false });

    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", "");
  }

  installSafeShopObserver();

  window.setTimeout(() => {
    patchPrestigeShopLabels();
    if (pendingClaim) showOfflineReport(pendingClaim);
    else finishOfflineBoot(null);
  }, 0);
})();
