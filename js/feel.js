(() => {
  "use strict";

  const CONFIG = window.NightIdleConfig;
  if (!CONFIG) return;

  const SAVE_KEY = "nightIdle.save.v1";
  const PREF_KEY = "nightIdle.feel.v1";
  const BUILD = "20260914-music1";
  const storageProto = window.Storage?.prototype;
  const inheritedSetItem = storageProto?.setItem;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

  const tierByComboId = Object.freeze({
    pair: 1,
    three_of_a_kind: 2,
    double_pair: 2,
    straight_4: 2,
    full_house: 3,
    straight_5: 3,
    four_of_a_kind: 4,
    triple_pair: 4,
    double_three: 4,
    five_of_a_kind: 5,
    straight_6: 5,
    six_of_a_kind: 6
  });

  function readJson(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function readSave() {
    const save = readJson(SAVE_KEY, null);
    return save && typeof save === "object" ? save : null;
  }

  let preferences = { enabled: true, ...(readJson(PREF_KEY, {}) || {}) };
  let previousSave = readSave();
  let manualIntent = false;
  let audioContext = null;
  let lastRareAudioAt = 0;

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = `feel.css?v=${BUILD}`;
  document.head.appendChild(stylesheet);

  function savePreferences() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(preferences));
    } catch {
      // Les effets restent utilisables pour la session courante.
    }
  }

  function unlockAudio() {
    if (!preferences.enabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContext) audioContext = new AudioCtx();
      if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    } catch {
      audioContext = null;
    }
  }

  document.addEventListener("pointerdown", unlockAudio, { capture: true, passive: true });
  document.addEventListener("keydown", unlockAudio, { capture: true });

  function tone(frequency, delay = 0, duration = 0.055, volume = 0.025, type = "sine") {
    if (!preferences.enabled || !audioContext || audioContext.state !== "running") return;
    try {
      const now = audioContext.currentTime + delay;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.015);
    } catch {
      // Un effet audio ne doit jamais perturber le jeu.
    }
  }

  function playRollSound(tier, isManual, fastAuto) {
    if (!preferences.enabled) return;
    const now = performance.now();

    if (!isManual && fastAuto && tier < 3) return;
    if (!isManual && now - lastRareAudioAt < 650) return;

    if (tier <= 0) {
      if (isManual) tone(170, 0, 0.035, 0.012, "triangle");
      return;
    }

    if (!isManual) lastRareAudioAt = now;

    const base = [0, 250, 330, 440, 540, 660, 820][tier] || 250;
    tone(base, 0, 0.055, 0.021, "triangle");
    if (tier >= 2) tone(base * 1.25, 0.045, 0.06, 0.018, "sine");
    if (tier >= 3) tone(base * 1.5, 0.09, 0.07, 0.018, "sine");
    if (tier >= 5) tone(base * 2, 0.15, 0.11, 0.022, "triangle");
  }

  function playPrestigeSound() {
    if (!preferences.enabled) return;
    [260, 390, 520, 780].forEach((frequency, index) => {
      tone(frequency, index * 0.085, 0.13, 0.024, index < 3 ? "sine" : "triangle");
    });
  }

  function comboForResult(result) {
    if (!result?.comboName || result.comboName === "Aucune") return null;
    return CONFIG.combos.find((combo) => combo.name === result.comboName) || null;
  }

  function tierForResult(result) {
    const combo = comboForResult(result);
    return combo ? (tierByComboId[combo.id] || 1) : 0;
  }

  function autoInterval(save) {
    const upgrade = CONFIG.prestigeShop.find((entry) => entry.id === "auto_clicker");
    const level = Math.max(0, Math.floor(Number(save?.prestigeUpgrades?.auto_clicker) || 0));
    return Number(upgrade?.intervalsMs?.[level]) || 0;
  }

  function clearTierClasses(node) {
    if (!node) return;
    for (let tier = 0; tier <= 6; tier += 1) node.classList.remove(`feel-tier-${tier}`);
    node.classList.remove("feel-hit");
  }

  function restartClass(node, className) {
    if (!node || reducedMotion) return;
    node.classList.remove(className);
    void node.offsetWidth;
    node.classList.add(className);
  }

  function floatingGain(gain, tier) {
    if (reducedMotion || !Number.isFinite(Number(gain)) || Number(gain) <= 0) return;
    const source = document.querySelector(".gain-box");
    const target = document.getElementById("pointsValue");
    if (!source || !target) return;

    const from = source.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const node = document.createElement("div");
    node.className = `feel-floating-gain feel-tier-${tier}`;
    node.textContent = `+${new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 2 }).format(Number(gain) || 0)}`;
    node.style.setProperty("--feel-x", `${from.left + from.width * 0.72}px`);
    node.style.setProperty("--feel-y", `${from.top + from.height * 0.45}px`);
    node.style.setProperty("--feel-dx", `${to.left + to.width * 0.5 - (from.left + from.width * 0.72)}px`);
    node.style.setProperty("--feel-dy", `${to.top + to.height * 0.5 - (from.top + from.height * 0.45)}px`);
    document.body.appendChild(node);
    node.addEventListener("animationend", () => node.remove(), { once: true });
    window.setTimeout(() => node.remove(), 1300);
  }

  function comboBanner(result, tier) {
    if (reducedMotion || tier < 3 || !result?.comboName) return;
    document.querySelectorAll(".feel-combo-banner").forEach((node) => node.remove());

    const banner = document.createElement("div");
    banner.className = `feel-combo-banner feel-tier-${tier}`;
    banner.innerHTML = `<strong>${result.comboName}</strong><span>×${new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 2 }).format(Number(result.multiplier) || 1)}</span>`;
    document.body.appendChild(banner);

    if (tier >= 5) {
      for (let index = 0; index < 10; index += 1) {
        const particle = document.createElement("i");
        particle.style.setProperty("--particle-angle", `${index * 36}deg`);
        particle.style.setProperty("--particle-distance", `${48 + (index % 3) * 14}px`);
        banner.appendChild(particle);
      }
    }

    window.setTimeout(() => banner.remove(), tier >= 5 ? 1250 : 900);
  }

  function showRollFeedback(result, isManual, save) {
    if (!result || document.hidden) return;
    const tier = tierForResult(result);
    const fastAuto = !isManual && autoInterval(save) > 0 && autoInterval(save) < 500;
    const card = document.querySelector(".roll-card");
    const resultPanel = document.querySelector(".result-panel");
    const gain = document.getElementById("gainValue");
    const combo = document.getElementById("comboValue");

    [card, resultPanel, gain, combo].forEach((node) => {
      clearTierClasses(node);
      node?.classList.add(`feel-tier-${tier}`);
    });

    restartClass(resultPanel, "feel-hit");
    restartClass(gain, "feel-hit");
    if (tier >= 1) restartClass(combo, "feel-hit");

    if (isManual || !fastAuto || tier >= 3) floatingGain(result.gain, tier);
    comboBanner(result, tier);
    playRollSound(tier, isManual, fastAuto);
  }

  function showPrestigeFeedback(gems) {
    if (document.hidden) return;
    playPrestigeSound();

    const gemNode = document.getElementById("gemsValue");
    restartClass(gemNode, "feel-prestige-gem");
    if (!reducedMotion) {
      document.body.classList.remove("feel-prestige-flash");
      void document.body.offsetWidth;
      document.body.classList.add("feel-prestige-flash");
    }

    const banner = document.createElement("div");
    banner.className = "feel-prestige-banner";
    banner.innerHTML = `<span>PRESTIGE</span><strong>+${Math.max(0, Math.floor(Number(gems) || 0))} 💎</strong>`;
    document.body.appendChild(banner);
    window.setTimeout(() => banner.remove(), 1500);
  }

  function processTransition(prev, next) {
    if (!next || typeof next !== "object") return;
    const rollDelta = Math.max(0, Math.floor(Number(next.totalRolls) || 0) - Math.floor(Number(prev?.totalRolls) || 0));
    const prestigeDelta = Math.max(0, Math.floor(Number(next.prestigeCount) || 0) - Math.floor(Number(prev?.prestigeCount) || 0));
    const wasManual = manualIntent;
    manualIntent = false;

    if (rollDelta === 1 && next.lastResult) {
      window.requestAnimationFrame(() => showRollFeedback(next.lastResult, wasManual, next));
    }

    if (prestigeDelta > 0) {
      const reward = Math.max(0, Math.floor(Number(next.gems) || 0) - Math.floor(Number(prev?.gems) || 0));
      window.requestAnimationFrame(() => showPrestigeFeedback(reward));
    }
  }

  const rollButton = document.getElementById("rollButton");
  rollButton?.addEventListener("click", () => {
    manualIntent = true;
  }, { capture: true });

  if (storageProto && inheritedSetItem) {
    storageProto.setItem = function nightIdleFeelSetItem(key, value) {
      if (this === localStorage && key === SAVE_KEY) {
        try {
          const next = JSON.parse(value);
          if (next && typeof next === "object") {
            const prev = previousSave;
            const result = inheritedSetItem.call(this, key, value);
            processTransition(prev, next);
            previousSave = next;
            return result;
          }
        } catch (error) {
          console.warn("[Night Idle] Feedback visuel ignoré pour cette sauvegarde", error);
        }
      }
      return inheritedSetItem.call(this, key, value);
    };
  }

  const footerButtons = document.querySelector(".footer-buttons");
  const resetButton = document.getElementById("resetButton");
  let fxButton = document.getElementById("fxButton");
  if (footerButtons && !fxButton) {
    fxButton = document.createElement("button");
    fxButton.id = "fxButton";
    fxButton.type = "button";
    fxButton.className = "prestige-button feel-toggle";
    footerButtons.insertBefore(fxButton, resetButton || null);
  }

  function renderFxButton() {
    if (!fxButton) return;
    fxButton.textContent = preferences.enabled ? "SFX ✓" : "SFX OFF";
    fxButton.classList.toggle("is-enabled", preferences.enabled);
    fxButton.setAttribute("aria-label", preferences.enabled ? "Désactiver les effets sonores" : "Activer les effets sonores");
  }

  fxButton?.addEventListener("click", () => {
    preferences.enabled = !preferences.enabled;
    savePreferences();
    if (preferences.enabled) {
      unlockAudio();
      tone(440, 0, 0.06, 0.018, "sine");
    }
    renderFxButton();
  });

  renderFxButton();
  window.NightIdleFeel = Object.freeze({
    version: 2,
    enabled: () => preferences.enabled
  });
})();
