(() => {
  "use strict";

  const SAVE_KEY = "nightIdle.save.v1";
  const SNAPSHOT_KEY = "nightIdle.offline.snapshot.v1";

  function stable(value) {
    if (Array.isArray(value)) return value.map(stable);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])])
    );
  }

  try {
    const saveRaw = localStorage.getItem(SAVE_KEY);
    const snapshotRaw = localStorage.getItem(SNAPSHOT_KEY);
    if (!saveRaw || !snapshotRaw) return;

    const save = JSON.parse(saveRaw);
    const snapshot = JSON.parse(snapshotRaw);
    if (!snapshot?.save) return;

    const mainState = JSON.stringify(stable(save));
    const snapshotState = JSON.stringify(stable(snapshot.save));

    if (mainState !== snapshotState) {
      console.warn("[Night Idle] Snapshot offline obsolète ignoré pour protéger le save principal.");
      localStorage.removeItem(SNAPSHOT_KEY);
    }
  } catch (error) {
    console.warn("[Night Idle] Préflight offline ignoré", error);
  }
})();
