'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, Download } from 'lucide-react';

interface ReglementClient {
  id: string; numero: string; factureId: string; dateReglement: string;
  montant: number; modePaiement: string; reference: string | null;
  infoLibre: string | null; notes: string | null;
  facture?: { numero: string; client?: { raisonSociale: string }; totalTTC: number };
}

interface FactureClient {
  id: string; numero: string; clientId: string; totalTTC: number; statut: string;
  client?: { raisonSociale: string };
}

const parseNumber = (v: string) => { if (!v) return 0; return parseFloat(v.replace(',', '.').replace(/\s/g, '')) || 0; };
const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2 })}\tDH`;

export function ReglementsClientsView() {
  const [reglements, setReglements] = useState<ReglementClient[]>([]);
  const [factures, setFactures] = useState<FactureClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReglement, setEditingReglement] = useState<ReglementClient | null>(null);
  const [formData, setFormData] = useState({
    factureId: '', dateReglement: new Date().toISOString().split('T')[0],
    montant: '', modePaiement: 'VIREMENT', reference: '', infoLibre: '', notes: ''
  });

  useEffect(() => { fetchReglements(); fetchFactures(); }, []);
  const fetchReglements = async () => { try { const res = await fetch('/api/reglements-clients'); const data = await res.json(); setReglements(Array.isArray(data) ? data : []); } catch (e) { console.error(e); } finally { setLoading(false); } };
  const fetchFactures = async () => { try { const res = await fetch('/api/factures-clients'); const data = await res.json(); setFactures(Array.isArray(data) ? data : []); } catch (e) { console.error(e); } };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.factureId) { alert('Sélectionnez une facture'); return; }
    if (parseNumber(formData.montant) <= 0) { alert('Montant invalide'); return; }
    try {
      const res = await fetch('/api/reglements-clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, montant: parseNumber(formData.montant) })
      });
      if (res.ok) { setDialogOpen(false); resetForm(); fetchReglements(); }
      else { const err = await res.json(); alert(err.error || 'Erreur'); }
    } catch (e) { console.error(e); alert('Erreur serveur'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce règlement ?')) return;
    try { await fetch(`/api/reglements-clients?id=${id}`, { method: 'DELETE' }); fetchReglements(); } catch (e) { console.error(e); }
  };

  const resetForm = () => {
    setFormData({ factureId: '', dateReglement: new Date().toISOString().split('T')[0], montant: '', modePaiement: 'VIREMENT', reference: '', infoLibre: '', notes: '' });
    setEditingReglement(null);
  };

  const openEditDialog = (r: ReglementClient) => {
    setEditingReglement(r);
    setFormData({
      factureId: r.factureId, dateReglement: new Date(r.dateReglement).toISOString().split('T')[0],
      montant: r.montant.toString(), modePaiement: r.modePaiement,
      reference: r.reference || '', infoLibre: r.infoLibre || '', notes: r.notes || ''
    });
    setDialogOpen(true);
  };

  const handleExport = () => window.open('/api/export?type=reglements-clients', '_blank');
  const filteredReglements = reglements.filter(r => r.facture?.client?.raisonSociale?.toLowerCase().includes(search.toLowerCase()) || r.numero?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-blue-800">Règlements Clients</h1><p className="text-muted-foreground">Gérez les règlements reçus</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => { resetForm(); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nouveau</Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Liste des Règlements</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div></div>
          {filteredReglements.length === 0 ? <div className="text-center text-muted-foreground py-8">Aucun règlement</div> : (
            <Table>
              <TableHeader><TableRow><TableHead>N°</TableHead><TableHead>Date</TableHead><TableHead>Client</TableHead><TableHead>Facture</TableHead><TableHead>Montant</TableHead><TableHead>Mode</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filteredReglements.map((r) => (<TableRow key={r.id}>
                <TableCell className="font-medium">{r.numero}</TableCell>
                <TableCell>{new Date(r.dateReglement).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell>{r.facture?.client?.raisonSociale}</TableCell>
                <TableCell>{r.facture?.numero}</TableCell>
                <TableCell>{formatCurrency(r.montant)}</TableCell>
                <TableCell>{r.modePaiement}</TableCell>
                <TableCell><div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </div></TableCell>
              </TableRow>))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingReglement ? 'Modifier' : 'Nouveau'} Règlement</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Facture</Label>
              <Select value={formData.factureId} onValueChange={(v) => setFormData({ ...formData, factureId: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une facture" /></SelectTrigger>
                <SelectContent>
                  {factures.filter(f => f.statut === 'VALIDEE').map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.numero} - {f.client?.raisonSociale} ({formatCurrency(f.totalTTC)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date</Label><Input type="date" value={formData.dateReglement} onChange={(e) => setFormData({ ...formData, dateReglement: e.target.value })} required /></div>
              <div><Label>Montant</Label><Input type="text" value={formData.montant} onChange={(e) => setFormData({ ...formData, montant: e.target.value })} required /></div>
            </div>
            <div>
              <Label>Mode de paiement</Label>
              <Select value={formData.modePaiement} onValueChange={(v) => setFormData({ ...formData, modePaiement: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ESPECES">Espèces</SelectItem>
                  <SelectItem value="CHEQUE">Chèque</SelectItem>
                  <SelectItem value="VIREMENT">Virement</SelectItem>
                  <SelectItem value="CARTE">Carte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Référence</Label><Input value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="N° chèque, virement..." /></div>
            <div><Label>Info libre</Label><Textarea value={formData.infoLibre} onChange={(e) => setFormData({ ...formData, infoLibre: e.target.value })} placeholder="Informations complémentaires..." /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button type="submit" className="bg-blue-500 hover:bg-blue-600">{editingReglement ? 'Modifier' : 'Créer'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
