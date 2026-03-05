import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from './DashboardLayout';
import ModuleCard from './ModuleCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  LayoutGrid, Globe, FileSpreadsheet, BarChart3,
  Stethoscope, ListChecks, FileText, Target, Plus, Building2
} from 'lucide-react';

const MODULE_CONFIG = [
  { code: 'bmc' as const, title: 'Business Model Canvas', description: 'Analysez votre modèle économique avec le BMC', icon: LayoutGrid },
  { code: 'sic' as const, title: 'Social Impact Canvas', description: 'Évaluez votre impact social et ODD', icon: Globe },
  { code: 'inputs' as const, title: 'Données Financières', description: 'Saisissez vos données financières clés', icon: FileSpreadsheet },
  { code: 'framework' as const, title: 'Framework Analyse', description: 'Analyse financière complète de votre PME', icon: BarChart3 },
  { code: 'diagnostic' as const, title: 'Diagnostic', description: 'Diagnostic global de votre entreprise', icon: Stethoscope },
  { code: 'plan_ovo' as const, title: 'Plan OVO', description: 'Plan d\'Objectifs, Vision et Organisation', icon: ListChecks },
  { code: 'business_plan' as const, title: 'Business Plan', description: 'Génération automatique de votre BP', icon: FileText },
  { code: 'odd' as const, title: 'ODD', description: 'Alignement aux Objectifs de Développement Durable', icon: Target },
];

export default function EntrepreneurDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [enterprise, setEnterprise] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSector, setNewSector] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const { data: ent } = await supabase
      .from('enterprises')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (ent) {
      setEnterprise(ent);
      const { data: mods } = await supabase
        .from('enterprise_modules')
        .select('*')
        .eq('enterprise_id', ent.id);
      setModules(mods || []);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const createEnterprise = async () => {
    if (!user || !newName.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('enterprises')
        .insert({ user_id: user.id, name: newName.trim(), sector: newSector.trim() || null })
        .select()
        .single();
      if (error) throw error;

      // Create all module entries
      const moduleInserts = MODULE_CONFIG.map(m => ({
        enterprise_id: data.id,
        module: m.code,
      }));
      await supabase.from('enterprise_modules').insert(moduleInserts);

      toast.success('Entreprise créée !');
      setShowCreate(false);
      setNewName('');
      setNewSector('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const getModuleData = (code: string) => {
    const mod = modules.find(m => m.module === code);
    return {
      status: (mod?.status || 'not_started') as 'not_started' | 'in_progress' | 'completed',
      progress: mod?.progress || 0,
    };
  };

  return (
    <DashboardLayout
      title={`Bonjour, ${profile?.full_name || 'Entrepreneur'} 👋`}
      subtitle={enterprise ? enterprise.name : 'Commencez par créer votre entreprise'}
    >
      {!enterprise ? (
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="font-display">Créer votre entreprise</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2">
                  <Plus className="h-4 w-4" /> Commencer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Nouvelle entreprise</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Nom de l'entreprise</Label>
                    <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: EcoBuild CI SARL" />
                  </div>
                  <div className="space-y-2">
                    <Label>Secteur d'activité</Label>
                    <Input value={newSector} onChange={e => setNewSector(e.target.value)} placeholder="Ex: Recyclage, Agroalimentaire..." />
                  </div>
                  <Button className="w-full" onClick={createEnterprise} disabled={creating || !newName.trim()}>
                    {creating ? 'Création...' : 'Créer'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-display font-bold text-primary">
                  {modules.filter(m => m.status === 'completed').length}/{MODULE_CONFIG.length}
                </p>
                <p className="text-sm text-muted-foreground">Modules terminés</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-display font-bold text-secondary">
                  {modules.filter(m => m.status === 'in_progress').length}
                </p>
                <p className="text-sm text-muted-foreground">En cours</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-display font-bold text-foreground">
                  {Math.round(modules.reduce((sum, m) => sum + (m.progress || 0), 0) / Math.max(modules.length, 1))}%
                </p>
                <p className="text-sm text-muted-foreground">Progression globale</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-display font-bold text-foreground">{enterprise.sector || '—'}</p>
                <p className="text-sm text-muted-foreground">Secteur</p>
              </CardContent>
            </Card>
          </div>

          {/* Module cards */}
          <h2 className="text-lg font-display font-semibold mb-4">Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODULE_CONFIG.map(mod => {
              const data = getModuleData(mod.code);
              return (
                <ModuleCard
                  key={mod.code}
                  title={mod.title}
                  description={mod.description}
                  icon={mod.icon}
                  status={data.status}
                  progress={data.progress}
                  onClick={() => navigate(`/module/${mod.code}`)}
                />
              );
            })}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
