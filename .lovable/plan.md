

## Plan : Migrer `extract-enterprise-info` vers l'API Anthropic

La fonction `extract-enterprise-info` est la seule à utiliser le gateway Lovable AI. Toutes les autres fonctions utilisent déjà directement l'API Anthropic avec votre clé `ANTHROPIC_API_KEY` (qui est déjà configurée en secret).

### Modification unique

**Fichier : `supabase/functions/extract-enterprise-info/index.ts`**

Remplacer l'appel au gateway Lovable AI par un appel direct à `https://api.anthropic.com/v1/messages` en utilisant `ANTHROPIC_API_KEY`, de la même manière que toutes les autres edge functions du projet (via `claude-3-5-sonnet` ou `claude-3-haiku` pour cette tâche légère d'extraction).

- Remplacer le bloc fetch (lignes 59-90) pour utiliser l'API Anthropic avec le format `messages` natif
- Utiliser `claude-3-haiku-20240307` (rapide et économique pour cette tâche simple d'extraction)
- Adapter le parsing de la réponse au format Anthropic (`content[0].text` au lieu de `choices[0].message.content`)
- Conserver la même logique de gestion d'erreurs (402, 500)

Aucune autre modification nécessaire — le secret `ANTHROPIC_API_KEY` est déjà en place.

