

## Plan : Intégrer la base de connaissances financière + sources bailleurs dans le pipeline IA

### Ce que contient le document uploadé

Le document "Sources Bailleurs Entrepreneuriat Afrique" apporte des données complémentaires à la base de connaissances financière déjà définie :

- **Paramètres BCEAO** : taux bancaires PME (8-14%), TVA 18%, IS 25%, charges sociales ~25%, SMIG ~75 000 XOF
- **Benchmarks sectoriels additionnels** : aviculture (marge brute 35-50%), agriculture de rente (marge nette 15-30%), commerce détail (15-25%), services IT (40-60%), industrie (25-35%)
- **Critères bailleurs de fonds** : Enabel, GIZ, BAD, AFD/Proparco, IFC — critères d'éligibilité, tickets moyens, formats attendus
- **Mapping agents IA** : quel agent utilise quelles sources (Input Analyzer → BCEAO + FIRCA + Enterprise Surveys)

### Implémentation — 4 fichiers

**1. Créer `supabase/functions/_shared/financial-knowledge.ts`**
Reprendre le code fourni précédemment par l'utilisateur, enrichi avec :
- **Nouvelle section 6 — CRITÈRES BAILLEURS DE FONDS** : critères Enabel, GIZ, BAD, AFD/Proparco, IFC (tickets, secteurs prioritaires, formats attendus, KPIs d'impact)
- **Benchmarks sectoriels enrichis** : ajouter `aviculture`, `agriculture_rente`, `industrie_manufacturiere` aux `SECTOR_BENCHMARKS` existants avec les données du document (ex: aviculture marge brute 35-50%, coût aliment 65-70%)
- **Paramètres BCEAO/BEAC** : taux bancaires PME, SMIG par pays intégrés dans `SYSCOHADA_INVARIANTS`

**2. Mettre à jour `supabase/functions/generate-plan-ovo/index.ts`**
- Importer `getFinancialKnowledgePrompt` depuis `financial-knowledge.ts`
- Dans `buildSystemPrompt()` : supprimer les blocs dupliqués (CALCULS OBLIGATOIRES lignes 25-49, VALIDATION POST-CALCUL, COHÉRENCE OBLIGATOIRE) et les remplacer par `+ getFinancialKnowledgePrompt(country, sector)`
- Conserver les instructions de format JSON dans le user prompt

**3. Mettre à jour `supabase/functions/generate-framework/index.ts`**
- Importer `getFinancialKnowledgePrompt`
- Supprimer les blocs FORMULES DE CALCUL (lignes 16-20) et RÈGLES DE VALIDATION (lignes 22-27) du `SYSTEM_PROMPT`
- Injecter `getFinancialKnowledgePrompt(country, sector, false)` (sans exemples pour économiser le contexte) avant l'appel `callAI`
- Conserver la méthodologie top-down/bottom-up spécifique au Framework

**4. Mettre à jour `supabase/functions/generate-inputs/index.ts`**
- Importer `getExtractionKnowledgePrompt`
- Concaténer au `SYSTEM_PROMPT` : invariants comptables + fallbacks de dérivation uniquement (pas de benchmarks ni projections pour ne pas biaiser l'extraction)

### Résultat attendu

Les 3 agents financiers (Inputs, Framework, Plan OVO) partagent une source de vérité unique pour les règles comptables, les benchmarks et les critères bailleurs. Plus de formules dupliquées ou contradictoires entre les prompts.

