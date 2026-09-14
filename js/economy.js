(() => {
  "use strict";

  const BASE_CONFIG = window.NightIdleConfig;
  if (!BASE_CONFIG) return;

  const SAVE_KEY = "nightIdle.save.v1";
  const UPGRADE_ID = "cost_curve_mastery";
  const mastery = BASE_CONFIG.prestigeShop.find((upgrade) => upgrade.id === UPGRADE_ID);
  if (!mastery) return;

  const storageProto = window.Storage?.prototype;
  const inheritedSetItem = storageProto?.setItem;

  const baseGeneralGrowth = new Map(
    BASE_CONFIG.upgrades.map((upgrade) => [upgrade.id, Number(upgrade.costGrowth) || 1])
  );
  const baseComboGrowth = Number(BASE_CONFIG.comboUpgrade.costGrowth) || 1;
  const targetGrowth = Math.max(1, Number(mastery.targetGrowth) || 1.10);

  // game-core capture NightIdleConfig une seule fois. On fournit donc des objets runtime
  // mutables dont seules les courbes de coût sont recalculées après un achat Prestige.
  const runtimeUpgrades = BASE_CONFIG.upgrades.map((upgrade) => ({ ...upgrade }));
  const runtimeComboUpgrade = { ...BASE_CONFIG.comboUpgrade };
  const runtimeConfig = Object.freeze({
    ...BASE_CONFIG,
    upgrades: Object.freeze(runtimeUpgrades),
    comboUpgrade: runtimeComboUpgrade
  });

  window.NightIdleConfig = runtimeConfig;

  let currentLevel = 0;
  let currentProgress = 0;

  function clampLevel(value) {
    return Math.max(0, Math.min(mastery.maxLevel, Math.floor(Number(value) || 0)));
  }

  function progressForLevel(level) {
    if (mastery.maxLevel <= 0) return 1;
    return Math.max(0, Math.min(1, clampLevel(level) / mastery.maxLevel));
  }

  function effectiveGrowth(baseGrowth, levelOrProgress = currentLevel) {
    const base = Math.max(targetGrowth, Number(baseGrowth) || targetGrowth);
    const progress = Number(levelOrProgress) <= 1 && !Number.isInteger(levelOrProgress)
      ? Math.max(0, Math.min(1, Number(levelOrProgress) || 0))
      : progressForLevel(levelOrProgress);

    // Interpolation directe : au niveau 50, chaque courbe vaut exactement ×1.10,
    // indépendamment de sa valeur d'origine (1.60, 1.65, 1.80, 1.85 ou 2.05).
    return base + (targetGrowth - base) * progress;
  }

  function applyLevel(level) {
    currentLevel = clampLevel(level);
    currentProgress = progressForLevel(currentLevel);

    runtimeUpgrades.forEach((upgrade) => {
      const baseGrowth = baseGeneralGrowth.get(upgrade.id) || targetGrowth;
      upgrade.costGrowth = effectiveGrowth(baseGrowth, currentProgress);
    });

    runtimeComboUpgrade.costGrowth = effectiveGrowth(baseComboGrowth, currentProgress);
  }

  function readSavedLevel() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const save = raw ? JSON.parse(raw) : null;
      return clampLevel(save?.prestigeUpgrades?.[UPGRADE_ID]);
    } catch {
      return 0;
    }
  }

  applyLevel(readSavedLevel());

  // Met la courbe à jour avant que game-core ne rerende la boutique après un achat.
  if (storageProto && inheritedSetItem) {
    try {
      storageProto.setItem = function nightIdleEconomySetItem(key, value) {
        let nextLevel = null;

        if (this === localStorage && key === SAVE_KEY) {
          try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === "object") {
              nextLevel = clampLevel(parsed?.prestigeUpgrades?.[UPGRADE_ID]);
            }
          } catch {
            // Conserver le comportement de la chaîne de sauvegarde existante.
          }
        }

        const result = inheritedSetItem.call(this, key, value);
        if (nextLevel !== null) applyLevel(nextLevel);
        return result;
      };
    } catch (error) {
      console.warn("[Night Idle] Courbe économique dynamique indisponible.", error);
    }
  }

  const growthFormatter = new Intl.NumberFormat("fr-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  function growthRangeAt(level) {
    const values = [
      ...baseGeneralGrowth.values(),
      baseComboGrowth
    ].map((base) => effectiveGrowth(base, clampLevel(level)));

    return {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  function effectText(level) {
    const range = growthRangeAt(level);
    if (Math.abs(range.max - range.min) < 0.0005) {
      return `Toutes les courbes : ×${growthFormatter.format(range.max)}`;
    }
    return `Courbes : ×${growthFormatter.format(range.min)} – ×${growthFormatter.format(range.max)}`;
  }

  function patchPrestigeCard() {
    const list = document.getElementById("prestigeShopList");
    if (!list) return;

    for (const card of list.querySelectorAll(".prestige-shop-card")) {
      const title = card.querySelector(".upgrade-title-row strong")?.textContent?.trim();
      if (title !== mastery.name) continue;

      const levelText = card.querySelector(".upgrade-title-row span")?.textContent || "";
      const level = clampLevel(levelText.match(/Niv\.\s*(\d+)/)?.[1]);
      const maxed = level >= mastery.maxLevel;
      const effect = card.querySelector(".upgrade-effect");
      if (!effect) return;

      const nextLevel = Math.min(mastery.maxLevel, level + 1);
      const html = `${effectText(level)}${maxed ? "" : ` → <strong>${effectText(nextLevel)}</strong>`}`;
      if (effect.innerHTML !== html) effect.innerHTML = html;
      return;
    }
  }

  function installShopObserver() {
    const list = document.getElementById("prestigeShopList");
    if (!list || typeof MutationObserver === "undefined") return;

    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        observer.disconnect();
        patchPrestigeCard();
        observer.observe(list, { childList: true, subtree: true });
      });
    });

    observer.observe(list, { childList: true, subtree: true });
    queueMicrotask(() => {
      observer.disconnect();
      patchPrestigeCard();
      observer.observe(list, { childList: true, subtree: true });
    });
  }

  installShopObserver();

  window.NightIdleEconomy = Object.freeze({
    version: 2,
    level: () => currentLevel,
    progress: () => currentProgress,
    targetGrowth: () => targetGrowth,
    effectiveGrowth: (baseGrowth) => effectiveGrowth(Number(baseGrowth) || targetGrowth, currentLevel),
    growthRange: () => growthRangeAt(currentLevel)
  });
})();
