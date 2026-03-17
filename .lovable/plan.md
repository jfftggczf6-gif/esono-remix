

## Fix: permettre plusieurs documents supplémentaires

### Problème
Dans `handleUpload` (CoachDashboard.tsx, lignes 266-276), le bloc `else` supprime **tous** les uploads existants de la même catégorie avant d'insérer le nouveau. Pour `bmc`, `sic`, `inputs` c'est le comportement voulu (1 seul fichier). Mais pour `supplementary`, ça écrase le précédent à chaque fois.

Second problème : les noms de fichiers avec caractères spéciaux (parenthèses, espaces, accents) causent une erreur "Invalid key" dans le storage Supabase.

### Modifications — `CoachDashboard.tsx`

**1. `handleUpload` (~ligne 266-276)** — Ne pas supprimer les fichiers existants quand `category === 'supplementary'`

```ts
} else {
  if (category !== 'supplementary') {
    const existingUploads = uploadsMap[enterpriseId] || [];
    const existing = existingUploads.filter((u) => u.category === category);
    for (const u of existing) {
      await supabase.from('coach_uploads').delete().eq('id', u.id);
      await supabase.storage.from('documents').remove([u.storage_path]);
    }
  }
  await supabase.from('coach_uploads').insert({ ... });
}
```

**2. Sanitize le nom de fichier dans le `filePath`** (~ligne 248) — Remplacer les caractères problématiques (espaces, parenthèses, accents) par des underscores pour éviter l'erreur "Invalid key" :

```ts
const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
const filePath = `${enterpriseId}/coach/${category}/${Date.now()}_${safeName}`;
```

Le `filename` original reste stocké tel quel dans `coach_uploads` pour l'affichage.

