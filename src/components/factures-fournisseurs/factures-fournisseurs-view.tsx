'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, CheckCircle, Download, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImportDialog } from '@/components/import-export/import-dialog';
import { ExportDialog } from '@/components/import-export/export-dialog';

interface FactureFournisseur {
  id: string; numeroFacture: string; fournisseurId: string; dateFacture: string;
  dateEcheance: string; montantHT: number; montantTVA: number; montantTTC: number;
  statut: string; infoLibre: string | null; notes: string | null;
  fournisseur: { raisonSociale: string };
}

interface Tiers { id: string; code: string; raisonSociale: string; type: string; }

const parseNumber = (v: string) => { if (!v) return 0; return parseFloat(v.replace(',', '.').replace(/\s/g, '')) || 0; };
const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH`;

export function FacturesFournisseursView() {
  const [factures, setFactures] = useState<FactureFournisseur[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Tiers[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editing, setEditing] = useState<FactureFournisseur | null>(null);
  const [formData, setFormData] = useState({
    numeroFacture: '', fournisseurId: '', dateFacture: new Date().toISOString().split('T')[0],
    dateEcheance: '', montantHT: '', montantTVA: '', infoLibre: '', notes: ''
  });

  useEffect(() => { fetchFactures(); fetchFournisseurs(); }, []);
  
  // Recharger les données à l'ouverture du dialogue
  useEffect(() => {
    if (dialogOpen) {
      fetchFournisseurs();
    }
  }, [dialogOpen]);
  
  const fetchFactures = async () => { try { const res = await fetch('/api/factures-fournisseurs'); const d = await res.json(); setFactures(Array.isArray(d) ? d : []); } catch (e) { console.error(e); } finally { setLoading(false); } };
  const fetchFournisseurs = async () => { try { const res = await fetch('/api/tiers'); const d = await res.json(); setFournisseurs((Array.isArray(d) ? d : []).filter((t: any) => t.type === 'FOURNISSEUR')); } catch (e) { } };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fournisseurId) { alert('Sélectionnez un fournisseur'); return; }
    const montantHT = parseNumber(formData.montantHT);
    const montantTVA = parseNumber(formData.montantTVA);
    try {
      const res = await fetch('/api/factures-fournisseurs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, dateEcheance: formData.dateEcheance || formData.dateFacture, montantHT, montantTVA, montantTTC: montantHT + montantTVA })
      });
      if (res.ok) { setDialogOpen(false); resetForm(); fetchFactures(); }
      else { const err = await res.json(); alert(err.error || 'Erreur'); }
    } catch (e) { console.error(e); alert('Erreur serveur'); }
  };

  const handleValidate = async (id: string) => { if (!confirm('Valider ?')) return; try { const res = await fetch(`/api/factures-fournisseurs/${id}/validate`, { method: 'POST' }); if (res.ok) fetchFactures(); else { const err = await res.json(); alert(err.error || 'Erreur'); } } catch (e) { } };
  const handleDelete = async (id: string) => { if (!confirm('Supprimer ?')) return; try { await fetch(`/api/factures-fournisseurs?id=${id}`, { method: 'DELETE' }); fetchFactures(); } catch (e) { } };

  const resetForm = () => {
    setFormData({ numeroFacture: '', fournisseurId: '', dateFacture: new Date().toISOString().split('T')[0], dateEcheance: '', montantHT: '', montantTVA: '', infoLibre: '', notes: '' });
    setEditing(null);
  };

  const openEditDialog = (f: FactureFournisseur) => {
    setEditing(f);
    setFormData({
      numeroFacture: f.numeroFacture, fournisseurId: f.fournisseurId,
      dateFacture: new Date(f.dateFacture).toISOString().split('T')[0],
      dateEcheance: new Date(f.dateEcheance).toISOString().split('T')[0],
      montantHT: f.montantHT.toString(), montantTVA: f.montantTVA.toString(),
      infoLibre: f.infoLibre || '', notes: f.notes || ''
    });
    setDialogOpen(true);
  };

  const filtered = factures.filter(f => f.numeroFacture?.toLowerCase().includes(search.toLowerCase()) || f.fournisseur?.raisonSociale?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-pink-700">Factures Fournisseurs</h1><p className="text-muted-foreground">Gérez vos factures fournisseurs</p></div>
        <div className="flex items-center gap-2">
          <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-mono font-bold">NFF01</span>
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" />Import</Button>
          <Button variant="outline" onClick={() => setExportOpen(true)}><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button className="bg-pink-600 hover:bg-pink-700" onClick={() => { resetForm(); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nouveau</Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Liste</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div></div>
          {filtered.length === 0 ? <div className="text-center text-muted-foreground py-8">Aucune facture</div> : (
            <Table>
              <TableHeader><TableRow><TableHead>N° Facture</TableHead><TableHead>Date</TableHead><TableHead>Fournisseur</TableHead><TableHead>HT</TableHead><TableHead>TVA</TableHead><TableHead>TTC</TableHead><TableHead>Statut</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map((f) => (<TableRow key={f.id}>
                <TableCell className="font-medium">{f.numeroFacture}</TableCell>
                <TableCell>{new Date(f.dateFacture).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell>{f.fournisseur?.raisonSociale}</TableCell>
                <TableCell>{formatCurrency(f.montantHT)}</TableCell>
                <TableCell>{formatCurrency(f.montantTVA)}</TableCell>
                <TableCell>{formatCurrency(f.montantTTC)}</TableCell>
                <TableCell><span className={`px-2 py-1 rounded text-xs ${f.statut === 'VALIDEE' ? 'bg-pink-100 text-pink-800' : 'bg-yellow-100 text-yellow-800'}`}>{f.statut === 'VALIDEE' ? 'Validée' : 'Enregistrée'}</span></TableCell>
                <TableCell><div className="flex gap-2">
                  {f.statut === 'ENREGISTREE' && <Button size="sm" variant="outline" className="text-pink-600" onClick={() => handleValidate(f.id)}><CheckCircle className="h-4 w-4" /></Button>}
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(f)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(f.id)}><Trash2 className="h-4 w-4" /></Button>
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
              <DialogTitle>{editing ? 'Modifier' : 'Nouveau'} Facture Fournisseur</DialogTitle>
              <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-mono font-bold">NFF01-DLG</span>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>N° Facture</Label><Input value={formData.numeroFacture} onChange={(e) => setFormData({ ...formData, numeroFacture: e.target.value })} required /></div>
              <div><Label>Date</Label><Input type="date" value={formData.dateFacture} onChange={(e) => setFormData({ ...formData, dateFacture: e.target.value })} required /></div>
              <div><Label>Fournisseur</Label><Select value={formData.fournisseurId} onValueChange={(v) => setFormData({ ...formData, fournisseurId: v })}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{fournisseurs.map((f) => (<SelectItem key={f.id} value={f.id}>{f.raisonSociale}</SelectItem>))}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Échéance</Label><Input type="date" value={formData.dateEcheance} onChange={(e) => setFormData({ ...formData, dateEcheance: e.target.value })} /></div>
              <div><Label>Montant HT</Label><Input type="text" value={formData.montantHT} onChange={(e) => setFormData({ ...formData, montantHT: e.target.value })} required /></div>
              <div><Label>Montant TVA</Label><Input type="text" value={formData.montantTVA} onChange={(e) => setFormData({ ...formData, montantTVA: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Info libre</Label><Textarea value={formData.infoLibre} onChange={(e) => setFormData({ ...formData, infoLibre: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button type="submit" className="bg-pink-600 hover:bg-pink-700">{editing ? 'Modifier' : 'Créer'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} type="factures-fournisseurs" code="NFF01" onSuccess={fetchFactures} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} type="factures-fournisseurs" code="NFF01" />
    </div>
  );
}
