import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle2, XCircle, Info, FileSearch, Heart, Shield, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ScreeningReportViewerProps {
  data: Record<string, any>;
}

export default function ScreeningReportViewer({ data }: ScreeningReportViewerProps) {
  const score = data.screening_score ?? 0;
  const verdict = data.verdict || 'INSUFFISANT';
  const summary = data.verdict_summary || '';
  const anomalies = data.anomalies || [];
  const crossValidation = data.cross_validation || {};
  const docQuality = data.document_quality || {};
  const financialHealth = data.financial_health || {};
  const programmeMatch = data.programme_match || null;

  const verdictConfig: Record<string, { color: string; bg: string; border: string }> = {
    ELIGIBLE: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    CONDITIONNEL: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    NON_ELIGIBLE: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
    INSUFFISANT: { color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' },
  };
  const vc = verdictConfig[verdict] || verdictConfig.INSUFFISANT;

  const scoreColor = score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-red-600';

  const bloquants = anomalies.filter((a: any) => a.severity === 'bloquant');
  const attentions = anomalies.filter((a: any) => a.severity === 'attention');
  const notes = anomalies.filter((a: any) => a.severity === 'note');

  const severityIcon = (s: string) => {
    if (s === 'bloquant') return <XCircle className="h-4 w-4 text-red-500 flex-none" />;
    if (s === 'attention') return <AlertTriangle className="h-4 w-4 text-amber-500 flex-none" />;
    return <Info className="h-4 w-4 text-muted-foreground flex-none" />;
  };

  const severityBg = (s: string) => {
    if (s === 'bloquant') return 'bg-red-50 border-red-200';
    if (s === 'attention') return 'bg-amber-50 border-amber-200';
    return 'bg-muted/50 border-border';
  };

  const handleCopySummary = () => {
    const text = `Screening ${data.verdict} (${score}/100)\n${summary}\n\nAnomalies: ${bloquants.length} bloquantes, ${attentions.length} attentions, ${notes.length} notes`;
    navigator.clipboard.writeText(text);
    toast.success('Résumé copié !');
  };

  const cvCheck = (label: string, ok: boolean | null | undefined) => (
    <div className="flex items-center gap-2 py-1.5">
      {ok === true ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
       ok === false ? <XCircle className="h-4 w-4 text-red-500" /> :
       <Info className="h-4 w-4 text-muted-foreground" />}
      <span className="text-sm">{label}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Section 1 — Verdict */}
      <Card className={`p-6 ${vc.bg} ${vc.border} border`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-display font-bold ${scoreColor}`}>{score}</div>
            <div>
              <Badge className={`${vc.bg} ${vc.color} border ${vc.border} text-sm font-semibold`}>
                {verdict}
              </Badge>
              <p className="text-sm mt-2 max-w-xl">{summary}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleCopySummary}>
            <Copy className="h-3.5 w-3.5" /> Copier
          </Button>
        </div>
        {programmeMatch && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{programmeMatch.programme_name}</span>
              <Badge variant="outline" className="text-xs">Match: {programmeMatch.match_score}/100</Badge>
            </div>
          </div>
        )}
      </Card>

      {/* Section 2 — Anomalies */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-display font-semibold text-base">Anomalies détectées</h3>
          <div className="flex gap-2 text-xs">
            {bloquants.length > 0 && <Badge variant="destructive" className="text-[10px]">{bloquants.length} bloquante{bloquants.length > 1 ? 's' : ''}</Badge>}
            {attentions.length > 0 && <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px]">{attentions.length} attention{attentions.length > 1 ? 's' : ''}</Badge>}
            {notes.length > 0 && <Badge variant="outline" className="text-[10px]">{notes.length} note{notes.length > 1 ? 's' : ''}</Badge>}
          </div>
        </div>
        {anomalies.length === 0 ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">Aucune anomalie détectée</Card>
        ) : (
          <div className="space-y-2">
            {[...bloquants, ...attentions, ...notes].map((a: any, i: number) => (
              <Card key={i} className={`p-4 border ${severityBg(a.severity)}`}>
                <div className="flex items-start gap-3">
                  {severityIcon(a.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{a.title}</span>
                      <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.detail}</p>
                    {a.source_documents?.length > 0 && (
                      <p className="text-[10px] text-muted-foreground/70 mt-1">📎 {a.source_documents.join(', ')}</p>
                    )}
                    {a.recommendation && (
                      <p className="text-xs mt-2 text-primary font-medium">💡 {a.recommendation}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Section 3 — Cross-validation */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileSearch className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-display font-semibold text-base">Cross-validation documentaire</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-8">
          {cvCheck(
            `CA cohérent${crossValidation.ca_ecart_pct != null ? ` (écart ${crossValidation.ca_ecart_pct}%)` : ''}`,
            crossValidation.ca_coherent
          )}
          {cvCheck('Bilan équilibré', crossValidation.bilan_equilibre)}
          {cvCheck('Charges personnel cohérentes', crossValidation.charges_personnel_coherent)}
          {cvCheck('Trésorerie cohérente', crossValidation.tresorerie_coherent)}
        </div>
        {crossValidation.notes?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border space-y-1">
            {crossValidation.notes.map((n: string, i: number) => (
              <p key={i} className="text-xs text-muted-foreground">• {n}</p>
            ))}
          </div>
        )}
      </Card>

      {/* Section 4 — Qualité documentaire */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileSearch className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-display font-semibold text-base">Qualité documentaire</h3>
        </div>
        <div className="flex items-center gap-4 mb-3">
          <span className="text-sm text-muted-foreground">Documents exploitables</span>
          <Progress value={docQuality.total_documents > 0 ? (docQuality.documents_exploitables / docQuality.total_documents) * 100 : 0} className="h-2 flex-1 max-w-xs" />
          <span className="text-sm font-semibold">{docQuality.documents_exploitables || 0}/{docQuality.total_documents || 0}</span>
        </div>
        {docQuality.couverture && (
          <div className="flex gap-3 mb-3">
            {Object.entries(docQuality.couverture).map(([k, v]) => (
              <Badge key={k} variant="outline" className={`text-xs ${v ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {v ? '✅' : '❌'} {k.charAt(0).toUpperCase() + k.slice(1)}
              </Badge>
            ))}
          </div>
        )}
        {docQuality.documents_manquants_critiques?.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-red-600">Documents manquants critiques :</p>
            {docQuality.documents_manquants_critiques.map((d: string, i: number) => (
              <p key={i} className="text-xs text-red-500">• {d}</p>
            ))}
          </div>
        )}
        {docQuality.anciennete_documents && (
          <p className="text-xs text-muted-foreground mt-2">📅 {docQuality.anciennete_documents}</p>
        )}
      </Card>

      {/* Section 5 — Santé financière */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-display font-semibold text-base">Santé financière</h3>
          {financialHealth.health_label && (
            <Badge variant="outline" className={`text-xs ${
              financialHealth.health_label === 'Saine' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              financialHealth.health_label === 'Fragile' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              financialHealth.health_label === 'Critique' ? 'bg-red-50 text-red-700 border-red-200' :
              'bg-muted text-muted-foreground'
            }`}>
              {financialHealth.health_label}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Marge brute', value: financialHealth.marge_brute_pct, suffix: '%' },
            { label: 'Marge nette', value: financialHealth.marge_nette_pct, suffix: '%' },
            { label: 'Endettement', value: financialHealth.ratio_endettement_pct, suffix: '%' },
            { label: 'Liquidité', value: financialHealth.ratio_liquidite, suffix: '' },
            { label: 'BFR', value: financialHealth.bfr_jours, suffix: ' jours' },
          ].map((kpi) => (
            <div key={kpi.label} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{kpi.label}</span>
              <span className="text-sm font-semibold">
                {kpi.value != null ? `${kpi.value}${kpi.suffix}` : '—'}
              </span>
            </div>
          ))}
        </div>
        {financialHealth.benchmark_sector && (
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">📊 {financialHealth.benchmark_sector}</p>
        )}
      </Card>

      {/* Section 6 — Programme match */}
      {programmeMatch && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-display font-semibold text-base">Matching programme : {programmeMatch.programme_name}</h3>
            <Badge variant="outline" className="text-xs">{programmeMatch.match_score}/100</Badge>
          </div>
          <div className="space-y-2">
            {programmeMatch.criteres_ok?.map((c: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>{c}</span>
              </div>
            ))}
            {programmeMatch.criteres_partiels?.map((c: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span>{c}</span>
              </div>
            ))}
            {programmeMatch.criteres_ko?.map((c: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                <span>{c}</span>
              </div>
            ))}
          </div>
          {programmeMatch.recommandation && (
            <p className="text-sm mt-3 pt-3 border-t border-border font-medium">{programmeMatch.recommandation}</p>
          )}
        </Card>
      )}
    </div>
  );
}
