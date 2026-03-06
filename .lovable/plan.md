

## Problème

Le `max_tokens` est resté à `8000` dans `generate-ovo-plan/index.ts` (ligne 213), malgré le plan approuvé qui prévoyait de l'augmenter. C'est la cause directe des JSON tronqués et du moulinage infini (3 tentatives qui échouent toutes).

## Correction

**Fichier : `supabase/functions/generate-ovo-plan/index.ts`**

1. **Ligne 213** : changer `max_tokens: 8000` → `max_tokens: 16384`
2. **Ajouter une vérification `stop_reason`** après la réponse Claude : si `stop_reason === "max_tokens"`, loguer un warning et tenter de réparer le JSON tronqué plutôt que de réessayer 3 fois en boucle
3. **Redéployer** la Edge Function

C'est une correction d'une seule ligne + un guard de sécurité.

