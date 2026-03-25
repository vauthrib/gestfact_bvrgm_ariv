'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Printer, Download, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

const formatCurrency = (a: number) => a.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (d: string | Date) => {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR');
};

// Convert number to French words
const numberToWords = (num: number, currency: 'MAD' | 'EUR' = 'MAD'): string => {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
  
  const convertHundreds = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return units[n];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const u = n % 10;
      if (t === 7 || t === 9) {
        return tens[t] + (u === 1 && t !== 9 ? '-et-' : '-') + units[10 + u];
      }
      if (u === 0) return tens[t] + (t === 8 ? 's' : '');
      if (u === 1 && t !== 8) return tens[t] + '-et-un';
      return tens[t] + '-' + units[u];
    }
    const h = Math.floor(n / 100);
    const r = n % 100;
    let result = h === 1 ? 'cent' : units[h] + ' cent';
    if (r === 0 && h > 1) result += 's';
    return result + (r ? ' ' + convertHundreds(r) : '');
  };
  
  const convertGroup = (n: number, singular: string, plural: string): string => {
    if (n === 0) return '';
    if (n === 1) return singular;
    return convertHundreds(n) + ' ' + plural;
  };
  
  if (num === 0) return 'zéro';
  
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  
  let result = '';
  
  const millions = Math.floor(intPart / 1000000);
  const thousands = Math.floor((intPart % 1000000) / 1000);
  const remainder = intPart % 1000;
  
  if (millions > 0) {
    result += millions === 1 ? 'un million' : convertHundreds(millions) + ' millions';
    if (thousands > 0 || remainder > 0) result += ' ';
  }
  
  if (thousands > 0) {
    result += thousands === 1 ? 'mille' : convertHundreds(thousands) + ' mille';
    if (remainder > 0) result += ' ';
  }
  
  if (remainder > 0) {
    result += convertHundreds(remainder);
  }
  
  const currencyName = currency === 'MAD' ? 'Dirhams' : 'Euros';
  const centName = currency === 'MAD' ? 'centimes' : 'centimes';
  
  if (intPart > 0) {
    result += ' ' + (intPart === 1 ? currencyName.slice(0, -1) : currencyName);
  }
  
  if (decPart > 0) {
    result += ' et ' + convertHundreds(decPart) + ' ' + centName;
  }
  
  return result.trim();
};

const getMonthName = (monthOffset: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthOffset);
  return d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
};

const getMonthRange = (monthOffset: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthOffset);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
};

const getYearRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
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
  montant: number;
  montantTTC: number;
  solde: number;
  statut: string;
  isValidated: boolean;
  isInfo?: boolean;
}

type SortField = 'date' | 'type' | 'numero' | 'montant' | 'solde';
type SortDirection = 'asc' | 'desc';

interface MonthlyData {
  m6: number; m5: number; m4: number; m3: number; m2: number; m1: number; m0: number;
}

interface YearlyData {
  facturesClientsHT: number;
  facturesClientsTTC: number;
  facturesFournisseursTTC: number;
  blNonFactures: number;
}

