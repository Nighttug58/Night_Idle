(() => {
  "use strict";

  function evaluateAchievements() {
    window.setTimeout(() => {
      try {
        window.NightIdleAchievements?.evaluate?.();
      } catch (error) {
        console.warn("[Night Idle] Synchronisation Défis → Succès impossible", error);
      }
    }, 0);
  }

  window.addEventListener("nightidle:challenge-complete", evaluateAchievements);
})();
