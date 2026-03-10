

# Mise à jour de la Landing Page

## Modifications dans `src/pages/Index.tsx`

### 1. Supprimer le badge drapeau Côte d'Ivoire
- Ligne 63-65 : Retirer les deux badges (`🇨🇮 Côte d'Ivoire` et `XOF / FCFA`) — la plateforme cible toute l'Afrique, pas un seul pays

### 2. Réaligner le tableau `MODULES` (lignes 13-21)
Suivre l'ordre réel de `MODULE_CONFIG` :
1. Diagnostic Expert Global (Stethoscope)
2. Business Model Canvas (LayoutGrid)
3. Social Impact Canvas (Globe)
4. Plan Financier Intermédiaire (BarChart3)
5. Plan Financier Final (ListChecks)
6. Business Plan (FileText)
7. ODD (Target)

Supprimer le champ `category` (hybrid/automatic) — cette distinction n'existe pas dans l'app. Mettre à jour les livrables selon `DELIVERABLE_CONFIG`.

### 3. Supprimer la distinction hybride/automatique (lignes 115-155)
Remplacer les deux grilles séparées par une grille unique de 7 modules sans catégorisation.

### 4. Mettre à jour les badges hero (lignes 70-74)
- "Upload intelligent" — Analyse auto des documents
- "IA assistée" — Génération des livrables (garder)
- "Coaching humain" — Rapports détaillés IA (garder)

### 5. Corriger la carte Entrepreneur (ligne ~167)
- "7 modules" au lieu de "8"
- Features : "Diagnostic expert, BMC, SIC", "Génération IA : Framework, Plan OVO, BP, ODD", "7+ livrables (Excel, HTML, DOCX)"

### 6. Mettre à jour la carte Coach
- "Dashboard multi-entrepreneurs avec scores IR"
- "Rapports détaillés générés par IA"
- "Suivi de progression et validation"

### 7. Mettre à jour la barre de stats (lignes ~185-195)
Remplacer "TVA 18% / IS 25%" par des stats pertinentes :
- "7 modules" — Parcours complet
- "7+ livrables" — Multi-formats
- "IA + Coach" — Double validation
- "Afrique" — PME africaines

### Fichier impacté
| Fichier | Action |
|---|---|
| `src/pages/Index.tsx` | Modifier — réaligner modules, supprimer badge CI, mettre à jour features/stats |

