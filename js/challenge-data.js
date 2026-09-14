(() => {
  "use strict";

  const difficulties = [
    { id: "normal", name: "NORMAL", rank: 1, reward: 2 },
    { id: "hard", name: "DIFFICILE", rank: 2, reward: 5 },
    { id: "extreme", name: "EXTRÊME", rank: 3, reward: 10 },
    { id: "nightmare", name: "CAUCHEMAR", rank: 4, reward: 18 },
    { id: "infernal", name: "INFERNAL", rank: 5, reward: 30 },
    { id: "mythic", name: "MYTHIQUE", rank: 6, reward: 50 }
  ];

  const C = (id, difficulty, name, description, source, target, key = null, constraint = null) => ({
    id, difficulty, name, description, source, target, key, constraint
  });

  const contracts = [
    C("n_rolls", "normal", "Prise en main", "Effectuer 300 lancers actifs pendant ce run.", "rolls", 300),
    C("n_manual", "normal", "Au doigt et à l'œil", "Effectuer 150 lancers manuels.", "manualRolls", 150),
    C("n_combos", "normal", "Collectionneur", "Obtenir 40 combos.", "combosTotal", 40),
    C("n_pairs", "normal", "Duo régulier", "Obtenir 20 Paires.", "combo", 20, "pair"),
    C("n_straights", "normal", "Petit escalier", "Obtenir 8 Suites, toutes tailles confondues.", "comboGroup", 8, "straights"),
    C("n_points", "normal", "Petit trésor", "Gagner 250 000 Points pendant le run.", "runPoints", 250000),
    C("n_frenzy", "normal", "Frénétique", "Atteindre une Frénésie ×5.", "frenzyPeak", 5),
    C("n_anomaly", "normal", "Premier phénomène", "Déclencher 1 Anomalie.", "anomalies", 1),
    C("n_mutation", "normal", "Première mutation", "Déclencher 1 Dé Mutant.", "mutations", 1),
    C("n_upgrades", "normal", "Petit artisan", "Cumuler 20 niveaux d'améliorations sur le run.", "upgradeTotal", 20),

    C("h_rolls", "hard", "Longue session", "Effectuer 1 500 lancers actifs.", "rolls", 1500),
    C("h_manual_only", "hard", "Puriste", "Effectuer 600 lancers manuels sans utiliser l'Auto Clicker.", "manualRolls", 600, null, "noAuto"),
    C("h_combos", "hard", "Combo Hunter", "Obtenir 250 combos.", "combosTotal", 250),
    C("h_rare", "hard", "Chasseur de rareté", "Obtenir 10 combos rares : Carré, Quintuple ou Sextuple.", "comboGroup", 10, "rare"),
    C("h_straight6", "hard", "Suite royale", "Obtenir 5 Suites de 6.", "combo", 5, "straight_6"),
    C("h_points", "hard", "Fortune montante", "Gagner 20 M de Points pendant le run.", "runPoints", 20000000),
    C("h_frenzy", "hard", "Haute Frénésie", "Atteindre une Frénésie ×12.", "frenzyPeak", 12),
    C("h_anomaly", "hard", "Instabilité locale", "Déclencher 4 Anomalies.", "anomalies", 4),
    C("h_mutation", "hard", "Mutagène", "Déclencher 4 Dés Mutants.", "mutations", 4),
    C("h_mastery", "hard", "Expert en formation", "Cumuler 50 niveaux de maîtrises individuelles de combos.", "comboMasteryTotal", 50),

    C("e_rolls", "extreme", "Marathon", "Effectuer 6 000 lancers actifs.", "rolls", 6000),
    C("e_no_auto_points", "extreme", "Main souveraine", "Gagner 250 M de Points sans aucun lancer Auto Clicker.", "runPoints", 250000000, null, "noAuto"),
    C("e_combos", "extreme", "Machine à combos", "Obtenir 1 200 combos.", "combosTotal", 1200),
    C("e_fiveplus", "extreme", "Main lourde", "Obtenir 15 Quintuples ou Sextuples.", "comboGroup", 15, "fivePlus"),
    C("e_six", "extreme", "Six absolu", "Obtenir 5 Sextuples.", "combo", 5, "six_of_a_kind"),
    C("e_points", "extreme", "Empire naissant", "Gagner 2 B de Points pendant le run.", "runPoints", 2000000000),
    C("e_frenzy", "extreme", "Surchauffe", "Atteindre une Frénésie ×20.", "frenzyPeak", 20),
    C("e_anomaly", "extreme", "Chaos contrôlé", "Déclencher 10 Anomalies.", "anomalies", 10),
    C("e_mutation", "extreme", "Mutation massive", "Déclencher 10 Dés Mutants.", "mutations", 10),
    C("e_double_mut", "extreme", "Double trouble", "Effectuer 10 lancers avec 2 Dés Mutants simultanément.", "doubleMutationRolls", 10),

    C("c_rolls", "nightmare", "Nuit blanche", "Effectuer 18 000 lancers actifs.", "rolls", 18000),
    C("c_manual_combo", "nightmare", "Discipline absolue", "Obtenir 2 500 combos sans utiliser l'Auto Clicker.", "combosTotal", 2500, null, "noAuto"),
    C("c_diversity", "nightmare", "Table parfaite", "Obtenir les 12 types de combos pendant le même run.", "distinctCombos", 12),
    C("c_perfect", "nightmare", "Perfection répétée", "Obtenir 75 Suites de 6 ou Sextuples.", "comboGroup", 75, "perfect"),
    C("c_six", "nightmare", "Six sans relâche", "Obtenir 20 Sextuples.", "combo", 20, "six_of_a_kind"),
    C("c_points", "nightmare", "Dynastie", "Gagner 250 B de Points pendant le run.", "runPoints", 250000000000),
    C("c_frenzy", "nightmare", "Zone rouge", "Atteindre une Frénésie ×25.", "frenzyPeak", 25),
    C("c_anomaly", "nightmare", "Tempête d'Anomalies", "Déclencher 25 Anomalies.", "anomalies", 25),
    C("c_mutation", "nightmare", "Génome instable", "Déclencher 25 Dés Mutants.", "mutations", 25),
    C("c_build", "nightmare", "Build monstrueux", "Cumuler 300 niveaux d'améliorations sur le run.", "upgradeTotal", 300),

    C("i_rolls", "infernal", "Endurance infernale", "Effectuer 50 000 lancers actifs.", "rolls", 50000),
    C("i_no_auto_points", "infernal", "Ascète", "Gagner 5 T de Points sans aucun lancer Auto Clicker.", "runPoints", 5000000000000, null, "noAuto"),
    C("i_combos", "infernal", "Usine à combos", "Obtenir 12 000 combos.", "combosTotal", 12000),
    C("i_rare", "infernal", "Prédateur statistique", "Obtenir 400 Carrés, Quintuples ou Sextuples.", "comboGroup", 400, "rare"),
    C("i_six", "infernal", "Armée de six", "Obtenir 60 Sextuples.", "combo", 60, "six_of_a_kind"),
    C("i_points", "infernal", "Fortune infernale", "Gagner 25 T de Points pendant le run.", "runPoints", 25000000000000),
    C("i_frenzy_rolls", "infernal", "Frénésie soutenue", "Effectuer 5 000 lancers à Frénésie ×10 ou plus.", "frenzy10Rolls", 5000),
    C("i_anomaly", "infernal", "Réalité fracturée", "Déclencher 60 Anomalies.", "anomalies", 60),
    C("i_mutation", "infernal", "Évolution forcée", "Déclencher 60 Dés Mutants.", "mutations", 60),
    C("i_double_mut", "infernal", "Deux génomes", "Effectuer 100 lancers avec 2 Dés Mutants simultanément.", "doubleMutationRolls", 100),

    C("m_rolls", "mythic", "Éternité", "Effectuer 150 000 lancers actifs.", "rolls", 150000),
    C("m_no_auto_points", "mythic", "Volonté pure", "Gagner 100 T de Points sans aucun lancer Auto Clicker.", "runPoints", 100000000000000, null, "noAuto"),
    C("m_combos", "mythic", "Architecte du hasard", "Obtenir 40 000 combos.", "combosTotal", 40000),
    C("m_perfect", "mythic", "Perfection mythique", "Obtenir 1 000 Suites de 6 ou Sextuples.", "comboGroup", 1000, "perfect"),
    C("m_six", "mythic", "Sixième dimension", "Obtenir 150 Sextuples.", "combo", 150, "six_of_a_kind"),
    C("m_points", "mythic", "Empire absolu", "Gagner 1 Q de Points pendant le run.", "runPoints", 1000000000000000),
    C("m_frenzy_rolls", "mythic", "Au-delà de la limite", "Effectuer 20 000 lancers à Frénésie ×20 ou plus.", "frenzy20Rolls", 20000),
    C("m_anomaly", "mythic", "Effondrement du réel", "Déclencher 150 Anomalies.", "anomalies", 150),
    C("m_mutation", "mythic", "Apothéose mutagène", "Déclencher 150 Dés Mutants.", "mutations", 150),
    C("m_build", "mythic", "Build impossible", "Cumuler 1 000 niveaux d'améliorations sur le même run.", "upgradeTotal", 1000)
  ];

  window.NightIdleChallengeData = Object.freeze({
    version: 1,
    difficulties: Object.freeze(difficulties.map((entry) => Object.freeze(entry))),
    comboGroups: Object.freeze({
      straights: Object.freeze(["straight_4", "straight_5", "straight_6"]),
      rare: Object.freeze(["four_of_a_kind", "five_of_a_kind", "six_of_a_kind"]),
      fivePlus: Object.freeze(["five_of_a_kind", "six_of_a_kind"]),
      perfect: Object.freeze(["straight_6", "six_of_a_kind"])
    }),
    contracts: Object.freeze(contracts.map((entry) => Object.freeze(entry)))
  });
})();
