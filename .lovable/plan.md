
Objectif
- Replacer le bloc des boutons de génération pour qu’il n’empiète plus sur les icônes du bas, en revenant côté gauche comme avant, mais davantage décalé à gauche.

Ce que je vais modifier
1) Fichier ciblé
- `src/components/dashboard/EntrepreneurDashboard.tsx` (zone du conteneur des boutons flottants en bas).

2) Changement de position
- Remplacer la position actuelle:
  - `fixed bottom-4 right-4 ...`
- Par une position gauche, au-dessus de la barre d’icônes:
  - `fixed bottom-20 left-2 sm:left-4 ...`
- Résultat attendu: le groupe de boutons revient à gauche (comme demandé) et ne recouvre plus les icônes de navigation du bas.

3) Comportement conservé
- Aucun changement de logique:
  - `Générer les livrables` inchangé
  - `Régénération complète` inchangé
  - états `disabled/loading` inchangés

Validation prévue
- Vérifier sur `/dashboard` (viewport actuel ~1078x782) que:
  - les icônes du bas sont toutes visibles et cliquables
  - les boutons restent accessibles
  - aucune superposition gênante sur le contenu central

Détails techniques
- Modification CSS Tailwind uniquement (positionnement du wrapper des boutons flottants).
- Aucun impact backend, données, pipeline, ou permissions.
