'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, CheckCircle, Download, Upload, Printer } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImportDialog } from '@/components/import-export/import-dialog';
import { ExportDialog } from '@/components/import-export/export-dialog';
import { PrintDocument } from '@/components/print/print-document';

interface LigneFacture { id?: string; articleId?: string; designation: string; quantite: string; prixUnitaire: string; tauxTVA: string; totalHT: number; }
interface FactureClient { id: string; numero: string; dateFacture: string; clientId: string; dateEcheance: string; statut: string; infoLibre: string | null; notes: string | null; totalHT: number; totalTVA: number; totalTTC: number; client: { raisonSociale: string; adresse?: string; ville?: string; ice?: string }; lignes?: LigneFacture[]; }
interface Tiers { id: string; code: string; raisonSociale: string; type: string; }
interface Article { id: string; code: string; designation: string; prixUnitaire: number; tauxTVA: number; }
interface Parametres { nomEntreprise: string; adresseEntreprise?: string; villeEntreprise?: string; telephoneEntreprise?: string; emailEntreprise?: string; ice?: string; rc?: string; rcLieu?: string; }

const parseNumber = (v: string) => { if (!v) return 0; return parseFloat(v.replace(',', '.').replace(/\s/g, '')) || 0; };
const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH`;

export function FacturesClientsView() {
  const [factures, setFactures] = useState<FactureClient[]>([]);
  const [clients, setClients] = useState<Tiers[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [parametres, setParametres] = useState<Parametres | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState<FactureClient | null>(null);
  const [editing, setEditing] = useState<FactureClient | null>(null);
  const [lignes, setLignes] = useState<LigneFacture[]>([{ designation: '', quantite: '1', prixUnitaire: '0', tauxTVA: '20', totalHT: 0 }]);
  const [formData, setFormData] = useState({ numero: '', dateFacture: new Date().toISOString().split('T')[0], clientId: '', dateEcheance: '', infoLibre: '', notes: '' });

  useEffect(() => { fetchFactures(); fetchClients(); fetchArticles(); fetchParametres(); }, []);
  
  // Recharger les données à l'ouverture du dialogue
  useEffect(() => {
    if (dialogOpen) {
      fetchClients();
      fetchArticles();
    }
  }, [dialogOpen]);
  
  const fetchFactures = async () => { try { const res = await fetch('/api/factures-clients'); const d = await res.json(); setFactures(Array.isArray(d) ? d : []); } catch (e) { console.error(e); } finally { setLoading(false); } };
  const fetchClients = async () => { try { const res = await fetch('/api/tiers'); const d = await res.json(); setClients((Array.isArray(d) ? d : []).filter((t: any) => t.type === 'CLIENT')); } catch (e) { } };
  const fetchArticles = async () => { try { const res = await fetch('/api/articles'); const d = await res.json(); setArticles(Array.isArray(d) ? d : []); } catch (e) { } };
  const fetchParametres = async () => { try { const res = await fetch('/api/parametres'); const d = await res.json(); setParametres(d); } catch (e) { } };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) { alert('Sélectionnez un client'); return; }
    const validLignes = lignes.filter(l => l.designation.trim() && parseNumber(l.quantite) > 0);
    if (validLignes.length === 0) { alert('Ajoutez au moins une ligne'); return; }
    try {
      const res = await fetch('/api/factures-clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData, dateEcheance: formData.dateEcheance || formData.dateFacture,
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
    } catch (e) {
      setSelectedFacture(facture);
      setPrintOpen(true);
    }
  };

  const resetForm = () => { setFormData({ numero: '', dateFacture: new Date().toISOString().split('T')[0], clientId: '', dateEcheance: '', infoLibre: '', notes: '' }); setLignes([{ designation: '', quantite: '1', prixUnitaire: '0', tauxTVA: '20', totalHT: 0 }]); setEditing(null); };
  const generateNum = () => setFormData({ ...formData, numero: `FC${(factures.length + 1).toString().padStart(5, '0')}` });

  const filtered = factures.filter(f => f.numero?.toLowerCase().includes(search.toLowerCase()) || f.client?.raisonSociale?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-green-700">Factures Clients</h1><p className="text-muted-foreground">Gérez vos factures</p></div>
        <div className="flex items-center gap-2">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-mono font-bold">NFC01</span>
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" />Import</Button>
          <Button variant="outline" onClick={() => setExportOpen(true)}><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => { resetForm(); generateNum(); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nouveau</Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Liste</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div></div>
          {filtered.length === 0 ? <div className="text-center text-muted-foreground py-8">Aucune facture</div> : (
            <Table>
              <TableHeader><TableRow><TableHead>N°</TableHead><TableHead>Date</TableHead><TableHead>Client</TableHead><TableHead>Total HT</TableHead><TableHead>TVA</TableHead><TableHead>Total TTC</TableHead><TableHead>Statut</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map((f) => (<TableRow key={f.id}>
                <TableCell className="font-medium">{f.numero}</TableCell>
                <TableCell>{new Date(f.dateFacture).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell>{f.client?.raisonSociale}</TableCell>
                <TableCell>{formatCurrency(f.totalHT)}</TableCell>
                <TableCell>{formatCurrency(f.totalTVA)}</TableCell>
                <TableCell>{formatCurrency(f.totalTTC)}</TableCell>
                <TableCell><span className={`px-2 py-1 rounded text-xs ${f.statut === 'VALIDEE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{f.statut === 'VALIDEE' ? 'Validée' : 'Brouillon'}</span></TableCell>
                <TableCell><div className="flex gap-1 flex-wrap">
                  {f.statut === 'BROUILLON' && <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleValidate(f.id)} title="Valider"><CheckCircle className="h-4 w-4" /></Button>}
                  <Button size="sm" variant="outline" onClick={() => handlePrint(f)} title="Imprimer"><Printer className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(f); setDialogOpen(true); }} title="Modifier"><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(f.id)} disabled={f.statut === 'VALIDEE'} title="Supprimer"><Trash2 className="h-4 w-4" /></Button>
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
              <DialogTitle>{editing ? 'Modifier' : 'Nouveau'} Facture</DialogTitle>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-mono font-bold">NFC01-DLG</span>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div><Label>N°</Label><Input value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} required /></div>
              <div><Label>Date</Label><Input type="date" value={formData.dateFacture} onChange={(e) => setFormData({ ...formData, dateFacture: e.target.value })} required /></div>
              <div><Label>Échéance</Label><Input type="date" value={formData.dateEcheance} onChange={(e) => setFormData({ ...formData, dateEcheance: e.target.value })} /></div>
              <div><Label>Client</Label><Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.raisonSociale}</SelectItem>))}</SelectContent></Select></div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2"><Label>Lignes</Label><Button type="button" size="sm" variant="outline" onClick={addLigne}>+ Ajouter</Button></div>
              <Table>
                <TableHeader><TableRow><TableHead>Article</TableHead><TableHead className="w-[400px]">Désignation</TableHead><TableHead>Qté</TableHead><TableHead>P.U.</TableHead><TableHead>TVA%</TableHead><TableHead>Total HT</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>{lignes.map((l, idx) => (<TableRow key={idx}>
                  <TableCell><Select value={l.articleId || ''} onValueChange={(v) => updateLigne(idx, 'articleId', v)}><SelectTrigger className="w-32"><SelectValue placeholder="..." /></SelectTrigger><SelectContent>{articles.map((a) => (<SelectItem key={a.id} value={a.id}>{a.code}</SelectItem>))}</SelectContent></Select></TableCell>
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
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button type="submit" className="bg-green-600 hover:bg-green-700">{editing ? 'Modifier' : 'Créer'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} type="factures-clients" code="NFC01" onSuccess={fetchFactures} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} type="factures-clients" code="NFC01" />
      <PrintDocument open={printOpen} onOpenChange={setPrintOpen} documentType="FC" documentData={selectedFacture} entreprise={parametres} code="NFC01" />
    </div>
  );
}