export function DashboardView() {
  const [monthlyStats, setMonthlyStats] = useState({
    facturesClientsHT: { m6: 0, m5: 0, m4: 0, m3: 0, m2: 0, m1: 0, m0: 0 } as MonthlyData,
    facturesClientsTTC: { m6: 0, m5: 0, m4: 0, m3: 0, m2: 0, m1: 0, m0: 0 } as MonthlyData,
    facturesFournisseursTTC: { m6: 0, m5: 0, m4: 0, m3: 0, m2: 0, m1: 0, m0: 0 } as MonthlyData,
    blNonFactures: { m6: 0, m5: 0, m4: 0, m3: 0, m2: 0, m1: 0, m0: 0 } as MonthlyData
  });

  const [yearlyStats, setYearlyStats] = useState<YearlyData>({
    facturesClientsHT: 0,
    facturesClientsTTC: 0,
    facturesFournisseursTTC: 0,
    blNonFactures: 0
  });

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
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [printCurrency, setPrintCurrency] = useState<'MAD' | 'EUR'>('MAD');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [fc, ff, bl] = await Promise.all([
          fetch('/api/factures-clients').then(r => r.json()).catch(() => []),
          fetch('/api/factures-fournisseurs').then(r => r.json()).catch(() => []),
          fetch('/api/bons-livraison').then(r => r.json()).catch(() => []),
        ]);
        
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
        
        const calcYearlyTotal = (items: any[], dateField: string, valueField: string = 'totalHT'): number => {
          const yearRange = getYearRange();
          return items
            .filter((item: any) => {
              const date = new Date(item[dateField]);
              return date >= yearRange.start && date <= yearRange.end;
            })
            .reduce((sum: number, item: any) => sum + (item[valueField] || 0), 0);
        };
        
        // Factures Clients HT et TTC
        const fcHTTotals = calcMonthlyTotals(Array.isArray(fc) ? fc : [], 'dateFacture', 'totalHT');
        const fcTTCTotals = calcMonthlyTotals(Array.isArray(fc) ? fc : [], 'dateFacture', 'totalTTC');
        
        // Factures Fournisseurs TTC
        const ffTTCTotals = calcMonthlyTotals(Array.isArray(ff) ? ff : [], 'dateFacture', 'totalTTC');
        
        // BL non facturés = Total BL - BL transformés en factures
        const allBL = Array.isArray(bl) ? bl : [];
        const blTotalsAll = calcMonthlyTotals(allBL, 'dateBL', 'totalHT');
        // BL transformés en factures (ceux avec factureId ou statut = 'FACTURE')
        const blFactures = allBL.filter((b: any) => b.factureId || b.statut === 'FACTURE');
        const blFacturesTotals = calcMonthlyTotals(blFactures, 'dateBL', 'totalHT');
        // BL non facturés = Total BL - BL facturés
        const blNonFacturesTotals: MonthlyData = {
          m6: blTotalsAll.m6 - blFacturesTotals.m6,
          m5: blTotalsAll.m5 - blFacturesTotals.m5,
          m4: blTotalsAll.m4 - blFacturesTotals.m4,
          m3: blTotalsAll.m3 - blFacturesTotals.m3,
          m2: blTotalsAll.m2 - blFacturesTotals.m2,
          m1: blTotalsAll.m1 - blFacturesTotals.m1,
          m0: blTotalsAll.m0 - blFacturesTotals.m0
        };
        
        // Yearly totals
        const fcHTYearly = calcYearlyTotal(Array.isArray(fc) ? fc : [], 'dateFacture', 'totalHT');
        const fcTTCYearly = calcYearlyTotal(Array.isArray(fc) ? fc : [], 'dateFacture', 'totalTTC');
        const ffTTCYearly = calcYearlyTotal(Array.isArray(ff) ? ff : [], 'dateFacture', 'totalTTC');
        const blAllYearly = calcYearlyTotal(allBL, 'dateBL', 'totalHT');
        const blFacturesYearly = calcYearlyTotal(blFactures, 'dateBL', 'totalHT');
        const blNonFacturesYearly = blAllYearly - blFacturesYearly;
        
        setMonthlyStats({
          facturesClientsHT: fcHTTotals,
          facturesClientsTTC: fcTTCTotals,
          facturesFournisseursTTC: ffTTCTotals,
          blNonFactures: blNonFacturesTotals
        });
        
        setYearlyStats({
          facturesClientsHT: fcHTYearly,
          facturesClientsTTC: fcTTCYearly,
          facturesFournisseursTTC: ffTTCYearly,
          blNonFactures: blNonFacturesYearly
        });
      } catch (e) { console.error(e); }
    };
    fetchStats();
  }, []);

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
    setReleveForm({ tierType: 'CLIENT', tierId: '', dateFrom: '', dateTo: '' });
    setReleveDialogOpen(true);
  };

  const generateReleve = async () => {
    if (!releveForm.tierId) { alert('Sélectionnez un tiers'); return; }
    const tier = tiersList.find(t => t.id === releveForm.tierId);
    setReleveTier(tier || null);
    const isClient = releveForm.tierType === 'CLIENT';
    const dateFrom = releveForm.dateFrom ? new Date(releveForm.dateFrom) : null;
    const dateTo = releveForm.dateTo ? new Date(releveForm.dateTo + 'T23:59:59') : null;
    const lines: ReleveLine[] = [];
    try {
      const facturesUrl = isClient ? '/api/factures-clients' : '/api/factures-fournisseurs';
      const factures = await fetch(facturesUrl).then(r => r.json()).catch(() => []);
      if (Array.isArray(factures)) {
        factures.filter((f: any) => {
          const tierField = isClient ? 'clientId' : 'fournisseurId';
          const matchTier = f[tierField] === releveForm.tierId;
          const date = new Date(f.dateFacture);
          return matchTier && (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
        }).forEach((f: any) => {
          const isValidated = f.statut === 'VALIDEE';
          const montantTTC = f.totalTTC || 0;
          lines.push({
            date: new Date(f.dateFacture), dateStr: formatDate(f.dateFacture),
            type: isValidated ? 'Facture' : 'Facture (en attente)', numero: f.numero,
            montant: isClient ? montantTTC : -montantTTC, montantTTC, solde: 0,
            statut: f.statut, isValidated, isInfo: false
          });
        });
      }
      const reglementsUrl = isClient ? '/api/reglements-clients' : '/api/reglements-fournisseurs';
      const reglements = await fetch(reglementsUrl).then(r => r.json()).catch(() => []);
      if (Array.isArray(reglements)) {
        reglements.filter((r: any) => {
          const facture = r.facture;
          if (!facture) return false;
          const tierField = isClient ? 'clientId' : 'fournisseurId';
          const matchTier = facture[tierField] === releveForm.tierId;
          const date = new Date(r.dateReglement);
          return matchTier && (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
        }).forEach((r: any) => {
          const isValidated = r.statut === 'VALIDE';
          const montantRgl = r.montant || 0;
          lines.push({
            date: new Date(r.dateReglement), dateStr: formatDate(r.dateReglement),
            type: isValidated ? 'Règlement' : 'Règlement (en attente)', numero: r.numero || r.reference || '-',
            montant: isClient ? -montantRgl : montantRgl, montantTTC: 0, solde: 0,
            statut: r.statut, isValidated, isInfo: false
          });
        });
      }
      if (isClient) {
        const bl = await fetch('/api/bons-livraison').then(r => r.json()).catch(() => []);
        if (Array.isArray(bl)) {
          bl.filter((b: any) => {
            const matchTier = b.clientId === releveForm.tierId;
            const date = new Date(b.dateBL);
            return matchTier && (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
          }).forEach((b: any) => {
            lines.push({
              date: new Date(b.dateBL), dateStr: formatDate(b.dateBL),
              type: 'Bon de Livraison (info)', numero: b.numero,
              montant: 0, montantTTC: 0, solde: 0,
              statut: b.statut, isValidated: true, isInfo: true
            });
          });
        }
      }
      lines.sort((a, b) => a.date.getTime() - b.date.getTime());
      let runningSolde = 0;
      lines.forEach(line => { if (!line.isInfo) runningSolde += line.montant; line.solde = runningSolde; });
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
        if (typeof valA === 'string') return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
      setReleveData(sorted);
      setReleveDialogOpen(false);
      setReleveResultOpen(true);
    } catch (e) { console.error(e); alert('Erreur lors de la génération du relevé'); }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
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
        if (typeof valA === 'string') return newDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
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
    const headers = ['Date', 'Type', 'Numéro', 'Montant', 'Montant TTC', 'Solde', 'Statut'];
    const csvRows = [headers.join(';')];
    releveData.forEach(line => {
      csvRows.push([line.dateStr, line.type, line.numero, line.montant.toFixed(2).replace('.', ','),
        line.montantTTC > 0 ? line.montantTTC.toFixed(2).replace('.', ',') : '', line.solde.toFixed(2).replace('.', ','),
        line.isInfo ? 'INFO' : (line.isValidated ? 'Validé' : 'En attente')].join(';'));
    });
    csvRows.push(['', 'TOTAL', '', releveData.reduce((s, l) => s + l.montant, 0).toFixed(2).replace('.', ','), '', '', ''].join(';'));
    const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
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
    const totalMontant = Math.abs(releveData.reduce((s, l) => s + l.montant, 0));
    const amountInWords = numberToWords(totalMontant, printCurrency);
    const currencyLabel = printCurrency === 'MAD' ? 'Dirhams Marocain' : 'Euros';
    
    const html = `<!DOCTYPE html><html><head><title>Relevé ${releveTier?.raisonSociale || ''}</title>
      <style>@media print { body { margin: 0; padding: 0; } @page { margin: 1cm; size: A4; } table { page-break-inside: auto; } tr { page-break-inside: avoid; page-break-after: auto; } thead { display: table-header-group; } tfoot { display: table-footer-group; } }
      body { font-family: Arial, sans-serif; padding: 20px; font-size: 10pt; } h1 { color: #16a34a; font-size: 16pt; margin-bottom: 5px; } h2 { color: #15803d; font-size: 12pt; margin-top: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; } th { background: #16a34a; color: white; padding: 6px 4px; text-align: left; font-size: 9pt; } td { padding: 5px 4px; border-bottom: 1px solid #ddd; font-size: 9pt; }
      .text-right { text-align: right; } .total-row { font-weight: bold; background: #dcfce7; } .pending { color: #d97706; font-style: italic; } .info { color: #6b7280; font-style: italic; }
      .footer { margin-top: 20px; font-size: 8pt; color: #666; } .soldes { margin-top: 15px; padding: 10px; background: #dcfce7; border-radius: 6px; } .soldes-row { display: flex; justify-content: space-between; margin: 3px 0; }
      .negative { color: #dc2626; } .positive { color: #16a34a; } .amount-words { margin-top: 20px; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 6px; font-weight: bold; }</style></head>
      <body><h1>Relevé de compte</h1><h2>${releveTier?.raisonSociale || ''}</h2><p>Période: ${releveForm.dateFrom || 'Début'} - ${releveForm.dateTo || 'Fin'}</p>
      <table><thead><tr><th>Date</th><th>Type</th><th>N°</th><th class="text-right">Montant TTC</th><th class="text-right">Montant</th><th class="text-right">Solde</th></tr></thead>
      <tbody>${releveData.map(l => `<tr class="${l.isInfo ? 'info' : (!l.isValidated ? 'pending' : '')}"><td>${l.dateStr}</td><td>${l.type}</td><td>${l.numero}</td>
      <td class="text-right">${l.montantTTC > 0 ? l.montantTTC.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
      <td class="text-right ${l.montant < 0 ? 'negative' : 'positive'}">${l.montant !== 0 ? Math.abs(l.montant).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (l.montant < 0 ? ' (D)' : ' (C)') : ''}</td>
      <td class="text-right" style="font-weight:bold;">${Math.abs(l.solde).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${l.solde >= 0 ? (isClient ? '(C)' : '(D)') : (isClient ? '(D)' : '(C)')}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="3">TOTAL</td><td></td><td class="text-right">${totalMontant.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td></td></tr></tbody></table>
      <div class="soldes"><div class="soldes-row"><strong>Solde Final:</strong><span>${Math.abs(finalSolde).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${finalSolde >= 0 ? (isClient ? 'Créditeur' : 'Débiteur') : (isClient ? 'Débiteur' : 'Créditeur')}</span></div></div>
      <div class="amount-words">Soit le montant à payer de : <strong>${amountInWords}</strong> en ${currencyLabel} (${printCurrency})</div>
      <div class="footer"><p>Document généré le ${formatDate(new Date())}</p></div></body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const tableRows = [
    { label: 'Factures Clients HT', data: monthlyStats.facturesClientsHT, yearly: yearlyStats.facturesClientsHT, isTTC: false },
    { label: 'Factures Clients TTC', data: monthlyStats.facturesClientsTTC, yearly: yearlyStats.facturesClientsTTC, isTTC: true },
    { label: 'BL non facturés', data: monthlyStats.blNonFactures, yearly: yearlyStats.blNonFactures, isTTC: false },
    { label: 'Factures Fourn. TTC', data: monthlyStats.facturesFournisseursTTC, yearly: yearlyStats.facturesFournisseursTTC, isTTC: true },
  ];

  const finalSolde = releveData.length > 0 ? releveData[0].solde : 0;
  const isClient = releveForm.tierType === 'CLIENT';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-green-700">Tableau de bord</h1>
          <p className="text-muted-foreground">Bienvenue sur RGM V2.04</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-mono font-bold">TDB01</span>
          <Button className="bg-green-600 hover:bg-green-700" onClick={openReleveDialog}>
            <Calculator className="w-4 h-4 mr-2" />Relevé Tiers
          </Button>
        </div>
      </div>

      <div className="bg-green-50 rounded-lg border border-green-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-green-100 hover:bg-green-100">
              <TableHead className="font-bold text-green-700 border-r border-green-200">Libellé</TableHead>
              <TableHead className="text-center font-bold text-green-700 bg-green-200">Ce mois</TableHead>
              <TableHead className="text-center font-bold text-green-700">m-1</TableHead>
              <TableHead className="text-center font-bold text-green-700">m-2</TableHead>
              <TableHead className="text-center font-bold text-green-700">m-3</TableHead>
              <TableHead className="text-center font-bold text-green-700">m-4</TableHead>
              <TableHead className="text-center font-bold text-green-700">m-5</TableHead>
              <TableHead className="text-center font-bold text-green-700">m-6</TableHead>
              <TableHead className="text-center font-bold text-green-700 bg-green-300">Cumul Année</TableHead>
            </TableRow>
            <TableRow className="bg-green-50 hover:bg-green-50">
              <TableHead className="border-r border-green-200"></TableHead>
              {[0, 1, 2, 3, 4, 5, 6].map((m) => (
                <TableHead key={m} className={`text-center text-xs text-green-600 ${m === 0 ? 'bg-green-100' : ''}`}>
                  {getMonthName(m)}
                </TableHead>
              ))}
              <TableHead className="text-center text-xs text-green-600 bg-green-200">{new Date().getFullYear()}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableRows.map((row, idx) => (
              <TableRow key={idx} className="hover:bg-green-100/50">
                <TableCell className={`font-medium text-green-800 border-r border-green-200 ${row.isTTC ? 'text-xs' : ''}`}>{row.label}</TableCell>
                {[0, 1, 2, 3, 4, 5, 6].map((m) => {
                  const key = `m${m}` as keyof MonthlyData;
                  return (
                    <TableCell key={m} className={`text-right font-mono ${m === 0 ? 'bg-green-100 font-bold' : ''} ${row.isTTC ? 'text-xs' : ''}`}>
                      {formatCurrency(row.data[key])}
                    </TableCell>
                  );
                })}
                <TableCell className={`text-right font-mono bg-green-200 font-bold ${row.isTTC ? 'text-xs' : ''}`}>
                  {formatCurrency(row.yearly)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={releveDialogOpen} onOpenChange={setReleveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Relevé Tiers</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Type de tiers</Label>
              <Select value={releveForm.tierType} onValueChange={(v) => setReleveForm({ ...releveForm, tierType: v, tierId: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="CLIENT">Client</SelectItem><SelectItem value="FOURNISSEUR">Fournisseur</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>{releveForm.tierType === 'CLIENT' ? 'Client' : 'Fournisseur'}</Label>
              <Select value={releveForm.tierId} onValueChange={(v) => setReleveForm({ ...releveForm, tierId: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>{tiersList.map((t) => (<SelectItem key={t.id} value={t.id}>{t.raisonSociale}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date début</Label><Input type="date" value={releveForm.dateFrom} onChange={(e) => setReleveForm({ ...releveForm, dateFrom: e.target.value })} /></div>
              <div><Label>Date fin</Label><Input type="date" value={releveForm.dateTo} onChange={(e) => setReleveForm({ ...releveForm, dateTo: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleveDialogOpen(false)}>Annuler</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={generateReleve}>Générer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={releveResultOpen} onOpenChange={setReleveResultOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div><DialogTitle>Relevé de compte</DialogTitle><p className="text-sm text-muted-foreground">{releveTier?.raisonSociale}</p></div>
              <div className="flex gap-2 items-center">
                <Select value={printCurrency} onValueChange={(v) => setPrintCurrency(v as 'MAD' | 'EUR')}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="MAD">MAD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={exportReleveCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
                <Button size="sm" variant="outline" onClick={printReleve}><Printer className="w-4 h-4 mr-1" />Imprimer</Button>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            {releveData.length === 0 ? (<div className="text-center text-muted-foreground py-8">Aucune donnée sur la période</div>) : (
              <>
                <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-sm text-green-600 font-medium">Solde Final:</span>
                  <div className="text-xl font-bold text-green-700">{formatCurrency(Math.abs(finalSolde))}
                    <span className="text-sm ml-2">{finalSolde >= 0 ? (isClient ? 'Créditeur' : 'Débiteur') : (isClient ? 'Débiteur' : 'Créditeur')}</span>
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
                      <TableRow key={idx} className={line.isInfo ? 'bg-gray-100' : (!line.isValidated ? 'bg-yellow-50' : '')}>
                        <TableCell>{line.dateStr}</TableCell>
                        <TableCell className={line.isInfo ? 'text-gray-500 italic' : (!line.isValidated ? 'text-yellow-700 italic' : '')}>{line.type}</TableCell>
                        <TableCell>{line.numero}</TableCell>
                        <TableCell className="text-right">{line.montantTTC > 0 ? formatCurrency(line.montantTTC) : ''}</TableCell>
                        <TableCell className={`text-right font-medium ${line.type.includes('Règlement') ? 'text-green-600' : line.type.includes('Facture') ? 'text-red-600' : ''}`}>
                          {line.montant !== 0 ? `${line.montant < 0 ? '-' : '+'}${formatCurrency(Math.abs(line.montant))}` : ''}
                        </TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(Math.abs(line.solde))}<span className="text-xs ml-1">{line.solde >= 0 ? (isClient ? '(C)' : '(D)') : (isClient ? '(D)' : '(C)')}</span></TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-green-50 font-bold"><TableCell colSpan={3}>TOTAL</TableCell><TableCell></TableCell><TableCell className="text-right">{formatCurrency(Math.abs(releveData.reduce((s, l) => s + l.montant, 0)))}</TableCell><TableCell></TableCell></TableRow>
                  </TableBody>
                </Table>
              </>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setReleveResultOpen(false)}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
