'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, CheckCircle, Download, Upload, Printer, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImportDialog } from '@/components/import-export/import-dialog';
import { ExportDialog } from '@/components/import-export/export-dialog';
import { PrintDocument } from '@/components/print/print-document';

interface LigneBL { id?: string; articleId?: string; designation: string; quantite: number; prixUnitaire: number; totalHT: number; }
interface BonLivraison { id: string; numero: string; dateBL: string; clientId: string; statut: string; infoLibre: string | null; notesLivraison: string | null; totalHT: number; client: { raisonSociale: string }; lignes?: LigneBL[]; }
interface Tiers { id: string; code: string; raisonSociale: string; type: string; }
interface Article { id: string; code: string; designation: string; prixUnitaire: number; }
interface Parametres { nomEntreprise: string; adresseEntreprise?: string; villeEntreprise?: string; telephoneEntreprise?: string; emailEntreprise?: string; ice?: string; rc?: string; rcLieu?: string; }

const parseNumber = (v: string | number) => { if (!v) return 0; if (typeof v === 'number') return v; return parseFloat(v.replace(',', '.').replace(/\s/g, '')) || 0; };
const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH`;

export function BonsLivraisonView() {
  const [bons, setBons] = useState<BonLivraison[]>([]);
  const [clients, setClients] = useState<Tiers[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [parametres, setParametres] = useState<Parametres | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [selectedBL, setSelectedBL] = useState<BonLivraison | null>(null);
  const [editing, setEditing] = useState<BonLivraison | null>(null);
  const [lignes, setLignes] = useState<LigneBL[]>([{ designation: '', quantite: 1, prixUnitaire: 0, totalHT: 0 }]);
  const [formData, setFormData] = useState({ numero: '', dateBL: new Date().toISOString().split('T')[0], clientId: '', infoLibre: '', notesLivraison: '' });

  useEffect(() => { fetchBons(); fetchClients(); fetchArticles(); fetchParametres(); }, []);
  
  // Recharger les données à l'ouverture du dialogue
  useEffect(() => {
    if (dialogOpen) {
      fetchClients();
      fetchArticles();
    }
  }, [dialogOpen]);
  
  const fetchBons = async () => { try { const res = await fetch('/api/bons-livraison'); const d = await res.json(); setBons(Array.isArray(d) ? d : []); } catch (e) { console.error(e); } finally { setLoading(false); } };
  const fetchClients = async () => { try { const res = await fetch('/api/tiers'); const d = await res.json(); setClients((Array.isArray(d) ? d : []).filter((t: any) => t.type === 'CLIENT')); } catch (e) { } };
  const fetchArticles = async () => { try { const res = await fetch('/api/articles'); const d = await res.json(); setArticles(Array.isArray(d) ? d : []); } catch (e) { } };
  const fetchParametres = async () => { try { const res = await fetch('/api/parametres'); const d = await res.json(); setParametres(d); } catch (e) { } };

  const calcTotal = () => lignes.reduce((s, l) => s + (l.totalHT || 0), 0);

  const updateLigne = (idx: number, field: keyof LigneBL, val: string | number) => {
    const newLignes = [...lignes];
    if (field === 'articleId') {
      const art = articles.find(a => a.id === val);
      if (art) newLignes[idx] = { ...newLignes[idx], articleId: val as string, designation: art.designation, prixUnitaire: art.prixUnitaire, totalHT: (newLignes[idx].quantite || 1) * art.prixUnitaire };
    } else if (field === 'quantite' || field === 'prixUnitaire') {
      newLignes[idx] = { ...newLignes[idx], [field]: typeof val === 'string' ? parseNumber(val) : val };
      const q = field === 'quantite' ? (typeof val === 'string' ? parseNumber(val) : val) : newLignes[idx].quantite;
      const p = field === 'prixUnitaire' ? (typeof val === 'string' ? parseNumber(val) : val) : newLignes[idx].prixUnitaire;
      newLignes[idx].totalHT = q * p;
    } else { newLignes[idx] = { ...newLignes[idx], [field]: val }; }
    setLignes(newLignes);
  };

  const addLigne = () => setLignes([...lignes, { designation: '', quantite: 1, prixUnitaire: 0, totalHT: 0 }]);
  const removeLigne = (i: number) => { if (lignes.length > 1) setLignes(lignes.filter((_, idx) => idx !== i)); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) { alert('Sélectionnez un client'); return; }
    const validLignes = lignes.filter(l => l.designation.trim() && l.quantite > 0);
    if (validLignes.length === 0) { alert('Ajoutez au moins une ligne'); return; }
    try {
      const res = await fetch('/api/bons-livraison', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, lignes: validLignes.map(l => ({ ...l, quantite: l.quantite, prixUnitaire: l.prixUnitaire, totalHT: l.totalHT })), totalHT: calcTotal() })
      });
      if (res.ok) { setDialogOpen(false); resetForm(); fetchBons(); }
      else { const err = await res.json(); alert(err.error || 'Erreur'); }
    } catch (e) { console.error(e); alert('Erreur serveur'); }
  };

  const handleValidate = async (id: string) => {
    if (!confirm('Valider ce BL ?')) return;
    try {
      const res = await fetch(`/api/bons-livraison/${id}/validate`, { method: 'POST' });
      if (res.ok) fetchBons();
      else { const err = await res.json(); alert(err.error || 'Erreur'); }
    } catch (e) { }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ?')) return;
    try { await fetch(`/api/bons-livraison?id=${id}`, { method: 'DELETE' }); fetchBons(); } catch (e) { }
  };

  const handlePrint = async (bl: BonLivraison) => {
    // Fetch full BL with lines
    try {
      const res = await fetch('/api/bons-livraison');
      const allBL = await res.json();
      const fullBL = allBL.find((b: any) => b.id === bl.id);
      setSelectedBL(fullBL || bl);
      setPrintOpen(true);
    } catch (e) {
      setSelectedBL(bl);
      setPrintOpen(true);
    }
  };

  const handleConvertToFacture = async (bl: BonLivraison) => {
    if (!confirm(`Créer une facture depuis ${bl.numero} ?`)) return;
    try {
      const res = await fetch(`/api/bons-livraison/${bl.id}/convert`, { method: 'POST' });
      if (res.ok) {
        const facture = await res.json();
        alert(`Facture ${facture.numero} créée avec succès !`);
        fetchBons();
      } else {
        const err = await res.json();
        alert(err.error || 'Erreur lors de la conversion');
      }
    } catch (e) {
      alert('Erreur serveur');
    }
  };

  const resetForm = () => {
    setFormData({ numero: '', dateBL: new Date().toISOString().split('T')[0], clientId: '', infoLibre: '', notesLivraison: '' });
    setLignes([{ designation: '', quantite: 1, prixUnitaire: 0, totalHT: 0 }]);
    setEditing(null);
  };
  const generateNum = () => setFormData({ ...formData, numero: `BL${(bons.length + 1).toString().padStart(5, '0')}` });

  const filtered = bons.filter(b => b.numero?.toLowerCase().includes(search.toLowerCase()) || b.client?.raisonSociale?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-green-700">Bons de Livraison</h1><p className="text-muted-foreground">Gérez vos BL</p></div>
        <div className="flex items-center gap-2">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-mono font-bold">NBL01</span>
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" />Import</Button>
          <Button variant="outline" onClick={() => setExportOpen(true)}><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => { resetForm(); generateNum(); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nouveau</Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Liste</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div></div>
          {filtered.length === 0 ? <div className="text-center text-muted-foreground py-8">Aucun BL</div> : (
            <Table>
              <TableHeader><TableRow><TableHead>N°</TableHead><TableHead>Date</TableHead><TableHead>Client</TableHead><TableHead>Total HT</TableHead><TableHead>Statut</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map((b) => (<TableRow key={b.id}>
                <TableCell className="font-medium">{b.numero}</TableCell>
                <TableCell>{new Date(b.dateBL).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell>{b.client?.raisonSociale}</TableCell>
                <TableCell>{formatCurrency(b.totalHT)}</TableCell>
                <TableCell><span className={`px-2 py-1 rounded text-xs ${b.statut === 'VALIDEE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{b.statut === 'VALIDEE' ? 'Validé' : 'Brouillon'}</span></TableCell>
                <TableCell><div className="flex gap-1 flex-wrap">
                  {b.statut === 'BROUILLON' && <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleValidate(b.id)} title="Valider"><CheckCircle className="h-4 w-4" /></Button>}
                  {b.statut === 'VALIDEE' && <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleConvertToFacture(b)} title="Créer facture"><FileText className="h-4 w-4" /></Button>}
                  <Button size="sm" variant="outline" onClick={() => handlePrint(b)} title="Imprimer"><Printer className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(b); setDialogOpen(true); }} title="Modifier"><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(b.id)} disabled={b.statut === 'VALIDEE'} title="Supprimer"><Trash2 className="h-4 w-4" /></Button>
                </div></TableCell>
              </TableRow>))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[8000px] w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{editing ? 'Modifier' : 'Nouveau'} BL</DialogTitle>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-mono font-bold">NBL01-DLG</span>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>N°</Label><Input value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} required /></div>
              <div><Label>Date</Label><Input type="date" value={formData.dateBL} onChange={(e) => setFormData({ ...formData, dateBL: e.target.value })} required /></div>
              <div><Label>Client</Label><Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.raisonSociale}</SelectItem>))}</SelectContent></Select></div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2"><Label>Lignes</Label><Button type="button" size="sm" variant="outline" onClick={addLigne}>+ Ajouter</Button></div>
              <Table>
                <TableHeader><TableRow><TableHead>Article</TableHead><TableHead className="w-[400px]">Désignation</TableHead><TableHead>Qté</TableHead><TableHead>P.U.</TableHead><TableHead>Total HT</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>{lignes.map((l, idx) => (<TableRow key={idx}>
                  <TableCell><Select value={l.articleId || ''} onValueChange={(v) => updateLigne(idx, 'articleId', v)}><SelectTrigger className="w-32"><SelectValue placeholder="..." /></SelectTrigger><SelectContent>{articles.map((a) => (<SelectItem key={a.id} value={a.id}>{a.code}</SelectItem>))}</SelectContent></Select></TableCell>
                  <TableCell><Textarea value={l.designation} onChange={(e) => updateLigne(idx, 'designation', e.target.value)} className="min-h-[40px] min-w-[300px]" /></TableCell>
                  <TableCell><Input type="number" value={l.quantite} onChange={(e) => updateLigne(idx, 'quantite', e.target.value)} className="w-20" /></TableCell>
                  <TableCell><Input type="number" step="0.01" value={l.prixUnitaire} onChange={(e) => updateLigne(idx, 'prixUnitaire', e.target.value)} className="w-24" /></TableCell>
                  <TableCell>{formatCurrency(l.totalHT)}</TableCell>
                  <TableCell><Button type="button" size="sm" variant="ghost" onClick={() => removeLigne(idx)}>×</Button></TableCell>
                </TableRow>))}</TableBody>
              </Table>
              <div className="text-right font-bold mt-2">Total HT: {formatCurrency(calcTotal())}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Info libre</Label><Textarea value={formData.infoLibre} onChange={(e) => setFormData({ ...formData, infoLibre: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={formData.notesLivraison} onChange={(e) => setFormData({ ...formData, notesLivraison: e.target.value })} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button type="submit" className="bg-green-600 hover:bg-green-700">{editing ? 'Modifier' : 'Créer'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} type="bons-livraison" code="NBL01" onSuccess={fetchBons} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} type="bons-livraison" code="NBL01" />
      <PrintDocument open={printOpen} onOpenChange={setPrintOpen} documentType="BL" documentData={selectedBL} entreprise={parametres} code="NBL01" />
    </div>
  );
}
