

## Problème identifié

Deux bugs liés :

**Bug 1 — Redirection vers /select-role après inscription :**
Dans `signUp`, l'appel `supabase.auth.signUp` déclenche immédiatement `onAuthStateChange`, qui appelle `fetchUserData`. À ce moment, le `upsert` dans `user_roles` n'a pas encore été exécuté → `fetchUserData` trouve `role = null` → `setRoleState(null)`. Quand le code navigue vers `/dashboard`, le composant `Dashboard` voit `role === null` et redirige vers `/select-role`.

**Bug 2 — Erreur RLS sur user_roles :**
Sur la page `/select-role`, la fonction `setRole` fait un `upsert`. Si une ligne existe déjà (insérée par le signup), l'upsert tente un `UPDATE`, mais il n'y a **aucune politique UPDATE** sur `user_roles` → erreur RLS.

## Corrections

### 1. Migration SQL : ajouter une politique UPDATE sur user_roles
```sql
CREATE POLICY "Users can update their own role"
ON public.user_roles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 2. Corriger la race condition dans `useAuth.tsx` — fonction `signUp`
- Insérer le rôle **avant** que `onAuthStateChange` ne se déclenche n'est pas possible, mais on peut s'assurer que le `setRoleState(role)` dans `signUp` "gagne" la course.
- Solution : dans le callback `onAuthStateChange`, ne pas écraser le rôle si `signUp` l'a déjà défini. Ajouter un flag `skipNextRoleFetch` (ref) qui est activé pendant le signup.

Concrètement dans `useAuth.tsx` :
- Ajouter un `useRef(false)` nommé `skipRoleFetch`
- Dans `signUp` : mettre `skipRoleFetch.current = true` avant l'appel `signUp`, puis faire le `upsert` + `setRoleState`, puis remettre le flag à `false`
- Dans `onAuthStateChange` : si `skipRoleFetch.current === true`, ne pas appeler `fetchUserData`

### Fichiers modifiés
- `src/hooks/useAuth.tsx` (fix race condition)
- Migration SQL (ajout politique UPDATE sur user_roles)

