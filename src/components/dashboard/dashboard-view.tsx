'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Users, Package, Truck, CreditCard, Receipt, Calculator, Printer } from 'lucide-react';

const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;

const formatDate = (d: string | Date) => {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR');
};

const getMonthName = (monthOffset: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthOffset);
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
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
  debit: number;
  credit: number;
  solde: number;
}

export function DashboardView() {
  const [stats, setStats] = useState({
    tiers: 0, articles: 0, facturesClients: 0, facturesFournisseurs: 0,
    bonsLivraison: 0, reglementsClients: 0, reglementsFournisseurs: 0
  });
  
  const [monthlyStats, setMonthlyStats] = useState({
    facturesClients: { m2: 0, m1: 0, m0: 0 },
    facturesFournisseurs: { m2: 0, m1: 0, m0: 0 },
    blNonFactures: { m2: 0, m1: 0, m0: 0 }
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
        
        // Calculate monthly totals
        const calcMonthlyTotals = (items: any[], dateField: string, valueField: string = 'totalHT') => {
          const ranges = [getMonthRange(2), getMonthRange(1), getMonthRange(0)];
          return ranges.map(range => {
            return items
              .filter((item: any) => {
                const date = new Date(item[dateField]);
                return date >= range.start && date <= range.end;
              })
              .reduce((sum: number, item: any) => sum + (item[valueField] || 0), 0);
          });
        };
        
        const fcTotals = calcMonthlyTotals(Array.isArray(fc) ? fc : [], 'dateFacture');
        const ffTotals = calcMonthlyTotals(Array.isArray(ff) ? ff : [], 'dateFacture');
        
        // BL non facturés (sans factureId ou statut != 'FACTURE')
        const blNonFacturesData = Array.isArray(bl) ? bl.filter((b: any) => !b.factureId && b.statut !== 'FACTURE') : [];
        const blTotals = calcMonthlyTotals(blNonFacturesData, 'dateBL');
        
        setMonthlyStats({
          facturesClients: { m2: fcTotals[0], m1: fcTotals[1], m0: fcTotals[2] },
          facturesFournisseurs: { m2: ffTotals[0], m1: ffTotals[1], m0: ffTotals[2] },
          blNonFactures: { m2: blTotals[0], m1: blTotals[1], m0: blTotals[2] }
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
            // Pour les clients: factures = crédit (ils nous doivent), règlements = débit
            // Pour les fournisseurs: factures = débit (on leur doit), règlements = crédit
            lines.push({
              date: new Date(f.dateFacture),
              dateStr: formatDate(f.dateFacture),
              type: 'Facture',
              numero: f.numero,
              debit: isClient ? 0 : (f.totalTTC || 0),
              credit: isClient ? (f.totalTTC || 0) : 0,
              solde: 0
            });
          });
      }

      // Fetch règlements
      const reglementsUrl = isClient ? '/api/reglements-clients' : '/api/reglements-fournisseurs';
      const reglements = await fetch(reglementsUrl).then(r => r.json()).catch(() => []);
      
      if (Array.isArray(reglements)) {
        reglements
          .filter((r: any) => {
            const tierField = isClient ? 'clientId' : 'fournisseurId';
            const matchTier = r[tierField] === releveForm.tierId;
            const date = new Date(r.dateReglement);
            const matchDate = (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
            return matchTier && matchDate;
          })
          .forEach((r: any) => {
            lines.push({
              date: new Date(r.dateReglement),
              dateStr: formatDate(r.dateReglement),
              type: 'Règlement',
              numero: r.numero || r.reference || '-',
              debit: isClient ? (r.montant || 0) : 0,
              credit: isClient ? 0 : (r.montant || 0),
              solde: 0
            });
          });
      }

      // Fetch BL for clients only
      if (isClient) {
        const bl = await fetch('/api/bons-livraison').then(r => r.json()).catch((): any[] => []);
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
                type: 'BL',
                numero: b.numero,
                debit: 0,
                credit: b.totalTTC || b.totalHT || 0,
                solde: 0
              });
            });
        }
      }

      // Sort by date ascending first to calculate running balance correctly
      lines.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Calculate running balance
      // Pour client: solde = crédit - débit (ce qu'ils nous doivent)
      // Pour fournisseur: solde = débit - crédit (ce qu'on leur doit)
      let runningSolde = 0;
      lines.forEach(line => {
        if (isClient) {
          runningSolde = runningSolde + line.credit - line.debit;
        } else {
          runningSolde = runningSolde + line.debit - line.credit;
        }
        line.solde = runningSolde;
      });

      // Sort by date descending for display (most recent first)
      lines.sort((a, b) => b.date.getTime() - a.date.getTime());

      setReleveData(lines);
      setReleveDialogOpen(false);
      setReleveResultOpen(true);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la génération du relevé');
    }
  };

  const printReleve = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const isClient = releveForm.tierType === 'CLIENT';
    const totalDebit = releveData.reduce((s, l) => s + l.debit, 0);
    const totalCredit = releveData.reduce((s, l) => s + l.credit, 0);
    // Since data is sorted descending (most recent first), first element has the final solde
    const finalSolde = releveData.length > 0 ? releveData[0].solde : 0;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relevé ${releveTier?.raisonSociale || ''}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #16a34a; }
          h2 { color: #15803d; font-size: 14pt; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #16a34a; color: white; padding: 8px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background: #dcfce7; }
          .footer { margin-top: 30px; font-size: 10pt; color: #666; }
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
              <th class="text-right">Débit</th>
              <th class="text-right">Crédit</th>
              <th class="text-right">Solde</th>
            </tr>
          </thead>
          <tbody>
            ${releveData.map(l => `
              <tr>
                <td>${l.dateStr}</td>
                <td>${l.type}</td>
                <td>${l.numero}</td>
                <td class="text-right">${l.debit > 0 ? formatCurrency(l.debit) : ''}</td>
                <td class="text-right">${l.credit > 0 ? formatCurrency(l.credit) : ''}</td>
                <td class="text-right">${formatCurrency(Math.abs(l.solde))} ${l.solde >= 0 ? (isClient ? '(C)' : '(D)') : (isClient ? '(D)' : '(C)')}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3">TOTAUX</td>
              <td class="text-right">${formatCurrency(totalDebit)}</td>
              <td class="text-right">${formatCurrency(totalCredit)}</td>
              <td class="text-right">${formatCurrency(Math.abs(finalSolde))}</td>
            </tr>
          </tbody>
        </table>
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

  // Monthly stats component
  const MonthlyStatBar = ({ data, label }: { data: { m2: number, m1: number, m0: number }, label: string }) => (
    <div className="bg-green-50 rounded-lg p-3 mb-3 border border-green-200">
      <div className="text-xs text-green-600 font-medium mb-2">{label}</div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xs text-muted-foreground">{getMonthName(2)}</div>
          <div className="text-sm font-bold text-green-700">{formatCurrency(data.m2)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{getMonthName(1)}</div>
          <div className="text-sm font-bold text-green-700">{formatCurrency(data.m1)}</div>
        </div>
        <div className="bg-green-100 rounded px-1">
          <div className="text-xs text-green-600 font-medium">{getMonthName(0)}</div>
          <div className="text-sm font-bold text-green-800">{formatCurrency(data.m0)}</div>
        </div>
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

  const totalDebit = releveData.reduce((s, l) => s + l.debit, 0);
  const totalCredit = releveData.reduce((s, l) => s + l.credit, 0);
  // Since data is sorted descending (most recent first), first element has the final solde
  const finalSolde = releveData.length > 0 ? releveData[0].solde : 0;
  const isClient = releveForm.tierType === 'CLIENT';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-green-700">Tableau de bord</h1>
          <p className="text-muted-foreground">Bienvenue sur RGM V1.91</p>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Relevé de compte</DialogTitle>
                <p className="text-sm text-muted-foreground">{releveTier?.raisonSociale}</p>
              </div>
              <Button size="sm" variant="outline" onClick={printReleve}>
                <Printer className="w-4 h-4 mr-1" />Imprimer
              </Button>
            </div>
          </DialogHeader>
          <div className="py-4">
            {releveData.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Aucune donnée sur la période</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>N°</TableHead>
                    <TableHead className="text-right">Débit</TableHead>
                    <TableHead className="text-right">Crédit</TableHead>
                    <TableHead className="text-right">Solde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {releveData.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{line.dateStr}</TableCell>
                      <TableCell>{line.type}</TableCell>
                      <TableCell>{line.numero}</TableCell>
                      <TableCell className="text-right">{line.debit > 0 ? formatCurrency(line.debit) : ''}</TableCell>
                      <TableCell className="text-right">{line.credit > 0 ? formatCurrency(line.credit) : ''}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Math.abs(line.solde))}
                        <span className="text-xs ml-1">{line.solde >= 0 ? (isClient ? '(C)' : '(D)') : (isClient ? '(D)' : '(C)')}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-green-50 font-bold">
                    <TableCell colSpan={3}>TOTAUX</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalDebit)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalCredit)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Math.abs(finalSolde))}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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
