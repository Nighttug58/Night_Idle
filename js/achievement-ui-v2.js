(() => {
  "use strict";

  const API = window.NightIdleAchievements;
  if (!API) return;
  const BUILD = "20260914-challenge-achievements1";
  let activeCategory = "progression";
  let activeView = "achievements";
  let toastTimer = 0;

  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = `achievements.css?v=${BUILD}`;
  document.head.appendChild(stylesheet);

  const footerButtons = document.querySelector(".footer-buttons");
  const statsButton = document.getElementById("statsButton");
  const prestigeButton = document.getElementById("prestigeButton");
  let button = document.getElementById("achievementButton");
  if (footerButtons && !button) {
    button = document.createElement("button");
    button.id = "achievementButton";
    button.className = "prestige-button achievement-button";
    button.type = "button";
    button.textContent = "SUCCÈS";
    button.setAttribute("aria-haspopup", "dialog");
    footerButtons.insertBefore(button, statsButton || prestigeButton || footerButtons.firstChild);
  }

  let modal = document.getElementById("achievementModal");
  if (!modal) {
    modal = document.createElement("dialog");
    modal.id = "achievementModal";
    modal.className = "modal achievement-modal";
    modal.setAttribute("aria-labelledby", "achievementTitle");
    modal.innerHTML = `
      <div class="modal-card achievement-modal-card">
        <div class="modal-header">
          <div><p class="eyebrow">PROGRESSION PERMANENTE</p><h2 id="achievementTitle">Succès & AP</h2></div>
          <button id="closeAchievementButton" class="modal-close" type="button" aria-label="Fermer">×</button>
        </div>
        <div id="achievementSummary" class="achievement-summary"></div>
        <div class="modal-tabs achievement-main-tabs" role="tablist">
          <button id="achievementListTab" class="modal-tab is-active" type="button">SUCCÈS</button>
          <button id="achievementShopTab" class="modal-tab" type="button">BOUTIQUE AP</button>
        </div>
        <div class="achievement-body modal-scroll">
          <section id="achievementListPanel">
            <div id="achievementCategoryTabs" class="achievement-category-tabs"></div>
            <div id="achievementList" class="achievement-list"></div>
          </section>
          <section id="achievementShopPanel" hidden><div id="achievementShop"></div></section>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  let toast = document.getElementById("achievementToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "achievementToast";
    toast.className = "achievement-toast";
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }

  function n(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }
  function fmt(v, compact = false) {
    return new Intl.NumberFormat("fr-CH", compact ? { notation: "compact", maximumFractionDigits: 1 } : { maximumFractionDigits: 2 }).format(n(v));
  }
  function fmtDuration(seconds) {
    const s = Math.max(0, Math.floor(n(seconds)));
    if (s < 60) return `${s} s`;
    if (s < 3600) return `${Math.floor(s / 60)} min`;
    return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
  }
  function fmtValue(d, value) {
    if (d.format === "multiplier") return `×${fmt(value)}`;
    if (d.format === "compact") return fmt(value, true);
    if (d.format === "duration") return fmtDuration(value);
    return fmt(value);
  }

  function renderSummary() {
    const s = API.snapshot();
    const node = document.getElementById("achievementSummary");
    if (!node) return;
    node.innerHTML = `
      <div><span>AP disponibles</span><strong>${fmt(s.availableAP)}</strong></div>
      <div><span>AP gagnés</span><strong>${fmt(s.earnedAP)} / ${fmt(s.maxAP)}</strong></div>
      <div><span>Bonus total</span><strong>×${fmt(s.gainMultiplier)}</strong></div>
      <div><span>Paliers</span><strong>${fmt(s.completedMilestones)} / ${fmt(s.maxMilestones)}</strong></div>`;
  }

  function renderCategories() {
    const node = document.getElementById("achievementCategoryTabs");
    if (!node) return;
    node.replaceChildren();
    API.categories.forEach((category) => {
      const defs = API.definitions.filter((d) => d.category === category.id);
      const max = defs.length * 10;
      let complete = 0;
      defs.forEach((d) => {
        const value = API.metricValue(d);
        let tier = 0;
        while (tier < 10 && value >= d.thresholds[tier]) tier += 1;
        complete += tier;
      });
      const b = document.createElement("button");
      b.type = "button";
      b.className = `achievement-category${activeCategory === category.id ? " is-active" : ""}`;
      b.innerHTML = `<strong>${category.name}</strong><span>${complete}/${max}</span>`;
      b.addEventListener("click", () => { activeCategory = category.id; renderCategories(); renderList(); });
      node.appendChild(b);
    });
  }

  function renderList() {
    const list = document.getElementById("achievementList");
    if (!list) return;
    list.replaceChildren();
    API.definitions.filter((d) => d.category === activeCategory).forEach((d) => {
      const value = API.metricValue(d);
      let tier = 0;
      while (tier < 10 && value >= d.thresholds[tier]) tier += 1;
      const maxed = tier >= 10;
      const target = maxed ? d.thresholds[9] : d.thresholds[tier];
      const previous = tier > 0 ? d.thresholds[tier - 1] : 0;
      const progress = maxed ? 1 : Math.max(0, Math.min(1, (value - previous) / Math.max(1e-9, target - previous)));
      const reward = maxed ? API.tierRewards[9] : API.tierRewards[tier];
      const card = document.createElement("article");
      card.className = `achievement-card${maxed ? " is-complete" : ""}`;
      card.innerHTML = `
        <div class="achievement-card-head">
          <div><strong>${d.name}</strong><span>Palier ${tier}/10</span></div>
          <b>${maxed ? "COMPLET" : `+${reward} AP`}</b>
        </div>
        <p>${d.description}</p>
        <div class="achievement-progress-line"><span>${fmtValue(d, value)}</span><strong>${fmtValue(d, target)}</strong></div>
        <div class="achievement-progress"><i style="transform:scaleX(${progress})"></i></div>`;
      list.appendChild(card);
    });
  }

  function renderShop() {
    const node = document.getElementById("achievementShop");
    if (!node) return;
    const s = API.snapshot();
    const level = s.multiplierLevel;
    const maxed = level >= API.multiplierCosts.length;
    const cost = maxed ? 0 : API.multiplierCosts[level];
    const next = maxed ? s.gainMultiplier : Math.min(10, 1 + (level + 1) * 0.9);
    const surplus = Math.max(0, s.maxAP - s.maxCost);
    node.innerHTML = `
      <article class="achievement-shop-card${maxed ? " is-maxed" : ""}">
        <div class="achievement-shop-title">
          <div><span>MULTIPLICATEUR DE SUCCÈS</span><strong>Puissance des Achievements</strong></div>
          <b>Niv. ${level}/10</b>
        </div>
        <p>Bonus final appliqué à tous les gains. Chaque niveau ajoute +0,9× au multiplicateur Achievement.</p>
        <div class="achievement-shop-effect">×${fmt(s.gainMultiplier)}${maxed ? "" : ` → <strong>×${fmt(next)}</strong>`}</div>
        <button id="buyAchievementMultiplier" class="prestige-shop-buy" type="button" ${maxed || s.availableAP < cost ? "disabled" : ""}>
          ${maxed ? `<span>MAX</span><strong>×${fmt(s.gainMultiplier)}</strong>` : `<span>AMÉLIORER</span><strong>${fmt(cost)} AP</strong>`}
        </button>
      </article>
      <div class="achievement-budget-note">
        <strong>Coût du ×10 réduit à ${fmt(s.maxCost)} AP</strong>
        <span>${fmt(s.maxAP)} AP maximum peuvent être gagnés dans les ${fmt(s.maxMilestones)} paliers.</span>
        <span>Une fois le ×10 acheté, jusqu'à ${fmt(surplus)} AP peuvent rester disponibles pour de futures dépenses AP.</span>
      </div>`;
    document.getElementById("buyAchievementMultiplier")?.addEventListener("click", () => {
      if (API.buyMultiplier()) render();
    });
  }

  function setView(view) {
    activeView = view === "shop" ? "shop" : "achievements";
    const list = document.getElementById("achievementListPanel");
    const shop = document.getElementById("achievementShopPanel");
    const listTab = document.getElementById("achievementListTab");
    const shopTab = document.getElementById("achievementShopTab");
    const showList = activeView === "achievements";
    if (list) list.hidden = !showList;
    if (shop) shop.hidden = showList;
    listTab?.classList.toggle("is-active", showList);
    shopTab?.classList.toggle("is-active", !showList);
    if (showList) { renderCategories(); renderList(); } else renderShop();
  }

  function render() { renderSummary(); setView(activeView); }

  button?.addEventListener("click", () => {
    API.evaluate();
    render();
    if (!modal.open) modal.showModal();
  });
  document.getElementById("closeAchievementButton")?.addEventListener("click", () => modal.close());
  modal?.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
  document.getElementById("achievementListTab")?.addEventListener("click", () => { activeView = "achievements"; render(); });
  document.getElementById("achievementShopTab")?.addEventListener("click", () => { activeView = "shop"; render(); });

  window.addEventListener("nightidle:achievement-unlock", (e) => {
    const { definition, tier, reward } = e.detail || {};
    if (!definition) return;
    toast.innerHTML = `<span>SUCCÈS · PALIER ${tier}</span><strong>${definition.name}</strong><em>+${reward} AP</em>`;
    toast.classList.remove("is-showing");
    void toast.offsetWidth;
    toast.classList.add("is-showing");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-showing"), 2200);
    if (modal?.open) render();
  });
  window.addEventListener("nightidle:achievement-change", () => { if (modal?.open) render(); });

  render();
})();