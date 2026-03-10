

# Plan : Synchroniser revenus Excel OVO avec Framework + Dynamiser pays

## Modifications (2 sur 3 — sans compactage des slots)

### Modification 1 : Dynamiser `buildSystemPrompt(country)`

**Fichier** : `supabase/functions/generate-ovo-plan/index.ts`

- Copier la fonction `getFiscalParams(country)` depuis `generate-plan-ovo/index.ts` (12+ pays africains)
- Modifier `buildSystemPrompt()` pour accepter un parametre `country` et injecter les parametres fiscaux dynamiques au lieu du bloc hardcode "CÔTE D'IVOIRE" (lignes 453-460)
- Mettre a jour l'appel ligne 329 : `buildSystemPrompt(data.country)`

### Modification 2 : Ajouter `scaleToFrameworkTargets()` post-expansion

Inserer une nouvelle fonction entre `validateAndFillVolumes()` (ligne 196) et le tri des produits (ligne 199).

Logique :
1. Extraire les targets revenue par annee depuis `data.plan_ovo_data.revenue` (prioritaire, deja en nombres) ou `data.framework_data.projection_5ans.lignes` (ligne CA Total)
2. Pour chaque annee (YEAR-2 a YEAR6) :
   - Calculer `revenue_excel` = somme de `(volume_h1 + volume_h2) × unit_price_r1` pour tous produits/services actifs
   - Si target existe ET `revenue_excel > 0` ET ecart > 5% : calculer `ratio = target / revenue_excel`
   - Appliquer le ratio sur les volumes de chaque produit/service : `volume_h1 = round(volume_h1 × ratio)`, idem pour `volume_h2`
3. Cela preserve la repartition relative entre produits tout en forcant le total a correspondre au Framework

Le `financialJson` doit recevoir `framework_data` et `plan_ovo_data` depuis l'objet `data` transmis au handler. Ces donnees sont deja presentes dans `EntrepreneurData` (lignes 44-45).

Pipeline mis a jour (lignes 188-204) :
```text
expandCondensedData(financialJson);
normalizeRangeData(financialJson);
validateAndFillVolumes(financialJson);
scaleToFrameworkTargets(financialJson, data.framework_data, data.plan_ovo_data);  // NOUVEAU
// tri existant...
```

### Mapping annees OVO → plan_ovo JSON

| Year label Excel | Cle plan_ovo.revenue |
|---|---|
| YEAR-2 | year_minus_2 |
| YEAR-1 | year_minus_1 |
| CURRENT YEAR | current_year |
| YEAR2 | year2 |
| YEAR3 | year3 |
| YEAR4 | year4 |
| YEAR5 | year5 |
| YEAR6 | year6 |

## Fichier impacte

| Fichier | Changement |
|---|---|
| `supabase/functions/generate-ovo-plan/index.ts` | Ajouter `getFiscalParams()`, dynamiser `buildSystemPrompt(country)`, ajouter `scaleToFrameworkTargets()` |

