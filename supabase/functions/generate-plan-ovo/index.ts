import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, errorResponse, jsonResponse, verifyAndGetContext, callAI, saveDeliverable, buildRAGContext, getFiscalParamsForPrompt } from "../_shared/helpers.ts";
import { normalizePlanOvo, enforceFrameworkConstraints } from "../_shared/normalizers.ts";

// Use centralized fiscal params from helpers.ts

function buildSystemPrompt(country: string): string {
  const fp = getFiscalParamsForPrompt(country);
  return `Tu es un expert financier senior de niveau CFO/analyste institutionnel, certifié SYSCOHADA révisé (2017), spécialisé dans la modélisation financière des PME africaines (focus: ${fp.focus}). Tu ne fais AUCUNE erreur sur les calculs financiers.

═══════════════════════════════════════════════════════════
PARAMÈTRES FISCAUX — ${fp.focus}
═══════════════════════════════════════════════════════════
- Devise: XOF (FCFA) | Taux de change EUR: 655.957
- TVA: ${fp.tva}%
- Impôt sur les sociétés (IS): ${fp.is_standard}%${fp.seuil_pme !== 'N/A' ? ` (ou ${fp.is_pme}% si CA < ${fp.seuil_pme})` : ''}
- Charges sociales patronales: ${fp.charges_sociales}% du salaire brut
- Taux de croissance PME réaliste: 10-30%/an (justifier si > 30%)
- Taux d'actualisation par défaut: 12% (coût du capital UEMOA PME)

═══════════════════════════════════════════════════════════
RÈGLE #1 — CASCADE P&L OBLIGATOIRE (à respecter pour CHAQUE année)
═══════════════════════════════════════════════════════════
La cascade du compte de résultat est IMMUABLE et doit être appliquée dans cet ordre exact :

  CA (Revenue)
  - COGS (Coût des ventes = achats matières + charges variables directes)
  ═ MARGE BRUTE (Gross Profit) → toujours ≤ CA, toujours ≥ 0 si activité viable
  - OPEX total (charges fixes opérationnelles : salaires, loyer, marketing, etc.)
  ═ EBITDA → peut être négatif en phase de démarrage
  - Dotations aux amortissements (D&A)
  ═ EBIT (Résultat d'exploitation)
  - Charges financières nettes (intérêts sur emprunts)
  ═ EBT (Résultat avant impôts)
  - IS (${fp.is_standard}% si EBT > 0, sinon IS = 0 — pas d'impôt sur les pertes)
  ═ RÉSULTAT NET

CONTRAINTES ABSOLUES DE LA CASCADE :
  ✅ Marge Brute = CA - COGS (toujours)
  ✅ EBITDA = Marge Brute - OPEX total (toujours)
  ✅ Résultat Net ≤ EBITDA (TOUJOURS — les amortissements, intérêts et impôts ne s'annulent pas)
  ✅ Résultat Net ≤ EBIT (TOUJOURS)
  ✅ Marge Brute ≤ CA (TOUJOURS)
  ✅ Marge Brute % ∈ [0%, 100%] (TOUJOURS)
  ✅ Si EBITDA < 0 → IS = 0 et Résultat Net = EBIT - Charges financières (toujours plus négatif que EBITDA)
  ❌ INTERDIT : Résultat Net > EBITDA (sauf produit exceptionnel documenté ≥ différence)
  ❌ INTERDIT : EBITDA > Marge Brute
  ❌ INTERDIT : Marge Brute > CA

═══════════════════════════════════════════════════════════
RÈGLE #2 — FORMULES EXACTES DES MÉTRIQUES D'INVESTISSEMENT
═══════════════════════════════════════════════════════════

── VAN (NPV) ──
  VAN = Σ(CF_t / (1 + r)^t) - I₀   pour t = 1 à 5
  r = taux d'actualisation (0.12 par défaut)
  I₀ = investissement initial (funding_need)
  CF_t = cash-flow net de l'année t (year2 à year6)
  → VAN en FCFA, décimal sans arrondi excessif

── TRI (IRR) ──
  TRI = taux r* tel que Σ(CF_t / (1+r*)^t) - I₀ = 0
  Méthode : Newton-Raphson, seed initial = 0.10, 50 itérations max
  → TRI en décimal (ex: 0.18 pour 18%) — PAS en pourcentage dans le JSON
  → Si TRI ne converge pas ou est < -50% → mettre 0
  VALIDATION : si VAN > 0 alors TRI DOIT être > r (0.12). Sinon ERREUR, recalculer.

── CAGR REVENUE ──
  CAGR_rev = (Revenue_Year6 / Revenue_CurrentYear)^(1/5) - 1
  Exposant = 1/5 car 5 années de projection (year2 à year6)
  Revenue_CurrentYear = données Inputs réelles UNIQUEMENT
  → Décimal (ex: 0.114 pour 11.4%)
  ⚠️ Si Revenue_CurrentYear ≤ 0 → CAGR_rev = null

── CAGR EBITDA ──
  Si EBITDA_CurrentYear > 0 :
    CAGR_ebitda = (EBITDA_Year6 / EBITDA_CurrentYear)^(1/5) - 1
  Si EBITDA_CurrentYear ≤ 0 ET EBITDA_Year2 > 0 :
    CAGR_ebitda = (EBITDA_Year6 / EBITDA_Year2)^(1/4) - 1  [base year2, 4 ans]
  Si EBITDA_CurrentYear ≤ 0 ET EBITDA_Year2 ≤ 0 :
    CAGR_ebitda = null
  → Décimal (ex: 0.45 pour 45%) — jamais > 3.0 (300%) sauf exception documentée

── ROI ──
  ROI = Σ(Résultat_Net_t) / I₀   pour t = year2 à year6
  → Décimal (ex: 0.55 pour 55%)
  ⚠️ ROI et TRI peuvent diverger car ROI ignore la valeur temporelle de l'argent.
     Néanmoins si ROI > 50% et TRI < 0 → incohérence forte, revoir les CF vs net_profit.

── PAYBACK ──
  Payback = première année t où Σ(CF_1..t) ≥ I₀ (fractionnel)
  Formule fractionnelle : Payback = (i-1) + (I₀ - Σ_CF_précédents) / CF_i
  → En années (ex: 3.7)
  → Si non atteint sur 5 ans → payback_years = 5 (maximum affiché)
  → Si I₀ = 0 → payback_years = 0

── DSCR (Debt Service Coverage Ratio) ──
  DSCR = EBITDA_annuel / Service_dette_annuel
  Service_dette_annuel = Principal_annuel + Intérêts_annuels
  Principal_annuel (prêt i) = Montant_i / Durée_i
  Intérêts_annuels (prêt i) = Encours_moyen_i × Taux_i ≈ (Montant_i × (1 + 1/Durée_i)/2) × Taux_i
  EBITDA à utiliser = EBITDA_Year2 (première année de projection)
  ⚠️ Si EBITDA_Year2 ≤ 0 → DSCR = null (non calculable)
  ⚠️ Si aucun emprunt → DSCR = null
  Interprétation : > 1.5 = bon; 1.2-1.5 = acceptable; < 1.2 = risque; < 1 = insolvabilité

── MULTIPLE EBITDA ──
  Multiple = Valorisation / EBITDA_normalisé
  EBITDA_normalisé = EBITDA_Year4 ou Year5 (EBITDA stabilisé projeté)
  Valorisation = Multiple × EBITDA_normalisé
  Fourchettes sectorielles :
    - Restauration/Traiteur/Agroalimentaire : 4-6x
    - Commerce de détail : 3-5x
    - Services aux entreprises : 5-8x
    - Technologie/Digital : 8-15x
    - Industrie/Manufacture : 4-7x
  ⚠️ Si EBITDA_normalisé ≤ 0 → multiple_ebitda = null
  → Décimal (ex: 5.5 pour 5.5x)

── POINT MORT (Break-Even) ──
  CA_point_mort = Charges_fixes_totales / (1 - COGS_rate)
  COGS_rate = COGS / CA (taux de charges variables)
  Charges_fixes_totales = OPEX total (salaires + loyer + marketing + assurances + ...)
  Mois = (CA_point_mort / CA_annuel) × 12
  → break_even_year = "An X" (première année où EBITDA > 0)

═══════════════════════════════════════════════════════════
RÈGLE #3 — CASH-FLOW (ne pas confondre avec Résultat Net)
═══════════════════════════════════════════════════════════
  Cash-Flow = Résultat Net + Dotations - Variation BFR - CAPEX net
  Approximation simplifiée (si BFR stable) :
    Cash-Flow ≈ EBITDA × (1 - IS%) pour années bénéficiaires
    Cash-Flow ≈ EBITDA pour années déficitaires (IS = 0)
  → Cash-Flow peut être > Résultat Net (grâce aux dotations réintégrées)
  → Cash-Flow peut être < Résultat Net (si CAPEX importants)

═══════════════════════════════════════════════════════════
RÈGLE #4 — COHÉRENCE INTER-MÉTRIQUES (validation croisée)
═══════════════════════════════════════════════════════════
AVANT de finaliser le JSON, vérifier CHAQUE point :

  1. ✅ Pour chaque année t : Résultat_Net_t ≤ EBITDA_t
  2. ✅ Pour chaque année t : EBITDA_t ≤ Marge_Brute_t
  3. ✅ Pour chaque année t : Marge_Brute_t = Revenue_t - COGS_t (exactement)
  4. ✅ Pour chaque année t : EBITDA_t = Marge_Brute_t - OPEX_total_t (exactement)
  5. ✅ Si VAN > 0 → TRI > 0.12 (sinon recalculer)
  6. ✅ Si VAN < 0 → TRI < 0.12
  7. ✅ DSCR = null si EBITDA_Year2 ≤ 0
  8. ✅ Multiple_EBITDA = null si EBITDA_normalisé ≤ 0
  9. ✅ CAGR_ebitda = null si base EBITDA ≤ 0 (voir formule ci-dessus)
  10. ✅ Payback > 0 si funding_need > 0
  11. ✅ Trésorerie_Cumulée(t) = Trésorerie(t-1) + CF(t)
  12. ✅ Scénario pessimiste < central < optimiste pour tous les KPIs positifs

═══════════════════════════════════════════════════════════
RÈGLE #5 — RÉALISME DES PROJECTIONS (PME africaine)
═══════════════════════════════════════════════════════════
- Croissance CA : 10-25%/an est réaliste. > 30%/an = justifier impérativement.
- Marge Brute % doit être cohérente avec le secteur :
    Restauration/Traiteur : 35-55%
    Commerce alimentaire : 15-35%
    Services : 50-75%
    Industrie : 30-50%
- Marge EBITDA mature (après an2) : 8-25% selon secteur
- Taux d'imposition effectif : IS s'applique UNIQUEMENT sur EBT > 0
- Ne jamais inventer des CA > 2× les données historiques pour year2

CONTRAINTE GÉOGRAPHIQUE ABSOLUE:
- Tous les CAPEX, investissements, locaux CONCERNENT UNIQUEMENT ${fp.focus}
- Hypothèses de marché basées sur le contexte économique de ${fp.focus}

IMPORTANT: Réponds UNIQUEMENT en JSON valide. Pas de markdown, pas de backticks, pas de texte avant ou après.`;
}

