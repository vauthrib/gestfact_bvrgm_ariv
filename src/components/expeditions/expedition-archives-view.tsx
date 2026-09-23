'use client';

// V3.23 - Résumé des expéditions : un seul bouton, un tableau de tous les BL
// Filtres : date début / date fin, client, article, recherche libre.
// Remplace l'ancien bouton « Archiver l'expédition » par BL et la page NEXP01.

import { useEffect, useMemo, useState } from 'react';
import { Truck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QRCodeSVG } from 'qrcode.react';

interface LigneBL { articleId?: string; designation: string; quantite: number; }
interface BonLivraison {
  id: string; numero: string; dateBL: string; statut: string;
  client?: { raisonSociale: string } | null;
  lignes?: LigneBL[];
}

export function ExpeditionSummaryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [bons, setBons] = useState<BonLivraison[]>([]);
  const [archives, setArchives] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [clientId, setClientId] = useState('ALL');
  const [articleCode, setArticleCode] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch('/api/bons-livraison').then((r) => r.json()).catch(() => []),
      fetch('/api/expeditions').then((r) => r.json()).catch(() => []),
    ]).then(([bl, arch]) => {
      setBons(Array.isArray(bl) ? bl : []);
      setArchives(Array.isArray(arch) ? arch : []);
    }).finally(() => setLoading(false));
  }, [open]);

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    bons.forEach((b) => { if (b.client?.raisonSociale) map.set(b.client.raisonSociale, b.client.raisonSociale); });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [bons]);

  const articles = useMemo(() => {
    const set = new Set<string>();
    bons.forEach((b) => (b.lignes || []).forEach((l) => {
      if (l.designation) {
        const code = l.designation.split('\n')[0].split(' - ')[0].trim();
        if (code) set.add(code);
      }
    }));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [bons]);

  const tokensByBL = useMemo(() => {
    const map = new Map<string, string[]>();
    archives.forEach((a) => {
      if (a.blId && Array.isArray(a.contenants)) {
        map.set(a.blId, a.contenants.map((c: any) => c.qrToken).filter(Boolean));
      }
    });
    return map;
  }, [archives]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bons
      .filter((b) => {
        const d = new Date(b.dateBL);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
        if (clientId !== 'ALL' && b.client?.raisonSociale !== clientId) return false;
        const lignes = b.lignes || [];
        if (articleCode !== 'ALL' && !lignes.some((l) => (l.designation || '').split('\n')[0].split(' - ')[0].trim() === articleCode)) return false;
        if (q) {
          const lignesTxt = lignes.map((l) => l.designation || '').join(' ').toLowerCase();
          if (!`${b.numero} ${b.client?.raisonSociale || ''} ${lignesTxt}`.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.dateBL).getTime() - new Date(a.dateBL).getTime());
  }, [bons, dateFrom, dateTo, clientId, articleCode, search]);

  const totalLignes = rows.reduce((s, b) => s + (b.lignes || []).length, 0);

  const resetFilters = () => { setDateFrom(''); setDateTo(''); setClientId('ALL'); setArticleCode('ALL'); setSearch(''); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1400px] w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-blue-700"><Truck className="h-5 w-5" />Résumé des expéditions — Tous les BL</DialogTitle>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">NEXP01</span>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div>
            <Label>Date début</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label>Date fin</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div>
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
            <SelectContent className="max-h-[300px]">
                <SelectItem value="ALL">Tous les clients</SelectItem>
                {clients.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Article</Label>
            <Select value={articleCode} onValueChange={setArticleCode}>
              <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="ALL">Tous les articles</SelectItem>
                {articles.map((a) => (<SelectItem key={a} value={a} className="whitespace-normal">{a}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Recherche</Label>
            <Input placeholder="BL, client, désignation..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" onClick={resetFilters}><X className="h-4 w-4 mr-1" />Effacer</Button>
        </div>

        {loading ? (
          <p className="py-6 text-center text-muted-foreground">Chargement...</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">Aucun BL pour ces filtres</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{rows.length} BL · {totalLignes} ligne(s) article</p>
            <div className="overflow-x-auto">
              <Table className="table-fixed min-w-[1050px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">N° BL</TableHead>
                    <TableHead className="w-[95px]">Date</TableHead>
                    <TableHead className="w-[160px]">Client</TableHead>
                    <TableHead className="w-[300px]">Article / Désignation</TableHead>
                    <TableHead className="w-[80px]">Qté</TableHead>
                    <TableHead className="w-[80px]">Total BL</TableHead>
                    <TableHead className="w-[120px]">N° contenant</TableHead>
                    <TableHead className="w-[70px]">QR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.flatMap((b) => {
                    const tokens = tokensByBL.get(b.id) || [];
                    const lignes = (b.lignes || []).length > 0 ? b.lignes! : [{ designation: '-', quantite: 0 }];
                    return lignes.map((l, li) => {
                      const token = tokens[li] || tokens[0];
                      const qrUrl = token ? `${typeof window !== 'undefined' ? window.location.origin : ''}/contenant/${encodeURIComponent(token)}` : '';
                      return (
                        <TableRow key={`${b.id}-${li}`}>
                          {li === 0 && (
                            <>
                              <TableCell className="font-mono align-top" rowSpan={lignes.length}>{b.numero}</TableCell>
                              <TableCell className="align-top" rowSpan={lignes.length}>{new Date(b.dateBL).toLocaleDateString('fr-FR')}</TableCell>
                              <TableCell className="whitespace-normal break-words align-top" rowSpan={lignes.length}>{b.client?.raisonSociale || '-'}</TableCell>
                            </>
                          )}
                          <TableCell className="whitespace-normal break-words">{l.designation || '-'}</TableCell>
                          <TableCell>{l.quantite}</TableCell>
                          {li === 0 && (
                            <TableCell className="align-top" rowSpan={lignes.length}>
                              {lignes.reduce((s, x) => s + Number(x.quantite || 0), 0)}
                            </TableCell>
                          )}
                          <TableCell className="font-mono">{token ? String((li % Math.max(tokens.length, 1))).padStart(3, '0') : '-'}</TableCell>
                          <TableCell>{qrUrl && <QRCodeSVG value={qrUrl} size={40} level="M" />}</TableCell>
                        </TableRow>
                      );
                    });
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
