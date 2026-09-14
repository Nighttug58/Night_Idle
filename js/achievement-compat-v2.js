(() => {
  "use strict";

  const data = window.NightIdleAchievementDataV2;
  if (!data || !Array.isArray(data.d) || !Array.isArray(data.c)) return;

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

  if (!data.c.some(([id]) => id === "challenges")) {
    data.c.push(["challenges", "DÉFIS"]);
  }

  const challengeDefinitions = [
    ["challenge_completed_total", "Contractant", "challenges", "Terminer des contrats de Run, toutes difficultés confondues.", [1, 3, 5, 10, 20, 35, 50, 75, 100, 150], "challengeCompletedTotal", null, "number"],
    ["challenge_tokens_earned", "Trésor de Défis", "challenges", "Gagner des DT grâce aux contrats terminés.", [2, 10, 25, 50, 100, 200, 350, 600, 1000, 1500], "challengeTokensEarned", null, "number"],
    ["challenge_normal_completed", "Défis normaux", "challenges", "Terminer des contrats de difficulté Normal.", [1, 2, 3, 5, 8, 12, 18, 25, 35, 50], "challengeDifficulty", "normal", "number"],
    ["challenge_hard_completed", "Défis difficiles", "challenges", "Terminer des contrats de difficulté Difficile.", [1, 2, 3, 5, 8, 12, 18, 25, 35, 50], "challengeDifficulty", "hard", "number"],
    ["challenge_extreme_completed", "Défis extrêmes", "challenges", "Terminer des contrats de difficulté Extrême.", [1, 2, 3, 4, 5, 7, 10, 15, 20, 30], "challengeDifficulty", "extreme", "number"],
    ["challenge_nightmare_completed", "Défis cauchemar", "challenges", "Terminer des contrats de difficulté Cauchemar.", [1, 2, 3, 4, 5, 7, 10, 15, 20, 25], "challengeDifficulty", "nightmare", "number"],
    ["challenge_infernal_completed", "Défis infernaux", "challenges", "Terminer des contrats de difficulté Infernal.", [1, 2, 3, 4, 5, 6, 8, 10, 15, 20], "challengeDifficulty", "infernal", "number"],
    ["challenge_mythic_completed", "Défis mythiques", "challenges", "Terminer des contrats de difficulté Mythique.", [1, 2, 3, 4, 5, 6, 8, 10, 12, 15], "challengeDifficulty", "mythic", "number"],
    ["challenge_unique_completed", "Collection de contrats", "challenges", "Terminer des contrats différents et compléter progressivement le catalogue.", [1, 3, 5, 10, 15, 20, 30, 40, 50, 60], "challengeUniqueCompleted", null, "number"],
    ["challenge_high_tier_completed", "Conquérant des profondeurs", "challenges", "Cumuler des victoires en Cauchemar, Infernal et Mythique.", [1, 2, 5, 10, 15, 25, 40, 60, 90, 120], "challengeHighTierCompleted", null, "number"]
  ];

  const existing = new Set(data.d.map((definition) => definition?.[0]));
  challengeDefinitions.forEach((definition) => {
    if (!existing.has(definition[0])) data.d.push(definition);
  });
})();
