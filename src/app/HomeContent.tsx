'use client';

import { useState, useMemo } from 'react';
import { signOut } from 'next-auth/react';
import { AppSidebar, PageView } from '@/components/layout/app-sidebar';
import { TiersView } from '@/components/tiers/tiers-view';
import { ArticlesView } from '@/components/articles/articles-view';
import { FacturesClientsView } from '@/components/factures-clients/factures-clients-view';
import { AvoirsClientsView } from '@/components/avoirs-clients/avoirs-clients-view';
import { ReglementsClientsView } from '@/components/reglements-clients/reglements-clients-view';
import { FacturesFournisseursView } from '@/components/factures-fournisseurs/factures-fournisseurs-view';
import { ReglementsFournisseursView } from '@/components/reglements-fournisseurs/reglements-fournisseurs-view';
import { BonsLivraisonView } from '@/components/bons-livraison/bons-livraison-view';
import { ParametresView } from '@/components/parametres/parametres-view';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { Permission, hasPermission, getAccessiblePages } from '@/lib/permissions';
import { UserProvider } from '@/lib/user-context';

interface User {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  permissions: Permission[];
}

interface HomeContentProps {
  user: User;
}

export default function HomeContent({ user }: HomeContentProps) {
  // Determine the initial view based on permissions
  const initialView = useMemo<PageView>(() => {
    const canViewDashboard = hasPermission(user.role, user.permissions, 'dashboard.view');
    if (canViewDashboard) return 'dashboard';
    
    // Get accessible pages and return the first one
    const accessiblePages = getAccessiblePages(user.role, user.permissions);
    if (accessiblePages.length > 0) {
      return accessiblePages[0] as PageView;
    }
    
    // Fallback to dashboard even if no access (shouldn't happen)
    return 'dashboard';
  }, [user.role, user.permissions]);

  const [currentView, setCurrentView] = useState<PageView>(initialView);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'tiers': return <TiersView />;
      case 'articles': return <ArticlesView />;
      case 'factures-clients': return <FacturesClientsView />;
      case 'avoirs-clients': return <AvoirsClientsView />;
      case 'reglements-clients': return <ReglementsClientsView />;
      case 'factures-fournisseurs': return <FacturesFournisseursView />;
      case 'reglements-fournisseurs': return <ReglementsFournisseursView />;
      case 'bons-livraison': return <BonsLivraisonView />;
      case 'parametres': return <ParametresView userRole={user.role} />;
      default: return <DashboardView />;
    }
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <UserProvider user={user}>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          user={user}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {renderView()}
        </main>
      </div>
    </UserProvider>
  );
}