function buildUserPrompt(name: string, sector: string, country: string, docs: string, allData: any, baseYear?: number): string {
  // C6: Use base_year frozen at enterprise creation
  const cy = baseYear || new Date().getFullYear();
  const ym2 = cy - 2;
  const ym1 = cy - 1;

  // Extract framework projections as constraints
  let frameworkConstraints = "";
  const fw = allData.framework;
  if (fw?.projection_5ans?.lignes && Array.isArray(fw.projection_5ans.lignes)) {
    const lines = fw.projection_5ans.lignes;
    const label = (l: any) => (l.poste || l.libelle || '').toLowerCase();
    const caLine = lines.find((l: any) => { const lb = label(l); return lb.includes("ca total") || lb.includes("chiffre") || lb.includes("revenue"); });
    const ebitdaLine = lines.find((l: any) => label(l).includes("ebitda"));
    const rnLine = lines.find((l: any) => { const lb = label(l); return lb.includes("résultat net") || lb.includes("resultat net"); });
    const mbLine = lines.find((l: any) => { const lb = label(l); return lb.includes("marge brute") || lb.includes("gross"); });
    const cfLine = lines.find((l: any) => { const lb = label(l); return lb.includes("cash") || lb.includes("trésorerie"); });

    const found = [caLine, ebitdaLine, rnLine, mbLine, cfLine].filter(Boolean);
    if (found.length > 0) {
      frameworkConstraints = `\nCONTRAINTES OBLIGATOIRES DU PLAN FINANCIER INTERMÉDIAIRE (respecter ces valeurs exactes pour les projections):`;
      const fmtLine = (name: string, line: any) => {
        return `\n- ${name}: year2(${cy+1})=${line.an1 ?? '?'}, year3(${cy+2})=${line.an2 ?? '?'}, year4(${cy+3})=${line.an3 ?? '?'}, year5(${cy+4})=${line.an4 ?? '?'}, year6(${cy+5})=${line.an5 ?? '?'}`;
      };
      if (caLine) frameworkConstraints += fmtLine("Revenue (CA)", caLine);
      if (mbLine) frameworkConstraints += fmtLine("Marge Brute", mbLine);
      if (ebitdaLine) frameworkConstraints += fmtLine("EBITDA", ebitdaLine);
      if (rnLine) frameworkConstraints += fmtLine("Résultat Net", rnLine);
      if (cfLine) frameworkConstraints += fmtLine("Cash-Flow", cfLine);
    }
  }

  // Extract historical CA from inputs
  let inputsConstraints = "";
  const inputs = allData.inputs;
  if (inputs?.compte_resultat) {
    const cr = inputs.compte_resultat;
    if (cr.chiffre_affaires) {
      inputsConstraints = `\nDONNÉES HISTORIQUES (compte de résultat année en cours):
- CA: ${cr.chiffre_affaires} FCFA
- Charges personnel: ${cr.charges_personnel || '?'} FCFA
- Résultat net: ${cr.resultat_net || '?'} FCFA`;
    }
  }

  // Extract existing plan_ovo data as alignment constraints
  let planOvoConstraints = "";
  const existingPlanOvo = allData.plan_ovo;
  if (existingPlanOvo?.revenue) {
    planOvoConstraints = `\nDONNÉES DU PLAN OVO JSON EXISTANT (à respecter pour cohérence):
- Revenue: ${JSON.stringify(existingPlanOvo.revenue)}
- COGS: ${JSON.stringify(existingPlanOvo.cogs)}
- EBITDA: ${JSON.stringify(existingPlanOvo.ebitda)}
- Net Profit: ${JSON.stringify(existingPlanOvo.net_profit)}`;
  }

  const fp = getFiscalParamsForPrompt(country);

  return `
Crée le plan financier OVO complet pour "${name}" (Secteur: ${sector}, Pays: ${fp.focus}).

RAPPEL GÉOGRAPHIQUE: Tous les investissements, CAPEX, locaux et hypothèses doivent concerner UNIQUEMENT ${fp.focus}. Ne mentionne AUCUN autre pays.

DONNÉES ENTREPRISE:
${JSON.stringify(allData, null, 2)}
${docs ? `\nDOCUMENTS:\n${docs}` : ""}
${frameworkConstraints}
${inputsConstraints}
${planOvoConstraints}

ANNÉES À UTILISER:
- year_minus_2 = ${ym2}
- year_minus_1 = ${ym1}
- current_year = ${cy}
- year2 = ${cy + 1}
- year3 = ${cy + 2}
- year4 = ${cy + 3}
- year5 = ${cy + 4}
- year6 = ${cy + 5}

Génère le JSON suivant avec des valeurs réalistes basées sur les données:
{
  "score": <0-100>,
  "company": "${name}",
  "country": "${fp.focus}",
  "currency": "XOF",
  "exchange_rate_eur": 655.957,
  "base_year": ${cy},
  "years": {
    "year_minus_2": ${ym2},
    "year_minus_1": ${ym1},
    "current_year": ${cy},
    "year2": ${cy + 1},
    "year3": ${cy + 2},
    "year4": ${cy + 3},
    "year5": ${cy + 4},
    "year6": ${cy + 5}
  },
  "products": [{"name": "string", "filter": 1, "range": "Entry level", "channel": "B2B"}],
  "services": [{"name": "string", "filter": 1, "range": "Entry level", "channel": "B2B"}],
  "revenue": {"year_minus_2": 0, "year_minus_1": 0, "current_year": 0, "year2": 0, "year3": 0, "year4": 0, "year5": 0, "year6": 0},
  "cogs": {"year_minus_2": 0, "year_minus_1": 0, "current_year": 0, "year2": 0, "year3": 0, "year4": 0, "year5": 0, "year6": 0},
  "gross_profit": {"year_minus_2": 0, "year_minus_1": 0, "current_year": 0, "year2": 0, "year3": 0, "year4": 0, "year5": 0, "year6": 0},
  "gross_margin_pct": {"year_minus_2": 0, "year_minus_1": 0, "current_year": 0, "year2": 0, "year3": 0, "year4": 0, "year5": 0, "year6": 0},
  "staff": [{"category": "STAFF_CAT01", "label": "string", "department": "string", "social_security_rate": ${fp.charges_sociales / 100}}],
  "opex": {
    "staff_salaries": {"year_minus_2": 0, "year_minus_1": 0, "current_year": 0, "year2": 0, "year3": 0, "year4": 0, "year5": 0, "year6": 0},
    "marketing": {"year_minus_2": 0, "year_minus_1": 0, "current_year": 0, "year2": 0, "year3": 0, "year4": 0, "year5": 0, "year6": 0},
    "office_costs": {"year_minus_2": 0, "year_minus_1": 0, "current_year": 0, "year2": 0, "year3": 0, "year4": 0, "year5": 0, "year6": 0},
    "travel": {"year_minus_2": 0, "year_minus_1": 0, "current_year": 0, "year2": 0, "year3": 0, "year4": 0, "year5": 0, "year6": 0},
    "insurance": {"year_minus_2": 0, "year_minus_1": 0, "current_year": 0, "year2": 0, "year3": 0, "year4": 0, "year5": 0, "year6": 0},
    "maintenance": {"year_minus_2": 0, "year_minus_1": 0, "current_year": 0, "year2": 0, "year3": 0, "year4": 0, "year5": 0, "year6": 0},
    "third_parties": {"year_minus_2": 0, "year_minus_1": 0, "current_year": 0, "year2": 0, "year3": 0, "year4": 0, "year5": 0, "year6": 0},
    "other": {"year_minus_2": 0, "year_minus_1": 0, "current_year": 0, "year2": 0, "year3": 0, "year4": 0, "year5": 0, "year6": 0}
  },
  "ebitda": {"year_minus_2": 0, "year_minus_1": 0, "current_year": 0, "year2": 0, "year3": 0, "year4": 0, "year5": 0, "year6": 0},
  "ebitda_margin_pct": {"year_minus_2": 0, "year_minus_1": 0, "current_year": 0, "year2": 0, "year3": 0, "year4": 0, "year5": 0, "year6": 0},
  "net_profit": {"year_minus_2": 0, "year_minus_1": 0, "current_year": 0, "year2": 0, "year3": 0, "year4": 0, "year5": 0, "year6": 0},
  "cashflow": {"year_minus_2": 0, "year_minus_1": 0, "current_year": 0, "year2": 0, "year3": 0, "year4": 0, "year5": 0, "year6": 0},
  "capex": [{"label": "string", "acquisition_year": ${cy}, "acquisition_value": 0, "amortisation_rate_pct": 0.2}],
  "loans": {
    "ovo": {"amount": 0, "rate": 0.07, "term_years": 5},
    "family": {"amount": 0, "rate": 0.10, "term_years": 3},
    "bank": {"amount": 0, "rate": 0.20, "term_years": 2}
  },
  "funding_need": 0,
  "break_even_year": "string",
  "investment_metrics": {
    "van": 0, "tri": 0, "cagr_revenue": 0, "cagr_ebitda": 0,
    "roi": 0, "payback_years": 0, "dscr": 0, "multiple_ebitda": 0,
    "discount_rate": 0.12, "cost_of_capital": 0.12
  },
  "key_assumptions": ["string"],
  "scenarios": {
    "optimiste": {"hypotheses": "description", "taux_croissance_ca": "xx%/an", "revenue_year5": 0, "ebitda_year5": 0, "net_profit_year5": 0, "van": 0, "tri": 0},
    "realiste": {"hypotheses": "description", "taux_croissance_ca": "xx%/an", "revenue_year5": 0, "ebitda_year5": 0, "net_profit_year5": 0, "van": 0, "tri": 0},
    "pessimiste": {"hypotheses": "description", "taux_croissance_ca": "xx%/an", "revenue_year5": 0, "ebitda_year5": 0, "net_profit_year5": 0, "van": 0, "tri": 0}
  },
  "recommandations": ["string"]
}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const ctx = await verifyAndGetContext(req);
    const ent = ctx.enterprise;
    const country = ent.country || "Côte d'Ivoire";
    const allData = {
      inputs: ctx.deliverableMap["inputs_data"] || {},
      framework: ctx.deliverableMap["framework_data"] || {},
      bmc: ctx.deliverableMap["bmc_analysis"] || {},
      plan_ovo: ctx.deliverableMap["plan_ovo"] || {},
    };

    // RAG: enrichir avec benchmarks et fiscal
    const ragContext = await buildRAGContext(ctx.supabase, country, ent.sector || "", ["benchmarks", "fiscal", "bailleurs"]);

    const rawData = await callAI(buildSystemPrompt(country), buildUserPrompt(
      ent.name, ent.sector || "", country, ctx.documentContent, allData, ctx.baseYear
    ) + ragContext);
    
    // Normalize: fix years, ensure consistency, fill gaps
    let data = normalizePlanOvo(rawData);
    
    // Enforce Framework constraints: overwrite projections with exact Framework values
    const frameworkData = allData.framework;
    data = enforceFrameworkConstraints(data, frameworkData, allData.inputs, country);

    await saveDeliverable(ctx.supabase, ctx.enterprise_id, "plan_ovo", data, "plan_ovo");

    return jsonResponse({ success: true, data, score: data.score });
  } catch (e: any) {
    console.error("generate-plan-ovo error:", e);
    return errorResponse(e.message || "Erreur inconnue", e.status || 500);
  }
});
