

## Plan: Audit complet et corrections du Dashboard Coach

### Problemes identifies

**1. Parcours Rapide — Aucun bouton de telechargement**
La section "Livrables generes" (lignes 953-994) n'affiche que "Voir" et "Partager" pour chaque module. Il manque des boutons de telechargement (HTML, XLSX, DOCX, XLSM) par module. L'entrepreneur, dans sa vue equivalente, a des barres contextuelles avec tous les formats.

**2. Parcours Rapide — Pas de generation OVO Excel automatique**
L'entrepreneur declenche automatiquement `handleGenerateOvoPlan()` apres la pipeline (ligne 298-306 de EntrepreneurDashboard). Le coach ne le fait pas. Resultat : le fichier `.xlsm` du Plan Financier n'est jamais genere cote coach.

**3. Parcours Rapide — Pas d'overlay de generation**
L'entrepreneur a un overlay plein ecran pendant la generation (lignes 1336-1354). Le coach n'en a pas, ce qui permet des clics accidentels pendant la generation.

**4. Vue Miroir — Business Plan Word telecharge sans URL signee**
`handleDownloadBpWordCoach` (ligne 526) fait un fetch direct sur `url` (qui peut etre une URL de bucket prive). L'entrepreneur utilise `getValidAccessToken` + `handleDownloadBpWord`. Le coach n'utilise que `getSession` basique.

**5. Tous les handlers coach — Pas de resilience token**
L'entrepreneur utilise `getValidAccessToken()` (3 niveaux de fallback). Le coach utilise `supabase.auth.getSession()` simple, qui peut echouer apres expiration du token.

**6. Vue Miroir — Pas de generation OVO Excel**
Le coach ne peut pas declencher la generation du fichier Excel OVO (`.xlsm`) depuis la vue miroir. Le bouton "Generer" manque dans la barre Plan OVO quand aucun fichier n'existe.

**7. Livrables tab — Pas de barres de telechargement**
L'onglet "Livrables" (lignes 1280-1313) montre le contenu du livrable mais sans aucune barre de telechargement contextuelle.

---

### Corrections a appliquer dans `CoachDashboard.tsx`

#### A. Ajouter `getValidAccessToken` (comme l'entrepreneur)
Copier le helper resilient depuis EntrepreneurDashboard et l'utiliser dans tous les handlers coach :
- `handleDownloadCoach`
- `handleDownloadBpWordCoach`
- `handleDownloadOvoCoach`
- `handleDownloadOddExcelCoach`
- `handleGenerateCoach`
- `handleGenerateMirror`
- `handleGenerateModuleCoach`

#### B. Ajouter des boutons de telechargement dans le Parcours Rapide
Dans la liste des livrables generes (lignes 978-991), ajouter un bouton `Download` par module avec le format adapte :
- BMC, SIC, Diagnostic : HTML
- Framework : XLSX + HTML
- Plan OVO : XLSM (si existe) + HTML
- Business Plan : DOCX (si existe) + HTML
- ODD : XLSM (si existe) + HTML

#### C. Ajouter `handleGenerateOvoPlanCoach`
Creer une version coach de la generation OVO Excel, similaire a `handleGenerateOvoPlan` de l'entrepreneur. Declencher automatiquement apres `handleGenerateCoach` (pipeline parcours rapide).

#### D. Ajouter l'overlay de generation
Reproduire l'overlay plein ecran de l'entrepreneur pendant `generating === true`.

#### E. Corriger `handleDownloadBpWordCoach`
Utiliser une URL signee pour le bucket `bp-outputs` au lieu d'un fetch direct.

#### F. Ajouter les barres de telechargement dans l'onglet Livrables
Reproduire les memes barres contextuelles que dans la Vue Miroir.

### Fichier modifie
- `src/components/dashboard/CoachDashboard.tsx` uniquement

### Resultat attendu
- Parcours Rapide : chaque livrable genere a ses boutons de telechargement (HTML, XLSX, DOCX, XLSM)
- OVO Excel genere automatiquement apres la pipeline coach
- Overlay de generation pour eviter les clics accidentels
- Token resilient sur tous les appels
- Onglet Livrables avec barres de telechargement completes

