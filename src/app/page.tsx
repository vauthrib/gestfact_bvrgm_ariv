'use client';

import { useState } from 'react';
import { AppSidebar, PageView } from '@/components/layout/app-sidebar';
import { SecretCodeGate } from '@/components/auth/secret-code-gate';
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

function AppContent() {
  const [currentView, setCurrentView] = useState<PageView>('dashboard');
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
      case 'parametres': return <ParametresView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {renderView()}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <SecretCodeGate>
      <AppContent />
    </SecretCodeGate>
  );
}
