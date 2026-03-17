

## Retirer le plafonnage du score à 20

### Modification

**`supabase/functions/generate-inputs/index.ts`** — 2 changements :

1. **Ligne 346** : Retirer l'instruction dans le prompt qui dit "Le score DOIT être entre 10 et 20". Laisser l'IA évaluer librement la complétude de son estimation.

2. **Ligne 377** : Remplacer `Math.min(estimationData.score || 15, 20)` par simplement `estimationData.score || 15` — le score reflètera la qualité de l'estimation sectorielle sans plafond artificiel.

### Impact
- L'IA pourra attribuer un score plus élevé si elle trouve suffisamment de benchmarks sectoriels et d'infos BMC/SIC pour produire une estimation complète
- Le flag `estimation_sectorielle: true` et le bandeau UI restent en place pour distinguer clairement estimations vs données réelles

