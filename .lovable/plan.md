

## Plan : Hiérarchie de sources prix — Données réelles > Benchmark sectoriel > Jamais de fixe arbitraire

### Principe

La logique actuelle utilise des fallbacks fixes (arrondi 500 FCFA, COGS à 35%) qui n'ont aucun lien avec l'entreprise. Le nouveau principe :

1. **Priorité 1** : Prix/coûts réels extraits des documents (Inputs `produits_services[]`)
2. **Priorité 2** : Estimation sectorielle intelligente (benchmarks de `financial-knowledge.ts` appliqués au contexte)
3. **Interdit** : Valeurs fixes arbitraires (500 FCFA, 35% COGS)

### Modifications par fichier

#### 1. `generate-inputs/index.ts` — Extraire les produits des documents

Ajouter au JSON du prompt une section `produits_services` dynamique :
```json
"produits_services": [
  { "nom": "...", "type": "Produit|Service", "prix_unitaire": <number>,
    "cout_unitaire": <number>, "unite": "...", "marge_pct": <number> }
]
```
Instruction : "Extrais chaque produit/service avec son prix et coût tels que dans les documents. Si un coût unitaire n'est pas explicite, **estime-le à partir de la marge brute sectorielle** du pays/secteur. Indique `source: 'estimé'` dans ce cas."

#### 2. `generate-framework/index.ts` — Injecter les produits réels dans le contexte

Si `inputsData.produits_services` existe, l'ajouter au prompt Framework pour que les projections agrégées soient ancrées sur les marges réelles par produit (pas uniquement les benchmarks génériques du system prompt).

#### 3. `generate-ovo-plan/index.ts` — Prioriser Inputs, fallback sectoriel intelligent

**Lignes 160-175** : Ajouter une extraction prioritaire depuis `inputs_data.produits_services` (avec prix, coût, marge). Si absent, garder le fallback BMC existant.

**Lignes 960-964** : Remplacer la contrainte prix actuelle :
```
HIÉRARCHIE DES PRIX (OBLIGATOIRE) :
1. Si un prix réel est fourni par les Inputs → l'utiliser EXACTEMENT
2. Si pas de prix réel → estimer via les benchmarks sectoriels du pays/secteur
   (ex: marge brute BTP = 20-35%, donc coût ≈ 65-80% du prix)
3. JAMAIS de valeur fixe arbitraire (pas de "500 FCFA par défaut")
```

#### 4. `_shared/ovo-data-expander.ts` — Remplacer les fallbacks fixes

**Ligne 243** (prix dérivé) : Remplacer `Math.round(x / 500) * 500 || 500` par un calcul exact `Math.round(remainingTarget / zeroPriceVolume)` — le prix découle mathématiquement du CA cible et du volume, pas d'un arrondi arbitraire.

**Lignes 249 et 285** (COGS) : Remplacer `derivedPrice * 0.35` par un COGS dérivé du benchmark sectoriel. Le secteur et le pays sont déjà disponibles dans les données OVO. Utiliser les `SECTOR_BENCHMARKS` de `financial-knowledge.ts` pour obtenir la marge brute médiane du secteur et en déduire le taux de COGS :

```typescript
// Exemple : secteur BTP → margeBrute "20-35%" → médiane 27.5% → COGS = 72.5%
const benchMB = getSectorMarginMedian(sector); // parse "20-35%" → 0.275
const cogsRate = 1 - benchMB;
zyr.cogs_r1 = Math.round(derivedPrice * cogsRate);
```

**Ligne 274** (fallback total) : Même logique — prix exact + COGS sectoriel.

#### 5. `_shared/ovo-data-expander.ts` — Nouvelle fonction utilitaire

Ajouter une fonction `getSectorCogsRate(sector: string)` qui parse les benchmarks sectoriels de `financial-knowledge.ts` et retourne un taux de COGS médian. Si le secteur n'est pas trouvé, utiliser la médiane globale tous secteurs (~55-60%) plutôt qu'un 35% fixe.

### Résumé des suppressions

| Valeur fixe supprimée | Remplacée par |
|----------------------|---------------|
| `Math.round(x / 500) * 500` | `Math.round(target / volume)` (exact) |
| `COGS = prix * 0.35` | COGS = prix × (1 - marge_brute_sectorielle_médiane) |
| `\|\| 500` (fallback prix) | Pas de fallback — si volume=0, pas de prix à dériver |
| Arrondi 500 FCFA | Aucun arrondi arbitraire |

### Fichiers modifiés

- `supabase/functions/generate-inputs/index.ts`
- `supabase/functions/generate-framework/index.ts`
- `supabase/functions/generate-ovo-plan/index.ts`
- `supabase/functions/_shared/ovo-data-expander.ts`

