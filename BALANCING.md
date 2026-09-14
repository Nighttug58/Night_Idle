# Night Idle — Balancing baseline

## Goal of this pass

This document records the first measurable balance target for the base game.

The first Prestige is intentionally active: Auto Clicker only exists after spending Prestige Gems. The first run must therefore be long enough to teach dice, combos and upgrades, but short enough not to become a click wall.

### Current target

- First Prestige baseline without buying normal upgrades: ~1,900 manual rolls.
- A player investing intelligently in normal upgrades should finish noticeably faster.
- First Prestige should usually award about 4–6 Gems.
- A first Prestige should be able to buy the beginning of the idle loop, for example Auto Clicker + Offline Income + Time Reserve.

## Exact base expected value per roll

These values use all standard combos available at each dice count, with base multipliers and no normal/Prestige upgrades.

| Dice | Expected points / roll |
| ---: | ---: |
| 1 | 3.50 |
| 2 | 7.58 |
| 3 | 13.27 |
| 4 | 23.59 |
| 5 | 43.95 |
| 6 | 83.69 |

The game evaluates one best valid unlocked combo per roll, with no combo stacking.

## Dice unlock costs

| Dice | Cost |
| ---: | ---: |
| 2 | 50 |
| 3 | 250 |
| 4 | 1,200 |
| 5 | 6,000 |
| 6 | 25,000 |

Total paid for extra dice: 32,500 Points.

## Combo unlock costs

| Combo | Cost |
| --- | ---: |
| Pair | 75 |
| Three of a kind | 200 |
| Double pair | 400 |
| Straight 4 | 600 |
| Four of a kind | 1,200 |
| Full house | 2,200 |
| Straight 5 | 2,800 |
| Five of a kind | 5,500 |
| Triple pair | 7,000 |
| Double three | 9,000 |
| Straight 6 | 12,000 |
| Six of a kind | 20,000 |

Total combo unlock cost: 60,975 Points.

Mandatory base progression total: **93,475 Points**.

## Prestige reward

Current formula:

`floor(5 × sqrt(runPointsEarned / 100000))`

Prestige still requires all 6 dice and all combos to be unlocked.

The use of `runPointsEarned` is deliberate: spending Points never lowers the future Prestige reward.

## General upgrades — pass 1

| Upgrade | Base cost | Growth | Effect / level |
| --- | ---: | ---: | ---: |
| Die Value | 35 | ×1.65 | +12% |
| Manual Power | 30 | ×1.60 | +10% |
| Global Power | 80 | ×1.80 | +6% |
| Combo Mastery | 120 | ×1.85 | +6% combo multiplier |

Manual Power only affects player-triggered rolls. Global Power and Die Value also affect automatic/offline production.

## Next measurements

During real device testing, record:

- rolls and real time to first Prestige;
- normal upgrade levels at Prestige;
- run Points at Prestige;
- Gems awarded;
- time from Prestige 1 to Prestige 2 with Auto Clicker;
- share of income coming from offline production;
- whether any single upgrade is an obvious always-buy compared with all alternatives.

This file should be updated after real playtest data rather than changing progression values only by intuition.
