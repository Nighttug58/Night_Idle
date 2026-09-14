(() => {
  "use strict";

  const CONFIG = window.NightIdleConfig;
  if (!CONFIG) return;

  const SAVE_KEY = "nightIdle.save.v1";
  const SNAPSHOT_KEY = "nightIdle.offline.snapshot.v1";
  const TEST_KEY = "nightIdle.storage.test";
  const ERROR_KEY = "nightIdle.last.error";

  function rememberError(kind, error) {
    try {
      const message = error?.message || String(error || "Erreur inconnue");
      const stack = error?.stack || "";
      sessionStorage.setItem(ERROR_KEY, JSON.stringify({
        kind,
        message,
        stack,
        at: Date.now()
      }));
    } catch {
      // Le diagnostic ne doit jamais devenir une nouvelle source d'erreur.
    }
  }

  window.addEventListener("error", (event) => {
    rememberError("error", event.error || event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    rememberError("unhandledrejection", event.reason);
  });

  function storageAvailable() {
    try {
      localStorage.setItem(TEST_KEY, "1");
      localStorage.removeItem(TEST_KEY);
      return true;
    } catch (error) {
      rememberError("storage", error);
      return false;
    }
  }

  const hasStorage = storageAvailable();

  // Les seuls timeouts récurrents du jeu sont actuellement ceux de l'Auto Clicker.
  // On les empêche de produire lorsque l'onglet est réellement masqué : le revenu
  // hors ligne reste alors l'unique propriétaire de cette période.
  const autoIntervals = new Set(
    (CONFIG.prestigeShop.find((upgrade) => upgrade.id === "auto_clicker")?.intervalsMs || [])
      .map((value) => Number(value))
      .filter((value) => value > 0)
  );

  const nativeSetTimeout = window.setTimeout.bind(window);
  window.setTimeout = function nightIdleSetTimeout(handler, delay = 0, ...args) {
    const numericDelay = Number(delay) || 0;
    if (typeof handler !== "function" || !autoIntervals.has(numericDelay)) {
      return nativeSetTimeout(handler, numericDelay, ...args);
    }

    const guardedHandler = (...callbackArgs) => {
      if (document.hidden) {
        return nativeSetTimeout(guardedHandler, Math.max(1000, numericDelay), ...callbackArgs);
      }
      return handler(...callbackArgs);
    };

    return nativeSetTimeout(guardedHandler, numericDelay, ...args);
  };

  // Une page restaurée depuis le Back/Forward Cache peut revenir avec des timers
  // et un état JS figés. Un reload unique remet save/offline/auto-clicker en cohérence.
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    try {
      const key = "nightIdle.bfcache.reloaded";
      if (sessionStorage.getItem(key) === "1") {
        sessionStorage.removeItem(key);
        return;
      }
      sessionStorage.setItem(key, "1");
    } catch {
      // Même sans sessionStorage, le reload reste préférable à un runtime figé.
    }
    window.location.reload();
  });

  function makeRecoveryBanner(message) {
    if (document.getElementById("nightIdleRecoveryBanner")) return;

    const banner = document.createElement("section");
    banner.id = "nightIdleRecoveryBanner";
    banner.setAttribute("role", "alert");
    banner.style.cssText = [
      "position:fixed",
      "inset:12px 12px auto 12px",
      "z-index:99999",
      "padding:12px",
      "border:1px solid rgba(255,127,146,.45)",
      "border-radius:14px",
      "background:#1b1116",
      "color:#f5f7fb",
      "font:600 13px/1.35 system-ui,sans-serif",
      "box-shadow:0 16px 50px rgba(0,0,0,.5)"
    ].join(";");

    const text = document.createElement("div");
    text.textContent = message;

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:8px;margin-top:10px;flex-wrap:wrap";

    const reload = document.createElement("button");
    reload.type = "button";
    reload.textContent = "RECHARGER";
    reload.style.cssText = "padding:8px 10px;border:0;border-radius:9px;background:#8a7dff;color:white;font-weight:800";
    reload.addEventListener("click", () => window.location.reload());

    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = "RÉINITIALISER LA SAVE";
    reset.style.cssText = "padding:8px 10px;border:1px solid rgba(255,255,255,.14);border-radius:9px;background:#242d3d;color:#ff9aaa;font-weight:800";
    reset.addEventListener("click", () => {
      if (!window.confirm("Réinitialiser uniquement la sauvegarde locale Night Idle ?")) return;
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) localStorage.setItem(`${SAVE_KEY}.backup.${Date.now()}`, raw);
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem(SNAPSHOT_KEY);
      } catch {
        // Le reload reste utile même si le stockage est inaccessible.
      }
      window.location.reload();
    });

    actions.append(reload, reset);
    banner.append(text, actions);
    document.body.appendChild(banner);
  }

  // Le jeu doit avoir construit au moins le premier dé après son boot.
  // Délai volontairement différent des vitesses Auto Clicker pour ne pas être intercepté.
  nativeSetTimeout(() => {
    const tray = document.getElementById("diceTray");
    const rollButton = document.getElementById("rollButton");
    const booted = Boolean(tray?.children?.length && rollButton);

    if (!hasStorage) {
      console.warn("[Night Idle] localStorage indisponible : progression non persistante.");
    }

    if (!booted) {
      let detail = "Le moteur n'a pas terminé son initialisation.";
      try {
        const last = JSON.parse(sessionStorage.getItem(ERROR_KEY) || "null");
        if (last?.message) detail += ` Erreur : ${last.message}`;
      } catch {
        // Pas de détail disponible.
      }
      makeRecoveryBanner(detail);
    }
  }, 1375);
})();
