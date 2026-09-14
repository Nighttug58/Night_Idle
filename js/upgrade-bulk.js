(() => {
  "use strict";

  const BUILD = "20260914-upgrade-bulk1";

  const upgradesButton = document.getElementById("upgradesButton");
  if (upgradesButton) {
    upgradesButton.textContent = "UPGRADE";
    upgradesButton.setAttribute("aria-label", "Ouvrir les upgrades");
  }

  const upgradesTitle = document.getElementById("upgradesTitle");
  if (upgradesTitle) upgradesTitle.textContent = "Upgrade";

  const balance = document.querySelector("#upgradesModal .upgrade-balance");
  if (balance && !document.getElementById("upgradeBuyMode")) {
    const selector = document.createElement("div");
    selector.id = "upgradeBuyMode";
    selector.className = "upgrade-buy-mode";
    selector.setAttribute("role", "group");
    selector.setAttribute("aria-label", "Quantité d'achat");
    selector.innerHTML = `
      <span>ACHAT</span>
      <div class="upgrade-buy-mode-buttons">
        <button id="upgradeBuyMode1" class="upgrade-buy-mode-button is-active" type="button" data-mode="1" aria-pressed="true">×1</button>
        <button id="upgradeBuyMode10" class="upgrade-buy-mode-button" type="button" data-mode="10" aria-pressed="false">×10</button>
        <button id="upgradeBuyModeMax" class="upgrade-buy-mode-button" type="button" data-mode="max" aria-pressed="false">MAX</button>
      </div>`;
    balance.insertAdjacentElement("afterend", selector);
  }

  const style = document.createElement("style");
  style.id = "upgradeBulkStyle";
  style.textContent = `
    .upgrade-buy-mode {
      display: flex;
      width: 100%;
      min-height: 42px;
      padding: 6px 8px;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 12px;
      background: rgba(255,255,255,.025);
    }
    .upgrade-buy-mode > span {
      color: var(--text-muted, #9da7b5);
      font-size: .62rem;
      font-weight: 900;
      letter-spacing: .12em;
    }
    .upgrade-buy-mode-buttons {
      display: grid;
      min-width: 174px;
      grid-template-columns: repeat(3, 1fr);
      gap: 5px;
    }
    .upgrade-buy-mode-button {
      min-height: 30px;
      padding: 4px 10px;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 9px;
      background: rgba(255,255,255,.035);
      color: var(--text-muted, #aeb7c4);
      font-size: .68rem;
      font-weight: 950;
      cursor: pointer;
    }
    .upgrade-buy-mode-button.is-active {
      border-color: rgba(165,156,255,.58);
      background: rgba(138,125,255,.18);
      color: var(--accent-strong, #d7d2ff);
      box-shadow: inset 0 0 0 1px rgba(165,156,255,.08);
    }
    @media (max-width: 390px) {
      .upgrade-buy-mode-buttons { min-width: 156px; }
      .upgrade-buy-mode-button { padding-inline: 7px; }
    }
  `;
  document.head.appendChild(style);

  function patchCore(source) {
    let patched = source;

    const stateNeedle = `  let state = load();\n  let activeUpgradeTab = "general";\n  let activePrestigeTab = "prestige";\n  let autoTimer = null;`;
    if (!patched.includes(stateNeedle)) throw new Error("État Upgrade introuvable");
    patched = patched.replace(
      stateNeedle,
      `  let state = load();\n  let activeUpgradeTab = "general";\n  let activePrestigeTab = "prestige";\n  let upgradeBuyMode = "1";\n  let autoTimer = null;`
    );

    const comboCostNeedle = `  function comboUpgradeCost(combo) {\n    return Math.ceil(\n      combo.upgradeBaseCost *\n      Math.pow(CONFIG.comboUpgrade.costGrowth, comboUpgradeLevel(combo.id))\n    );\n  }`;
    if (!patched.includes(comboCostNeedle)) throw new Error("Coût maîtrise introuvable");
    patched = patched.replace(
      comboCostNeedle,
      `${comboCostNeedle}\n\n  function requestedUpgradeQuantity() {\n    if (upgradeBuyMode === "10") return 10;\n    if (upgradeBuyMode === "max") return Number.POSITIVE_INFINITY;\n    return 1;\n  }\n\n  function batchQuote(costAtLevel, currentLevel) {\n    const requested = requestedUpgradeQuantity();\n    const maxIterations = requested === Number.POSITIVE_INFINITY ? 10000 : requested;\n    let total = 0;\n    let quantity = 0;\n\n    for (let offset = 0; offset < maxIterations; offset += 1) {\n      const cost = Math.max(1, Math.ceil(Number(costAtLevel(currentLevel + offset)) || 0));\n      if (!Number.isFinite(cost) || cost <= 0) break;\n\n      if (requested === Number.POSITIVE_INFINITY) {\n        if (total + cost > state.points) break;\n        total += cost;\n        quantity += 1;\n        continue;\n      }\n\n      total += cost;\n      quantity += 1;\n    }\n\n    if (requested !== Number.POSITIVE_INFINITY) {\n      return { quantity, cost: total, affordable: quantity > 0 && state.points >= total, mode: upgradeBuyMode };\n    }\n\n    return { quantity, cost: total, affordable: quantity > 0, mode: upgradeBuyMode };\n  }\n\n  function generalBatchQuote(upgrade) {\n    return batchQuote(\n      (level) => upgrade.baseCost * Math.pow(upgrade.costGrowth, level),\n      upgradeLevel(upgrade.id)\n    );\n  }\n\n  function comboBatchQuote(combo) {\n    return batchQuote(\n      (level) => combo.upgradeBaseCost * Math.pow(CONFIG.comboUpgrade.costGrowth, level),\n      comboUpgradeLevel(combo.id)\n    );\n  }\n\n  function batchLabel(quote) {\n    if (quote.mode === "max") return quote.quantity > 0 ? \`MAX ×\${quote.quantity}\` : "MAX";\n    return \`×\${quote.quantity}\`;\n  }`
    );

    const buyUpgradeNeedle = `  function buyUpgrade(id) {\n    const upgrade = generalUpgrade(id);\n    if (!upgrade) return;\n    const cost = upgradeCost(upgrade);\n    if (state.points < cost) return;\n\n    state.points -= cost;\n    state.upgrades[id] = upgradeLevel(id) + 1;\n    save();\n    render(false, true);\n  }`;
    if (!patched.includes(buyUpgradeNeedle)) throw new Error("Achat Upgrade introuvable");
    patched = patched.replace(
      buyUpgradeNeedle,
      `  function buyUpgrade(id) {\n    const upgrade = generalUpgrade(id);\n    if (!upgrade) return;\n    const quote = generalBatchQuote(upgrade);\n    if (!quote.affordable || quote.quantity <= 0) return;\n\n    state.points -= quote.cost;\n    state.upgrades[id] = upgradeLevel(id) + quote.quantity;\n    save();\n    render(false, true);\n  }`
    );

    const buyComboNeedle = `  function buyComboUpgrade(id) {\n    const combo = comboById(id);\n    if (!combo || !comboUnlocked(id)) return;\n    const cost = comboUpgradeCost(combo);\n    if (state.points < cost) return;\n\n    state.points -= cost;\n    state.comboUpgrades[id] = comboUpgradeLevel(id) + 1;\n    save();\n    render(false, true);\n  }`;
    if (!patched.includes(buyComboNeedle)) throw new Error("Achat maîtrise introuvable");
    patched = patched.replace(
      buyComboNeedle,
      `  function buyComboUpgrade(id) {\n    const combo = comboById(id);\n    if (!combo || !comboUnlocked(id)) return;\n    const quote = comboBatchQuote(combo);\n    if (!quote.affordable || quote.quantity <= 0) return;\n\n    state.points -= quote.cost;\n    state.comboUpgrades[id] = comboUpgradeLevel(id) + quote.quantity;\n    save();\n    render(false, true);\n  }`
    );

    const effectNeedle = `  function effectLabel(upgrade, next = false) {\n    const level = upgradeLevel(upgrade.id) + (next ? 1 : 0);\n    const value = 1 + level * upgrade.effectPerLevel;\n    return \`×\${fmt(value)}\`;\n  }`;
    if (!patched.includes(effectNeedle)) throw new Error("Prévisualisation Upgrade introuvable");
    patched = patched.replace(
      effectNeedle,
      `  function effectLabel(upgrade, offset = 0) {\n    const level = upgradeLevel(upgrade.id) + Math.max(0, Number(offset) || 0);\n    const value = 1 + level * upgrade.effectPerLevel;\n    return \`×\${fmt(value)}\`;\n  }`
    );

    const generalCardNeedle = `    const level = upgradeLevel(upgrade.id);\n    const cost = upgradeCost(upgrade);\n    const affordable = state.points >= cost;`;
    if (!patched.includes(generalCardNeedle)) throw new Error("Carte Upgrade introuvable");
    patched = patched.replace(
      generalCardNeedle,
      `    const level = upgradeLevel(upgrade.id);\n    const quote = generalBatchQuote(upgrade);\n    const cost = quote.cost;\n    const affordable = quote.affordable;`
    );
    patched = patched.replace(
      `      <div class="upgrade-effect">\${effectLabel(upgrade)} → <strong>\${effectLabel(upgrade, true)}</strong></div>`,
      `      <div class="upgrade-effect">\${effectLabel(upgrade)} → <strong>\${effectLabel(upgrade, quote.quantity)}</strong></div>`
    );
    patched = patched.replace(
      `    button.innerHTML = \`<span>AMÉLIORER</span><strong>\${fmt(cost)} pts</strong>\`;`,
      `    button.innerHTML = \`<span>AMÉLIORER \${batchLabel(quote)}</span><strong>\${fmt(cost)} pts</strong>\`;`
    );

    const comboCardNeedle = `    const unlocked = comboUnlocked(combo.id);\n    const level = comboUpgradeLevel(combo.id);\n    const cost = comboUpgradeCost(combo);\n    const affordable = unlocked && state.points >= cost;\n    const currentOwnFactor = 1 + level * CONFIG.comboUpgrade.effectPerLevel;\n    const nextOwnFactor = currentOwnFactor + CONFIG.comboUpgrade.effectPerLevel;`;
    if (!patched.includes(comboCardNeedle)) throw new Error("Carte maîtrise introuvable");
    patched = patched.replace(
      comboCardNeedle,
      `    const unlocked = comboUnlocked(combo.id);\n    const level = comboUpgradeLevel(combo.id);\n    const quote = comboBatchQuote(combo);\n    const cost = quote.cost;\n    const affordable = unlocked && quote.affordable;\n    const currentOwnFactor = 1 + level * CONFIG.comboUpgrade.effectPerLevel;\n    const nextOwnFactor = currentOwnFactor + quote.quantity * CONFIG.comboUpgrade.effectPerLevel;`
    );
    patched = patched.replace(
      `      ? \`<span>AMÉLIORER</span><strong>\${fmt(cost)} pts</strong>\``,
      `      ? \`<span>AMÉLIORER \${batchLabel(quote)}</span><strong>\${fmt(cost)} pts</strong>\``
    );

    const setTabNeedle = `  function setUpgradeTab(tab) {`;
    if (!patched.includes(setTabNeedle)) throw new Error("Tabs Upgrade introuvables");
    patched = patched.replace(
      setTabNeedle,
      `  function syncUpgradeBuyModeControls() {\n    const modes = [["upgradeBuyMode1", "1"], ["upgradeBuyMode10", "10"], ["upgradeBuyModeMax", "max"]];\n    modes.forEach(([id, mode]) => {\n      const button = document.getElementById(id);\n      if (!button) return;\n      const active = upgradeBuyMode === mode;\n      button.classList.toggle("is-active", active);\n      button.setAttribute("aria-pressed", String(active));\n    });\n  }\n\n  function setUpgradeBuyMode(mode) {\n    upgradeBuyMode = mode === "10" || mode === "max" ? mode : "1";\n    syncUpgradeBuyModeControls();\n    if (ui.upgradesModal.open) renderUpgrades();\n  }\n\n${setTabNeedle}`
    );

    const listenerNeedle = `  ui.comboMasteriesTab.addEventListener("click", () => setUpgradeTab("masteries"));`;
    if (!patched.includes(listenerNeedle)) throw new Error("Listeners Upgrade introuvables");
    patched = patched.replace(
      listenerNeedle,
      `${listenerNeedle}\n  document.getElementById("upgradeBuyMode1")?.addEventListener("click", () => setUpgradeBuyMode("1"));\n  document.getElementById("upgradeBuyMode10")?.addEventListener("click", () => setUpgradeBuyMode("10"));\n  document.getElementById("upgradeBuyModeMax")?.addEventListener("click", () => setUpgradeBuyMode("max"));`
    );

    const initNeedle = `  setUpgradeTab(activeUpgradeTab);\n  setPrestigeTab(activePrestigeTab);`;
    if (!patched.includes(initNeedle)) throw new Error("Initialisation Upgrade introuvable");
    patched = patched.replace(
      initNeedle,
      `  setUpgradeBuyMode("1");\n  setUpgradeTab(activeUpgradeTab);\n  setPrestigeTab(activePrestigeTab);`
    );

    return patched;
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function nightIdleUpgradeBulkFetch(input, init) {
    const response = await originalFetch(input, init);
    const url = typeof input === "string" ? input : String(input?.url || "");
    if (!/js\/game-core\.js(?:\?|$)/.test(url) || !response.ok) return response;

    try {
      const source = await response.text();
      const patched = patchCore(source);
      return new Response(patched, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    } catch (error) {
      console.warn("[Night Idle] Achat multiple indisponible, moteur standard conservé.", error);
      return response;
    }
  };

  window.NightIdleUpgradeBulk = Object.freeze({ version: 1, build: BUILD });
})();
