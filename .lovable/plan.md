

# Synchronisation des projections financières — Plan d'implémentation

## 3 modifications à effectuer

### 1. `supabase/functions/_shared/ovo-data-expander.ts` — Inverser la priorité de scaling

**Lignes 45-71** : Inverser l'ordre pour charger d'abord les cibles **Framework** (an1→YEAR2, ..., an5→YEAR6), puis utiliser `planOvoData.revenue` uniquement en fallback pour les années non couvertes par le Framework (YEAR-2, YEAR-1, CURRENT YEAR).

**Après ligne 119** : Ajouter une boucle de **vérification post-scaling** — recalculer Σ(volumes × prix) par année, comparer aux targets, et relancer le scaling si l'écart dépasse 3% (max 2 passes).

### 2. `supabase/functions/_shared/normalizers.ts` — Années historiques

**Après ligne 491** (fin du bloc `inputsData`), ajouter la dérivation de `year_minus_1` et `year_minus_2` :
- Calculer le taux de croissance implicite depuis le Framework : `growthRate = (revenue.year2 / revenue.current_year) - 1`
- `year_minus_1 = current_year / (1 + growthRate)`
- `year_minus_2 = year_minus_1 / (1 + growthRate)`
- Appliquer la même logique à `cogs`, `gross_profit`, `ebitda`, `net_profit`
- Plafonner les valeurs dérivées à ±50% du `current_year` pour éviter les aberrations

### 3. `supabase/functions/generate-ovo-plan/index.ts` — Second passage de scaling

**Après ligne 213** (après `enforceFrameworkConstraints`), ajouter :
- Recalculer le revenu Excel réel (Σ volumes × prix pour chaque produit/service actif, par année)
- Comparer aux cibles Framework
- Si écart > 5%, relancer `scaleToFrameworkTargets()` avec les cibles Framework uniquement
- Logger les écarts résiduels

## Résultat

Les 3 modules (Framework, Plan OVO JSON, Excel OVO) afficheront les mêmes chiffres year2→year6, alignés sur le Framework (source de vérité). Les années historiques seront cohérentes et dérivées des Inputs réels.

