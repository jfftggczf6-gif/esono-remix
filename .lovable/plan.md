

## Plan : Corriger le lien Coach ↔ Entrepreneur et vérifier les deux dashboards

### Constat actuel

**Deux entreprises "MORINGA GOLD TOGO" existent :**
- `695f16bd` : l'originale, créée par l'entrepreneur (`philippeyace@hotmail.fr`), `coach_id = null`, 12 livrables, 8 modules complétés
- `d07a3a29` : le doublon, créée par le coach (`philyace@gmail.com`), `user_id = coach_id = coach`, 0 livrables, 0 modules

**Problemes identifiés :**
1. Le coach ne voit PAS l'entreprise originale car `coach_id` est null dessus
2. Le doublon est vide et inutile
3. La logique `handleAddEntrepreneur` crée un doublon au lieu de lier à l'existant
4. Le coach ne peut pas faire d'UPDATE sur `enterprises` (pas de policy UPDATE pour les coaches)
5. Les RLS `coach_uploads` utilisent `RESTRICTIVE` au lieu de `PERMISSIVE` — risque de blocage

### Corrections à apporter

#### 1. Nettoyage des données (via insert tool)
- Supprimer l'entreprise doublon `d07a3a29`
- Mettre à jour `coach_id = d5943002-beca-4fcd-a5ad-f1b5f5d062d9` sur l'entreprise originale `695f16bd`

#### 2. Migration SQL : ajouter la policy UPDATE pour les coaches
```sql
CREATE POLICY "Coaches can update assigned enterprises"
ON public.enterprises FOR UPDATE
USING (auth.uid() = coach_id)
WITH CHECK (auth.uid() = coach_id);
```

Et corriger les policies `coach_uploads` de RESTRICTIVE à PERMISSIVE.

#### 3. Modifier `CoachDashboard.tsx` — logique d'ajout
Remplacer la logique actuelle (qui crée toujours une nouvelle entreprise avec `user_id = coach`) par :
- **Etape 1** : Chercher une entreprise existante par `contact_email`
- **Si trouvée** : UPDATE pour assigner `coach_id = coach.id` (liaison)
- **Si non trouvée** : Créer une nouvelle entreprise avec `user_id = coach.id` (fiche en attente)

#### 4. Vérification côté entrepreneur
L'entrepreneur `philippeyace@hotmail.fr` voit ses 12 livrables et 8 modules complétés — la RLS SELECT est correcte (`user_id = auth.uid()`). Une fois le `coach_id` assigné sur son entreprise, le coach pourra aussi voir ces données grâce aux policies existantes sur `deliverables` et `enterprise_modules`.

### Fichiers à modifier
- **Migration SQL** : ajouter UPDATE policy sur `enterprises` pour coaches + corriger `coach_uploads` policies
- **Données** : supprimer doublon + assigner `coach_id` sur l'originale
- **`src/components/dashboard/CoachDashboard.tsx`** : modifier `handleAddEntrepreneur` pour chercher par email avant de créer

### Résultat attendu
- Le coach voit "MORINGA GOLD TOGO" avec ses 12 livrables et 8 modules
- L'entrepreneur continue de voir son entreprise normalement
- Les futurs ajouts lient au lieu de dupliquer

