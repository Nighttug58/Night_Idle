window.NightIdleConfig = Object.freeze({
  version: 16,
  maxDice: 6,
  dieFaces: 6,

  dieUnlockCosts: Object.freeze({
    2: 50,
    3: 250,
    4: 1200,
    5: 6000,
    6: 25000
  }),

  prestige: Object.freeze({
    pointScale: 100000,
    gemCoefficient: 5,
    minimumGems: 1,
    minimumOfflineMs: 15000
  }),

  achievementSystem: Object.freeze({
    tierRewards: Object.freeze([1, 2, 3, 4, 5, 6, 8, 10, 12, 15]),
    multiplierMaxLevel: 10,
    multiplierPerLevel: 0.9,
    multiplierCosts: Object.freeze([100, 150, 225, 300, 400, 500, 625, 750, 875, 1075]),
    maxMultiplier: 10,
    expectedFamilyCount: 118
  }),

  mutationSystem: Object.freeze({
    baseProcChance: 0.0012,
    chancePerLevel: 0.10,
    baseMinDuration: 3,
    baseMaxDuration: 5,
    absoluteMaxDuration: 10,
    powerPerLevel: 0.05,
    pityStartRolls: 750,
    pityNearGuaranteeRolls: 2500
  }),

  prestigeShop: Object.freeze([
    Object.freeze({
      id: "auto_clicker",
      name: "Auto Clicker",
      description: "Lance automatiquement les dés. Les lancers automatiques ne bénéficient pas de Puissance manuelle.",
      maxLevel: 10,
      costs: Object.freeze([1, 2, 3, 5, 8, 12, 18, 25, 35, 50]),
      intervalsMs: Object.freeze([0, 5000, 4000, 3000, 2500, 2000, 1500, 1000, 500, 333, 200])
    }),
    Object.freeze({
      id: "offline_income",
      name: "Revenu hors ligne",
      description: "Produit une partie du rendement de l'Auto Clicker pendant ton absence. Nécessite l'Auto Clicker.",
      maxLevel: 10,
      costs: Object.freeze([2, 3, 4, 6, 8, 11, 15, 20, 27, 35]),
      efficiencyPerLevel: 0.10
    }),
    Object.freeze({
      id: "time_reserve",
      name: "Réserve temporelle",
      description: "Augmente la durée maximale d'absence pouvant générer du revenu hors ligne. La réserve de base est de 10 minutes.",
      maxLevel: 8,
      costs: Object.freeze([1, 2, 4, 7, 12, 20, 32, 50]),
      valuesMinutes: Object.freeze([10, 30, 60, 120, 240, 480, 720, 1440, 2880])
    }),
    Object.freeze({
      id: "fate_reroll",
      name: "Chance du Destin",
      description: "Donne une chance de relancer automatiquement le dé offrant le meilleur potentiel. Le nouveau résultat n'est gardé que s'il améliore le lancer.",
      maxLevel: 10,
      costs: Object.freeze([1, 2, 3, 4, 6, 8, 11, 15, 20, 27]),
      chancePerLevel: 0.02
    }),
    Object.freeze({
      id: "starting_points",
      name: "Départ accéléré",
      description: "Commence chaque nouveau run avec des Points supplémentaires.",
      maxLevel: 5,
      costs: Object.freeze([1, 2, 4, 7, 12]),
      values: Object.freeze([0, 100, 500, 2000, 10000, 50000])
    }),
    Object.freeze({
      id: "dice_discount",
      name: "Héritage des dés",
      description: "Réduit définitivement le prix d'achat des dés pendant tous les runs.",
      maxLevel: 10,
      costs: Object.freeze([2, 3, 4, 6, 8, 11, 15, 20, 27, 35]),
      discountPerLevel: 0.05,
      maxDiscount: 0.50
    }),
    Object.freeze({
      id: "combo_discount",
      name: "Héritage des combos",
      description: "Réduit définitivement le prix de déblocage des combinaisons.",
      maxLevel: 10,
      costs: Object.freeze([2, 3, 4, 6, 8, 11, 15, 20, 27, 35]),
      discountPerLevel: 0.05,
      maxDiscount: 0.50
    }),
    Object.freeze({
      id: "gem_power",
      name: "Puissance des Gemmes",
      description: "Chaque Gemme actuellement possédée augmente tous les gains. Chaque niveau ajoute +0,02 % par Gemme. Cette amélioration n'a pas de niveau maximum.",
      unlimited: true,
      maxLevel: Number.POSITIVE_INFINITY,
      costs: Object.freeze([3, 4, 5, 7, 10, 14, 19, 25, 32, 40]),
      costGrowth: 1.18,
      bonusPerGemPerLevel: 0.0002
    }),
    Object.freeze({
      id: "free_combos",
      name: "Combos hérités",
      description: "Commence chaque nouveau run avec des combinaisons déjà débloquées, dans l'ordre de progression.",
      maxLevel: 5,
      costs: Object.freeze([5, 10, 20, 35, 60]),
      combosPerLevel: 1
    }),
    Object.freeze({
      id: "starting_dice",
      name: "Dés hérités",
      description: "Commence les futurs runs avec davantage de dés déjà débloqués.",
      maxLevel: 2,
      costs: Object.freeze([25, 75]),
      startingDiceByLevel: Object.freeze([1, 2, 3])
    }),
    Object.freeze({
      id: "anomaly_unlock",
      name: "Déverrouillage des Anomalies",
      description: "Débloque définitivement les événements rares de lancer : Dé Doré, Rush Frénétique, Combo Fever et Jackpot.",
      maxLevel: 1,
      costs: Object.freeze([5])
    }),
    Object.freeze({
      id: "mutation_unlock",
      name: "Éveil des Dés Mutants",
      description: "Débloque définitivement les Dés Mutants temporaires et leurs 7 variantes.",
      maxLevel: 1,
      costs: Object.freeze([15])
    }),
    Object.freeze({
      id: "mutation_chance",
      name: "Instabilité Mutagène",
      description: "Augmente de +10 % relatif par niveau la chance d'apparition d'un Dé Mutant.",
      maxLevel: 20,
      costs: Object.freeze([3, 4, 5, 6, 8, 10, 12, 15, 18, 22, 27, 33, 40, 48, 57, 68, 80, 94, 110, 128])
    }),
    Object.freeze({
      id: "mutation_duration",
      name: "Mutation Persistante",
      description: "Augmente la durée maximale d'un Dé Mutant de +1 lancer par niveau, jusqu'à 10 lancers.",
      maxLevel: 5,
      costs: Object.freeze([5, 8, 12, 18, 27])
    }),
    Object.freeze({
      id: "mutation_power",
      name: "Puissance Mutagène",
      description: "Renforce de +5 % par niveau les effets positifs des Dés Mutants et réduit certains risques.",
      maxLevel: 10,
      costs: Object.freeze([5, 7, 10, 14, 20, 28, 39, 54, 74, 100])
    }),
    Object.freeze({
      id: "mutation_slots",
      name: "Double Mutation",
      description: "Autorise jusqu'à 2 Dés Mutants actifs simultanément, sur deux dés différents.",
      maxLevel: 1,
      costs: Object.freeze([75])
    }),
    Object.freeze({
      id: "cost_curve_mastery",
      name: "Économie d'échelle",
      description: "Aplatit définitivement la croissance exponentielle du prix de toutes les améliorations achetées avec des Points. Au niveau 50, toutes les courbes concernées deviennent ×1,10. Les dés et déblocages de combos ne sont pas concernés.",
      maxLevel: 50,
      costs: Object.freeze(Array.from({ length: 50 }, (_, level) => Math.ceil(2 * Math.pow(1.08, level) + level * 0.2))),
      targetGrowth: 1.10
    }),
    Object.freeze({
      id: "frenzy_mastery",
      name: "Maîtrise de la Frénésie",
      description: "Renforce définitivement la Frénésie manuelle : la jauge se remplit plus vite et son multiplicateur maximum augmente à chaque niveau.",
      maxLevel: 20,
      costs: Object.freeze([3, 5, 6, 8, 10, 12, 14, 17, 20, 24, 28, 34, 40, 48, 57, 68, 81, 96, 113, 133]),
      baseMaxMultiplier: 10,
      maxMultiplierPerLevel: 1,
      chargeSpeedPerLevel: 0.06
    }),
    Object.freeze({
      id: "frenzy_tier_power",
      name: "Puissance des paliers",
      description: "Augmente définitivement le multiplicateur gagné à chaque barre de Frénésie. Chaque niveau ajoute +0,1× par palier, jusqu'à +2,0× par barre.",
      maxLevel: 15,
      costs: Object.freeze([4, 6, 8, 11, 14, 18, 23, 29, 36, 44, 53, 63, 74, 86, 100]),
      baseStep: 0.5,
      stepPerLevel: 0.1,
      maxBonusStep: 1.5
    })
  ]),

  upgrades: Object.freeze([
    {
      id: "die_value",
      name: "Valeur des dés",
      description: "Augmente la valeur de chaque point obtenu sur les dés.",
      baseCost: 35,
      costGrowth: 1.65,
      effectPerLevel: 0.12,
      effectType: "dieValue"
    },
    {
      id: "manual_power",
      name: "Puissance manuelle",
      description: "Augmente les gains lorsque tu appuies toi-même sur LANCER.",
      baseCost: 30,
      costGrowth: 1.60,
      effectPerLevel: 0.10,
      effectType: "manualMultiplier"
    },
    {
      id: "global_power",
      name: "Puissance globale",
      description: "Multiplie tous les gains de la partie, y compris les lancers automatiques et hors ligne.",
      baseCost: 80,
      costGrowth: 1.80,
      effectPerLevel: 0.06,
      effectType: "globalMultiplier"
    },
    {
      id: "combo_mastery",
      name: "Maîtrise des combos",
      description: "Augmente le multiplicateur de toutes les combinaisons débloquées.",
      baseCost: 120,
      costGrowth: 1.85,
      effectPerLevel: 0.06,
      effectType: "comboMultiplier"
    }
  ]),

  comboUpgrade: Object.freeze({
    costGrowth: 2.05,
    effectPerLevel: 0.05
  }),

  combos: Object.freeze([
    { id: "pair", name: "Paire", minDice: 2, multiplier: 1.5, example: "3 3", unlockCost: 75, upgradeBaseCost: 100 },
    { id: "three_of_a_kind", name: "Brelan", minDice: 3, multiplier: 3, example: "4 4 4", unlockCost: 200, upgradeBaseCost: 250 },
    { id: "double_pair", name: "Double paire", minDice: 4, multiplier: 2, example: "2 2 5 5", unlockCost: 400, upgradeBaseCost: 350 },
    { id: "straight_4", name: "Suite de 4", minDice: 4, multiplier: 3, example: "1 2 3 4", unlockCost: 600, upgradeBaseCost: 450 },
    { id: "four_of_a_kind", name: "Carré", minDice: 4, multiplier: 10, example: "6 6 6 6", unlockCost: 1200, upgradeBaseCost: 1800 },
    { id: "full_house", name: "Full", minDice: 5, multiplier: 6, example: "3 3 3 5 5", unlockCost: 2200, upgradeBaseCost: 1200 },
    { id: "straight_5", name: "Suite de 5", minDice: 5, multiplier: 6, example: "1 2 3 4 5", unlockCost: 2800, upgradeBaseCost: 1400 },
    { id: "five_of_a_kind", name: "Quintuple", minDice: 5, multiplier: 25, example: "5 5 5 5 5", unlockCost: 5500, upgradeBaseCost: 6500 },
    { id: "triple_pair", name: "Triple paire", minDice: 6, multiplier: 4, example: "1 1 3 3 6 6", unlockCost: 7000, upgradeBaseCost: 2200 },
    { id: "double_three", name: "Double brelan", minDice: 6, multiplier: 8, example: "2 2 2 5 5 5", unlockCost: 9000, upgradeBaseCost: 2800 },
    { id: "straight_6", name: "Suite de 6", minDice: 6, multiplier: 15, example: "1 2 3 4 5 6", unlockCost: 12000, upgradeBaseCost: 5000 },
    { id: "six_of_a_kind", name: "Sextuple", minDice: 6, multiplier: 50, example: "3 3 3 3 3 3", unlockCost: 20000, upgradeBaseCost: 15000 }
  ])
});