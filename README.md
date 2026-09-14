# Night Idle

Prototype mobile-first d'un idle/clicker basé sur des lancers de D6.

## Boucle de jeu actuelle

1. Le joueur commence avec **1 seul D6**.
2. Chaque lancer rapporte la somme des dés multipliée par la meilleure combinaison obtenue.
3. Les points gagnés servent à débloquer progressivement les dés n°2 à n°6.
4. Chaque nouveau dé rend de nouvelles combinaisons possibles.
5. La progression est sauvegardée automatiquement dans le navigateur avec `localStorage`.

## Coût de déblocage des dés

| Dés disponibles | Coût du nouveau dé |
| --- | ---: |
| 1 | Gratuit |
| 2 | 50 points |
| 3 | 500 points |
| 4 | 5 000 points |
| 5 | 50 000 points |
| 6 | 500 000 points |

Ces valeurs sont provisoires et sont centralisées dans `js/config.js` pour faciliter le balancing.

## Combinaisons du MVP

| Combinaison | Dés minimum | Multiplicateur initial |
| --- | ---: | ---: |
| Paire | 2 | ×1.5 |
| Double paire | 4 | ×2 |
| Brelan | 3 | ×3 |
| Suite de 4 | 4 | ×3 |
| Triple paire | 6 | ×4 |
| Full | 5 | ×6 |
| Suite de 5 | 5 | ×6 |
| Double brelan | 6 | ×8 |
| Carré | 4 | ×10 |
| Suite de 6 | 6 | ×15 |
| Quintuple | 5 | ×25 |
| Sextuple | 6 | ×50 |

Quand plusieurs combinaisons sont présentes sur un même lancer, le jeu applique automatiquement celle qui possède le multiplicateur le plus élevé.

## Architecture

- `index.html` : structure de l'interface.
- `styles.css` : interface responsive mobile-first.
- `js/config.js` : coûts, multiplicateurs et données de balancing.
- `js/game.js` : lancer des dés, détection des combinaisons, progression et sauvegarde.

Aucun moteur 2D/3D ni framework n'est nécessaire pour ce prototype.

## Prochaines étapes prévues

Le MVP doit d'abord permettre de valider le rythme de progression jusqu'aux 6 dés. Les systèmes idle/passifs, améliorations, prestige et arbre de compétences seront ajoutés ensuite sans mélanger leur logique au moteur de lancer de base.
