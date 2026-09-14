(() => {
  "use strict";

  const data = window.NightIdleAchievementDataV2;
  if (!data || !Array.isArray(data.d)) return;

  // Conserver les IDs utilisés par le premier système de Succès afin que les
  // paliers déjà gagnés et leurs AP restent reconnus après l'extension v2.
  const legacyIds = Object.freeze({
    combo_three_of_a_kind: "combo_three",
    combo_straight_4: "combo_straight4",
    combo_four_of_a_kind: "combo_four",
    combo_full_house: "combo_full",
    combo_straight_5: "combo_straight5",
    combo_five_of_a_kind: "combo_five",
    combo_straight_6: "combo_straight6",
    combo_six_of_a_kind: "combo_six"
  });

  data.d.forEach((definition) => {
    if (!Array.isArray(definition)) return;
    if (legacyIds[definition[0]]) definition[0] = legacyIds[definition[0]];

    if (definition[0] === "prestige_inheritance_score") {
      // Maximum réellement atteignable : 5 + 5 + 2 + 10 + 10 = 32.
      definition[4] = [2, 4, 7, 10, 14, 18, 22, 26, 29, 32];
    }
  });
})();
