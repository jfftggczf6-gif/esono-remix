

## Plan : 5 correctifs et 1 nouvelle fonctionnalité

### Problème 1 : Rapports HTML pour Plan Financier Final et ODD non à jour

**Constat** : Les fonctions `planOvoHTML` (ligne 876) et `oddHTML` (ligne 968) dans `download-deliverable/index.ts` utilisent des **formats de données obsolètes**. 

- `planOvoHTML` : attend `data.scenarios.optimiste/realiste/pessimiste` et `data.hypotheses_base`, mais le `generate-plan-ovo` produit maintenant `data.revenue`, `data.ebitda`, `data.cashflow`, `data.investment_metrics`, etc. (format visible dans `PlanOvoViewer.tsx`)
- `oddHTML` : attend `data.checklist`, `data.red_flags`, `data.scores_par_categorie`, mais le `generate-odd` produit `data.evaluation_cibles_odd`, `data.indicateurs_impact`, `data.circularite`, `data.synthese` (format visible dans `OddViewer.tsx`)

**Correction** : Réécrire ces deux fonctions HTML pour refléter le format de données actuel, aligné avec les viewers React. Le rapport HTML doit être aussi riche visuellement que le viewer (tableaux P&L 8 ans, graphiques de métriques, cibles ODD avec couleurs).

**Fichier** : `supabase/functions/download-deliverable/index.ts`

---

### Problème 2 : Petits boutons de téléchargement en haut redondants

**Constat** : Lignes 970-983 — une barre de boutons de téléchargement apparaît en haut de chaque module. Mais les modules Framework, Plan OVO, Business Plan et ODD ont déjà leurs propres barres de téléchargement contextuelles (barres émeraude/indigo). Les modules restants (Diagnostic, BMC, SIC) n'ont pas de barre dédiée.

**Correction** :
1. Supprimer les petits boutons génériques en haut (lignes 970-983)
2. Ajouter des barres de téléchargement contextuelles pour Diagnostic, BMC et SIC (même style que les barres existantes pour Framework/ODD)

**Fichier** : `src/components/dashboard/EntrepreneurDashboard.tsx`

---

### Problème 3 : Flash de la page SelectRole/Enterprise à la connexion

**Constat** : À la connexion, l'utilisateur voit brièvement la page de sélection de rôle et de création d'entreprise avant d'être redirigé vers le dashboard. Cela vient de la séquence :
1. `signIn` résout → `onAuthStateChange` met user
2. Dashboard se rend, `role` est encore null → redirige vers `/select-role`
3. `fetchUserData` finit → `role` est défini → SelectRole redirige vers `/dashboard`

**Correction** : 
- Dans `Dashboard.tsx` : ne pas rediriger si `loading` est true (déjà fait), mais le problème est que `loading` passe à false avant que `fetchUserData` ne termine lors du `onAuthStateChange`. 
- Ajouter un état intermédiaire : quand `user` existe mais `role` n'est pas encore chargé, afficher le loader au lieu de rediriger.
- Modifier `useAuth` : ajouter un flag `roleLoading` qui reste true tant que `fetchUserData` n'a pas terminé pour le user courant.

**Fichiers** : `src/hooks/useAuth.tsx`, `src/pages/Dashboard.tsx`

---

### Problème 4 : Coach dashboard — synchronisation avec les modifications entrepreneur

**Constat** : Le CoachDashboard fetch les données indépendamment via `enterprises`, `enterprise_modules` et `deliverables`. Il affiche les modules et livrables tels qu'ils sont en base, donc les modifications entrepreneur sont bien reflétées. Cependant :
- Il manque les viewers spécialisés pour SIC, BusinessPlan, et les barres de téléchargement contextuelles
- Le coach ne voit que le BMC via `BmcViewer` et le reste via `DeliverableViewer` (ligne 219-222), ce qui fonctionne

**Correction** : Aligner le coach avec les mêmes viewers que l'entrepreneur (ajouter SicViewer, BusinessPlanPreview) et les barres de téléchargement contextuelles.

**Fichier** : `src/components/dashboard/CoachDashboard.tsx`

---

### Problème 5 (Nouvelle fonctionnalité) : Rapport coaching par entrepreneur

**Description** : Ajouter une section dans le CoachDashboard permettant au coach de générer un rapport global par entrepreneur, présentant :
- Progression globale (modules complétés, scores)
- Résumé des livrables générés et scores par module
- Points forts et points faibles identifiés
- Recommandations clés extraites des livrables
- Historique d'avancement

Ce rapport serait généré à partir des données déjà en base (deliverables, modules) sans appel IA supplémentaire, et téléchargeable en HTML.

**Fichiers** :
- `src/components/dashboard/CoachDashboard.tsx` — ajouter un bouton "Rapport Coaching" dans la vue détaillée d'un entrepreneur
- `supabase/functions/download-deliverable/index.ts` — ajouter un type `coaching_report` qui compile les données des livrables en un rapport HTML synthétique

---

### Résumé des fichiers modifiés

| Fichier | Modifications |
|---|---|
| `supabase/functions/download-deliverable/index.ts` | Réécrire `planOvoHTML` et `oddHTML`, ajouter `coachingReportHTML` |
| `src/components/dashboard/EntrepreneurDashboard.tsx` | Supprimer boutons génériques, ajouter barres contextuelles BMC/SIC/Diagnostic |
| `src/components/dashboard/CoachDashboard.tsx` | Aligner viewers, ajouter section rapport coaching |
| `src/hooks/useAuth.tsx` | Ajouter `roleLoading` pour éviter le flash |
| `src/pages/Dashboard.tsx` | Utiliser `roleLoading` dans la condition de redirection |

