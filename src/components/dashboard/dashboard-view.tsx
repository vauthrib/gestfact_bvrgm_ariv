'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, Package, Truck, CreditCard, Receipt } from 'lucide-react';

export function DashboardView() {
  const [stats, setStats] = useState({
    tiers: 0, articles: 0, facturesClients: 0, facturesFournisseurs: 0,
    bonsLivraison: 0, reglementsClients: 0, reglementsFournisseurs: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [tiers, articles, fc, ff, bl, rc, rf] = await Promise.all([
          fetch('/api/tiers').then(r => r.json()).catch(() => []),
          fetch('/api/articles').then(r => r.json()).catch(() => []),
          fetch('/api/factures-clients').then(r => r.json()).catch(() => []),
          fetch('/api/factures-fournisseurs').then(r => r.json()).catch(() => []),
          fetch('/api/bons-livraison').then(r => r.json()).catch(() => []),
          fetch('/api/reglements-clients').then(r => r.json()).catch(() => []),
          fetch('/api/reglements-fournisseurs').then(r => r.json()).catch(() => []),
        ]);
        setStats({
          tiers: Array.isArray(tiers) ? tiers.length : 0,
          articles: Array.isArray(articles) ? articles.length : 0,
          facturesClients: Array.isArray(fc) ? fc.length : 0,
          facturesFournisseurs: Array.isArray(ff) ? ff.length : 0,
          bonsLivraison: Array.isArray(bl) ? bl.length : 0,
          reglementsClients: Array.isArray(rc) ? rc.length : 0,
          reglementsFournisseurs: Array.isArray(rf) ? rf.length : 0,
        });
      } catch (e) { console.error(e); }
    };
    fetchStats();
  }, []);

  const cards = [
    { title: 'Tiers', value: stats.tiers, icon: <Users className="w-5 h-5 text-green-500" /> },
    { title: 'Articles', value: stats.articles, icon: <Package className="w-5 h-5 text-green-500" /> },
    { title: 'Factures Clients', value: stats.facturesClients, icon: <FileText className="w-5 h-5 text-green-500" /> },
    { title: 'Factures Fourn.', value: stats.facturesFournisseurs, icon: <Receipt className="w-5 h-5 text-green-500" /> },
    { title: 'Bons de Livraison', value: stats.bonsLivraison, icon: <Truck className="w-5 h-5 text-green-500" /> },
    { title: 'Règlements', value: stats.reglementsClients + stats.reglementsFournisseurs, icon: <CreditCard className="w-5 h-5 text-green-500" /> },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-green-700">Tableau de bord</h1>
          <p className="text-muted-foreground">Bienvenue sur GestFact V1.61</p>
        </div>
        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-mono font-bold">TDB01</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{card.value}</div></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
