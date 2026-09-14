window.NightIdleConfig = Object.freeze({
  version: 1,
  maxDice: 6,
  dieFaces: 6,
  dieUnlockCosts: Object.freeze({
    2: 50,
    3: 500,
    4: 5000,
    5: 50000,
    6: 500000
  }),
  combos: Object.freeze([
    { id: "pair", name: "Paire", minDice: 2, multiplier: 1.5, example: "3 3" },
    { id: "double_pair", name: "Double paire", minDice: 4, multiplier: 2, example: "2 2 5 5" },
    { id: "three_of_a_kind", name: "Brelan", minDice: 3, multiplier: 3, example: "4 4 4" },
    { id: "straight_4", name: "Suite de 4", minDice: 4, multiplier: 3, example: "1 2 3 4" },
    { id: "triple_pair", name: "Triple paire", minDice: 6, multiplier: 4, example: "1 1 3 3 6 6" },
    { id: "full_house", name: "Full", minDice: 5, multiplier: 6, example: "3 3 3 5 5" },
    { id: "straight_5", name: "Suite de 5", minDice: 5, multiplier: 6, example: "1 2 3 4 5" },
    { id: "double_three", name: "Double brelan", minDice: 6, multiplier: 8, example: "2 2 2 5 5 5" },
    { id: "four_of_a_kind", name: "Carré", minDice: 4, multiplier: 10, example: "6 6 6 6" },
    { id: "straight_6", name: "Suite de 6", minDice: 6, multiplier: 15, example: "1 2 3 4 5 6" },
    { id: "five_of_a_kind", name: "Quintuple", minDice: 5, multiplier: 25, example: "5 5 5 5 5" },
    { id: "six_of_a_kind", name: "Sextuple", minDice: 6, multiplier: 50, example: "3 3 3 3 3 3" }
  ])
});
