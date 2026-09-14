(() => {
  "use strict";

  const BUILD = "20260914-geminf1";

  // Supprime totalement le flash/tap highlight natif Android/Chrome sur l'interface.
  // Le focus clavier reste géré séparément avec :focus-visible dans les CSS du jeu.
  const tapStyle = document.createElement("style");
  tapStyle.textContent = `
    html,
    body,
    body *,
    body *::before,
    body *::after {
      -webkit-tap-highlight-color: rgba(0, 0, 0, 0) !important;
    }

    button,
    [role="button"],
    a,
    .dice-tray,
    .die,
    .roll-card,
    .result-panel,
    .stats-grid,
    .stat-card {
      -webkit-tap-highlight-color: transparent !important;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
      touch-action: manipulation;
    }

    button:focus:not(:focus-visible),
    [role="button"]:focus:not(:focus-visible),
    a:focus:not(:focus-visible),
    .dice-tray:focus:not(:focus-visible) {
      outline: none !important;
    }
  `;
  document.head.appendChild(tapStyle);

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${src}?v=${BUILD}`;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Impossible de charger ${src}`));
      document.head.appendChild(script);
    });
  }

  async function loadPatchedScript(src, transform, label) {
    try {
      const response = await fetch(`${src}?v=${BUILD}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const source = await response.text();
      const patched = transform(source);
      if (!patched || patched === source) throw new Error("Patch non appliqué");

      const script = document.createElement("script");
      script.textContent = `${patched}\n//# sourceURL=${src}?v=${BUILD}`;
      document.head.appendChild(script);
      return;
    } catch (error) {
      console.warn(`[Night Idle] ${label} dynamique indisponible, fallback standard.`, error);
      await loadScript(src);
    }
  }

  function patchMusicForDynamicTempo(source) {
    let patched = source;

    const declarationsNeedle = "  let startedByGesture = false;";
    if (!patched.includes(declarationsNeedle)) throw new Error("Déclarations musique introuvables");
    patched = patched.replace(
      declarationsNeedle,
      `${declarationsNeedle}\n  let tempoMultiplier = 1;\n  let renderedTempoBand = 0;\n  let lastTempoRestartAt = 0;`
    );

    const beatNeedle = "    const beat = 60 / track.bpm;";
    if (!patched.includes(beatNeedle)) throw new Error("Calcul BPM introuvable");
    patched = patched.replace(
      beatNeedle,
      "    const beat = 60 / (track.bpm * tempoMultiplier);"
    );

    const apiNeedle = "  renderMusicButton();\n\n  window.NightIdleMusic = Object.freeze({";
    if (!patched.includes(apiNeedle)) throw new Error("API musique introuvable");
    patched = patched.replace(
      apiNeedle,
      `  function setTempoMultiplier(value) {\n    const next = Math.max(1, Math.min(1.32, Number(value) || 1));\n    const desiredBand = Math.max(0, Math.round((next - 1) / 0.055));\n    tempoMultiplier = next;\n\n    if (desiredBand === renderedTempoBand) return tempoMultiplier;\n\n    if (!preferences.enabled || !startedByGesture || document.hidden || currentTrackIndex < 0) {\n      renderedTempoBand = desiredBand;\n      return tempoMultiplier;\n    }\n\n    const now = performance.now();\n    if (now - lastTempoRestartAt < 650) return tempoMultiplier;\n\n    renderedTempoBand = desiredBand;\n    lastTempoRestartAt = now;\n    playTrack(currentTrackIndex);\n    return tempoMultiplier;\n  }\n\n  renderMusicButton();\n\n  window.NightIdleMusic = Object.freeze({`
    );

    const currentTrackNeedle = "    currentTrack: () => currentTrackIndex >= 0 ? TRACKS[currentTrackIndex]?.name || null : null,\n    next: () => {";
    if (!patched.includes(currentTrackNeedle)) throw new Error("Extension API musique introuvable");
    patched = patched.replace(
      currentTrackNeedle,
      `    currentTrack: () => currentTrackIndex >= 0 ? TRACKS[currentTrackIndex]?.name || null : null,\n    tempoMultiplier: () => tempoMultiplier,\n    setTempoMultiplier,\n    next: () => {`
    );

    patched = patched.replace("    version: 2,", "    version: 3,");
    return patched;
  }

  function patchCoreForRuntime(source) {
    let patched = source;

    const gainNeedle = "      manualFactor *\n      gemPowerFactor()\n    );";
    if (!patched.includes(gainNeedle)) throw new Error("Formule de gain introuvable");
    patched = patched.replace(
      gainNeedle,
      `      manualFactor *\n      gemPowerFactor() *\n      (window.NightIdleFrenzy?.multiplier?.() || 1)\n    );`
    );

    const prestigeCostNeedle = `  function prestigeUpgradeCost(upgrade) {
    const level = prestigeUpgradeLevel(upgrade.id);
    if (level >= upgrade.maxLevel) return null;
    return upgrade.costs[level] ?? null;
  }`;
    if (!patched.includes(prestigeCostNeedle)) throw new Error("Calcul de coût Prestige introuvable");
    patched = patched.replace(
      prestigeCostNeedle,
      `  function prestigeUpgradeCost(upgrade) {
    const level = prestigeUpgradeLevel(upgrade.id);
    if (level >= upgrade.maxLevel) return null;

    const listedCost = upgrade.costs?.[level];
    if (listedCost !== undefined && listedCost !== null) return listedCost;

    if (upgrade.unlimited) {
      const costs = Array.isArray(upgrade.costs) ? upgrade.costs : [];
      const lastListedCost = Math.max(1, Number(costs[costs.length - 1]) || 1);
      const growth = Math.max(1.001, Number(upgrade.costGrowth) || 1.18);
      const extraLevel = Math.max(1, level - costs.length + 1);
      const rawCost = lastListedCost * Math.pow(growth, extraLevel);
      return Number.isFinite(rawCost)
        ? Math.max(1, Math.ceil(rawCost))
        : Number.MAX_SAFE_INTEGER;
    }

    return null;
  }`
    );

    const levelLabelNeedle = '        <span>Niv. ${level}/${upgrade.maxLevel}</span>';
    if (!patched.includes(levelLabelNeedle)) throw new Error("Libellé niveau Prestige introuvable");
    patched = patched.replace(
      levelLabelNeedle,
      '        <span>${upgrade.unlimited ? `Niv. ${level} · ∞` : `Niv. ${level}/${upgrade.maxLevel}`}</span>'
    );

    return patched;
  }

  async function boot() {
    if ((Number(window.NightIdleConfig?.version) || 0) < 11) {
      try {
        await loadScript("js/config.js");
      } catch (error) {
        console.warn("[Night Idle] Nouvelle configuration indisponible, poursuite avec la version locale.", error);
      }
    }

    try {
      if (window.NightIdleOfflineReady && typeof window.NightIdleOfflineReady.then === "function") {
        await window.NightIdleOfflineReady;
      }
    } catch (error) {
      console.warn("[Night Idle] Validation offline interrompue, poursuite du boot.", error);
    }

    try {
      await loadScript("js/stability.js");
    } catch (error) {
      console.warn("[Night Idle] Guard de stabilité indisponible, poursuite du boot.", error);
    }

    try {
      await loadScript("js/main-ui.js");
    } catch (error) {
      console.warn("[Night Idle] Interface minimale indisponible, poursuite du boot.", error);
    }

    try {
      await loadScript("js/stats.js");
    } catch (error) {
      console.warn("[Night Idle] Statistiques indisponibles, poursuite du boot.", error);
    }

    try {
      await loadScript("js/feel.js");
    } catch (error) {
      console.warn("[Night Idle] Feedback visuel/sonore indisponible, poursuite du boot.", error);
    }

    try {
      await loadPatchedScript("js/music.js", patchMusicForDynamicTempo, "Accélération musicale");
    } catch (error) {
      console.warn("[Night Idle] Musique procédurale indisponible, poursuite du boot.", error);
    }

    try {
      await loadScript("js/frenzy.js");
    } catch (error) {
      console.warn("[Night Idle] Frénésie manuelle indisponible, poursuite du boot.", error);
    }

    try {
      await loadScript("js/economy.js");
    } catch (error) {
      console.warn("[Night Idle] Maîtrise permanente des coûts indisponible, poursuite du boot.", error);
    }

    try {
      await loadPatchedScript("js/game-core.js", patchCoreForRuntime, "Moteur dynamique");
    } catch (error) {
      console.error("[Night Idle] Échec du chargement du moteur principal.", error);
      const event = new ErrorEvent("error", { error, message: error.message });
      window.dispatchEvent(event);
    }
  }

  boot();
})();
