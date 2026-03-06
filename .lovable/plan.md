

## Plan: Remettre à zéro le module Plan OVO et créer une preview HTML riche

### Contexte
Le module `plan_ovo` a été vidé lors de la suppression précédente. Le `PlanOvoViewer` existant (lignes 574-641 de DeliverableViewer.tsx) est basique : il affiche les hypothèses, 3 tableaux de scénarios et les indicateurs clés. Il manque les sections riches décrites dans le prompt (revenus détaillés, OPEX, EBITDA, staff, CAPEX, graphiques visuels, break-even).

### Changements

**1. Refactorer le prompt IA de `generate-plan-ovo/index.ts`**
- Remplacer le prompt actuel par le prompt enrichi fourni par l'utilisateur pour obtenir une structure JSON complète avec : `revenue`, `cogs`, `gross_profit`, `opex` détaillé (salaires, marketing, etc.), `ebitda`, `net_profit`, `cashflow`, `staff`, `capex`, `loans`, `key_assumptions`, `break_even_year`
- Adapter le format pour demander des projections sur 8 colonnes (Year-2, Year-1, Current, Year2-Year6)
- Garder les paramètres fiscaux UEMOA (TVA 18%, IS 25%, etc.)

**2. Refactorer le `PlanOvoViewer` dans `DeliverableViewer.tsx`**
Créer une preview HTML riche avec les sections suivantes :
- **Header** : nom entreprise, pays, devise, date, score
- **KPIs bar** : Revenue, Gross Profit, EBITDA, Net Profit (année courante)
- **Tableau résumé 8 colonnes** : Revenue, COGS, Gross Profit, Gross Margin %, EBITDA, EBITDA Margin %, Net Profit, Cashflow — avec formattage FCFA
- **Graphique visuel** (barres) : Revenue vs EBITDA par année (via Recharts, déjà installé)
- **Graphique ligne** : Net Profit et Cashflow par année
- **OPEX détaillé** : tableau avec salaires, marketing, bureaux, voyages, etc.
- **Staff** : tableau catégorie, département, taux charges sociales
- **CAPEX** : tableau label, année acquisition, valeur, taux amortissement
- **Prêts** : détail OVO, famille, banque
- **Break-even** : année mise en évidence en vert
- **Hypothèses clés** : liste à puces
- **Scénarios OVO** : conserver les 3 scénarios (optimiste, réaliste, pessimiste) existants
- Design cohérent avec les autres viewers (Cards, Badges, même style)

**3. Aucune modification backend supplémentaire nécessaire** — La régénération se fera via le pipeline frontend existant qui appelle `generate-plan-ovo` individuellement.

### Fichiers modifiés
- `supabase/functions/generate-plan-ovo/index.ts` — nouveau prompt enrichi
- `src/components/dashboard/DeliverableViewer.tsx` — refonte complète du `PlanOvoViewer`

