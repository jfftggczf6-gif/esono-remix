

## Correction definitive : volumes zéro YEAR3-YEAR6 dans le Plan OVO Excel

### Diagnostic confirmé

Le problème persiste parce que la correction `forceWrite` proposée précédemment **n'a jamais été implémentée**. Le code actuel (ligne 1761) skip inconditionnellement toute cellule contenant une formule Excel (`<f>` tag) :

```typescript
if (cellContent && cellContent.includes("<f")) {
  formulaSkipCount++;
  applied.add(ref);
  return cellMatch; // ← nos valeurs de volumes sont ignorées
}
```

Le template Excel contient des formules dans les colonnes de volume (AE-AH) pour les années YEAR3-YEAR6. L'expansion et la réparation des volumes fonctionnent correctement (les données sont bien générées), mais **elles ne sont jamais écrites dans le fichier** car l'injecteur XML les saute.

### Plan de correction

#### 1. Ajouter `forceWrite` à l'interface `CellWrite` (ligne 49-55)

```typescript
interface CellWrite {
  sheet: string;
  row: number;
  col: number;
  value: string | number | null;
  type: "string" | "number" | "date";
  forceWrite?: boolean;
}
```

#### 2. Modifier `applyWritesToXml` (ligne 1761)

Changer la condition de skip pour respecter le flag :

```typescript
if (cellContent && cellContent.includes("<f") && !cw.forceWrite) {
  formulaSkipCount++;
  applied.add(ref);
  return cellMatch;
}
```

Ajouter un compteur de formules forcées pour le logging.

#### 3. Marquer `forceWrite: true` dans `buildCellWrites()`

Pour toutes les cellules de données "writable" des produits/services dans RevenueData (volumes AE-AH, prix L-N, COGS S-U, mix P-R/W-AB), ajouter `forceWrite: true`. Il faut localiser la fonction `buildCellWrites` et identifier où les CellWrite sont créés pour les colonnes RevenueData.

### Fichier modifié

- `supabase/functions/generate-ovo-plan/index.ts` — 3 modifications ciblées

