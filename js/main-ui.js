(() => {
  "use strict";

  const BUILD = "20260914-mainui1";
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = `main-ui.css?v=${BUILD}`;
  document.head.appendChild(stylesheet);

  const rollButton = document.getElementById("rollButton");
  const diceTray = document.getElementById("diceTray");

  function triggerRoll(event) {
    if (!rollButton || !diceTray) return;
    if (event?.target?.closest?.(".locked-die")) return;
    rollButton.click();
  }

  if (diceTray && rollButton) {
    diceTray.tabIndex = 0;
    diceTray.setAttribute("role", "button");
    diceTray.setAttribute("aria-label", "Lancer les dés");
    diceTray.addEventListener("click", triggerRoll);
    diceTray.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target?.closest?.(".locked-die")) return;
      event.preventDefault();
      triggerRoll(event);
    });
  }

  const suffixes = [
    { value: 1e33, suffix: "Dc" },
    { value: 1e30, suffix: "No" },
    { value: 1e27, suffix: "Oc" },
    { value: 1e24, suffix: "Sp" },
    { value: 1e21, suffix: "Sx" },
    { value: 1e18, suffix: "Qi" },
    { value: 1e15, suffix: "Q" },
    { value: 1e12, suffix: "T" },
    { value: 1e9, suffix: "B" },
    { value: 1e6, suffix: "M" }
  ];

  function parseDisplayedNumber(text) {
    if (typeof text !== "string") return NaN;
    const cleaned = text
      .replace(/[’'\u00a0\u202f\s]/g, "")
      .replace(",", ".")
      .replace(/[^0-9.\-]/g, "");
    const value = Number(cleaned);
    return Number.isFinite(value) ? value : NaN;
  }

  function compactNumber(value) {
    const absolute = Math.abs(value);
    if (absolute < 1e6) return null;

    const unit = suffixes.find((entry) => absolute >= entry.value) || suffixes[suffixes.length - 1];
    const scaled = value / unit.value;
    const digits = Math.abs(scaled) < 10 ? 2 : Math.abs(scaled) < 100 ? 1 : 0;
    const formatted = new Intl.NumberFormat("fr-CH", {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0
    }).format(scaled);
    return `${formatted}${unit.suffix}`;
  }

  const compactTargets = [
    document.getElementById("pointsValue"),
    document.getElementById("gemsValue"),
    document.getElementById("totalRollsValue"),
    document.getElementById("runPointsValue"),
    document.getElementById("bestGainValue")
  ].filter(Boolean);

  function compactNode(node) {
    if (!node) return;
    const value = parseDisplayedNumber(node.textContent || "");
    if (!Number.isFinite(value)) return;
    const compact = compactNumber(value);
    if (!compact || node.textContent === compact) return;
    node.title = new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 2 }).format(value);
    node.textContent = compact;
  }

  compactTargets.forEach((node) => {
    const observer = new MutationObserver(() => compactNode(node));
    observer.observe(node, { childList: true, characterData: true, subtree: true });
    compactNode(node);
  });

  window.NightIdleMainUI = Object.freeze({ compactNumber });
})();
