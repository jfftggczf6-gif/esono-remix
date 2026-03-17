import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Leaf, GraduationCap, Briefcase } from 'lucide-react';

export default function SelectRole() {
  const { setRole, role } = useAuth();
  const navigate = useNavigate();

  if (role) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSelect = async (selectedRole: 'coach' | 'entrepreneur') => {
    try {
      await setRole(selectedRole);
      toast.success(`Rôle ${selectedRole === 'coach' ? 'Coach' : 'Entrepreneur'} activé`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la sélection du rôle');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Leaf className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">ESONO BIS</h1>
        </div>

        <h2 className="text-center text-xl font-display font-semibold mb-2">Choisissez votre rôle</h2>
        <p className="text-center text-muted-foreground mb-8">Ce choix est permanent et ne pourra pas être modifié.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
            onClick={() => handleSelect('coach')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-display mt-4">Coach</CardTitle>
              <CardDescription>
                Accompagnez vos entrepreneurs, suivez leurs progrès et gérez les livrables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>✓ Tableau de bord de suivi</li>
                <li>✓ Gestion des entrepreneurs</li>
                <li>✓ Validation des livrables</li>
                <li>✓ Génération automatique</li>
              </ul>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-secondary hover:shadow-lg transition-all group"
            onClick={() => handleSelect('entrepreneur')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                <Briefcase className="h-8 w-8 text-secondary" />
              </div>
              <CardTitle className="font-display mt-4">Entrepreneur</CardTitle>
              <CardDescription>
                Développez votre business plan, complétez vos modules et téléchargez vos livrables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>✓ 8 modules guidés</li>
                <li>✓ Analyse IA automatique</li>
                <li>✓ Livrables téléchargeables</li>
                <li>✓ Suivi de progression</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
