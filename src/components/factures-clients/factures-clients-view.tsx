'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/lib/user-context';
import { Permission, hasPermission } from '@/lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, CheckCircle, Download, Printer, ArrowUp, ArrowDown, ArrowUpDown, ListPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ExportDialog } from '@/components/import-export/export-dialog';
import { PrintDocument } from '@/components/print/print-document';

interface LigneFacture { id?: string; articleId?: string; designation: string; quantite: string; prixUnitaire: string; tauxTVA: string; totalHT: number; }
interface FactureClient { id: string; numero: string; dateFacture: string; clientId: string; bonCommande: string | null; numeroBL: string | null; dateEcheance: string; statut: string; infoLibre: string | null; notes: string | null; totalHT: number; totalTVA: number; totalTTC: number; client: { raisonSociale: string; adresse?: string; ville?: string; ice?: string }; lignes?: LigneFacture[]; }
interface Tiers { id: string; code: string; raisonSociale: string; type: string; }
interface Article { id: string; code: string; designation: string; prixUnitaire: number; tauxTVA: number; }
interface Parametres { 
  nomEntreprise: string; adresseEntreprise?: string; villeEntreprise?: string; 
  telephoneEntreprise?: string; emailEntreprise?: string; ice?: string; 
  rc?: string; rcLieu?: string; prefixeFacture?: string; numeroFactureDepart?: number;
  letterheadImage?: string | null; printLayout?: string | null;
}

