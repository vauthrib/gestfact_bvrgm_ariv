'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Users, Package, Truck, CreditCard, Receipt, Calculator, Printer, Download, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;

const formatDate = (d: string | Date) => {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR');
};

const getMonthLabel = (monthOffset: number) => {
  return `CA m${monthOffset === 0 ? ' en cours' : `-${monthOffset}`}`;
};

const getMonthRange = (monthOffset: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthOffset);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
};

interface Tiers {
  id: string;
  code: string;
  raisonSociale: string;
  type: string;
}

interface ReleveLine {
  date: Date;
  dateStr: string;
  type: string;
  numero: string;
  montant: number;         // Montant avec signe (positif = crédit, négatif = débit)
  montantTTC: number;      // Montant TTC de la facture (pour les lignes facture)
  solde: number;           // Solde cumulé
  statut: string;          // Statut de l'élément
  isValidated: boolean;    // Si l'élément est validé
  isInfo?: boolean;        // Si c'est juste pour info (BL) - pas dans le calcul des soldes
}

type SortField = 'date' | 'type' | 'numero' | 'montant' | 'solde';
type SortDirection = 'asc' | 'desc';

interface MonthlyData {
  m6: number; m5: number; m4: number; m3: number; m2: number; m1: number; m0: number;
}

export function DashboardView() {
  const [stats, setStats] = useState({
    tiers: 0, articles: 0, facturesClients: 0, facturesFournisseurs: 0,
    bonsLivraison: 0, reglementsClients: 0, reglementsFournisseurs: 0
  });
  
  const [monthlyStats, setMonthlyStats] = useState({
    facturesClients: { m6: 0, m5: 0, m4: 0, m3: 0, m2: 0, m1: 0, m0: 0 } as MonthlyData,
    facturesFournisseurs: { m6: 0, m5: 0, m4: 0, m3: 0, m2: 0, m1: 0, m0: 0 } as MonthlyData,
    blNonFactures: { m6: 0, m5: 0, m4: 0, m3: 0, m2: 0, m1: 0, m0: 0 } as MonthlyData
  });

  // Relevé dialog state
  const [releveDialogOpen, setReleveDialogOpen] = useState(false);
  const [releveResultOpen, setReleveResultOpen] = useState(false);
  const [tiersList, setTiersList] = useState<Tiers[]>([]);
  const [releveForm, setReleveForm] = useState({
    tierType: 'CLIENT',
    tierId: '',
    dateFrom: '',
    dateTo: ''
  });
  const [releveData, setReleveData] = useState<ReleveLine[]>([]);
  const [releveTier, setReleveTier] = useState<Tiers | null>(null);
  
  // Sorting state for relevé
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
        
        // Calculate monthly totals - 7 months (M-6 to M en cours)
        const calcMonthlyTotals = (items: any[], dateField: string, valueField: string = 'totalHT'): MonthlyData => {
          const ranges = [getMonthRange(6), getMonthRange(5), getMonthRange(4), getMonthRange(3), getMonthRange(2), getMonthRange(1), getMonthRange(0)];
          const totals = ranges.map(range => {
            return items
              .filter((item: any) => {
                const date = new Date(item[dateField]);
                return date >= range.start && date <= range.end;
              })
              .reduce((sum: number, item: any) => sum + (item[valueField] || 0), 0);
          });
          return { m6: totals[0], m5: totals[1], m4: totals[2], m3: totals[3], m2: totals[4], m1: totals[5], m0: totals[6] };
        };
        
        const fcTotals = calcMonthlyTotals(Array.isArray(fc) ? fc : [], 'dateFacture');
        const ffTotals = calcMonthlyTotals(Array.isArray(ff) ? ff : [], 'dateFacture');
        
        // BL non facturés (sans factureId ou statut != 'FACTURE')
        const blNonFacturesData = Array.isArray(bl) ? bl.filter((b: any) => !b.factureId && b.statut !== 'FACTURE') : [];
        const blTotals = calcMonthlyTotals(blNonFacturesData, 'dateBL');
        
        setMonthlyStats({
          facturesClients: fcTotals,
          facturesFournisseurs: ffTotals,
          blNonFactures: blTotals
        });
      } catch (e) { console.error(e); }
    };
    fetchStats();
  }, []);

  // Fetch tiers when opening relevé dialog
  useEffect(() => {
    if (releveDialogOpen) {
      fetch('/api/tiers')
        .then(r => r.json())
        .then(data => {
          const filtered = (Array.isArray(data) ? data : []).filter((t: Tiers) => t.type === releveForm.tierType);
          setTiersList(filtered.sort((a: Tiers, b: Tiers) => a.raisonSociale.localeCompare(b.raisonSociale)));
        })
        .catch(() => setTiersList([]));
    }
  }, [releveDialogOpen, releveForm.tierType]);

  const openReleveDialog = () => {
    setReleveForm({
      tierType: 'CLIENT',
      tierId: '',
      dateFrom: '',
      dateTo: ''
    });
    setReleveDialogOpen(true);
  };

  const generateReleve = async () => {
    if (!releveForm.tierId) {
      alert('Sélectionnez un tiers');
      return;
    }

    const tier = tiersList.find(t => t.id === releveForm.tierId);
    setReleveTier(tier || null);

    const isClient = releveForm.tierType === 'CLIENT';
    const dateFrom = releveForm.dateFrom ? new Date(releveForm.dateFrom) : null;
    const dateTo = releveForm.dateTo ? new Date(releveForm.dateTo + 'T23:59:59') : null;

    const lines: ReleveLine[] = [];

    try {
      // Fetch factures
      const facturesUrl = isClient ? '/api/factures-clients' : '/api/factures-fournisseurs';
      const factures = await fetch(facturesUrl).then(r => r.json()).catch(() => []);
      
      if (Array.isArray(factures)) {
        factures
          .filter((f: any) => {
            const tierField = isClient ? 'clientId' : 'fournisseurId';
            const matchTier = f[tierField] === releveForm.tierId;
            const date = new Date(f.dateFacture);
            const matchDate = (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
            return matchTier && matchDate;
          })
          .forEach((f: any) => {
            const isValidated = f.statut === 'VALIDEE';
            // Pour les clients: factures = crédit (montant positif)
            // Pour les fournisseurs: factures = débit (montant négatif)
            const montantTTC = f.totalTTC || 0;
            const montant = isClient ? montantTTC : -montantTTC;
            lines.push({
              date: new Date(f.dateFacture),
              dateStr: formatDate(f.dateFacture),
              type: isValidated ? 'Facture' : 'Facture (en attente)',
              numero: f.numero,
              montant: montant,
              montantTTC: montantTTC,
              solde: 0,
              statut: f.statut,
              isValidated: isValidated,
              isInfo: false
            });
          });
      }

      // Fetch règlements
      const reglementsUrl = isClient ? '/api/reglements-clients' : '/api/reglements-fournisseurs';
      const reglements = await fetch(reglementsUrl).then(r => r.json()).catch(() => []);
      
      if (Array.isArray(reglements)) {
        reglements
          .filter((r: any) => {
            const facture = r.facture;
            if (!facture) return false;
            const tierField = isClient ? 'clientId' : 'fournisseurId';
            const matchTier = facture[tierField] === releveForm.tierId;
            const date = new Date(r.dateReglement);
            const matchDate = (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
            return matchTier && matchDate;
          })
          .forEach((r: any) => {
            const isValidated = r.statut === 'VALIDE';
            // Pour les clients: règlements = débit (montant négatif)
            // Pour les fournisseurs: règlements = crédit (montant positif)
            const montantRgl = r.montant || 0;
            const montant = isClient ? -montantRgl : montantRgl;
            lines.push({
              date: new Date(r.dateReglement),
              dateStr: formatDate(r.dateReglement),
              type: isValidated ? 'Règlement' : 'Règlement (en attente)',
              numero: r.numero || r.reference || '-',
              montant: montant,
              montantTTC: 0, // Pas de TTC pour les règlements
              solde: 0,
              statut: r.statut,
              isValidated: isValidated,
              isInfo: false
            });
          });
      }

      // Fetch Bons de Livraison (only for clients, for info only)
      if (isClient) {
        const bl = await fetch('/api/bons-livraison').then(r => r.json()).catch(() => []);
        
        if (Array.isArray(bl)) {
          bl
            .filter((b: any) => {
              const matchTier = b.clientId === releveForm.tierId;
              const date = new Date(b.dateBL);
              const matchDate = (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
              return matchTier && matchDate;
            })
            .forEach((b: any) => {
              lines.push({
                date: new Date(b.dateBL),
                dateStr: formatDate(b.dateBL),
                type: 'Bon de Livraison (info)',
                numero: b.numero,
                montant: 0,
                montantTTC: 0,
                solde: 0,
                statut: b.statut,
                isValidated: true,
                isInfo: true
              });
            });
        }
      }

      // Sort by date ascending first to calculate running balance correctly
      lines.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate running balance
      let runningSolde = 0;
      lines.forEach(line => {
        if (!line.isInfo) {
          runningSolde += line.montant;
        }
        line.solde = runningSolde;
      });

      // Apply sorting
      const sorted = [...lines].sort((a, b) => {
        let valA: any, valB: any;
        switch (sortField) {
          case 'date': valA = a.date.getTime(); valB = b.date.getTime(); break;
          case 'type': valA = a.type; valB = b.type; break;
          case 'numero': valA = a.numero; valB = b.numero; break;
          case 'montant': valA = a.montant; valB = b.montant; break;
          case 'solde': valA = a.solde; valB = b.solde; break;
          default: return 0;
        }
        if (typeof valA === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });

      setReleveData(sorted);
      setReleveDialogOpen(false);
      setReleveResultOpen(true);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la génération du relevé');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    // Re-sort the data
    setReleveData(prev => {
      const sorted = [...prev].sort((a, b) => {
        let valA: any, valB: any;
        switch (field) {
          case 'date': valA = a.date.getTime(); valB = b.date.getTime(); break;
          case 'type': valA = a.type; valB = b.type; break;
          case 'numero': valA = a.numero; valB = b.numero; break;
          case 'montant': valA = a.montant; valB = b.montant; break;
          case 'solde': valA = a.solde; valB = b.solde; break;
          default: return 0;
        }
        const newDirection = sortField === field ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'desc';
        if (typeof valA === 'string') {
          return newDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return newDirection === 'asc' ? valA - valB : valB - valA;
      });
      return sorted;
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 inline opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1 inline" /> : <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  const exportReleveCSV = () => {
    if (releveData.length === 0) return;
    
    // CSV header
    const headers = ['Date', 'Type', 'Numéro', 'Montant', 'Montant TTC', 'Solde', 'Statut'];
    const csvRows = [headers.join(';')];
    
    // Add data rows
    releveData.forEach(line => {
      const row = [
        line.dateStr,
        line.type,
        line.numero,
        line.montant.toFixed(2).replace('.', ','),
        line.montantTTC > 0 ? line.montantTTC.toFixed(2).replace('.', ',') : '',
        line.solde.toFixed(2).replace('.', ','),
        line.isInfo ? 'INFO' : (line.isValidated ? 'Validé' : 'En attente')
      ];
      csvRows.push(row.join(';'));
    });
    
    // Add totals
    const totalMontant = releveData.reduce((s, l) => s + l.montant, 0);
    csvRows.push(['', 'TOTAL', '', totalMontant.toFixed(2).replace('.', ','), '', '', ''].join(';'));
    
    // Create and download file
    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `releve_${releveTier?.raisonSociale || 'tiers'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReleve = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const isClient = releveForm.tierType === 'CLIENT';
    const finalSolde = releveData.length > 0 ? releveData[0].solde : 0;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relevé ${releveTier?.raisonSociale || ''}</title>
        <style>
          @media print {
            body { margin: 0; padding: 0; }
            @page { margin: 1cm; size: A4; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
          }
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 10pt; }
          h1 { color: #16a34a; font-size: 16pt; margin-bottom: 5px; }
          h2 { color: #15803d; font-size: 12pt; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #16a34a; color: white; padding: 6px 4px; text-align: left; font-size: 9pt; }
          td { padding: 5px 4px; border-bottom: 1px solid #ddd; font-size: 9pt; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background: #dcfce7; }
          .pending { color: #d97706; font-style: italic; }
          .info { color: #6b7280; font-style: italic; }
          .footer { margin-top: 20px; font-size: 8pt; color: #666; }
          .soldes { margin-top: 15px; padding: 10px; background: #dcfce7; border-radius: 6px; }
          .soldes-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .negative { color: #dc2626; }
          .positive { color: #16a34a; }
        </style>
      </head>
      <body>
        <h1>Relevé de compte</h1>
        <h2>${releveTier?.raisonSociale || ''}</h2>
        <p>Période: ${releveForm.dateFrom || 'Début'} - ${releveForm.dateTo || 'Fin'}</p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>N°</th>
              <th class="text-right">Montant TTC</th>
              <th class="text-right">Montant</th>
              <th class="text-right">Solde</th>
            </tr>
          </thead>
          <tbody>
            ${releveData.map(l => `
              <tr class="${l.isInfo ? 'info' : (!l.isValidated ? 'pending' : '')}">
                <td>${l.dateStr}</td>
                <td>${l.type}</td>
                <td>${l.numero}</td>
                <td class="text-right">${l.montantTTC > 0 ? l.montantTTC.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DH' : ''}</td>
                <td class="text-right ${l.montant < 0 ? 'negative' : 'positive'}">${l.montant !== 0 ? Math.abs(l.montant).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DH' + (l.montant < 0 ? ' (D)' : ' (C)') : ''}</td>
                <td class="text-right" style="font-weight:bold;">${Math.abs(l.solde).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH ${l.solde >= 0 ? (isClient ? '(C)' : '(D)') : (isClient ? '(D)' : '(C)')}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3">TOTAL</td>
              <td></td>
              <td class="text-right">${Math.abs(releveData.reduce((s, l) => s + l.montant, 0)).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <div class="soldes">
          <div class="soldes-row">
            <strong>Solde Final:</strong>
            <span>${Math.abs(finalSolde).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH ${finalSolde >= 0 ? (isClient ? 'Créditeur' : 'Débiteur') : (isClient ? 'Débiteur' : 'Créditeur')}</span>
          </div>
        </div>
        <div class="footer">
          <p>Document généré le ${formatDate(new Date())}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  // Monthly stats component - 7 months
  const MonthlyStatBar = ({ data, label }: { data: MonthlyData, label: string }) => (
    <div className="bg-green-50 rounded-lg p-2 mb-2 border border-green-200">
      <div className="text-xs text-green-600 font-medium mb-1">{label}</div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {[6, 5, 4, 3, 2, 1, 0].map((m) => {
          const key = `m${m}` as keyof MonthlyData;
          const isCurrent = m === 0;
          return (
            <div key={m} className={isCurrent ? 'bg-green-100 rounded px-1' : ''}>
              <div className="text-[9px] text-muted-foreground font-medium">{getMonthLabel(m)}</div>
              <div className={`text-[10px] font-bold ${isCurrent ? 'text-green-800' : 'text-green-700'}`}>
                {formatCurrency(data[key])}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const cards = [
    { 
      title: 'Tiers', 
      value: stats.tiers, 
      icon: <Users className="w-5 h-5 text-green-500" />,
      monthlyStats: <MonthlyStatBar data={monthlyStats.facturesClients} label="Total HT Factures Clients" />
    },
    { 
      title: 'Articles', 
      value: stats.articles, 
      icon: <Package className="w-5 h-5 text-green-500" />,
      monthlyStats: <MonthlyStatBar data={monthlyStats.facturesFournisseurs} label="Total HT Factures Fourn." />
    },
    { 
      title: 'Factures Clients', 
      value: stats.facturesClients, 
      icon: <FileText className="w-5 h-5 text-green-500" />,
      monthlyStats: <MonthlyStatBar data={monthlyStats.blNonFactures} label="Total HT BL non facturés" />
    },
    { 
      title: 'Factures Fourn.', 
      value: stats.facturesFournisseurs, 
      icon: <Receipt className="w-5 h-5 text-green-500" /> 
    },
    { 
      title: 'Bons de Livraison', 
      value: stats.bonsLivraison, 
      icon: <Truck className="w-5 h-5 text-green-500" /> 
    },
    { 
      title: 'Règlements', 
      value: stats.reglementsClients + stats.reglementsFournisseurs, 
      icon: <CreditCard className="w-5 h-5 text-green-500" /> 
    },
  ];

  const finalSolde = releveData.length > 0 ? releveData[0].solde : 0;
  const isClient = releveForm.tierType === 'CLIENT';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-green-700">Tableau de bord</h1>
          <p className="text-muted-foreground">Bienvenue sur RGM V1.98</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-mono font-bold">TDB01</span>
          <Button className="bg-green-600 hover:bg-green-700" onClick={openReleveDialog}>
            <Calculator className="w-4 h-4 mr-2" />Relevé Tiers
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            {card.monthlyStats && (
              <div className="px-4 pt-4">
                {card.monthlyStats}
              </div>
            )}
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{card.value}</div></CardContent>
          </Card>
        ))}
      </div>

      {/* Relevé Dialog - Selection */}
      <Dialog open={releveDialogOpen} onOpenChange={setReleveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Relevé Tiers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Type de tiers</Label>
              <Select value={releveForm.tierType} onValueChange={(v) => setReleveForm({ ...releveForm, tierType: v, tierId: '' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLIENT">Client</SelectItem>
                  <SelectItem value="FOURNISSEUR">Fournisseur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{releveForm.tierType === 'CLIENT' ? 'Client' : 'Fournisseur'}</Label>
              <Select value={releveForm.tierId} onValueChange={(v) => setReleveForm({ ...releveForm, tierId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {tiersList.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.raisonSociale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date début</Label>
                <Input type="date" value={releveForm.dateFrom} onChange={(e) => setReleveForm({ ...releveForm, dateFrom: e.target.value })} />
              </div>
              <div>
                <Label>Date fin</Label>
                <Input type="date" value={releveForm.dateTo} onChange={(e) => setReleveForm({ ...releveForm, dateTo: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleveDialogOpen(false)}>Annuler</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={generateReleve}>Générer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Relevé Result Dialog */}
      <Dialog open={releveResultOpen} onOpenChange={setReleveResultOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Relevé de compte</DialogTitle>
                <p className="text-sm text-muted-foreground">{releveTier?.raisonSociale}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportReleveCSV}>
                  <Download className="w-4 h-4 mr-1" />Export CSV
                </Button>
                <Button size="sm" variant="outline" onClick={printReleve}>
                  <Printer className="w-4 h-4 mr-1" />Imprimer
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            {releveData.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Aucune donnée sur la période</div>
            ) : (
              <>
                {/* Solde Summary */}
                <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <span className="text-sm text-green-600 font-medium">Solde Final:</span>
                    <div className="text-xl font-bold text-green-700">
                      {formatCurrency(Math.abs(finalSolde))}
                      <span className="text-sm ml-2">{finalSolde >= 0 ? (isClient ? 'Créditeur' : 'Débiteur') : (isClient ? 'Débiteur' : 'Créditeur')}</span>
                    </div>
                  </div>
                </div>
              
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>Date <SortIcon field="date" /></TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('type')}>Type <SortIcon field="type" /></TableHead>
                      <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('numero')}>N° <SortIcon field="numero" /></TableHead>
                      <TableHead className="text-right">Montant TTC</TableHead>
                      <TableHead className="text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('montant')}>Montant <SortIcon field="montant" /></TableHead>
                      <TableHead className="text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('solde')}>Solde <SortIcon field="solde" /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {releveData.map((line, idx) => (
                      <TableRow 
                        key={idx} 
                        className={line.isInfo ? 'bg-gray-100' : (!line.isValidated ? 'bg-yellow-50' : '')}
                      >
                        <TableCell>{line.dateStr}</TableCell>
                        <TableCell className={line.isInfo ? 'text-gray-500 italic' : (!line.isValidated ? 'text-yellow-700 italic' : '')}>
                          {line.type}
                        </TableCell>
                        <TableCell>{line.numero}</TableCell>
                        <TableCell className="text-right">{line.montantTTC > 0 ? formatCurrency(line.montantTTC) : ''}</TableCell>
                        <TableCell className={`text-right font-medium ${line.type.includes('Règlement') ? 'text-green-600' : line.type.includes('Facture') ? 'text-red-600' : ''}`}>
                          {line.montant !== 0 ? `${line.montant < 0 ? '-' : '+'}${formatCurrency(Math.abs(line.montant))}` : ''}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(Math.abs(line.solde))}
                          <span className="text-xs ml-1">{line.solde >= 0 ? (isClient ? '(C)' : '(D)') : (isClient ? '(D)' : '(C)')}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-green-50 font-bold">
                      <TableCell colSpan={3}>TOTAL</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">{formatCurrency(Math.abs(releveData.reduce((s, l) => s + l.montant, 0)))}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleveResultOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
