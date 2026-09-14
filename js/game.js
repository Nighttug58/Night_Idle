(() => {
  "use strict";

  const BUILD = "20260914-stability1";

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

  async function boot() {
    try {
      await loadScript("js/stability.js");
    } catch (error) {
      console.warn("[Night Idle] Guard de stabilité indisponible, poursuite du boot.", error);
    }

    try {
      await loadScript("js/game-core.js");
    } catch (error) {
      console.error("[Night Idle] Échec du chargement du moteur principal.", error);
      const event = new ErrorEvent("error", { error, message: error.message });
      window.dispatchEvent(event);
    }
  }

  boot();
})();
