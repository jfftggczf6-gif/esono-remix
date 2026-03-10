

# Fix Excel ODD corrompu — format invalide à l'ouverture

## Diagnostic

Le fichier `.xlsx` généré par `fillOddExcelTemplate` est corrompu car `JSZip.generateAsync()` est appelé **sans compression DEFLATE**. Par défaut JSZip utilise STORE (pas de compression), ce qui produit un ZIP techniquement valide mais qu'Excel rejette car les `.xlsx` doivent utiliser DEFLATE.

De plus, le code cherche et ré-injecte des entrées VBA (lignes 213-294) alors que le template est un `.xlsx` sans macros — ce n'est pas la cause du bug mais c'est du code mort à nettoyer.

Enfin, quand on modifie des cellules manuellement via XML, le fichier `calcChain.xml` devient incohérent avec les cellules réelles, ce qui peut aussi provoquer un rejet par Excel.

## Corrections dans `odd-excel-template.ts`

### 1. Ajouter `compression: "DEFLATE"` au `generateAsync`
Ligne 298 : remplacer par :
```ts
return await zip.generateAsync({
  type: "uint8array",
  compression: "DEFLATE",
  compressionOptions: { level: 6 }
});
```

### 2. Supprimer `calcChain.xml` pour éviter l'incohérence
Avant le `generateAsync`, supprimer ce fichier que Excel recalculera automatiquement :
```ts
zip.remove("xl/calcChain.xml");
```

### 3. Supprimer le code VBA mort (lignes 213-225 et 290-294)
Le template est `.xlsx`, pas `.xlsm` — ce code ne fait rien mais alourdit la logique.

---

**Fichier modifié** : `supabase/functions/_shared/odd-excel-template.ts`

