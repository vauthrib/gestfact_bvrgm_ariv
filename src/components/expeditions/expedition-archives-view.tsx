'use client';

// V3.24 - NEXP01 : tableau croisé expéditions
// Lignes = BL, colonnes = articles (texte vertical), cellules = quantités.
// Somme des cellules sélectionnées (clic / glisser) + somme par colonne.
// Filtres : date début / date fin, client, article (par articleId).

import { useEffect, useMemo, useState } from 'react';
import { Truck, X, Sigma } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LigneBL { articleId?: string; designation: string; quantite: number; }
interface BonLivraison {
  id: string; numero: string; dateBL: string; statut: string;
  client?: { raisonSociale: string } | null;
  lignes?: LigneBL[];
}
interface Article { id: string; code: string; designation: string; }

export function ExpeditionSummaryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [bons, setBons] = useState<BonLivraison[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [clientId, setClientId] = useState('ALL');
  const [articleId, setArticleId] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      fetch('/api/bons-livraison').then((r) => r.json()).catch(() => []),
      fetch('/api/articles').then((r) => r.json()).catch(() => []),
    ]).then(([bl, arts]) => {
      setBons(Array.isArray(bl) ? bl : []);
      setArticles(Array.isArray(arts) ? arts : []);
    }).finally(() => setLoading(false));
  }, [open]);

  // Clients triés
  const clients = useMemo(() => {
    const map = new Map<string, string>();
    bons.forEach((b) => { if (b.client?.raisonSociale) map.set(b.client.raisonSociale, b.client.raisonSociale); });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [bons]);

  // Articles utilisés dans les BL filtrés par date/client/recherche (avant filtre article)
  const usedArticles = useMemo(() => {
    const ids = new Set<string>();
    bons.forEach((b) => {
      const d = new Date(b.dateBL);
      if (dateFrom && d < new Date(dateFrom)) return;
      if (dateTo && d > new Date(dateTo + 'T23:59:59')) return;
      if (clientId !== 'ALL' && b.client?.raisonSociale !== clientId) return;
      const q = search.trim().toLowerCase();
      if (q && !`${b.numero} ${b.client?.raisonSociale || ''} ${(b.lignes || []).map((l) => l.designation || '').join(' ')}`.toLowerCase().includes(q)) return;
      (b.lignes || []).forEach((l) => { if (l.articleId) ids.add(l.articleId); });
    });
    return articles.filter((a) => ids.has(a.id));
  }, [bons, articles, dateFrom, dateTo, clientId, search]);

  // Colonnes : tous les articles si "Tous", sinon l'article choisi
  const columns = useMemo(() => {
    if (articleId === 'ALL') return usedArticles;
    return usedArticles.filter((a) => a.id === articleId);
  }, [usedArticles, articleId]);

  // BL filtrés (y compris par article : le BL doit contenir l'article choisi)
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bons
      .filter((b) => {
        const d = new Date(b.dateBL);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
        if (clientId !== 'ALL' && b.client?.raisonSociale !== clientId) return false;
        const lignes = b.lignes || [];
        if (articleId !== 'ALL' && !lignes.some((l) => l.articleId === articleId)) return false;
        if (q) {
          const lignesTxt = lignes.map((l) => l.designation || '').join(' ').toLowerCase();
          if (!`${b.numero} ${b.client?.raisonSociale || ''} ${lignesTxt}`.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.dateBL).getTime() - new Date(a.dateBL).getTime());
  }, [bons, dateFrom, dateTo, clientId, articleId, search]);

  // Quantité d'un article dans un BL
  const qteOf = (b: BonLivraison, artId: string) =>
    (b.lignes || []).filter((l) => l.articleId === artId).reduce((s, l) => s + Number(l.quantite || 0), 0);

  // Sommes par colonne
  const colTotals = useMemo(() => {
    const map = new Map<string, number>();
    columns.forEach((a) => {
      map.set(a.id, rows.reduce((s, b) => s + qteOf(b, a.id), 0));
    });
    return map;
  }, [columns, rows]);

  // Somme des cellules sélectionnées
  const selectionTotal = useMemo(() => {
    let total = 0;
    const artById = new Map(articles.map((a) => [a.id, a]));
    selectedCells.forEach((key) => {
      const [blId, artId] = key.split('|');
      const bl = rows.find((b) => b.id === blId);
      if (bl && artById.has(artId)) total += qteOf(bl, artId);
    });
    return total;
  }, [selectedCells, rows, articles]);

  const toggleCell = (blId: string, artId: string) => {
    const key = `${blId}|${artId}`;
    setSelectedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const cellProps = (blId: string, artId: string, value: number) => ({
    onMouseDown: () => { setDragging(true); toggleCell(blId, artId); },
    onMouseEnter: () => { if (dragging && value > 0) { const key = `${blId}|${artId}`; if (!selectedCells.has(key)) toggleCell(blId, artId); } },
    className: `cursor-pointer text-center select-none ${selectedCells.has(`${blId}|${artId}`) ? 'bg-blue-200 font-bold' : 'hover:bg-muted'}`,
  });

  const clearSelection = () => setSelectedCells(new Set());
  const resetFilters = () => { setDateFrom(''); setDateTo(''); setClientId('ALL'); setArticleId('ALL'); setSearch(''); clearSelection(); };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) clearSelection(); }}>
      <DialogContent className="max-w-[1500px] w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto" onMouseUp={() => setDragging(false)} onMouseLeave={() => setDragging(false)}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-blue-700"><Truck className="h-5 w-5" />Résumé des expéditions — Tableau croisé</DialogTitle>
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
            <Select value={clientId} onValueChange={(v) => { setClientId(v); clearSelection(); }}>
              <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="ALL">Tous les clients</SelectItem>
                {clients.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Article</Label>
            <Select value={articleId} onValueChange={(v) => { setArticleId(v); clearSelection(); }}>
              <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="ALL">Tous les articles</SelectItem>
                {usedArticles.map((a) => (<SelectItem key={a.id} value={a.id} className="whitespace-normal">{a.code} - {a.designation}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Recherche</Label>
            <Input placeholder="BL, client, désignation..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" onClick={resetFilters}><X className="h-4 w-4 mr-1" />Effacer</Button>
        </div>

        {selectedCells.size > 0 && (
          <div className="flex items-center justify-between rounded border bg-blue-50 px-3 py-2">
            <span className="flex items-center gap-2 text-sm font-medium text-blue-700">
              <Sigma className="h-4 w-4" />Somme sélection : {selectedCells.size} cellule(s) = <b>{selectionTotal}</b>
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>Vider la sélection</Button>
          </div>
        )}

        {loading ? (
          <p className="py-6 text-center text-muted-foreground">Chargement...</p>
        ) : rows.length === 0 || columns.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">Aucun BL / article pour ces filtres</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{rows.length} BL · {columns.length} article(s) · Cliquez ou glissez sur les cellules pour additionner</p>
            <div className="overflow-x-auto">
              <Table className="table-auto border-collapse">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px] sticky left-0 bg-white z-10">N° BL</TableHead>
                    <TableHead className="w-[95px]">Date</TableHead>
                    <TableHead className="w-[160px]">Client</TableHead>
                    {columns.map((a) => (
                      <TableHead key={a.id} className="w-[44px] p-0 align-bottom border-l">
                        <div className="flex items-end justify-center" style={{ height: 180 }}>
                          <span className="whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                            {a.code}{a.designation ? ` · ${a.designation}` : ''}
                          </span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono sticky left-0 bg-white z-10">{b.numero}</TableCell>
                      <TableCell>{new Date(b.dateBL).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell className="whitespace-normal break-words">{b.client?.raisonSociale || '-'}</TableCell>
                      {columns.map((a) => {
                        const qte = qteOf(b, a.id);
                        return (
                          <TableCell key={a.id} {...cellProps(b.id, a.id, qte)}>
                            {qte > 0 ? qte : ''}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="sticky left-0 bg-white z-10 font-bold">Somme</TableCell>
                    <TableCell />
                    <TableCell />
                    {columns.map((a) => (
                      <TableCell key={a.id} className="text-center font-bold border-l">
                        {colTotals.get(a.id) || ''}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
