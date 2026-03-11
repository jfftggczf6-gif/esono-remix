
Objectif: éliminer définitivement le mélange ODD/OVO au téléchargement et rendre le flux ODD auto-vérifié (même si cache navigateur ou ancien fichier).

1) Constat confirmé (à partir du runtime)
- Tu télécharges depuis le Dashboard entrepreneur.
- La requête vue en runtime appelle bien `download-deliverable?type=odd_analysis&format=xlsx`.
- En base, `odd_excel` et `plan_ovo_excel` existent séparément, mais ton symptôme (`PlanFinancier...OVO...xlsm`) montre qu’un nom OVO peut encore être appliqué à un fichier ODD dans certains cas (cache/ancien flux/nom forcé).

2) Correction frontend (unification stricte ODD)
- Créer un handler dédié `downloadOddExcel()` (au lieu d’un handler générique) dans:
  - `src/components/dashboard/EntrepreneurDashboard.tsx`
  - `src/components/dashboard/CoachDashboard.tsx`
  - `src/pages/Livrables.tsx`
- Ce handler:
  - appelle uniquement `download-deliverable?type=odd_analysis&format=xlsx&_ts=<timestamp>` (anti-cache),
  - lit les headers de réponse (`content-type`, `content-disposition`),
  - bloque le téléchargement si le header contient `xlsm` ou `OVO` (protection anti-mix),
  - force le nom local: `{Entreprise}_ODD_{timestamp}.xlsx`.
- Résultat: même si une réponse incohérente arrive, on ne sauvegarde plus un faux fichier ODD.

3) Correction backend (durcissement du endpoint)
- Dans `supabase/functions/download-deliverable/index.ts`, branche `odd_analysis + xlsx`:
  - garder source de vérité sur `odd_excel.data.file_name`,
  - rejeter toute valeur suspecte (`.xlsm`, `PlanFinancier`, `_OVO_`) et basculer en régénération ODD à la volée,
  - ajouter headers anti-cache (`Cache-Control: no-store, no-cache, must-revalidate`, `Pragma: no-cache`, `Expires: 0`),
  - ajouter logs explicites: `type demandé`, `fichier servi`, `nom final`, `mime`.
- Important: ne pas toucher au flux `plan_ovo` (il doit rester `.xlsm`).

4) Vérification et nettoyage ciblé
- Contrôle DB des `odd_excel` pour détecter d’éventuelles entrées historiques mal nommées.
- Si trouvées: régénération ODD ciblée pour ces entreprises (pas besoin de relancer tout le pipeline).

5) Validation E2E (critique)
- Test 1: Dashboard entrepreneur → module ODD → téléchargement → nom contient `_ODD_` + extension `.xlsx`.
- Test 2: ouverture du fichier dans Excel desktop (aucune alerte de format/extension).
- Test 3: téléchargement Plan OVO reste `.xlsm` et s’ouvre correctement.
- Test 4: page `/livrables` et dashboard coach donnent exactement le même comportement.

Réponse à ta question “je dois régénérer la page ?”
- Après ce correctif: un hard refresh suffira pour prendre le nouveau code.
- Pas besoin de relancer tout le pipeline; au pire on régénère uniquement ODD pour l’entreprise concernée si un ancien artefact est détecté.
