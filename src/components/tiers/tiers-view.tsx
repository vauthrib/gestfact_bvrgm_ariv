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
import { Plus, Pencil, Trash2, Search, Users, Download, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { ExportDialog } from '@/components/import-export/export-dialog';
import { PermissionGate } from '@/components/auth/permission-gate';

interface Tiers {
  id: string; code: string; type: string; raisonSociale: string;
  adresse: string | null; adresse2: string | null; codePostal: string | null; ville: string | null; pays: string | null;
  telephone: string | null; email: string | null; ice: string | null;
  rc: string | null; rcLieu: string | null; cnss: string | null;
  infoLibre: string | null; notes: string | null;
}

type SortField = 'raisonSociale' | 'ville' | 'telephone' | 'email';
type SortDirection = 'asc' | 'desc';

export function TiersView() {
  const [tiers, setTiers] = useState<Tiers[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editingTiers, setEditingTiers] = useState<Tiers | null>(null);
  const [formData, setFormData] = useState({
    code: '', type: 'CLIENT', raisonSociale: '', adresse: '', adresse2: '', codePostal: '',
    ville: '', pays: '', telephone: '', email: '', ice: '', rc: '', rcLieu: '', cnss: '', infoLibre: '', notes: ''
  });
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('raisonSociale');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => { fetchTiers(); }, []);

  const fetchTiers = async () => {
    try {
      const res = await fetch('/api/tiers');
      const data = await res.json();
      setTiers(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = { ...formData, id: editingTiers?.id };
      const res = await fetch('/api/tiers', {
        method: editingTiers ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) { setDialogOpen(false); resetForm(); fetchTiers(); }
      else { const err = await res.json(); alert(err.error || 'Erreur'); }
    } catch (e) { alert('Erreur serveur'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce tiers ?')) return;
    await fetch(`/api/tiers?id=${id}`, { method: 'DELETE' });
    fetchTiers();
  };

  const resetForm = () => {
    setFormData({ code: '', type: 'CLIENT', raisonSociale: '', adresse: '', adresse2: '', codePostal: '', ville: '', pays: '', telephone: '', email: '', ice: '', rc: '', rcLieu: '', cnss: '', infoLibre: '', notes: '' });
    setEditingTiers(null);
  };

  const openEditDialog = (t: Tiers) => {
    setEditingTiers(t);
    setFormData({
      code: t.code, type: t.type, raisonSociale: t.raisonSociale,
      adresse: t.adresse || '', adresse2: t.adresse2 || '', codePostal: t.codePostal || '',
      ville: t.ville || '', pays: t.pays || '', telephone: t.telephone || '', email: t.email || '',
      ice: t.ice || '', rc: t.rc || '', rcLieu: t.rcLieu || '', cnss: t.cnss || '',
      infoLibre: t.infoLibre || '', notes: t.notes || ''
    });
    setDialogOpen(true);
  };

  const generateCode = () => setFormData({ ...formData, code: `T${(tiers.length + 1).toString().padStart(4, '0')}` });
  const filteredTiers = tiers.filter(t => t.raisonSociale?.toLowerCase().includes(search.toLowerCase()) || t.code?.toLowerCase().includes(search.toLowerCase()));
  
  // Sorting functions
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 inline opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1 inline" /> : <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };
  
  // Sorted data
  const sortedTiers = [...filteredTiers].sort((a, b) => {
    let valA: string, valB: string;
    switch (sortField) {
      case 'raisonSociale': valA = a.raisonSociale || ''; valB = b.raisonSociale || ''; break;
      case 'ville': valA = a.ville || ''; valB = b.ville || ''; break;
      case 'telephone': valA = a.telephone || ''; valB = b.telephone || ''; break;
      case 'email': valA = a.email || ''; valB = b.email || ''; break;
      default: return 0;
    }
    return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-blue-700">Tiers</h1><p className="text-muted-foreground">Gérez vos clients et fournisseurs</p></div>
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">TIE01</span>
          <PermissionGate permission="tiers.create">
            <Button variant="outline" onClick={() => setExportOpen(true)}><Download className="w-4 h-4 mr-2" />Export</Button>
          </PermissionGate>
          <PermissionGate permission="tiers.create">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { resetForm(); generateCode(); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nouveau</Button>
          </PermissionGate>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Liste des Tiers</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div></div>
          {filteredTiers.length === 0 ? <div className="text-center text-muted-foreground py-8">Aucun tiers</div> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('raisonSociale')}>Raison Sociale <SortIcon field="raisonSociale" /></TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('ville')}>Ville <SortIcon field="ville" /></TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('telephone')}>Téléphone <SortIcon field="telephone" /></TableHead>
                <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('email')}>Email <SortIcon field="email" /></TableHead>
                <TableHead>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>{sortedTiers.map((t) => (<TableRow key={t.id}>
                <TableCell className="font-medium">{t.raisonSociale}</TableCell>
                <TableCell>{t.ville}</TableCell>
                <TableCell>{t.telephone}</TableCell>
                <TableCell>{t.email}</TableCell>
                <TableCell><div className="flex gap-2">
                  <PermissionGate permission="tiers.edit">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(t)}><Pencil className="h-4 w-4" /></Button>
                  </PermissionGate>
                  <PermissionGate permission="tiers.edit">
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4" /></Button>
                  </PermissionGate>
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
              <DialogTitle>{editingTiers ? 'Modifier' : 'Nouveau'} Tiers</DialogTitle>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">TIE01-DLG</span>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Code | Type */}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Code</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required /></div>
              <div><Label>Type</Label><Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CLIENT">Client</SelectItem><SelectItem value="FOURNISSEUR">Fournisseur</SelectItem></SelectContent></Select></div>
            </div>

            {/* Row 2: *Raison Sociale (3x large, 2x haut, 2x font) */}
            <div className="col-span-full">
              <Label className="text-base font-semibold">* Raison Sociale <span className="text-red-500">(obligatoire)</span></Label>
              <Textarea
                value={formData.raisonSociale}
                onChange={(e) => setFormData({ ...formData, raisonSociale: e.target.value })}
                required
                className="text-2xl font-semibold min-h-[80px] resize-none"
                placeholder="Raison sociale..."
              />
            </div>

            {/* Row 3: Adresse */}
            <div><Label>Adresse</Label><Input value={formData.adresse} onChange={(e) => setFormData({ ...formData, adresse: e.target.value })} /></div>

            {/* Row 4: Adresse 2 */}
            <div><Label>Adresse (suite)</Label><Input value={formData.adresse2} onChange={(e) => setFormData({ ...formData, adresse2: e.target.value })} /></div>

            {/* Row 5: Ville | Pays */}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Ville</Label><Input value={formData.ville} onChange={(e) => setFormData({ ...formData, ville: e.target.value })} /></div>
              <div><Label>Pays</Label><Input value={formData.pays} onChange={(e) => setFormData({ ...formData, pays: e.target.value })} /></div>
            </div>

            {/* Row 6: Téléphone | Email */}
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Téléphone</Label><Input value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            </div>

            {/* Row 7: ICE | RC | Lieu RC */}
            <div className="grid grid-cols-3 gap-4">
              <div><Label>ICE</Label><Input value={formData.ice} onChange={(e) => setFormData({ ...formData, ice: e.target.value })} /></div>
              <div><Label>RC</Label><Input value={formData.rc} onChange={(e) => setFormData({ ...formData, rc: e.target.value })} /></div>
              <div><Label>Lieu RC</Label><Input value={formData.rcLieu} onChange={(e) => setFormData({ ...formData, rcLieu: e.target.value })} /></div>
            </div>

            {/* Row 8: CNSS */}
            <div><Label>CNSS</Label><Input value={formData.cnss} onChange={(e) => setFormData({ ...formData, cnss: e.target.value })} /></div>

            {/* Row 9: Info Libres */}
            <div><Label>Info libres</Label><Textarea value={formData.infoLibre} onChange={(e) => setFormData({ ...formData, infoLibre: e.target.value })} /></div>

            {/* Row 10: Notes */}
            <div><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>

            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button type="submit" className="bg-blue-600 hover:bg-blue-700">{editingTiers ? 'Modifier' : 'Créer'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} type="tiers" code="TIE01" />
    </div>
  );
}
