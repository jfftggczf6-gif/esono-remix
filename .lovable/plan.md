

## Plan : Mise a jour des Templates Vierges

### Fichiers recus
- **Questionnaire_BM_and_Social_Impact_Canvas-3.docx** : questionnaire unifie BMC + SIC + ODD (18 sections, 4 pages)
- **Analyse_financiere_INPUTS_ENTREPRENEURS_V2.xlsx** : framework financier 7 etapes (guide, historiques, produits, couts, RH, investissements, hypotheses)

### Modifications

**1. Copier les fichiers dans le projet**
- `user-uploads://Questionnaire_BM_and_Social_Impact_Canvas-3.docx` → `public/templates/Questionnaire_BM_and_Social_Impact_Canvas.docx`
- `user-uploads://Analyse_financiere_INPUTS_ENTREPRENEURS_V2.xlsx` → `public/templates/Analyse_financiere_INPUTS_ENTREPRENEURS_V2.xlsx`

**2. Mettre a jour `src/pages/Templates.tsx`**
- Retirer l'entree "Plan Financier OVO" de la liste `TEMPLATES`
- Mettre a jour le path du questionnaire BMC/SIC avec le nouveau nom de fichier
- Mettre a jour la description du BMC/SIC pour refléter le contenu reel (BMC + SIC + ODD unifie)
- Grille passe de 3 colonnes a 2

**3. Auto-upload vers le bucket `templates`**
Ajouter une logique dans `handleDownload` : si le fichier n'existe pas dans le bucket storage, l'uploader depuis `/templates/` (dossier public) avant de le telecharger. Cela garantit que les fichiers sont disponibles dans le bucket sans intervention manuelle.

### Fichiers modifies
- `src/pages/Templates.tsx`
- Copie de 2 fichiers dans `public/templates/`

