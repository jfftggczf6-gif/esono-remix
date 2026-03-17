

## Vue Miroir plein écran pour le Coach

### Problème
La Vue Miroir (onglet "Vue Entrepreneur") est actuellement contrainte dans le `DashboardLayout` avec un `container` CSS qui limite la largeur. Le coach utilise cette vue comme outil de travail principal — elle doit occuper tout l'écran.

### Approche
Quand le coach est en detail view avec l'onglet `mirror` actif, sortir le contenu du `DashboardLayout` standard et utiliser un layout plein écran dédié.

### Fichier modifié : `src/components/dashboard/CoachDashboard.tsx`

**Changement dans le render du detail view** (lignes ~777-1413) :

Quand `detailTab === 'mirror'`, au lieu de rendre à l'intérieur de `<DashboardLayout>`, rendre un layout plein écran autonome :

- Header compact fixe en haut : logo ESONO, nom de l'entreprise, badge score, bouton Retour, bouton Rapport IA, onglets (Parcours Rapide / Vue Entrepreneur / Livrables)
- Contenu miroir occupe `100vh - hauteur header` sans contrainte `container`
- La sidebar Sources et le panneau central utilisent la grille existante `grid-cols-3` mais dans un conteneur `w-full px-4` au lieu de `container`
- La barre de modules en bas reste sticky/fixed en bas de l'écran

Concrètement :
1. Extraire le bloc `detailTab === 'mirror'` pour qu'il retourne un JSX **séparé** avant le `return <DashboardLayout>`, avec son propre layout `min-h-screen`
2. Header simplifié : bouton retour + nom entreprise + onglets en ligne + actions (tout en une barre)
3. Le contenu miroir utilise `h-[calc(100vh-8rem)]` avec overflow scroll
4. La barre de modules en bas est `fixed bottom-0` pleine largeur

Les onglets `parcours` et `livrables` restent dans le `DashboardLayout` classique — seul `mirror` passe en plein écran.

### Résultat
- Vue Miroir = plein écran, immersive, comme l'app entrepreneur
- Les autres onglets du coach restent dans le layout standard avec header/container

