

## Afficher et gérer les documents supplémentaires uploadés

### Problème actuel
L'upload multiple fonctionne déjà techniquement (attribut `multiple` présent). Mais les fichiers supplémentaires ne sont **jamais listés** dans l'UI après upload — ils sont mélangés avec les fichiers doc/fin dans le stockage sans distinction visuelle.

### Modifications

**1. `EntrepreneurDashboard.tsx`** — Ajouter une section de liste sous le bouton "Documents supplémentaires"
- Créer une 3e catégorie `extraFiles` : fichiers qui ne matchent ni doc (`.docx, .doc, .pdf, .txt`) ni fin (`.xlsx, .xls, .csv`) — ou bien tous les fichiers au-delà de ceux déjà listés dans doc/fin.
- Afficher chaque fichier supplémentaire avec nom, taille, et bouton supprimer (même pattern que les listes BMC/Inputs existantes).
- Afficher un compteur `({extraFiles.length})` à côté du bouton.

**2. `CoachDashboard.tsx`** — Même traitement pour les deux vues (volet réduit et volet étendu)
- Les fichiers `supplementary` sont déjà catégorisés via `coach_uploads`. Ajouter un `.map()` pour lister chaque fichier avec nom et bouton supprimer.
- Les deux endroits (ligne ~1004 et ligne ~1509) doivent afficher la liste des `suppUploads`.

### Résultat attendu
- Upload multiple : déjà fonctionnel, inchangé.
- Après upload : les fichiers supplémentaires apparaissent listés avec nom + icône supprimer.
- Suppression individuelle possible.

