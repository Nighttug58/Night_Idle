(() => {
  "use strict";

  const CONFIG = window.NightIdleConfig;
  const SAVE_KEY = "nightIdle.save.v1";
  const SNAPSHOT_KEY = "nightIdle.offline.snapshot.v1";
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
      console.warn("[Night Idle] Lecture sauvegarde offline impossible", error);
      return null;
    }
  }

  function writeSave(save, timestamp = Date.now()) {
    if (!save || typeof save !== "object") return;
    try {
      const payload = { ...save, lastSaveAt: timestamp };
      nativeWrite(localStorage, SAVE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("[Night Idle] Écriture sauvegarde offline impossible", error);
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

        const candidateExpectedScore = candidateScoreTotal / faces;
        if (candidateExpectedScore > bestExpectedScore) {
          bestExpectedScore = candidateExpectedScore;
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
    const interval = autoClickInterval(save);
    const efficiency = offlineEfficiency(save);
    const reserveMs = reserveMinutes(save) * 60 * 1000;
    const awayMs = Math.max(0, now - departureTimestamp);

    if (awayMs < minimumOfflineMs || interval <= 0 || efficiency <= 0) return null;

    const countedMs = Math.min(awayMs, reserveMs);
    const rolls = Math.floor(countedMs / interval);
    if (rolls <= 0) return null;

    const averageGain = expectedGainPerAutoRoll(save);
    const gain = Math.round(rolls * averageGain * efficiency * 100) / 100;
    if (!Number.isFinite(gain) || gain <= 0) return null;

    return { awayMs, countedMs, reserveMs, efficiency, rolls, averageGain, gain };
  }

  function consumeOfflineProgress() {
    try {
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
      if (report) {
        save.points = Math.max(0, Number(save.points) || 0) + report.gain;
        save.runPointsEarned = Math.max(0, Number(save.runPointsEarned ?? save.totalEarned) || 0) + report.gain;
        save.totalRolls = Math.max(0, Math.floor(Number(save.totalRolls) || 0)) + report.rolls;
      }

      // Consomme immédiatement la période afin qu'un refresh ne puisse pas redonner le même revenu.
      writeSave(save, now);
      return report;
    } catch (error) {
      console.error("[Night Idle] Le revenu hors ligne a été ignoré pour préserver le boot.", error);
      return null;
    }
  }

  const offlineReport = consumeOfflineProgress();

  // Ajoute automatiquement un timestamp à toutes les futures sauvegardes sans modifier game.js.
  // Le patch est volontairement protégé : s'il est refusé par un navigateur, le jeu continue quand même.
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
      console.warn("[Night Idle] Timestamp automatique indisponible, fallback pagehide actif.", error);
    }
  }

  function captureOfflineSnapshot() {
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
      // Le reload fait recalculer la période depuis le snapshot, une seule fois.
      writeSave(snapshot.save, Number(snapshot.hiddenAt));
      clearSnapshot();
      window.location.reload();
      return;
    }

    clearSnapshot();
  });

  window.addEventListener("pagehide", captureOfflineSnapshot);

  function formatNumber(value) {
    return new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 2 }).format(value || 0);
  }

  function formatDuration(ms) {
    const totalMinutes = Math.max(0, Math.floor(ms / 60000));
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

  // Important : on déconnecte l'observer pendant le patch.
  // L'ancienne version observait puis réécrivait son propre subtree en boucle infinie.
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

  function showOfflineReport(report) {
    if (!report) return;
    const modal = document.getElementById("offlineModal");
    if (!modal) return;

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

    const close = () => {
      if (modal.open) modal.close();
    };

    document.getElementById("closeOfflineButton")?.addEventListener("click", close, { once: true });
    document.getElementById("claimOfflineButton")?.addEventListener("click", close, { once: true });
    modal.addEventListener(
      "click",
      (event) => {
        if (event.target === modal) close();
      },
      { once: true }
    );

    if (typeof modal.showModal === "function") modal.showModal();
  }

  installSafeShopObserver();

  window.setTimeout(() => {
    patchPrestigeShopLabels();
    showOfflineReport(offlineReport);
  }, 0);
})();
