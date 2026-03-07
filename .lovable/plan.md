

## Diagnostic : Business Plan Preview vide pour "eco build"

### Cause racine
Les logs backend montrent que la fonction `generate-business-plan` a **timeout** après ~67 secondes pour "eco build" :
- `02:45:05` → `[BP] Generating Business Plan for: eco build`
- `02:46:12` → `shutdown` (aucun log de succès ni d'erreur)

L'appel AI (Claude) pour générer les 14 sections du BP prend trop de temps, et la fonction meurt avant de sauvegarder le deliverable. Résultat : aucune donnée `business_plan` en base pour cette entreprise → preview vide.

### Plan de correction

**1. Découper la génération BP en 2 appels AI plus courts**
- Fichier : `supabase/functions/generate-business-plan/index.ts`
- **Appel 1** (sections 1-8) : Infos entreprise, résumé gestion, historique, vision/mission, description, SWOT, modèle entreprise, marché
- **Appel 2** (sections 9-14) : Marketing 5P, équipe, projet, impact, financier, attentes OVO
- Chaque appel cible ~6000 tokens max au lieu de ~12000, réduisant le temps de réponse de moitié
- Les deux résultats sont fusionnés (`{...part1, ...part2}`) avant génération Word

**2. Ajouter un fallback timeout côté front**
- Fichier : `src/components/dashboard/EntrepreneurDashboard.tsx`
- Dans `handleGenerateModule('business_plan')`, ajouter un `AbortController` avec timeout de 120s
- Si timeout, afficher un message explicite : "La génération du Business Plan a pris trop de temps. Réessayez."

**3. Ajouter une détection de truncation dans `callAI`**
- Fichier : `supabase/functions/_shared/helpers.ts`
- Vérifier `aiResult.stop_reason === "max_tokens"` avant le parsing JSON
- Si truncation détectée, logger clairement et remonter l'erreur au lieu d'un crash silencieux

**4. Réduire la taille du prompt BP**
- Fichier : `supabase/functions/generate-business-plan/index.ts`
- Réduire les blocs JSON injectés (BMC, framework, plan_ovo) : passer de 2000/1500 chars à 1000/800 chars chacun
- Garder uniquement les champs clés au lieu du JSON brut complet

### Fichiers modifiés
- `supabase/functions/generate-business-plan/index.ts` (split AI calls + prompt compact)
- `supabase/functions/_shared/helpers.ts` (détection truncation)
- `src/components/dashboard/EntrepreneurDashboard.tsx` (timeout + message)

