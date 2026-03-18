import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Download, Shield, BarChart3, Briefcase, Users, Globe, FolderOpen } from 'lucide-react';

const CATEGORY_META: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  legal: { label: 'Juridique', icon: Shield, color: 'bg-blue-100 text-blue-600' },
  finance: { label: 'Finance', icon: BarChart3, color: 'bg-emerald-100 text-emerald-600' },
  commercial: { label: 'Commercial', icon: Briefcase, color: 'bg-amber-100 text-amber-600' },
  team: { label: 'Équipe', icon: Users, color: 'bg-purple-100 text-purple-600' },
  impact: { label: 'ESG / Impact', icon: Globe, color: 'bg-teal-100 text-teal-600' },
  other: { label: 'Autres', icon: FileText, color: 'bg-muted text-muted-foreground' },
};

export default function DataRoomPublic() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    const fetchDataRoom = async () => {
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/access-data-room?token=${token}`
        );
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: 'Erreur' }));
          throw new Error(err.error || 'Lien invalide');
        }
        setData(await resp.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDataRoom();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center max-w-md">
          <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display font-bold text-lg mb-2">Accès impossible</h2>
          <p className="text-sm text-muted-foreground">{error || 'Ce lien est invalide ou a expiré.'}</p>
        </Card>
      </div>
    );
  }

  const { enterprise, investor_name, can_download, documents } = data;
  const categories = Object.keys(CATEGORY_META);
  const grouped = categories.map(cat => ({
    ...CATEGORY_META[cat],
    id: cat,
    docs: (documents || []).filter((d: any) => d.category === cat),
  })).filter(g => g.docs.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <span className="font-display font-bold text-lg tracking-tight">ESONO</span>
          <Badge variant="outline" className="text-xs">Data Room</Badge>
        </div>
      </header>

      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <h1 className="font-display font-bold text-2xl mb-1">{enterprise?.name || 'Entreprise'}</h1>
          <p className="text-sm text-muted-foreground">
            {enterprise?.sector && `${enterprise.sector} · `}
            {enterprise?.country || ''}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Bienvenue {investor_name}. Voici les documents partagés avec vous.
          </p>
        </div>

        <div className="space-y-6">
          {grouped.map(cat => {
            const CatIcon = cat.icon;
            return (
              <Card key={cat.id} className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-8 w-8 rounded-lg ${cat.color} flex items-center justify-center`}>
                    <CatIcon className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-sm">{cat.label}</h3>
                  <Badge variant="outline" className="text-[10px]">{cat.docs.length}</Badge>
                </div>
                <div className="space-y-2">
                  {cat.docs.map((doc: any) => (
                    <div key={doc.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50">
                      <FileText className="h-4 w-4 text-muted-foreground flex-none" />
                      <span className="text-sm flex-1 truncate">{doc.label}</span>
                      {can_download && doc.download_url && (
                        <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
                          <a href={doc.download_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3 w-3" /> Télécharger
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>

        {grouped.length === 0 && (
          <Card className="p-8 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Aucun document partagé pour le moment.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
