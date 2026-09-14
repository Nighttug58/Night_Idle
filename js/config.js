window.NightIdleConfig = Object.freeze({
  version: 7,
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
      description: "Chaque Gemme actuellement possédée augmente tous les gains. Chaque niveau ajoute +0,02 % par Gemme.",
      maxLevel: 10,
      costs: Object.freeze([3, 4, 5, 7, 10, 14, 19, 25, 32, 40]),
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
