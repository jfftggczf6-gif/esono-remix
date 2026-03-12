

## Supprimer le bouton vert "Framework Excel (.xlsx)" du Plan Financier Intermédiaire

### Changements

**Fichier 1 : `src/components/dashboard/CoachDashboard.tsx` (ligne ~1216)**
Supprimer le bouton `<button onClick={() => handleDownloadCoach('framework_data', 'xlsx', ent.id)} className="... bg-emerald-600 ...">Framework Excel (.xlsx)</button>`.

**Fichier 2 : `src/components/dashboard/EntrepreneurDashboard.tsx` (ligne ~1150-1153)**
Supprimer le bouton `<button ... className="... bg-emerald-600 ...">Framework Excel (.xlsx)</button>`.

Seul le bouton "Rapport HTML" restera pour le téléchargement du Framework.

