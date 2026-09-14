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

  // Les objets internes restent volontairement mutables : game-core capture CONFIG une seule fois,
  // puis cette couche peut mettre à jour les courbes immédiatement après un achat Prestige.
  const runtimeUpgrades = BASE_CONFIG.upgrades.map((upgrade) => ({ ...upgrade }));
  const runtimeComboUpgrade = { ...BASE_CONFIG.comboUpgrade };
  const runtimeConfig = Object.freeze({
    ...BASE_CONFIG,
    upgrades: Object.freeze(runtimeUpgrades),
    comboUpgrade: runtimeComboUpgrade
  });

  window.NightIdleConfig = runtimeConfig;

  let currentLevel = 0;
  let currentReduction = 0;

  function clampLevel(value) {
    return Math.max(0, Math.min(mastery.maxLevel, Math.floor(Number(value) || 0)));
  }

  function reductionForLevel(level) {
    return Math.min(
      Number(mastery.maxGrowthReduction) || 0,
      clampLevel(level) * (Number(mastery.growthReductionPerLevel) || 0)
    );
  }

  function effectiveGrowth(baseGrowth, reduction) {
    // On réduit uniquement la partie située au-dessus de ×1 afin d'aplatir l'exponentielle
    // sans transformer la croissance en remise linéaire sur le prix final.
    return 1 + Math.max(0, baseGrowth - 1) * (1 - reduction);
  }

  function applyLevel(level) {
    currentLevel = clampLevel(level);
    currentReduction = reductionForLevel(currentLevel);

    runtimeUpgrades.forEach((upgrade) => {
      const baseGrowth = baseGeneralGrowth.get(upgrade.id) || 1;
      upgrade.costGrowth = effectiveGrowth(baseGrowth, currentReduction);
    });

    runtimeComboUpgrade.costGrowth = effectiveGrowth(baseComboGrowth, currentReduction);
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

  // Met à jour la courbe avant que game-core ne rerende la boutique après un achat.
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

  const percentFormatter = new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 1 });

  function effectText(level) {
    return `Courbe : -${percentFormatter.format(reductionForLevel(level) * 100)} %`;
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
    version: 1,
    level: () => currentLevel,
    reduction: () => currentReduction,
    effectiveGrowth: (baseGrowth) => effectiveGrowth(Number(baseGrowth) || 1, currentReduction)
  });
})();
