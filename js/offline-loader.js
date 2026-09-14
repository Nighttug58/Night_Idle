(() => {
  "use strict";

  const BUILD = "20260914-achievements1";

  function achievementFactorExpression() {
    const maxLevel = Number(window.NightIdleConfig?.achievementSystem?.multiplierMaxLevel) || 10;
    const perLevel = Number(window.NightIdleConfig?.achievementSystem?.multiplierPerLevel) || 0.9;
    const maxMultiplier = Number(window.NightIdleConfig?.achievementSystem?.maxMultiplier) || 10;
    return `(Math.min(${maxMultiplier}, 1 + Math.max(0, Math.min(${maxLevel}, Math.floor(Number(save?.achievementState?.multiplierLevel) || 0))) * ${perLevel}))`;
  }

  function execute(source) {
    const script = document.createElement("script");
    script.textContent = `${source}\n//# sourceURL=js/offline.js?v=${BUILD}`;
    document.head.appendChild(script);
  }

  function fallback() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `js/offline.js?v=${BUILD}`;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Impossible de charger js/offline.js"));
      document.head.appendChild(script);
    });
  }

  window.NightIdleOfflineLoaderReady = (async () => {
    try {
      const response = await fetch(`js/offline.js?v=${BUILD}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const source = await response.text();
      const needle = "    const gainFactor = dieValue(save) * globalPower(save) * gemPower(save);";
      if (!source.includes(needle)) throw new Error("Formule offline introuvable");
      const patched = source.replace(
        needle,
        `    const gainFactor = dieValue(save) * globalPower(save) * gemPower(save) * ${achievementFactorExpression()};`
      );
      execute(patched);
    } catch (error) {
      console.warn("[Night Idle] Multiplicateur Achievement hors ligne indisponible, fallback standard.", error);
      await fallback();
    }
  })();
})();