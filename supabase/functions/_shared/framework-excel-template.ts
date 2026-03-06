import JSZip from "https://esm.sh/jszip@3.10.1";

// ===== XML HELPERS =====

function escapeXml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function setCellInXml(
  sheetXml: string,
  cellRef: string,
  value: string | number | null | undefined
): string {
  if (value === null || value === undefined || value === '') return sheetXml;

  const safeVal = String(value);
  const row = cellRef.match(/\d+/)?.[0] ?? '1';

  const isNum =
    typeof value === 'number' ||
    (typeof value === 'string' &&
      !isNaN(Number(value)) &&
      value.trim() !== '' &&
      !value.includes('%') &&
      !value.includes('/') &&
      !value.includes(' ') &&
      !value.includes('→'));

  const newCell = isNum
    ? `<c r="${cellRef}"><v>${value}</v></c>`
    : `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(safeVal)}</t></is></c>`;

  // 1. Replace existing cell
  const existingCellRegex = new RegExp(
    `<c\\s+r="${cellRef}"(?:\\s[^>]*?)?>(?:(?!</c>).)*</c>`,
    's'
  );
  if (existingCellRegex.test(sheetXml)) {
    return sheetXml.replace(existingCellRegex, newCell);
  }

  // 2. Insert into existing row
  const rowRegex = new RegExp(`(<row[^>]*\\br="${row}"[^>]*>)(.*?)(</row>)`, 's');
  if (rowRegex.test(sheetXml)) {
    return sheetXml.replace(rowRegex, (_, open, content, close) => {
      return `${open}${content}${newCell}${close}`;
    });
  }

  // 3. Create row
  return sheetXml.replace('</sheetData>', `<row r="${row}">${newCell}</row></sheetData>`);
}

/**
 * Find the XML row number containing a text label (searches inline strings).
 */
function findRowByLabel(sheetXml: string, label: string): number | null {
  const labelLower = label.toLowerCase().trim();
  const rowRegex = /<row[^>]*\br="(\d+)"[^>]*>.*?<\/row>/gs;
  let match;
  while ((match = rowRegex.exec(sheetXml)) !== null) {
    const rowNum = parseInt(match[1]);
    const rowContent = match[0];
    const textMatches = rowContent.matchAll(/<t[^>]*>([^<]*)<\/t>/g);
    for (const tm of textMatches) {
      if (tm[1].toLowerCase().trim().includes(labelLower)) {
        return rowNum;
      }
    }
  }
  return null;
}

/** Interpolate missing year values in projection data */
function interpolateYears(ligne: any): any {
  if (!ligne) return ligne;
  const yrs = ['an1', 'an2', 'an3', 'an4', 'an5'];
  const result = { ...ligne };
  for (let i = 0; i < yrs.length; i++) {
    if (result[yrs[i]] == null || result[yrs[i]] === '') {
      const prev = i > 0 ? Number(result[yrs[i - 1]]) : NaN;
      const next = i < 4 ? Number(result[yrs[i + 1]]) : NaN;
      if (!isNaN(prev) && !isNaN(next)) {
        result[yrs[i]] = Math.round((prev + next) / 2);
      } else if (!isNaN(prev) && i > 1) {
        const prevPrev = Number(result[yrs[i - 2]]);
        if (!isNaN(prevPrev)) result[yrs[i]] = Math.round(prev + (prev - prevPrev));
      }
    }
  }
  return result;
}

// ===== MAIN EXPORT =====

