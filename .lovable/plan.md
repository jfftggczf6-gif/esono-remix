
Objectif: corriger définitivement l’erreur “Non authentifié — veuillez vous reconnecter” au clic sur “Régénérer” du Plan OVO.

Constat rapide (exploration)
- Le message exact vient du front (`EntrepreneurDashboard.tsx`, `handleGenerateOvoPlan`, ligne ~455).
- Aucune trace d’appel backend au moment de l’erreur (pas de requête/lignes de logs), donc l’échec se produit avant l’appel réseau.
- Le flux actuel est trop strict: il considère l’état invalide si `sessionErr` existe, même quand une session potentiellement exploitable est encore disponible ailleurs (contexte auth en mémoire).

Plan de correction
1) Centraliser la récupération du token côté front
- Créer une fonction utilitaire locale dans `EntrepreneurDashboard.tsx` (ex: `getValidAccessTokenOrThrow()`).
- Ordre de fallback robuste:
  1. `session` du contexte auth (`useAuth`) si disponible
  2. `supabase.auth.getSession()`
  3. `supabase.auth.getUser()` puis `supabase.auth.refreshSession()`
- Échouer uniquement si tous les fallback échouent.
- En cas d’échec final: message clair “Session expirée” + redirection vers `/login` (au lieu de rester bloqué).

2) Appliquer ce helper à tous les appels protégés du dashboard
- Remplacer les blocs `getSession()` actuels dans:
  - `handleGenerateOvoPlan` (cas critique signalé)
  - `handleGenerate`
  - `handleGenerateModule`
  - `handleDownload`
  - `handleDownloadOvoFile`
  - `handleDownloadBpWord`
  - `extractEnterpriseInfo`
- Bénéfice: plus de comportement incohérent selon le bouton cliqué.

3) Ajuster la condition qui déclenche le refresh
- Ne plus déclencher un échec immédiat sur `sessionErr` seul.
- Utiliser la présence d’un `access_token` valide comme critère principal.

4) Renforcer la robustesse auth globale
- Dans `useAuth.tsx`, aligner l’initialisation de session pour éviter les états “user visible / session absente”:
  - mettre en place l’écoute `onAuthStateChange` en premier
  - puis hydratation session initiale
- Cela réduit les faux positifs d’expiration côté UI.

5) Vérification après implémentation
- Test 1: clic “Régénérer” Plan OVO → requête backend bien envoyée, plus de toast “Non authentifié”.
- Test 2: session vieillissante (attendre, puis relancer) → refresh automatique ou redirection login propre.
- Test 3: vérifier que les autres actions (génération modules, téléchargements) continuent de fonctionner.

Fichiers concernés
- `src/components/dashboard/EntrepreneurDashboard.tsx`
- `src/hooks/useAuth.tsx`

Détails techniques (implémentation)
- Introduire un helper unique pour éviter la duplication des blocs auth et les divergences de comportement.
- Utiliser l’`access_token` du contexte auth comme source prioritaire (plus fiable en runtime).
- Conserver les appels backend existants, mais alimentés par le helper central pour sécuriser l’authentification de bout en bout.