const parseNumber = (v: string | number) => { if (!v) return 0; if (typeof v === 'number') return v; return parseFloat(v.replace(',', '.').replace(/\s/g, '')) || 0; };
const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH`;

type SortField = 'numero' | 'dateFacture' | 'client' | 'totalHT' | 'totalTVA' | 'totalTTC' | 'statut';
type SortDirection = 'asc' | 'desc';

export function FacturesClientsView() {
  const { user } = useUser();
  const permissions = user?.permissions as Permission[] || [];
  
  const canEdit = hasPermission(user?.role || '', permissions, 'factures.edit');
  const canCreate = hasPermission(user?.role || '', permissions, 'factures.create');
  const canValidate = hasPermission(user?.role || '', permissions, 'factures.validate');
  
  const [factures, setFactures] = useState<FactureClient[]>([]);
  const [clients, setClients] = useState<Tiers[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [parametres, setParametres] = useState<Parametres | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState<FactureClient | null>(null);
  const [editing, setEditing] = useState<FactureClient | null>(null);
  const [lignes, setLignes] = useState<LigneFacture[]>([{ designation: '', quantite: '1', prixUnitaire: '0', tauxTVA: '20', totalHT: 0 }]);
  const [formData, setFormData] = useState({ numero: '', dateFacture: new Date().toISOString().split('T')[0], clientId: '', bonCommande: '', numeroBL: '', dateEcheance: '', infoLibre: '', notes: '' });
  
  // Sorting and filtering
  const [sortField, setSortField] = useState<SortField>('dateFacture');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Code protection for validated documents
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<FactureClient | null>(null);

  // Multi-article dialog
  const [multiArticleDialogOpen, setMultiArticleDialogOpen] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);

  useEffect(() => { fetchFactures(); fetchClients(); fetchArticles(); fetchParametres(); }, []);
  
  useEffect(() => {
    if (dialogOpen) {
      fetchClients();
      fetchArticles();
      if (editing) {
        setFormData({
          numero: editing.numero,
          dateFacture: new Date(editing.dateFacture).toISOString().split('T')[0],
          clientId: editing.clientId,
          bonCommande: editing.bonCommande || '',
          numeroBL: editing.numeroBL || '',
          dateEcheance: editing.dateEcheance ? new Date(editing.dateEcheance).toISOString().split('T')[0] : '',
          infoLibre: editing.infoLibre || '',
          notes: editing.notes || ''
        });
        if (editing.lignes && editing.lignes.length > 0) {
          setLignes(editing.lignes.map(l => ({
            id: l.id, articleId: l.articleId, designation: l.designation,
            quantite: l.quantite.toString(), prixUnitaire: l.prixUnitaire.toString(),
            tauxTVA: l.tauxTVA.toString(), totalHT: l.totalHT
          })));
        }
      }
    }
  }, [dialogOpen, editing]);
  
  const fetchFactures = async () => { try { const res = await fetch('/api/factures-clients'); const d = await res.json(); setFactures(Array.isArray(d) ? d : []); } catch (e) { console.error(e); } finally { setLoading(false); } };
  const fetchClients = async () => { try { const res = await fetch('/api/tiers'); const d = await res.json(); setClients((Array.isArray(d) ? d : []).filter((t: any) => t.type === 'CLIENT')); } catch (e) { } };
  const fetchArticles = async () => { try { const res = await fetch('/api/articles'); const d = await res.json(); setArticles(Array.isArray(d) ? d : []); } catch (e) { } };
  const fetchParametres = async () => { try { const res = await fetch('/api/parametres'); const d = await res.json(); setParametres(d); } catch (e) { } };

  // Sorted lists for dropdowns
  const sortedClients = [...clients].sort((a, b) => a.raisonSociale.localeCompare(b.raisonSociale));
  const sortedArticles = [...articles].sort((a, b) => a.designation.localeCompare(b.designation));

  const calcTotalHT = () => lignes.reduce((s, l) => s + (l.totalHT || 0), 0);
  const calcTotalTVA = () => lignes.reduce((s, l) => s + ((l.totalHT || 0) * parseNumber(l.tauxTVA) / 100), 0);
  const calcTotalTTC = () => calcTotalHT() + calcTotalTVA();

  const updateLigne = (idx: number, field: keyof LigneFacture, val: string) => {
    const newLignes = [...lignes];
    if (field === 'articleId') {
      const art = articles.find(a => a.id === val);
      if (art) newLignes[idx] = { ...newLignes[idx], articleId: val, designation: art.designation, prixUnitaire: art.prixUnitaire.toString(), tauxTVA: art.tauxTVA.toString(), totalHT: parseNumber(newLignes[idx].quantite) * art.prixUnitaire };
    } else if (field === 'quantite' || field === 'prixUnitaire') {
      newLignes[idx] = { ...newLignes[idx], [field]: val };
      const q = field === 'quantite' ? parseNumber(val) : parseNumber(newLignes[idx].quantite);
      const p = field === 'prixUnitaire' ? parseNumber(val) : parseNumber(newLignes[idx].prixUnitaire);
      newLignes[idx].totalHT = q * p;
    } else { newLignes[idx] = { ...newLignes[idx], [field]: val }; }
    setLignes(newLignes);
  };

  const addLigne = () => setLignes([...lignes, { designation: '', quantite: '1', prixUnitaire: '0', tauxTVA: '20', totalHT: 0 }]);
  const removeLigne = (i: number) => { if (lignes.length > 1) setLignes(lignes.filter((_, idx) => idx !== i)); };

  // Add multiple articles
  const handleAddMultipleArticles = () => {
    const newLignes = selectedArticles.map(articleId => {
      const art = articles.find(a => a.id === articleId);
      if (art) {
        return {
          articleId: art.id,
          designation: art.designation,
          quantite: '1',
          prixUnitaire: art.prixUnitaire.toString(),
          tauxTVA: art.tauxTVA.toString(),
          totalHT: art.prixUnitaire
        };
      }
      return null;
    }).filter((l): l is LigneFacture => l !== null);
    
    setLignes([...lignes, ...newLignes]);
    setSelectedArticles([]);
    setMultiArticleDialogOpen(false);
  };

  const toggleArticleSelection = (articleId: string) => {
    setSelectedArticles(prev => 
      prev.includes(articleId) 
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) { alert('Sélectionnez un client'); return; }
    const validLignes = lignes.filter(l => l.designation.trim() && parseNumber(l.quantite) > 0);
    if (validLignes.length === 0) { alert('Ajoutez au moins une ligne'); return; }
    try {
      const res = await fetch('/api/factures-clients', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData, id: editing?.id,
          dateEcheance: formData.dateEcheance || formData.dateFacture,
          lignes: validLignes.map(l => ({ ...l, quantite: parseNumber(l.quantite), prixUnitaire: parseNumber(l.prixUnitaire), tauxTVA: parseNumber(l.tauxTVA), totalHT: l.totalHT })),
          totalHT: calcTotalHT(), totalTVA: calcTotalTVA(), totalTTC: calcTotalTTC()
        })
      });
      if (res.ok) { setDialogOpen(false); resetForm(); fetchFactures(); }
      else { const err = await res.json(); alert(err.error || 'Erreur'); }
    } catch (e) { console.error(e); alert('Erreur serveur'); }
  };

  const handleValidate = async (id: string) => { if (!confirm('Valider ?')) return; try { const res = await fetch(`/api/factures-clients/${id}/validate`, { method: 'POST' }); if (res.ok) fetchFactures(); else { const err = await res.json(); alert(err.error || 'Erreur'); } } catch (e) { } };
  const handleDelete = async (id: string) => { if (!confirm('Supprimer ?')) return; try { await fetch(`/api/factures-clients?id=${id}`, { method: 'DELETE' }); fetchFactures(); } catch (e) { } };

  const handlePrint = async (facture: FactureClient) => {
    try {
      const res = await fetch('/api/factures-clients');
      const allFactures = await res.json();
      const fullFacture = allFactures.find((f: any) => f.id === facture.id);
      setSelectedFacture(fullFacture || facture);
      setPrintOpen(true);
    } catch (e) { setSelectedFacture(facture); setPrintOpen(true); }
  };

  const openEditDialog = async (facture: FactureClient) => {
    // Si la facture est validée, demander le code
    if (facture.statut === 'VALIDEE') {
      setPendingEdit(facture);
      setCodeInput('');
      setCodeError(false);
      setCodeDialogOpen(true);
      return;
    }
    // Sinon, ouvrir directement le dialogue
    try {
      const res = await fetch('/api/factures-clients');
      const allFactures = await res.json();
      const fullFacture = allFactures.find((f: any) => f.id === facture.id);
      setEditing(fullFacture || facture);
    } catch (e) { setEditing(facture); }
    setDialogOpen(true);
  };

  const handleCodeSubmit = async () => {
    if (codeInput === '1111') {
      setCodeDialogOpen(false);
      if (pendingEdit) {
        try {
          const res = await fetch('/api/factures-clients');
          const allFactures = await res.json();
          const fullFacture = allFactures.find((f: any) => f.id === pendingEdit.id);
          setEditing(fullFacture || pendingEdit);
        } catch (e) { setEditing(pendingEdit); }
        setDialogOpen(true);
      }
      setPendingEdit(null);
    } else {
      setCodeError(true);
      setTimeout(() => setCodeError(false), 2000);
    }
  };

  const resetForm = () => { 
    setFormData({ numero: '', dateFacture: new Date().toISOString().split('T')[0], clientId: '', bonCommande: '', numeroBL: '', dateEcheance: '', infoLibre: '', notes: '' }); 
    setLignes([{ designation: '', quantite: '1', prixUnitaire: '0', tauxTVA: '20', totalHT: 0 }]); 
    setEditing(null); 
  };

  const getProchainNumero = () => {
    const prefixe = parametres?.prefixeFacture || 'FC';
    const numeroDepart = parametres?.numeroFactureDepart || 1;
    return `${prefixe}${(numeroDepart + factures.length).toString().padStart(5, '0')}`;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 inline opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1 inline" /> : <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  // Filter and sort data
  const filtered = factures
    .filter(f => {
      const matchSearch = f.numero?.toLowerCase().includes(search.toLowerCase()) || f.client?.raisonSociale?.toLowerCase().includes(search.toLowerCase());
      const factureDate = new Date(f.dateFacture);
      const matchDateFrom = !dateFrom || factureDate >= new Date(dateFrom);
      const matchDateTo = !dateTo || factureDate <= new Date(dateTo + 'T23:59:59');
      return matchSearch && matchDateFrom && matchDateTo;
    })
    .sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case 'numero': valA = a.numero; valB = b.numero; break;
        case 'dateFacture': valA = new Date(a.dateFacture).getTime(); valB = new Date(b.dateFacture).getTime(); break;
        case 'client': valA = a.client?.raisonSociale || ''; valB = b.client?.raisonSociale || ''; break;
        case 'totalHT': valA = a.totalHT; valB = b.totalHT; break;
        case 'totalTVA': valA = a.totalTVA; valB = b.totalTVA; break;
        case 'totalTTC': valA = a.totalTTC; valB = b.totalTTC; break;
        case 'statut': valA = a.statut; valB = b.statut; break;
        default: return 0;
      }
      if (typeof valA === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-green-700">Factures Clients</h1><p className="text-muted-foreground">Gérez vos factures</p></div>
        <div className="flex items-center gap-2">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-mono font-bold">NFC01</span>
          <Button variant="outline" onClick={() => setExportOpen(true)}><Download className="w-4 h-4 mr-2" />Export</Button>
          {canCreate && (
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => { resetForm(); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nouveau</Button>
          )}
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Liste</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Du:</span>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Au:</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Effacer</Button>
            )}
          </div>
          {filtered.length === 0 ? <div className="text-center text-muted-foreground py-8">Aucune facture</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('numero')}>N° <SortIcon field="numero" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('dateFacture')}>Date <SortIcon field="dateFacture" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('client')}>Client <SortIcon field="client" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('totalHT')}>Total HT <SortIcon field="totalHT" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('totalTVA')}>TVA <SortIcon field="totalTVA" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('totalTTC')}>Total TTC <SortIcon field="totalTTC" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('statut')}>Statut <SortIcon field="statut" /></TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{filtered.map((f) => (<TableRow key={f.id}>
                <TableCell className="font-medium">{f.numero}</TableCell>
                <TableCell>{new Date(f.dateFacture).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell>{f.client?.raisonSociale}</TableCell>
                <TableCell>{formatCurrency(f.totalHT)}</TableCell>
                <TableCell>{formatCurrency(f.totalTVA)}</TableCell>
                <TableCell>{formatCurrency(f.totalTTC)}</TableCell>
                <TableCell><span className={`px-2 py-1 rounded text-xs ${f.statut === 'VALIDEE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{f.statut === 'VALIDEE' ? 'Validée' : 'Brouillon'}</span></TableCell>
                <TableCell><div className="flex gap-1 flex-wrap">
                  {f.statut === 'BROUILLON' && canValidate && <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleValidate(f.id)} title="Valider"><CheckCircle className="h-4 w-4" /></Button>}
                  <Button size="sm" variant="outline" onClick={() => handlePrint(f)} title="Imprimer"><Printer className="h-4 w-4" /></Button>
                  {canEdit && <Button size="sm" variant="outline" onClick={() => openEditDialog(f)} title="Modifier"><Pencil className="h-4 w-4" /></Button>}
                  {canEdit && <Button size="sm" variant="destructive" onClick={() => handleDelete(f.id)} disabled={f.statut === 'VALIDEE'} title="Supprimer"><Trash2 className="h-4 w-4" /></Button>}
                </div></TableCell>
              </TableRow>))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-[8000px] w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{editing ? 'Modifier' : 'Nouveau'} Facture</DialogTitle>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-mono font-bold">NFC01-DLG</span>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>N° Facture</Label>
                {editing ? (
                  <Input value={formData.numero} disabled className="bg-gray-100" />
                ) : (
                  <div className="space-y-1">
                    <Input value={getProchainNumero()} disabled className="bg-gray-100 font-bold text-green-700" />
                    <span className="text-xs text-muted-foreground">(Numéro automatique)</span>
                  </div>
                )}
              </div>
              <div><Label>Date</Label><Input type="date" value={formData.dateFacture} onChange={(e) => setFormData({ ...formData, dateFacture: e.target.value })} required /></div>
              <div><Label>Échéance</Label><Input type="date" value={formData.dateEcheance} onChange={(e) => setFormData({ ...formData, dateEcheance: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Client</Label><Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{sortedClients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.raisonSociale}</SelectItem>))}</SelectContent></Select></div>
              <div><Label>Bon de commande</Label><Input placeholder="N° BC client" value={formData.bonCommande} onChange={(e) => setFormData({ ...formData, bonCommande: e.target.value })} /></div>
              <div><Label>N° BL</Label><Input placeholder="N° Bon de livraison" value={formData.numeroBL} onChange={(e) => setFormData({ ...formData, numeroBL: e.target.value })} /></div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <Label>Lignes</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => { setSelectedArticles([]); setMultiArticleDialogOpen(true); }}><ListPlus className="w-4 h-4 mr-1" />Ajouter plusieurs</Button>
                  <Button type="button" size="sm" variant="outline" onClick={addLigne}>+ Ajouter</Button>
                </div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Article</TableHead><TableHead className="w-[400px]">Désignation</TableHead><TableHead>Qté</TableHead><TableHead>P.U.</TableHead><TableHead>TVA%</TableHead><TableHead>Total HT</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>{lignes.map((l, idx) => (<TableRow key={idx}>
                  <TableCell><Select value={l.articleId || ''} onValueChange={(v) => updateLigne(idx, 'articleId', v)}><SelectTrigger className="w-32"><SelectValue placeholder="..." /></SelectTrigger><SelectContent>{sortedArticles.map((a) => (<SelectItem key={a.id} value={a.id}>{a.code}</SelectItem>))}</SelectContent></Select></TableCell>
                  <TableCell><Textarea value={l.designation} onChange={(e) => updateLigne(idx, 'designation', e.target.value)} className="min-h-[40px] min-w-[300px]" /></TableCell>
                  <TableCell><Input type="text" value={l.quantite} onChange={(e) => updateLigne(idx, 'quantite', e.target.value)} className="w-20" /></TableCell>
                  <TableCell><Input type="text" value={l.prixUnitaire} onChange={(e) => updateLigne(idx, 'prixUnitaire', e.target.value)} className="w-24" /></TableCell>
                  <TableCell><Input type="text" value={l.tauxTVA} onChange={(e) => updateLigne(idx, 'tauxTVA', e.target.value)} className="w-16" /></TableCell>
                  <TableCell>{formatCurrency(l.totalHT)}</TableCell>
                  <TableCell><Button type="button" size="sm" variant="ghost" onClick={() => removeLigne(idx)}>×</Button></TableCell>
                </TableRow>))}</TableBody>
              </Table>
              <div className="flex justify-end gap-8 mt-2 font-bold">
                <span>Total HT: {formatCurrency(calcTotalHT())}</span>
                <span>TVA: {formatCurrency(calcTotalTVA())}</span>
                <span>Total TTC: {formatCurrency(calcTotalTTC())}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Info libre</Label><Textarea value={formData.infoLibre} onChange={(e) => setFormData({ ...formData, infoLibre: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Annuler</Button><Button type="submit" className="bg-green-600 hover:bg-green-700">{editing ? 'Modifier' : 'Créer'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Multi-article dialog */}
      <Dialog open={multiArticleDialogOpen} onOpenChange={setMultiArticleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter plusieurs articles</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 text-sm text-muted-foreground">
              Cochez les articles à ajouter ({selectedArticles.length} sélectionné{selectedArticles.length > 1 ? 's' : ''})
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead>P.U.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedArticles.map((a) => (
                    <TableRow key={a.id} className="cursor-pointer hover:bg-gray-50" onClick={() => toggleArticleSelection(a.id)}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedArticles.includes(a.id)}
                          onCheckedChange={() => toggleArticleSelection(a.id)}
                        />
                      </TableCell>
                      <TableCell>{a.code}</TableCell>
                      <TableCell>{a.designation}</TableCell>
                      <TableCell>{formatCurrency(a.prixUnitaire)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMultiArticleDialogOpen(false)}>Annuler</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleAddMultipleArticles} disabled={selectedArticles.length === 0}>
              Ajouter {selectedArticles.length} article{selectedArticles.length > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Code dialog for validated documents */}
      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Code requis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Cette facture est validée. Entrez le code pour la modifier.</p>
            <Input
              type="password"
              placeholder="Code à 4 chiffres"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              className={`text-center text-xl ${codeError ? 'border-red-500' : ''}`}
              maxLength={4}
              autoFocus
            />
            {codeError && <p className="text-red-500 text-sm text-center">Code incorrect</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCodeDialogOpen(false)}>Annuler</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleCodeSubmit}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} type="factures-clients" code="NFC01" />
      <PrintDocument 
        open={printOpen} 
        onOpenChange={setPrintOpen} 
        documentType="FC" 
        documentData={selectedFacture} 
        entreprise={parametres} 
        code="NFC01"
        printLayout={parametres?.printLayout ? JSON.parse(parametres.printLayout) : null}
        letterheadImage={parametres?.letterheadImage}
      />
    </div>
  );
}
