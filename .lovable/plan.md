

## Projections indicatives basées sur le secteur et BMC/SIC

### Problème actuel
Quand seuls des documents BMC/SIC sont uploadés, `generate-inputs` retourne un squelette vide (score 0, tout à zéro). Les modules en aval (Framework, Plan OVO) reçoivent ces zéros mais génèrent quand même des projections — soit hallucées, soit incohérentes.

### Solution : mode "estimation sectorielle"

Au lieu de court-circuiter complètement `generate-inputs`, on passe en **mode estimation** : l'IA utilise les benchmarks sectoriels + les infos du BMC/SIC pour produire des chiffres estimés, mais clairement marqués comme **indicatifs**. Un flag `estimation_sectorielle: true` se propage dans tous les livrables financiers.

### Modifications

**1. `supabase/functions/generate-inputs/index.ts`**
- Quand `hasFinancialContent()` retourne `false` : au lieu de retourner un squelette vide, appeler l'IA avec un prompt spécifique "estimation sectorielle"
- Le prompt demande d'estimer les données financières à partir du secteur, pays, et BMC/SIC — en se basant uniquement sur les benchmarks sectoriels de la knowledge base
- L'objet retourné porte `fiabilite: "Indicative — estimation sectorielle"`, `estimation_sectorielle: true`, et `score: 15` (score très bas pour refléter l'absence de données réelles)
- `donnees_manquantes` contient un avertissement clair

**2. `supabase/functions/generate-framework/index.ts` et `generate-plan-ovo/index.ts`**
- Lire le flag `estimation_sectorielle` depuis les inputs
- Si `true`, ajouter au prompt : "Les données d'entrée sont des ESTIMATIONS sectorielles, pas des données réelles. Marque toutes les projections comme INDICATIVES."
- Sauvegarder le flag `estimation_sectorielle: true` dans le deliverable

**3. Viewers UI : `FrameworkViewer.tsx`, `PlanOvoViewer.tsx`, `BusinessPlanPreview.tsx`**
- Détecter `data.estimation_sectorielle === true`
- Afficher un bandeau d'alerte en haut : "⚠️ Projections indicatives — basées sur les benchmarks sectoriels et le BMC/SIC. Uploadez les documents financiers (template Analyse Financière) pour des projections basées sur vos données réelles."

### Fichiers modifiés
- `supabase/functions/generate-inputs/index.ts` — mode estimation au lieu de squelette vide
- `supabase/functions/generate-framework/index.ts` — propagation du flag + avertissement prompt
- `supabase/functions/generate-plan-ovo/index.ts` — propagation du flag + avertissement prompt
- `src/components/dashboard/FrameworkViewer.tsx` — bandeau indicatif
- `src/components/dashboard/PlanOvoViewer.tsx` — bandeau indicatif
- `src/components/dashboard/BusinessPlanPreview.tsx` — bandeau indicatif
- Redéploiement des 3 edge functions

### Aucune migration DB requise

