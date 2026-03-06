

## Diagnostic : "CPU Time exceeded" lors de la génération OVO

### Cause racine

Les logs montrent que la fonction **réussit** (AI OK, 1064+515 cellules écrites, upload commencé) mais **dépasse la limite CPU** de l'Edge Function. Le problème est dans le code ZIP/XML :

1. **`setCellValue` exécute un regex sur tout le XML par cellule** — avec ~1600 cellules sur des fichiers XML de plusieurs Mo, c'est O(cellules × taille_XML)
2. **`buildZip` re-compresse TOUS les fichiers** du ZIP (images, styles, VBA...) même ceux non modifiés — seules 4-5 feuilles sur ~50+ fichiers sont touchées
3. **`buildCRC32Table()` est recalculé à chaque appel** de `crc32()` au lieu d'être mis en cache

### Plan d'optimisation

**Fichier** : `supabase/functions/generate-ovo-plan/index.ts`

#### 1. Cache CRC32 table (quick win)
- Déplacer `buildCRC32Table()` en variable module-level au lieu de la recalculer à chaque fichier

#### 2. Ne recomprimer que les fichiers modifiés
- Dans `buildZip`, accepter un Set des fichiers modifiés
- Pour les fichiers non modifiés, copier directement les bytes compressés originaux du ZIP source au lieu de décompresser puis recompresser
- Cela élimine ~90% du travail de compression (seules 4 feuilles XML sur 50+ fichiers sont modifiées)

#### 3. Batch les modifications XML au lieu de regex par cellule
- Remplacer `applyWritesToXml` qui appelle `setCellValue` (1 regex par cellule) par un parsing unique du XML :
  - Parser les `<row>` une seule fois
  - Indexer les cellules par ref
  - Appliquer toutes les modifications en un seul passage
  - Reconstruire le XML en une seule concaténation
- Passe de O(cells × xml_length) à O(xml_length + cells)

#### 4. Stocker les entrées ZIP originales compressées
- Modifier `readZip` pour retourner à la fois les données décompressées (pour modification) ET les données compressées originales + CRC (pour copie directe)

### Résultat attendu
Réduction de ~80% du CPU utilisé, évitant le timeout. La génération devrait passer de >150s CPU à ~30-50s.

