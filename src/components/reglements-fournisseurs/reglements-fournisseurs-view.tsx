'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, Download, Upload, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImportDialog } from '@/components/import-export/import-dialog';
import { ExportDialog } from '@/components/import-export/export-dialog';

interface ReglementFournisseur {
  id: string; factureId: string; dateReglement: string;
  montant: number; modePaiement: string; reference: string | null;
  infoLibre: string | null; notes: string | null;
  facture: { numeroFacture: string; fournisseur: { raisonSociale: string }; montantTTC: number };
}

interface FactureFournisseur {
  id: string; numeroFacture: string; fournisseur: { raisonSociale: string }; montantTTC: number; statut: string;
}

const parseNumber = (v: string) => { if (!v) return 0; return parseFloat(v.replace(',', '.').replace(/\s/g, '')) || 0; };
const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH`;

export function ReglementsFournisseursView() {
  const [reglements, setReglements] = useState<ReglementFournisseur[]>([]);
  const [factures, setFactures] = useState<FactureFournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editingReglement, setEditingReglement] = useState<ReglementFournisseur | null>(null);
  const [selectedFacture, setSelectedFacture] = useState<FactureFournisseur | null>(null);
  const [resteAPayer, setResteAPayer] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    factureId: '', dateReglement: new Date().toISOString().split('T')[0],
    montant: '', modePaiement: 'VIREMENT', reference: '', infoLibre: '', notes: ''
  });

  useEffect(() => { fetchReglements(); fetchFactures(); }, []);
  const fetchReglements = async () => { try { const res = await fetch('/api/reglements-fournisseurs'); const data = await res.json(); setReglements(Array.isArray(data) ? data : []); } catch (e) { console.error(e); } finally { setLoading(false); } };
  const fetchFactures = async () => { try { const res = await fetch('/api/factures-fournisseurs'); const data = await res.json(); setFactures(Array.isArray(data) ? data : []); } catch (e) { console.error(e); } };

  // Calculer le reste à payer pour une facture
  const calculerResteAPayer = (factureId: string) => {
    const facture = factures.find(f => f.id === factureId);
    if (!facture) return 0;
    const totalReglements = reglements
      .filter(r => r.factureId === factureId && (!editingReglement || r.id !== editingReglement.id))
      .reduce((sum, r) => sum + r.montant, 0);
    return facture.montantTTC - totalReglements;
  };

  // Quand on sélectionne une facture
  const handleFactureChange = (factureId: string) => {
    const facture = factures.find(f => f.id === factureId);
    setSelectedFacture(facture || null);
    const reste = calculerResteAPayer(factureId);
    setResteAPayer(reste);
    setFormData({ ...formData, factureId, montant: reste > 0 ? reste.toString() : '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.factureId) { alert('Sélectionnez une facture'); return; }
    const montant = parseNumber(formData.montant);
    if (montant <= 0) { alert('Montant invalide'); return; }
    
    // Vérifier le dépassement
    const reste = calculerResteAPayer(formData.factureId);
    const depassement = montant - reste;
    const TOLERANCE_DEPASSEMENT = 10; // Tolérance de 10 DH
    
    if (depassement > TOLERANCE_DEPASSEMENT) {
      const confirmMsg = `Attention: Le règlement de ${formatCurrency(montant)} dépasse le reste à payer de ${formatCurrency(reste)}.\n\nDépassement: ${formatCurrency(depassement)}\n\nVoulez-vous vraiment continuer?`;
      if (!confirm(confirmMsg)) return;
    } else if (depassement > 0 && depassement <= TOLERANCE_DEPASSEMENT) {
      const confirmMsg = `Petit dépassement détecté: ${formatCurrency(depassement)}.\n\nConfirmer ce règlement?`;
      if (!confirm(confirmMsg)) return;
    }
    
    try {
      const res = await fetch('/api/reglements-fournisseurs', {
        method: editingReglement ? 'PUT' : 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, id: editingReglement?.id, montant })
      });
      if (res.ok) { setDialogOpen(false); resetForm(); fetchReglements(); }
      else { const err = await res.json(); alert(err.error || 'Erreur'); }
    } catch (e) { console.error(e); alert('Erreur serveur'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce règlement ?')) return;
    try { await fetch(`/api/reglements-fournisseurs?id=${id}`, { method: 'DELETE' }); fetchReglements(); } catch (e) { console.error(e); }
  };

  const resetForm = () => {
    setFormData({ factureId: '', dateReglement: new Date().toISOString().split('T')[0], montant: '', modePaiement: 'VIREMENT', reference: '', infoLibre: '', notes: '' });
    setEditingReglement(null);
    setSelectedFacture(null);
    setResteAPayer(null);
  };

  const openEditDialog = (r: ReglementFournisseur) => {
    setEditingReglement(r);
    const facture = factures.find(f => f.id === r.factureId);
    setSelectedFacture(facture || null);
    const reste = calculerResteAPayer(r.factureId) + r.montant;
    setResteAPayer(reste);
    setFormData({
      factureId: r.factureId, dateReglement: new Date(r.dateReglement).toISOString().split('T')[0],
      montant: r.montant.toString(), modePaiement: r.modePaiement,
      reference: r.reference || '', infoLibre: r.infoLibre || '', notes: r.notes || ''
    });
    setDialogOpen(true);
  };

  const filteredReglements = reglements.filter(r => r.facture?.fournisseur?.raisonSociale?.toLowerCase().includes(search.toLowerCase()) || r.facture?.numeroFacture?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-pink-700">Règlements Fournisseurs</h1><p className="text-muted-foreground">Gérez les règlements effectués</p></div>
        <div className="flex items-center gap-2">
          <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-mono font-bold">MFF01</span>
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" />Import</Button>
          <Button variant="outline" onClick={() => setExportOpen(true)}><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button className="bg-pink-600 hover:bg-pink-700" onClick={() => { resetForm(); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nouveau</Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Liste des Règlements</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div></div>
          {filteredReglements.length === 0 ? <div className="text-center text-muted-foreground py-8">Aucun règlement</div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Fournisseur</TableHead><TableHead>Facture</TableHead><TableHead>Montant</TableHead><TableHead>Mode</TableHead><TableHead>Référence</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filteredReglements.map((r) => (<TableRow key={r.id}>
                <TableCell>{new Date(r.dateReglement).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell>{r.facture?.fournisseur?.raisonSociale}</TableCell>
                <TableCell>{r.facture?.numeroFacture}</TableCell>
                <TableCell>{formatCurrency(r.montant)}</TableCell>
                <TableCell>{r.modePaiement}</TableCell>
                <TableCell>{r.reference}</TableCell>
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
        <DialogContent className="max-w-[8000px] w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{editingReglement ? 'Modifier' : 'Nouveau'} Règlement</DialogTitle>
              <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-mono font-bold">MFF01-DLG</span>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Facture</Label>
              <Select value={formData.factureId} onValueChange={handleFactureChange} disabled={!!editingReglement}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une facture" /></SelectTrigger>
                <SelectContent>
                  {factures.filter(f => f.statut === 'VALIDEE').map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.numeroFacture} - {f.fournisseur?.raisonSociale} ({formatCurrency(f.montantTTC)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedFacture && resteAPayer !== null && (
              <div className={`p-4 rounded-lg border ${resteAPayer > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-pink-50 border-pink-200'}`}>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Facture:</span>
                    <div className="font-bold text-lg">{formatCurrency(selectedFacture.montantTTC)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Déjà réglé:</span>
                    <div className="font-bold text-lg">{formatCurrency(selectedFacture.montantTTC - resteAPayer)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reste à payer:</span>
                    <div className={`font-bold text-lg ${resteAPayer > 0 ? 'text-orange-600' : 'text-pink-600'}`}>
                      {formatCurrency(resteAPayer)}
                      {resteAPayer <= 0 && <span className="ml-2 text-sm">(Soldée)</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date</Label><Input type="date" value={formData.dateReglement} onChange={(e) => setFormData({ ...formData, dateReglement: e.target.value })} required /></div>
              <div>
                <Label>Montant</Label>
                <Input type="text" value={formData.montant} onChange={(e) => setFormData({ ...formData, montant: e.target.value })} required />
                {resteAPayer !== null && parseNumber(formData.montant) > resteAPayer && (
                  <div className="flex items-center gap-2 mt-1 text-orange-600 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Dépassement de {formatCurrency(parseNumber(formData.montant) - resteAPayer)}
                  </div>
                )}
              </div>
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
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button type="submit" className="bg-pink-600 hover:bg-pink-700">{editingReglement ? 'Modifier' : 'Créer'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} type="reglements-fournisseurs" code="MFF01" onSuccess={fetchReglements} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} type="reglements-fournisseurs" code="MFF01" />
    </div>
  );
}
