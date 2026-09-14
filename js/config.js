window.NightIdleConfig = Object.freeze({
  version: 4,
  maxDice: 6,
  dieFaces: 6,

  dieUnlockCosts: Object.freeze({
    2: 50,
    3: 500,
    4: 5000,
    5: 50000,
    6: 500000
  }),

  prestige: Object.freeze({
    pointScale: 1000000,
    gemCoefficient: 5,
    minimumGems: 1
  }),

  upgrades: Object.freeze([
    {
      id: "die_value",
      name: "Valeur des dés",
      description: "Augmente la valeur de chaque point obtenu sur les dés.",
      baseCost: 25,
      costGrowth: 1.55,
      effectPerLevel: 0.25,
      effectType: "dieValue"
    },
    {
      id: "manual_power",
      name: "Puissance manuelle",
      description: "Augmente les gains lorsque tu appuies toi-même sur LANCER.",
      baseCost: 40,
      costGrowth: 1.65,
      effectPerLevel: 0.10,
      effectType: "manualMultiplier"
    },
    {
      id: "global_power",
      name: "Puissance globale",
      description: "Multiplie tous les gains de la partie.",
      baseCost: 100,
      costGrowth: 1.80,
      effectPerLevel: 0.05,
      effectType: "globalMultiplier"
    },
    {
      id: "combo_mastery",
      name: "Maîtrise des combos",
      description: "Augmente le multiplicateur de toutes les combinaisons débloquées.",
      baseCost: 150,
      costGrowth: 1.90,
      effectPerLevel: 0.05,
      effectType: "comboMultiplier"
    }
  ]),

  comboUpgrade: Object.freeze({
    costGrowth: 2.05,
    effectPerLevel: 0.05
  }),

  combos: Object.freeze([
    { id: "pair", name: "Paire", minDice: 2, multiplier: 1.5, example: "3 3", unlockCost: 100, upgradeBaseCost: 100 },
    { id: "three_of_a_kind", name: "Brelan", minDice: 3, multiplier: 3, example: "4 4 4", unlockCost: 600, upgradeBaseCost: 250 },
    { id: "double_pair", name: "Double paire", minDice: 4, multiplier: 2, example: "2 2 5 5", unlockCost: 2000, upgradeBaseCost: 350 },
    { id: "straight_4", name: "Suite de 4", minDice: 4, multiplier: 3, example: "1 2 3 4", unlockCost: 3000, upgradeBaseCost: 450 },
    { id: "four_of_a_kind", name: "Carré", minDice: 4, multiplier: 10, example: "6 6 6 6", unlockCost: 6000, upgradeBaseCost: 1800 },
    { id: "full_house", name: "Full", minDice: 5, multiplier: 6, example: "3 3 3 5 5", unlockCost: 15000, upgradeBaseCost: 1200 },
    { id: "straight_5", name: "Suite de 5", minDice: 5, multiplier: 6, example: "1 2 3 4 5", unlockCost: 18000, upgradeBaseCost: 1400 },
    { id: "five_of_a_kind", name: "Quintuple", minDice: 5, multiplier: 25, example: "5 5 5 5 5", unlockCost: 45000, upgradeBaseCost: 6500 },
    { id: "triple_pair", name: "Triple paire", minDice: 6, multiplier: 4, example: "1 1 3 3 6 6", unlockCost: 75000, upgradeBaseCost: 2200 },
    { id: "double_three", name: "Double brelan", minDice: 6, multiplier: 8, example: "2 2 2 5 5 5", unlockCost: 100000, upgradeBaseCost: 2800 },
    { id: "straight_6", name: "Suite de 6", minDice: 6, multiplier: 15, example: "1 2 3 4 5 6", unlockCost: 150000, upgradeBaseCost: 5000 },
    { id: "six_of_a_kind", name: "Sextuple", minDice: 6, multiplier: 50, example: "3 3 3 3 3 3", unlockCost: 300000, upgradeBaseCost: 15000 }
  ])
});
