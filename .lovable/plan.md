
Objectif: corriger le cas “je régénère mais rien ne change” pour les livrables financiers, et garantir que les indicateurs d’investissement restent cohérents après chaque génération.

1) Diagnostic confirmé (code + données)
- Donnée actuelle en base pour PRESTIGE:
  - `plan_ovo.ebitda.year2 = -1 188 000`
  - `plan_ovo.investment_metrics.dscr = 0.8`
  - `plan_ovo.investment_metrics.multiple_ebitda = 4.5`
- C’est incohérent (EBITDA projection négatif mais DSCR/Multiple renseignés).
- Cause racine:
  - Le guard DSCR/Multiple est appliqué dans `normalizePlanOvo()`.
  - Ensuite `enforceFrameworkConstraints()` réécrit les séries (dont EBITDA), ce qui peut rendre `year2` négatif après coup.
  - Aucun guard final n’est réappliqué après cette phase.
- Cause UX additionnelle:
  - Le pipeline compte aussi les étapes “skipped” comme “completed”, donc l’UI peut indiquer “livrables générés” alors qu’aucun module clé n’a été recalculé.

2) Plan de correction (implémentation)
A. Corriger la cohérence backend (priorité haute)
- Fichier: `supabase/functions/_shared/normalizers.ts`
- Dans `enforceFrameworkConstraints()`, ajouter une validation finale post-calcul:
  - si `ebitda.year2 <= 0` => `investment_metrics.dscr = null` et `multiple_ebitda = null`
  - sinon recalcul/validation explicite des métriques (pas de valeur “héritée” incohérente)
- Résultat: cohérence persistée en base, export et dashboard alignés.

B. Forcer la régénération quand la logique métier change
- Fichiers:
  - `src/lib/pipeline-runner.ts`
  - `supabase/functions/generate-deliverables/index.ts`
- Ajouter un versioning métier sur `plan_ovo` (ex: `data.metadata.calculation_version`).
- Étendre la logique `isRich`/staleness:
  - un `plan_ovo` sans cette version (ou version ancienne) doit être considéré “à régénérer”, même si les dates semblent à jour.
- Résultat: les anciennes données “valides en date” mais invalides en logique ne sont plus conservées.

C. Clarifier le feedback de génération côté UI
- Fichiers:
  - `src/lib/pipeline-runner.ts`
  - `src/components/dashboard/EntrepreneurDashboard.tsx`
  - `src/components/dashboard/CoachDashboard.tsx`
- Séparer les compteurs:
  - `executedCount`, `skippedCount`, `failedCount`
- Mettre à jour les toasts:
  - ex: “3 recalculés, 6 déjà à jour”
  - ne plus afficher “X livrables générés” si tout a été skip.
- Résultat: plus d’ambiguïté “j’ai relancé mais rien n’a changé”.

D. Ajouter une régénération explicite “forcée”
- UI: bouton “Régénération complète” (force=true) accessible même quand état “à jour”.
- Utiliser le paramètre `force` déjà supporté dans `runPipelineFromClient`.
- Résultat: possibilité utilisateur de recalculer toute la chaîne après correction moteur.

3) Validation après implémentation
- Vérification base (post-run forcé):
  - `plan_ovo.ebitda.year2 <= 0` => `dscr` et `multiple_ebitda` doivent être `null`.
- Vérification UI:
  - Dashboard investissement affiche “—” pour DSCR/Multiple si EBITDA projection négatif.
- Vérification cohérence inter-livrables:
  - Plan OVO aligné sur Framework (revenus/EBITDA/Cashflow) après régénération.
- Vérification UX:
  - messages distinguent bien “recalculé” vs “déjà à jour”.

4) Portée et risque
- Aucun changement de schéma DB requis.
- Risque principal: régénération forcée plus coûteuse (temps/crédits), donc proposée en action explicite et non automatique permanente.
