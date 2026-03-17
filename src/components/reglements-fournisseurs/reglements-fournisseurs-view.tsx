'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, Download, AlertTriangle, CheckCircle, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExportDialog } from '@/components/import-export/export-dialog';

interface ReglementFournisseur {
  id: string; factureId: string; dateReglement: string;
  montant: number; modePaiement: string; reference: string | null;
  infoLibre: string | null; notes: string | null; statut: string;
  facture: { numeroFacture: string; fournisseur: { raisonSociale: string }; montantTTC: number };
}

interface FactureFournisseur {
  id: string; numeroFacture: string; fournisseurId: string; fournisseur: { raisonSociale: string }; montantTTC: number; statut: string;
}

interface Tiers {
  id: string; code: string; type: string; raisonSociale: string;
}

const parseNumber = (v: string) => { if (!v) return 0; return parseFloat(v.replace(',', '.').replace(/\s/g, '')) || 0; };
const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH`;

type SortField = 'dateReglement' | 'fournisseur' | 'facture' | 'montant' | 'modePaiement' | 'statut';
type SortDirection = 'asc' | 'desc';

interface MultiFacturePayment {
  factureId: string;
  montant: string;
  resteAPayer: number;
  montantTTC: number;
  numeroFacture: string;
}

const ALL_FOURNISSEURS = '__ALL__';

export function ReglementsFournisseursView() {
  const [reglements, setReglements] = useState<ReglementFournisseur[]>([]);
  const [factures, setFactures] = useState<FactureFournisseur[]>([]);
  const [tiers, setTiers] = useState<Tiers[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editingReglement, setEditingReglement] = useState<ReglementFournisseur | null>(null);
  const [selectedFacture, setSelectedFacture] = useState<FactureFournisseur | null>(null);
  const [resteAPayer, setResteAPayer] = useState<number | null>(null);
  
  // Multi-facture payment
  const [isMultiPayment, setIsMultiPayment] = useState(false);
  const [selectedFournisseurId, setSelectedFournisseurId] = useState<string>(ALL_FOURNISSEURS);
  const [multiPayments, setMultiPayments] = useState<MultiFacturePayment[]>([]);
  
  const [formData, setFormData] = useState({
    factureId: '', dateReglement: new Date().toISOString().split('T')[0],
    montant: '', modePaiement: 'VIREMENT', reference: '', infoLibre: '', notes: '',
    dateEcheanceEffet: ''
  });
  
  // Sorting and filtering
  const [sortField, setSortField] = useState<SortField>('dateReglement');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { fetchReglements(); fetchFactures(); fetchTiers(); }, []);
  const fetchReglements = async () => { try { const res = await fetch('/api/reglements-fournisseurs'); const data = await res.json(); setReglements(Array.isArray(data) ? data : []); } catch (e) { console.error(e); } finally { setLoading(false); } };
  const fetchFactures = async () => { try { const res = await fetch('/api/factures-fournisseurs'); const data = await res.json(); setFactures(Array.isArray(data) ? data : []); } catch (e) { console.error(e); } };
  const fetchTiers = async () => { try { const res = await fetch('/api/tiers'); const data = await res.json(); setTiers(Array.isArray(data) ? data.filter((t: Tiers) => t.type === 'FOURNISSEUR') : []); } catch (e) { console.error(e); } };

  const calculerResteAPayer = (factureId: string, excludeReglementId?: string) => {
    const facture = factures.find(f => f.id === factureId);
    if (!facture) return 0;
    const totalReglements = reglements
      .filter(r => r.factureId === factureId && (!excludeReglementId || r.id !== excludeReglementId))
      .reduce((sum, r) => sum + r.montant, 0);
    return facture.montantTTC - totalReglements;
  };

  const isFactureSoldee = (factureId: string) => {
    const facture = factures.find(f => f.id === factureId);
    if (!facture) return false;
    const totalReglements = reglements
      .filter(r => r.factureId === factureId)
      .reduce((sum, r) => sum + r.montant, 0);
    return totalReglements >= facture.montantTTC;
  };

  const facturesDisponibles = factures.filter(f => 
    f.statut === 'VALIDEE' && 
    !isFactureSoldee(f.id) &&
    (selectedFournisseurId === ALL_FOURNISSEURS || f.fournisseurId === selectedFournisseurId)
  );

  const getFacturesForFournisseur = (fournisseurId: string) => {
    return factures
      .filter(f => f.statut === 'VALIDEE' && f.fournisseurId === fournisseurId && !isFactureSoldee(f.id))
      .map(f => ({
        factureId: f.id,
        montant: '',
        resteAPayer: calculerResteAPayer(f.id),
        montantTTC: f.montantTTC,
        numeroFacture: f.numeroFacture
      }))
      .filter(f => f.resteAPayer > 0);
  };

  const handleFactureChange = (factureId: string) => {
    const facture = factures.find(f => f.id === factureId);
    setSelectedFacture(facture || null);
    const reste = calculerResteAPayer(factureId);
    setResteAPayer(reste);
    setFormData({ ...formData, factureId, montant: reste > 0 ? reste.toString() : '' });
  };

  const handleFournisseurChange = (fournisseurId: string) => {
    setSelectedFournisseurId(fournisseurId);
    setSelectedFacture(null);
    setFormData({ ...formData, factureId: '', montant: '' });
    setResteAPayer(null);
    
    if (fournisseurId !== ALL_FOURNISSEURS && isMultiPayment) {
      const fournisseurFactures = getFacturesForFournisseur(fournisseurId);
      setMultiPayments(fournisseurFactures);
    } else {
      setMultiPayments([]);
    }
  };

  const handleMultiPaymentChange = (factureId: string, montant: string) => {
    setMultiPayments(prev => 
      prev.map(p => p.factureId === factureId ? { ...p, montant } : p)
    );
  };

  const calculateTotalMultiPayment = () => {
    return multiPayments.reduce((sum, p) => sum + parseNumber(p.montant), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isMultiPayment) {
      const totalMontant = calculateTotalMultiPayment();
      if (totalMontant <= 0) { alert('Montant total invalide'); return; }
      
      const paymentsToCreate = multiPayments.filter(p => parseNumber(p.montant) > 0);
      if (paymentsToCreate.length === 0) { alert('Aucun montant saisi'); return; }
      
      for (const p of paymentsToCreate) {
        const montant = parseNumber(p.montant);
        if (montant > p.resteAPayer + 10) {
          if (!confirm(`Le montant pour la facture ${p.numeroFacture} (${formatCurrency(montant)}) dépasse le reste à payer (${formatCurrency(p.resteAPayer)}). Continuer?`)) return;
        }
      }
      
      let successCount = 0;
      for (const p of paymentsToCreate) {
        const montant = parseNumber(p.montant);
        const infoWithEcheance = formData.modePaiement === 'EFFET' && formData.dateEcheanceEffet
          ? `Échéance: ${formData.dateEcheanceEffet}${formData.infoLibre ? ' | ' + formData.infoLibre : ''}`
          : formData.infoLibre;
        
        try {
          const res = await fetch('/api/reglements-fournisseurs', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              factureId: p.factureId, 
              dateReglement: formData.dateReglement,
              montant,
              modePaiement: formData.modePaiement,
              reference: formData.reference,
              infoLibre: infoWithEcheance,
              notes: formData.notes
            })
          });
          if (res.ok) successCount++;
        } catch (e) { console.error(e); }
      }
      
      if (successCount > 0) {
        setDialogOpen(false);
        resetForm();
        fetchReglements();
        alert(`${successCount} règlement(s) créé(s) avec succès`);
      }
      return;
    }
    
    if (!formData.factureId) { alert('Sélectionnez une facture'); return; }
    const montant = parseNumber(formData.montant);
    if (montant <= 0) { alert('Montant invalide'); return; }
    
    const reste = calculerResteAPayer(formData.factureId, editingReglement?.id);
    const depassement = montant - reste;
    if (depassement > 10) { if (!confirm(`Dépassement de ${formatCurrency(depassement)}. Continuer?`)) return; }
    else if (depassement > 0) { if (!confirm(`Petit dépassement: ${formatCurrency(depassement)}. Confirmer?`)) return; }
    
    const infoWithEcheance = formData.modePaiement === 'EFFET' && formData.dateEcheanceEffet
      ? `Échéance: ${formData.dateEcheanceEffet}${formData.infoLibre ? ' | ' + formData.infoLibre : ''}`
      : formData.infoLibre;
    
    try {
      const res = await fetch('/api/reglements-fournisseurs', {
        method: editingReglement ? 'PUT' : 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          id: editingReglement?.id, 
          montant,
          infoLibre: infoWithEcheance
        })
      });
      if (res.ok) { setDialogOpen(false); resetForm(); fetchReglements(); }
      else { const err = await res.json(); alert(err.error || 'Erreur'); }
    } catch (e) { console.error(e); alert('Erreur serveur'); }
  };

  const handleValidate = async (id: string) => {
    if (!confirm('Valider ce règlement ?')) return;
    try { const res = await fetch(`/api/reglements-fournisseurs/${id}/validate`, { method: 'POST' }); if (res.ok) fetchReglements(); else { const err = await res.json(); alert(err.error || 'Erreur'); } } catch (e) { }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce règlement ?')) return;
    try { const res = await fetch(`/api/reglements-fournisseurs?id=${id}`, { method: 'DELETE' }); if (res.ok) fetchReglements(); else { const err = await res.json(); alert(err.error || 'Erreur'); } } catch (e) { }
  };

  const resetForm = () => {
    setFormData({
      factureId: '', dateReglement: new Date().toISOString().split('T')[0],
      montant: '', modePaiement: 'VIREMENT', reference: '', infoLibre: '', notes: '',
      dateEcheanceEffet: ''
    });
    setEditingReglement(null); 
    setSelectedFacture(null); 
    setResteAPayer(null);
    setSelectedFournisseurId(ALL_FOURNISSEURS);
    setIsMultiPayment(false);
    setMultiPayments([]);
  };

  const openEditDialog = (r: ReglementFournisseur) => {
    if (r.statut === 'VALIDE') { alert('Ce règlement est validé et ne peut plus être modifié.'); return; }
    setEditingReglement(r);
    setIsMultiPayment(false);
    const facture = factures.find(f => f.id === r.factureId);
    setSelectedFacture(facture || null);
    setSelectedFournisseurId(facture?.fournisseurId || ALL_FOURNISSEURS);
    const reste = calculerResteAPayer(r.factureId, r.id) + r.montant;
    setResteAPayer(reste);
    
    let dateEcheanceEffet = '';
    let infoLibre = r.infoLibre || '';
    if (r.modePaiement === 'EFFET' && infoLibre.includes('Échéance:')) {
      const match = infoLibre.match(/Échéance:\s*(\d{4}-\d{2}-\d{2})/);
      if (match) {
        dateEcheanceEffet = match[1];
        infoLibre = infoLibre.replace(/Échéance:\s*\d{4}-\d{2}-\d{2}\s*\|?\s*/g, '').trim();
      }
    }
    
    setFormData({
      factureId: r.factureId, dateReglement: new Date(r.dateReglement).toISOString().split('T')[0],
      montant: r.montant.toString(), modePaiement: r.modePaiement,
      reference: r.reference || '', infoLibre: infoLibre, notes: r.notes || '',
      dateEcheanceEffet
    });
    setDialogOpen(true);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) { setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); }
    else { setSortField(field); setSortDirection('desc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 inline opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1 inline" /> : <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  const getModePaiementDisplay = (mode: string, infoLibre: string | null) => {
    if (mode === 'EFFET') {
      const match = infoLibre?.match(/Échéance:\s*(\d{4}-\d{2}-\d{2})/);
      if (match) {
        return `Effet (Éch: ${new Date(match[1]).toLocaleDateString('fr-FR')})`;
      }
      return 'Effet';
    }
    return mode;
  };

  const filteredReglements = reglements
    .filter(r => {
      const matchSearch = r.facture?.fournisseur?.raisonSociale?.toLowerCase().includes(search.toLowerCase()) || r.facture?.numeroFacture?.toLowerCase().includes(search.toLowerCase());
      const regDate = new Date(r.dateReglement);
      const matchDateFrom = !dateFrom || regDate >= new Date(dateFrom);
      const matchDateTo = !dateTo || regDate <= new Date(dateTo + 'T23:59:59');
      return matchSearch && matchDateFrom && matchDateTo;
    })
    .sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case 'dateReglement': valA = new Date(a.dateReglement).getTime(); valB = new Date(b.dateReglement).getTime(); break;
        case 'fournisseur': valA = a.facture?.fournisseur?.raisonSociale || ''; valB = b.facture?.fournisseur?.raisonSociale || ''; break;
        case 'facture': valA = a.facture?.numeroFacture || ''; valB = b.facture?.numeroFacture || ''; break;
        case 'montant': valA = a.montant; valB = b.montant; break;
        case 'modePaiement': valA = a.modePaiement; valB = b.modePaiement; break;
        case 'statut': valA = a.statut; valB = b.statut; break;
        default: return 0;
      }
      if (typeof valA === 'string') { return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA); }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-green-700">Règlements Fournisseurs</h1><p className="text-muted-foreground">Gérez les règlements effectués</p></div>
        <div className="flex items-center gap-2">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-mono font-bold">MFF01</span>
          <Button variant="outline" onClick={() => setExportOpen(true)}><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => { resetForm(); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nouveau</Button>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Liste des Règlements</CardTitle></CardHeader>
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
            {(dateFrom || dateTo) && <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Effacer</Button>}
          </div>
          {filteredReglements.length === 0 ? <div className="text-center text-muted-foreground py-8">Aucun règlement</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('dateReglement')}>Date <SortIcon field="dateReglement" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('fournisseur')}>Fournisseur <SortIcon field="fournisseur" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('facture')}>Facture <SortIcon field="facture" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('montant')}>Montant <SortIcon field="montant" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('modePaiement')}>Mode <SortIcon field="modePaiement" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('statut')}>Statut <SortIcon field="statut" /></TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{filteredReglements.map((r) => (<TableRow key={r.id}>
                <TableCell>{new Date(r.dateReglement).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell>{r.facture?.fournisseur?.raisonSociale}</TableCell>
                <TableCell>{r.facture?.numeroFacture}</TableCell>
                <TableCell>{formatCurrency(r.montant)}</TableCell>
                <TableCell>{getModePaiementDisplay(r.modePaiement, r.infoLibre)}</TableCell>
                <TableCell><span className={`px-2 py-1 rounded text-xs ${r.statut === 'VALIDE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{r.statut === 'VALIDE' ? 'Validé' : 'En attente'}</span></TableCell>
                <TableCell><div className="flex gap-2">
                  {r.statut === 'ENREGISTRE' && <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleValidate(r.id)}><CheckCircle className="h-4 w-4" /></Button>}
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(r)} disabled={r.statut === 'VALIDE'}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(r.id)} disabled={r.statut === 'VALIDE'}><Trash2 className="h-4 w-4" /></Button>
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
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-mono font-bold">MFF01-DLG</span>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Fournisseur Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Fournisseur</Label>
                {!editingReglement && (
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="multiPaymentFourn" 
                      checked={isMultiPayment} 
                      onChange={(e) => {
                        setIsMultiPayment(e.target.checked);
                        if (!e.target.checked) {
                          setMultiPayments([]);
                        } else if (selectedFournisseurId !== ALL_FOURNISSEURS) {
                          const fournisseurFactures = getFacturesForFournisseur(selectedFournisseurId);
                          setMultiPayments(fournisseurFactures);
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor="multiPaymentFourn" className="text-sm cursor-pointer">Paiement multi-factures</label>
                  </div>
                )}
              </div>
              <Select 
                value={selectedFournisseurId} 
                onValueChange={handleFournisseurChange}
                disabled={!!editingReglement}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fournisseur (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FOURNISSEURS}>Tous les fournisseurs</SelectItem>
                  {tiers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.raisonSociale}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Multi-facture payment */}
            {isMultiPayment && !editingReglement && (
              <div className="border rounded-lg p-4 bg-green-50">
                <Label className="text-base font-semibold mb-2 block">Répartition du paiement</Label>
                {multiPayments.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    {selectedFournisseurId !== ALL_FOURNISSEURS ? 'Aucune facture impayée pour ce fournisseur' : 'Sélectionnez un fournisseur pour voir ses factures'}
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Facture</TableHead>
                          <TableHead>Total TTC</TableHead>
                          <TableHead>Reste à payer</TableHead>
                          <TableHead>Montant à régler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {multiPayments.map((p) => (
                          <TableRow key={p.factureId}>
                            <TableCell className="font-medium">{p.numeroFacture}</TableCell>
                            <TableCell>{formatCurrency(p.montantTTC)}</TableCell>
                            <TableCell className="text-green-600 font-semibold">{formatCurrency(p.resteAPayer)}</TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                value={p.montant}
                                onChange={(e) => handleMultiPaymentChange(p.factureId, e.target.value)}
                                placeholder="0.00"
                                className="w-32"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 p-3 bg-white rounded border flex justify-between items-center">
                      <span className="font-semibold">Total à régler:</span>
                      <span className="text-xl font-bold text-green-600">{formatCurrency(calculateTotalMultiPayment())}</span>
                    </div>
                  </>
                )}
              </div>
            )}
            
            {/* Single facture selection */}
            {!isMultiPayment && (
              <>
                <div>
                  <Label className="text-base font-semibold">Facture (non soldée)</Label>
                  <Select value={formData.factureId} onValueChange={handleFactureChange} disabled={!!editingReglement}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner une facture non soldée" /></SelectTrigger>
                    <SelectContent>
                      {facturesDisponibles.length === 0 ? <SelectItem value="__NONE__" disabled>Aucune facture disponible</SelectItem>
                        : facturesDisponibles.map((f) => (<SelectItem key={f.id} value={f.id}>{f.numeroFacture} - {f.fournisseur?.raisonSociale} ({formatCurrency(f.montantTTC)})</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedFacture && resteAPayer !== null && (
                  <div className={`p-4 rounded-lg border ${resteAPayer > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div><span className="text-muted-foreground">Total Facture:</span><div className="font-bold text-lg">{formatCurrency(selectedFacture.montantTTC)}</div></div>
                      <div><span className="text-muted-foreground">Déjà réglé:</span><div className="font-bold text-lg">{formatCurrency(selectedFacture.montantTTC - resteAPayer)}</div></div>
                      <div><span className="text-muted-foreground">Reste à payer:</span><div className="font-bold text-lg text-green-600">{formatCurrency(resteAPayer)}{resteAPayer <= 0 && <span className="ml-2 text-sm">(Soldée)</span>}</div></div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-base font-semibold">Date</Label><Input type="date" value={formData.dateReglement} onChange={(e) => setFormData({ ...formData, dateReglement: e.target.value })} required /></div>
                  <div>
                    <Label className="text-base font-semibold">Montant</Label>
                    <Input type="text" value={formData.montant} onChange={(e) => setFormData({ ...formData, montant: e.target.value })} required />
                    {resteAPayer !== null && parseNumber(formData.montant) > resteAPayer && <div className="flex items-center gap-2 mt-1 text-green-600 text-sm"><AlertTriangle className="w-4 h-4" />Dépassement de {formatCurrency(parseNumber(formData.montant) - resteAPayer)}</div>}
                  </div>
                </div>
              </>
            )}
            
            {/* Common fields for both modes */}
            {(isMultiPayment || formData.factureId) && (
              <>
                {isMultiPayment && (
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="text-base font-semibold">Date</Label><Input type="date" value={formData.dateReglement} onChange={(e) => setFormData({ ...formData, dateReglement: e.target.value })} required /></div>
                  </div>
                )}
                <div>
                  <Label className="text-base font-semibold">Mode de paiement</Label>
                  <Select value={formData.modePaiement} onValueChange={(v) => setFormData({ ...formData, modePaiement: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ESPECES">Espèces</SelectItem>
                      <SelectItem value="CHEQUE">Chèque</SelectItem>
                      <SelectItem value="VIREMENT">Virement</SelectItem>
                      <SelectItem value="CARTE">Carte</SelectItem>
                      <SelectItem value="EFFET">Effet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.modePaiement === 'EFFET' && (
                  <div>
                    <Label className="text-base font-semibold">Date d'échéance</Label>
                    <Input 
                      type="date" 
                      value={formData.dateEcheanceEffet} 
                      onChange={(e) => setFormData({ ...formData, dateEcheanceEffet: e.target.value })} 
                      required 
                    />
                  </div>
                )}
                
                <div><Label className="text-base font-semibold">Référence</Label><Input value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="N° chèque, virement, effet..." /></div>
                <div><Label className="text-base font-semibold">Info libre</Label><Textarea value={formData.infoLibre} onChange={(e) => setFormData({ ...formData, infoLibre: e.target.value })} placeholder="Informations complémentaires..." /></div>
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">{editingReglement ? 'Modifier' : 'Créer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} type="reglements-fournisseurs" code="MFF01" />
    </div>
  );
}