export async function fillFrameworkExcelTemplate(
  data: any,
  enterpriseName: string,
  supabase: any
): Promise<Uint8Array> {

  const { data: fileData, error } = await supabase.storage
    .from('templates')
    .download('Framework_Analyse_PME_Cote_Ivoire.xlsx');

  if (error || !fileData) {
    throw new Error(`Template Excel introuvable dans Storage: ${error?.message ?? 'fichier absent'}`);
  }

  const buffer = await fileData.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  // ── Data shortcuts ──
  const activites    = data.analyse_marge?.activites ?? [];
  const lignesProj   = data.projection_5ans?.lignes ?? [];
  const tableau      = data.scenarios?.tableau ?? [];
  const planAction   = data.plan_action ?? [];
  const sensib       = data.scenarios?.sensibilite ?? [];
  const bfr          = data.tresorerie_bfr ?? {};
  const comps        = bfr.composantes ?? [];
  const sante        = data.sante_financiere ?? {};
  const ratios       = data.ratios ?? {};
  const ratiosHist   = data.ratios_historiques ?? [];
  const cols         = ['B', 'C', 'D', 'E', 'F'];
  const years: string[] = ['an1', 'an2', 'an3', 'an4', 'an5'];

  const getProjLigne = (poste: string) =>
    lignesProj.find((l: any) => l.poste === poste);
  const getScenario = (ind: string) =>
    tableau.find((r: any) => r.indicateur?.toLowerCase().includes(ind.toLowerCase()));
  const getHistRatio = (name: string) =>
    ratiosHist.find((r: any) => r.ratio?.toLowerCase().includes(name.toLowerCase()));

  // ────────────────────────────────────────────────
  // SHEET 1: Données Historiques
  // ────────────────────────────────────────────────
  let s1 = await zip.file('xl/worksheets/sheet1.xml')?.async('string') ?? '';

  s1 = setCellInXml(s1, 'B5', enterpriseName);
  s1 = setCellInXml(s1, 'B6', data.sector || '');
  s1 = setCellInXml(s1, 'B7', new Date().toLocaleDateString('fr-FR'));
  s1 = setCellInXml(s1, 'B8', 'ESONO Platform');

  // CA Total + historical
  const histCA = getHistRatio('chiffre') || getHistRatio('ca total') || getHistRatio('ca');
  if (histCA?.n_moins_2) s1 = setCellInXml(s1, 'B12', histCA.n_moins_2);
  if (histCA?.n_moins_1) s1 = setCellInXml(s1, 'C12', histCA.n_moins_1);
  if (data.kpis?.ca_annee_n) s1 = setCellInXml(s1, 'D12', data.kpis.ca_annee_n);

  // Activities CA (rows 13-15)
  activites.slice(0, 3).forEach((act: any, i: number) => {
    const row = 13 + i;
    if (act.nom) s1 = setCellInXml(s1, `A${row}`, `CA ${act.nom}`);
    if (act.ca)  s1 = setCellInXml(s1, `D${row}`, act.ca);
  });

  // Marge Brute
  const margeBruteTotal = activites.reduce((s: number, a: any) => s + (Number(a.marge_brute) || 0), 0);
  if (margeBruteTotal > 0) s1 = setCellInXml(s1, 'D25', margeBruteTotal);
  if (ratios.rentabilite?.marge_brute?.valeur) s1 = setCellInXml(s1, 'D26', ratios.rentabilite.marge_brute.valeur);
  const histMB = getHistRatio('marge brute');
  if (histMB?.n_moins_2) s1 = setCellInXml(s1, 'B26', histMB.n_moins_2);
  if (histMB?.n_moins_1) s1 = setCellInXml(s1, 'C26', histMB.n_moins_1);

  // EBITDA + historical
  if (data.kpis?.ebitda)       s1 = setCellInXml(s1, 'D38', data.kpis.ebitda);
  if (data.kpis?.marge_ebitda) s1 = setCellInXml(s1, 'D39', data.kpis.marge_ebitda);
  const histEBITDA = getHistRatio('ebitda');
  if (histEBITDA?.n_moins_2) s1 = setCellInXml(s1, 'B38', histEBITDA.n_moins_2);
  if (histEBITDA?.n_moins_1) s1 = setCellInXml(s1, 'C38', histEBITDA.n_moins_1);

  // Résultat net + historical
  const resNetLigne = getProjLigne('Résultat Net');
  if (resNetLigne?.an1) s1 = setCellInXml(s1, 'D40', resNetLigne.an1);
  if (ratios.rentabilite?.marge_nette?.valeur) s1 = setCellInXml(s1, 'D41', ratios.rentabilite.marge_nette.valeur);
  const histRN = getHistRatio('résultat net') || getHistRatio('resultat net');
  if (histRN?.n_moins_2) s1 = setCellInXml(s1, 'B40', histRN.n_moins_2);
  if (histRN?.n_moins_1) s1 = setCellInXml(s1, 'C40', histRN.n_moins_1);

  // Trésorerie + historical
  if (bfr.tresorerie_nette) s1 = setCellInXml(s1, 'D45', bfr.tresorerie_nette);
  const histTreso = getHistRatio('trésorerie') || getHistRatio('tresorerie');
  if (histTreso?.n_moins_2) s1 = setCellInXml(s1, 'B45', histTreso.n_moins_2);
  if (histTreso?.n_moins_1) s1 = setCellInXml(s1, 'C45', histTreso.n_moins_1);

  zip.file('xl/worksheets/sheet1.xml', s1);

  // ────────────────────────────────────────────────
  // SHEET 2: Analyse des Marges par Activité
  // ────────────────────────────────────────────────
  let s2 = await zip.file('xl/worksheets/sheet2.xml')?.async('string') ?? '';

  activites.slice(0, 4).forEach((act: any, i: number) => {
    const row = 6 + i;
    if (act.nom) s2 = setCellInXml(s2, `A${row}`, act.nom);
    if (act.ca)  s2 = setCellInXml(s2, `B${row}`, act.ca);
    const coutsDir = (Number(act.ca) || 0) - (Number(act.marge_brute) || 0);
    if (coutsDir > 0) s2 = setCellInXml(s2, `C${row}`, coutsDir);
    if (act.marge_brute)    s2 = setCellInXml(s2, `D${row}`, act.marge_brute);
    if (act.marge_pct)      s2 = setCellInXml(s2, `E${row}`, act.marge_pct);
    if (act.classification) s2 = setCellInXml(s2, `F${row}`, act.classification);
  });

  // Total row (row 10)
  const totalCA = activites.reduce((s: number, a: any) => s + (Number(a.ca) || 0), 0);
  const totalMB = activites.reduce((s: number, a: any) => s + (Number(a.marge_brute) || 0), 0);
  if (totalCA > 0) {
    s2 = setCellInXml(s2, 'B10', totalCA);
    s2 = setCellInXml(s2, 'C10', totalCA - totalMB);
    s2 = setCellInXml(s2, 'D10', totalMB);
    s2 = setCellInXml(s2, 'E10', ((totalMB / totalCA) * 100).toFixed(1) + '%');
  }

  // Recommendations
  const renforcer    = activites.filter((a: any) => a.classification === 'RENFORCER').map((a: any) => a.nom).join(', ');
  const optimiser    = activites.filter((a: any) => ['ARBITRER', 'OPTIMISER'].includes(a.classification)).map((a: any) => a.nom).join(', ');
  const restructurer = activites.filter((a: any) => ['RESTRUCTURER', 'ARRÊTER'].includes(a.classification)).map((a: any) => a.nom).join(', ');
  if (renforcer)    s2 = setCellInXml(s2, 'B20', renforcer);
  if (optimiser)    s2 = setCellInXml(s2, 'B21', optimiser);
  if (data.analyse_marge?.message_cle) s2 = setCellInXml(s2, 'B22', data.analyse_marge.message_cle);
  if (restructurer) s2 = setCellInXml(s2, 'B23', restructurer);
  if (data.analyse_marge?.verdict) s2 = setCellInXml(s2, 'A25', data.analyse_marge.verdict);

  zip.file('xl/worksheets/sheet2.xml', s2);

  // ────────────────────────────────────────────────
  // SHEET 3: Structure de Coûts & Efficacité
  // ────────────────────────────────────────────────
  let s3 = await zip.file('xl/worksheets/sheet3.xml')?.async('string') ?? '';

  // Ratios clés (rows 6-10, col D = Année N)
  if (data.indicateurs_cles?.charges_fixes_ca)  s3 = setCellInXml(s3, 'D6',  data.indicateurs_cles.charges_fixes_ca);
  if (data.indicateurs_cles?.masse_salariale_ca) s3 = setCellInXml(s3, 'D7', data.indicateurs_cles.masse_salariale_ca);
  if (ratios.rentabilite?.marge_brute?.valeur)  s3 = setCellInXml(s3, 'D8',  ratios.rentabilite.marge_brute.valeur);
  if (data.kpis?.marge_ebitda)                  s3 = setCellInXml(s3, 'D9',  data.kpis.marge_ebitda);
  if (ratios.rentabilite?.marge_nette?.valeur)  s3 = setCellInXml(s3, 'D10', ratios.rentabilite.marge_nette.valeur);

  // Historical ratios (cols B, C)
  const histCharges = getHistRatio('charges fixes');
  if (histCharges?.n_moins_2) s3 = setCellInXml(s3, 'B6', histCharges.n_moins_2);
  if (histCharges?.n_moins_1) s3 = setCellInXml(s3, 'C6', histCharges.n_moins_1);
  const histMasseS = getHistRatio('masse salariale');
  if (histMasseS?.n_moins_2) s3 = setCellInXml(s3, 'B7', histMasseS.n_moins_2);
  if (histMasseS?.n_moins_1) s3 = setCellInXml(s3, 'C7', histMasseS.n_moins_1);

  // Diagnostic section (rows 25-27)
  const forcesStr    = (sante.forces ?? data.points_forts ?? []).slice(0, 3).join(' | ');
  const faiblStr     = (sante.faiblesses ?? data.points_faibles ?? []).slice(0, 3).join(' | ');
  const actionsCourt = planAction.filter((a: any) => a.horizon === 'COURT').map((a: any) => a.action).slice(0, 2).join(' | ');
  if (forcesStr)    s3 = setCellInXml(s3, 'B25', forcesStr);
  if (faiblStr)     s3 = setCellInXml(s3, 'B26', faiblStr);
  if (actionsCourt) s3 = setCellInXml(s3, 'B27', actionsCourt);
  if (data.verdict_indicateurs) s3 = setCellInXml(s3, 'A29', data.verdict_indicateurs);

  zip.file('xl/worksheets/sheet3.xml', s3);

  // ────────────────────────────────────────────────
  // SHEET 4: Trésorerie & BFR
  // ────────────────────────────────────────────────
  let s4 = await zip.file('xl/worksheets/sheet4.xml')?.async('string') ?? '';

  if (bfr.tresorerie_nette)      s4 = setCellInXml(s4, 'D6', bfr.tresorerie_nette);
  if (bfr.cashflow_operationnel) s4 = setCellInXml(s4, 'D7', bfr.cashflow_operationnel);
  if (bfr.caf)                   s4 = setCellInXml(s4, 'D8', bfr.caf);
  if (bfr.dscr)                  s4 = setCellInXml(s4, 'D9', bfr.dscr);

  // BFR composantes (rows 14-18)
  const dso    = comps.find((c: any) => /client|dso/i.test(c.indicateur));
  const dpo    = comps.find((c: any) => /fourn|dpo/i.test(c.indicateur));
  const stock  = comps.find((c: any) => /stock/i.test(c.indicateur));
  const bfrC   = comps.find((c: any) => /^bfr/i.test(c.indicateur));
  const bfrPct = comps.find((c: any) => /bfr.*%|bfr.*ca/i.test(c.indicateur));
  if (dso?.valeur)    s4 = setCellInXml(s4, 'D14', dso.valeur);
  if (dpo?.valeur)    s4 = setCellInXml(s4, 'D15', dpo.valeur);
  if (stock?.valeur)  s4 = setCellInXml(s4, 'D16', stock.valeur);
  if (bfrC?.valeur)   s4 = setCellInXml(s4, 'D17', bfrC.valeur);
  if (bfrPct?.valeur) s4 = setCellInXml(s4, 'D18', bfrPct.valeur);

  // Benchmarks
  if (dso?.benchmark)   s4 = setCellInXml(s4, 'F14', dso.benchmark);
  if (dpo?.benchmark)   s4 = setCellInXml(s4, 'F15', dpo.benchmark);
  if (stock?.benchmark) s4 = setCellInXml(s4, 'F16', stock.benchmark);

  // Structure endettement (rows 24-27)
  if (ratios.solvabilite?.endettement?.valeur)            s4 = setCellInXml(s4, 'D26', ratios.solvabilite.endettement.valeur);
  if (ratios.solvabilite?.autonomie_financiere?.valeur)   s4 = setCellInXml(s4, 'D25', ratios.solvabilite.autonomie_financiere.valeur);
  if (ratios.solvabilite?.capacite_remboursement?.valeur) s4 = setCellInXml(s4, 'D27', ratios.solvabilite.capacite_remboursement.valeur);

  // BFR verdict
  if (bfr.verdict) s4 = setCellInXml(s4, 'A30', bfr.verdict);

  zip.file('xl/worksheets/sheet4.xml', s4);

  // ────────────────────────────────────────────────
  // SHEET 5: Hypothèses de Projection
  // ────────────────────────────────────────────────
  let s5 = await zip.file('xl/worksheets/sheet5.xml')?.async('string') ?? '';

  const caRef   = Number(data.kpis?.ca_annee_n) || 1;
  const caLigne = interpolateYears(getProjLigne('CA Total'));
  if (caLigne) {
    const vals     = [caLigne.an1, caLigne.an2, caLigne.an3, caLigne.an4, caLigne.an5];
    const prevVals = [caRef, caLigne.an1, caLigne.an2, caLigne.an3, caLigne.an4];
    vals.forEach((v: any, i: number) => {
      const prev = Number(prevVals[i]);
      if (v && prev > 0) {
        const growth = (((Number(v) - prev) / prev) * 100).toFixed(1) + '%';
        s5 = setCellInXml(s5, `${cols[i]}6`, growth);
      }
    });
  }

  activites.slice(0, 3).forEach((act: any, i: number) => {
    if (act.nom) s5 = setCellInXml(s5, `A${7 + i}`, act.nom);
  });

  if (data.besoins_financiers?.capex_total) s5 = setCellInXml(s5, 'B32', data.besoins_financiers.capex_total);
  if (data.besoins_financiers?.timing)      s5 = setCellInXml(s5, 'G32', data.besoins_financiers.timing);

  zip.file('xl/worksheets/sheet5.xml', s5);

  // ────────────────────────────────────────────────
  // SHEET 6: Projection Financière 5 Ans
  // ────────────────────────────────────────────────
  let s6 = await zip.file('xl/worksheets/sheet6.xml')?.async('string') ?? '';

  const projRowMap: Record<number, string> = {
    6:  'CA Total',
    12: 'Marge Brute',
    13: 'Marge Brute (%)',
    20: 'EBITDA',
    21: 'Marge EBITDA (%)',
    23: 'Résultat Net',
    24: 'Marge nette (%)',
    32: 'Cash-Flow Net',
    33: 'Trésorerie Cumulée',
  };

  for (const [rowNum, poste] of Object.entries(projRowMap)) {
    let ligne = getProjLigne(poste);
    if (!ligne) continue;
    ligne = interpolateYears(ligne);
    years.forEach((yr, i) => {
      const val = ligne[yr];
      if (val != null && val !== '') s6 = setCellInXml(s6, `${cols[i]}${rowNum}`, val);
    });
    if (poste === 'CA Total' && ligne.cagr) s6 = setCellInXml(s6, 'G6', ligne.cagr);
  }

  if (data.seuil_rentabilite?.ca_point_mort) s6 = setCellInXml(s6, 'B39', data.seuil_rentabilite.ca_point_mort);
  if (data.seuil_rentabilite?.atteint_en)    s6 = setCellInXml(s6, 'B40', data.seuil_rentabilite.atteint_en);
  if (data.seuil_rentabilite?.verdict)       s6 = setCellInXml(s6, 'B41', data.seuil_rentabilite.verdict);
  if (data.projection_5ans?.verdict)         s6 = setCellInXml(s6, 'A43', data.projection_5ans.verdict);

  zip.file('xl/worksheets/sheet6.xml', s6);

  // ────────────────────────────────────────────────
  // SHEET 7: Analyse par Scénarios
  // ────────────────────────────────────────────────
  let s7 = await zip.file('xl/worksheets/sheet7.xml')?.async('string') ?? '';

  // Hypothèses par scénario (rows 7-10)
  const hypoRows: [number, string][] = [
    [7, 'Croissance CA'], [8, 'Marge brute'], [9, 'Charges fixes'], [10, 'Investissement'],
  ];
  for (const [rowNum, ind] of hypoRows) {
    const r = getScenario(ind);
    if (!r) continue;
    if (r.prudent)   s7 = setCellInXml(s7, `B${rowNum}`, r.prudent);
    if (r.central)   s7 = setCellInXml(s7, `C${rowNum}`, r.central);
    if (r.ambitieux) s7 = setCellInXml(s7, `D${rowNum}`, r.ambitieux);
  }

  // Résultats comparés (rows 13-18)
  const scenRows: [number, string][] = [
    [13, 'CA An 5'], [14, 'EBITDA'], [15, 'Marge EBITDA'],
    [16, 'Résultat Net'], [17, 'Trésorerie'], [18, 'ROI'],
  ];
  for (const [rowNum, ind] of scenRows) {
    const r = getScenario(ind);
    if (!r) continue;
    if (r.prudent)   s7 = setCellInXml(s7, `B${rowNum}`, r.prudent);
    if (r.central)   s7 = setCellInXml(s7, `C${rowNum}`, r.central);
    if (r.ambitieux) s7 = setCellInXml(s7, `D${rowNum}`, r.ambitieux);
    if (r.prudent && r.ambitieux) s7 = setCellInXml(s7, `E${rowNum}`, `${r.prudent} → ${r.ambitieux}`);
  }

  // Sensibilité (rows 23-25)
  if (sensib[0]) s7 = setCellInXml(s7, 'B23', sensib[0]);
  if (sensib[1]) s7 = setCellInXml(s7, 'B24', sensib[1]);
  if (sensib[2]) s7 = setCellInXml(s7, 'B25', sensib[2]);

  // Recommandation + synthèse (rows 29-30)
  if (data.scenarios?.recommandation_scenario) s7 = setCellInXml(s7, 'B29', data.scenarios.recommandation_scenario);
  if (data.synthese_expert) s7 = setCellInXml(s7, 'B30', data.synthese_expert.substring(0, 500));
  if (data.scenarios?.verdict) s7 = setCellInXml(s7, 'A32', data.scenarios.verdict);

  zip.file('xl/worksheets/sheet7.xml', s7);

  // ────────────────────────────────────────────────
  // SHEET 8: Synthèse Exécutive (dynamic row finding)
  // ────────────────────────────────────────────────
  let s8 = await zip.file('xl/worksheets/sheet8.xml')?.async('string') ?? '';

  // Try to find rows dynamically by label
  const rowChiffres      = findRowByLabel(s8, 'Ce que montrent les chiffres');
  const rowForces        = findRowByLabel(s8, 'Forces');
  const rowFaiblesses    = findRowByLabel(s8, 'Faiblesses');
  const rowFortPotentiel = findRowByLabel(s8, 'fort potentiel');
  const rowProbleme      = findRowByLabel(s8, 'probl');
  const rowMessageCle    = findRowByLabel(s8, 'Message cl');
  const rowDecisions     = findRowByLabel(s8, 'cisions recommand');
  const rowImpact        = findRowByLabel(s8, 'Impact attendu');
  const rowBesoins       = findRowByLabel(s8, 'Besoins financiers');
  const rowPhrase        = findRowByLabel(s8, 'Les chiffres ne servent');

  console.log(`[sheet8-debug] rowChiffres=${rowChiffres} rowForces=${rowForces} rowFaiblesses=${rowFaiblesses} rowFortPotentiel=${rowFortPotentiel} rowProbleme=${rowProbleme} rowDecisions=${rowDecisions} rowImpact=${rowImpact} rowBesoins=${rowBesoins} rowPhrase=${rowPhrase}`);

  // Build content strings
  const resumeChiffres = (sante.resume_chiffres ?? []).join(' | ');
  const forcesTexte = (sante.forces ?? data.points_forts ?? []).slice(0, 3).map((f: string, i: number) => `${i + 1}. ${f}`).join(' | ');
  const faiblTexte  = (sante.faiblesses ?? data.points_faibles ?? []).slice(0, 3).map((f: string, i: number) => `${i + 1}. ${f}`).join(' | ');
  const actFort = activites.filter((a: any) => a.classification === 'RENFORCER')
    .map((a: any) => `${a.nom} → marge ${a.marge_pct}`).join(', ');
  const actProb = activites.filter((a: any) => a.classification !== 'RENFORCER')
    .map((a: any) => `${a.nom} (${a.classification})`).join(', ');
  const planTexte = planAction.slice(0, 5).map((a: any, i: number) =>
    `${i + 1}. [${a.horizon}] ${a.action}${a.cout ? ` (${a.cout})` : ''}`
  ).join(' | ');
  const impactTexte = [
    data.impact_attendu?.ca_an5     ? `CA An5: ${data.impact_attendu.ca_an5}`     : '',
    data.impact_attendu?.ebitda_an5 ? `EBITDA: ${data.impact_attendu.ebitda_an5}` : '',
    data.impact_attendu?.marge_ebitda ? `Marge: ${data.impact_attendu.marge_ebitda}` : '',
  ].filter(Boolean).join(' | ');
  const besoinsTexte = [
    data.besoins_financiers?.capex_total ? `CAPEX: ${data.besoins_financiers.capex_total}` : '',
    data.besoins_financiers?.timing      ? `Timing: ${data.besoins_financiers.timing}`     : '',
  ].filter(Boolean).join(' | ');

  // Fill with dynamic rows (fallback to hardcoded positions)
  // SLIDE 1 — Santé financière
  const chifRow = rowChiffres ? rowChiffres + 1 : 8;
  if (resumeChiffres) s8 = setCellInXml(s8, `A${chifRow}`, resumeChiffres);

  const forRow = rowForces ? rowForces + 1 : 10;
  if (forcesTexte) s8 = setCellInXml(s8, `A${forRow}`, forcesTexte);

  const faibRow = rowFaiblesses ? rowFaiblesses + 1 : 14;
  if (faiblTexte) s8 = setCellInXml(s8, `A${faibRow}`, faiblTexte);

  // SLIDE 2 — Marge
  const fortRow = rowFortPotentiel ? rowFortPotentiel + 1 : 20;
  if (actFort) s8 = setCellInXml(s8, `A${fortRow}`, actFort);

  const probRow = rowProbleme ? rowProbleme + 1 : 23;
  if (actProb) s8 = setCellInXml(s8, `A${probRow}`, actProb);

  // Message clé
  if (data.analyse_marge?.message_cle) {
    const msgRow = rowMessageCle ? rowMessageCle : 25;
    s8 = setCellInXml(s8, `A${msgRow}`, `👉 Message clé : ${data.analyse_marge.message_cle}`);
  }

  // SLIDE 3 — Plan d'action
  const decRow = rowDecisions ? rowDecisions + 1 : 29;
  if (planTexte) s8 = setCellInXml(s8, `A${decRow}`, planTexte);

  const impRow = rowImpact ? rowImpact + 1 : 33;
  if (impactTexte) s8 = setCellInXml(s8, `A${impRow}`, impactTexte);

  const besRow = rowBesoins ? rowBesoins + 1 : 36;
  if (besoinsTexte) s8 = setCellInXml(s8, `A${besRow}`, besoinsTexte);

  // Synthèse expert
  if (data.synthese_expert) {
    const expertRow = rowPhrase ? rowPhrase - 1 : 39;
    s8 = setCellInXml(s8, `A${expertRow}`, data.synthese_expert.substring(0, 300));
  }

  zip.file('xl/worksheets/sheet8.xml', s8);

  // ── Generate final ZIP ──
  console.log(`[framework-excel] Filled template for "${enterpriseName}"`);
  return await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
