

# Correction : Ajouter une étape de réconciliation post-Framework

## Diagnostic confirmé

Le pipeline actuel : BMC → SIC → Inputs → **Framework** → **Plan OVO** → Business Plan → ODD → Diagnostic.

Même si Plan OVO tourne après Framework, l'écart persiste car :
1. L'IA génère des chiffres propres dans `generate-plan-ovo`
2. `enforceFrameworkConstraints` tente d'écraser year2-year6, mais le matching de la ligne "CA total" dans les `lignes` du Framework peut échouer si le libellé ne contient pas exactement "ca total", "chiffre" ou "revenue"
3. Les scénarios (pessimiste/réaliste/optimiste) ne sont synchronisés que si `frameworkData.scenarios.tableau` existe

## Correction en 2 étapes

### 1. Créer `supabase/functions/reconcile-plan-ovo/index.ts`

Edge function légère (pas d'appel IA, 0 crédit) qui :
- Charge le `plan_ovo` et `framework_data` les plus récents depuis la DB
- Réapplique `enforceFrameworkConstraints` avec le Framework frais
- Sauvegarde le `plan_ovo` mis à jour
- Ajoute un fallback de matching élargi pour la ligne CA (accepte aussi "total revenus", "ventes totales", "recettes")

### 2. Ajouter l'étape dans le pipeline client

**`src/lib/dashboard-config.ts`** : Insérer après Framework, avant Business Plan :
```
{ name: 'Sync Plan OVO', fn: 'reconcile-plan-ovo', type: 'plan_ovo' }
```

**`src/lib/pipeline-runner.ts`** : Modifier le skip-logic pour ne jamais sauter `reconcile-plan-ovo` (il doit toujours s'exécuter si plan_ovo ET framework_data existent).

**`supabase/functions/generate-deliverables/index.ts`** : Ajouter la même étape dans le pipeline serveur.

### 3. Renforcer le matching dans `normalizers.ts`

Élargir les patterns de `findLigne` pour la ligne CA : ajouter "total revenus", "ventes", "recettes", "turnover" pour éviter les échecs de matching silencieux.

## Résultat

Après chaque régénération, le Plan OVO JSON sera **systématiquement** réconcilié avec le Framework le plus récent, éliminant tout écart.

