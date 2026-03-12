

## Plan : Vider les livrables de PRESTIGE TRAITEUR ABIDJAN SARL

Enterprise ID : `38667b5a-bde4-4e86-bbe0-43692b04eb56`

11 livrables à supprimer : bmc_analysis, bmc_html, business_plan, sic_analysis, odd_analysis, odd_excel, diagnostic_data, plan_ovo_excel, framework_data, plan_ovo, inputs_data.

### Actions

1. **Supprimer tous les deliverables** via une migration SQL :
   ```sql
   DELETE FROM deliverables WHERE enterprise_id = '38667b5a-bde4-4e86-bbe0-43692b04eb56';
   ```

2. **Remettre le score IR à 0** :
   ```sql
   UPDATE enterprises SET score_ir = 0 WHERE id = '38667b5a-bde4-4e86-bbe0-43692b04eb56';
   ```

3. **Réinitialiser les modules** (remettre status/progress à zéro) :
   ```sql
   UPDATE enterprise_modules SET status = 'not_started', progress = 0, data = '{}'
   WHERE enterprise_id = '38667b5a-bde4-4e86-bbe0-43692b04eb56';
   ```

Aucun fichier code ne sera modifié — opération purement base de données.

