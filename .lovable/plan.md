

## Ajouter la prévisualisation du rapport IA coach

### Objectif
Permettre de visualiser le rapport HTML généré directement dans l'application au lieu de le télécharger automatiquement.

### Modifications

**Fichier : `src/components/dashboard/CoachDashboard.tsx`**

1. **Ajouter un state** pour stocker le contenu HTML du rapport et l'ID de l'entreprise concernée :
   - `reportPreview: { html: string; enterpriseName: string } | null`

2. **Modifier `handleDownloadReport`** : au lieu de créer un blob et déclencher un download, stocker le HTML dans le state `reportPreview`.

3. **Ajouter un Dialog/Sheet de prévisualisation** :
   - Utiliser un `Dialog` plein écran (ou `Sheet` côté droit) qui s'ouvre quand `reportPreview` est non-null
   - Contenu : un `iframe` avec `srcdoc={reportPreview.html}` pour afficher le HTML de façon isolée
   - Header avec le nom de l'entreprise + deux boutons :
     - **Télécharger** : déclenche le download du fichier HTML (logique actuelle)
     - **Fermer** : remet `reportPreview` à null

### Détails techniques
- `srcdoc` sur un iframe est le moyen le plus sûr d'afficher du HTML arbitraire sans risque XSS sur le DOM parent
- Le Dialog utilisera `max-w-[90vw] h-[85vh]` pour un affichage confortable
- Le bouton « Rapport IA » garde son comportement actuel (loader pendant la génération) mais ouvre la preview au lieu de télécharger

### Aucune migration requise

