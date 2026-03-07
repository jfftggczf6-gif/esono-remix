

## Plan: Add ODD download bar + fix Excel stack overflow

Two changes needed:

### 1. Fix Excel stack overflow in `supabase/functions/generate-odd/index.ts` (lines 172-195)

Replace `btoa(String.fromCharCode(...xlsxBytes))` which crashes on large arrays. Instead, upload the binary to the `ovo-outputs` storage bucket and store the file URL in the deliverable record (same pattern as `plan_ovo_excel`).

```
- Upload xlsxBytes to storage: ovo-outputs/odd_{enterprise_id}_{timestamp}.xlsx
- Store file_url in deliverable instead of base64 in html_content
```

### 2. Add green download bar for ODD module in `EntrepreneurDashboard.tsx` (after line 928)

Add a bar identical to the Framework one (same style as the screenshot), but for the ODD module:
- Icon: Target (already imported)
- Title: "Évaluation ODD (Excel)"
- Subtitle: "Template ODD rempli avec les évaluations de votre entreprise"
- Primary button: "ODD Excel (.xlsx)" → downloads from storage URL (same as OVO pattern)
- Secondary button: "Rapport HTML" → `handleDownload('odd_analysis', 'html')`
- Color scheme: emerald (matching the screenshot style)

Also add `'xlsx'` to the ODD entry in `DELIVERABLE_CONFIG` (line 42) and update the Livrables page (line 138) to include `odd_analysis` in the XLSX button condition.

### Files modified
- `supabase/functions/generate-odd/index.ts` — storage upload instead of btoa
- `src/components/dashboard/EntrepreneurDashboard.tsx` — green download bar for ODD + DELIVERABLE_CONFIG update
- `src/pages/Livrables.tsx` — add `odd_analysis` to XLSX visibility list

