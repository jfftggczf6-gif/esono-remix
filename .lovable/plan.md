

## Super Admin Dashboard

### Vue d'ensemble
Dashboard d'administration complet pour surveiller et intervenir sur l'activité de tous les coaches et entrepreneurs de la plateforme. Accès en lecture sur toutes les données, avec possibilité d'intervenir (supprimer un compte, réassigner un coach, etc.).

### 1. Base de données

**Migration SQL :**
- Ajouter `super_admin` à l'enum `app_role`
- Ajouter des politiques RLS SELECT sur `enterprises`, `deliverables`, `enterprise_modules`, `profiles`, `user_roles`, `score_history`, `coach_uploads` pour `super_admin` via `has_role()`
- Ajouter politique RLS UPDATE sur `enterprises` pour `super_admin` (réassigner coach, etc.)
- Ajouter politique RLS DELETE sur `enterprises`, `deliverables` pour `super_admin`
- Insérer le rôle `super_admin` pour le user `913a0bd1-2406-4d6d-a8e7-5c8ecd84060f` (adiallo23@gmail.com)

### 2. Frontend

**Nouveau fichier : `src/components/dashboard/SuperAdminDashboard.tsx`**

Layout :
```text
┌─────────────────────────────────────────────────────┐
│  ESONO Admin           Kadry Diallo      [Logout]   │
├─────────────────────────────────────────────────────┤
│  [12 Utilisateurs] [3 Coaches] [9 Entreprises] [69 Livrables] │
├─────────────────────────────────────────────────────┤
│  [Utilisateurs] [Entreprises] [Activité récente]    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Tab Utilisateurs:                                  │
│  - Tableau : nom, email, rôle, date inscription     │
│  - Actions : voir détail, changer rôle, supprimer   │
│                                                     │
│  Tab Entreprises:                                   │
│  - Tableau : nom, entrepreneur, coach, secteur,     │
│    score IR, phase, nb livrables, dernière activité  │
│  - Clic → panel détail : tous les livrables,        │
│    modules, fichiers uploadés                        │
│  - Actions : réassigner coach, supprimer entreprise  │
│                                                     │
│  Tab Activité:                                      │
│  - Feed chronologique des derniers livrables générés │
│  - Type, entreprise, généré par, date               │
└─────────────────────────────────────────────────────┘
```

Fonctionnalités d'intervention :
- **Réassigner un coach** : dropdown avec liste des coaches pour changer `enterprises.coach_id`
- **Supprimer une entreprise** : avec confirmation, supprime l'entreprise et ses deliverables en cascade
- **Voir les livrables** : réutilise les viewers existants (BmcViewer, SicViewer, DeliverableViewer, etc.) en mode lecture seule

**Fichier modifié : `src/pages/Dashboard.tsx`**
- Ajouter condition : si `role === 'super_admin'` → render `<SuperAdminDashboard />`

**Fichier modifié : `src/hooks/useAuth.tsx`**
- Aucun changement nécessaire, gère déjà tout `app_role`

### 3. Fichiers impactés

| Fichier | Action |
|---------|--------|
| Migration SQL | Nouveau — enum + RLS + insert rôle |
| `src/components/dashboard/SuperAdminDashboard.tsx` | Nouveau — dashboard complet |
| `src/pages/Dashboard.tsx` | Modifié — routing vers SuperAdminDashboard |

