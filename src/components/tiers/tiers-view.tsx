'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Permission, hasPermission } from '@/lib/permissions';
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
  const { data: session } = useSession();
  const user = session?.user;
  const permissions = user?.permissions as Permission[] || [];
  
  const canEdit = user?.role === 'ADMIN' || hasPermission(user?.role || '', permissions, 'tiers.edit');
  
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
    if (!canEdit) {
      alert('Vous n\'avez pas les droits pour créer ou modifier un tiers');
      return;
    }
    try {
      const body = { ...formData, id: editingTiers?.id };
      const res = await fetch('/api/tiers', {
        method: editingTiers ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) { setDialogOpen(false); resetForm(); fetchTiers(); }
      else { const err = await res.json(); alert(err.error || 'Erreur'); }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) {
      alert('Vous n\'avez pas les droits pour supprimer un tiers');
      return;
    }
    if (!confirm('Supprimer ce tiers ?')) return;
    try {
      const res = await fetch(`/api/tiers/${id}`, { method: 'DELETE' });
      if (res.ok) fetchTiers();
    } catch (e) { console.error(e); }
  };

  const resetForm = () => {
    setEditingTiers(null);
    setFormData({
      code: '', type: 'CLIENT', raisonSociale: '', adresse: '', adresse2: '', codePostal: '',
      ville: '', pays: '', telephone: '', email: '', ice: '', rc: '', rcLieu: '', cnss: '', infoLibre: '', notes: ''
    });
  };

  const openEditDialog = (t: Tiers) => {
    if (!canEdit) return;
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

  const openNewDialog = () => {
    if (!canEdit) return;
    resetForm();
    setDialogOpen(true);
  };

  // Sort functions
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

  // Filter and sort
  const filteredTiers = tiers.filter(t => {
    const q = search.toLowerCase();
    return t.raisonSociale.toLowerCase().includes(q) ||
      (t.code?.toLowerCase().includes(q) ?? false) ||
      (t.ville?.toLowerCase().includes(q) ?? false) ||
      (t.email?.toLowerCase().includes(q) ?? false);
  });

  const sortedTiers = [...filteredTiers].sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (sortDirection === 'asc') return valA < valB ? -1 : valA > valB ? 1 : 0;
    return valA > valB ? -1 : valA < valB ? 1 : 0;
  });

  // Group by type
  const clients = sortedTiers.filter(t => t.type === 'CLIENT');
  const fournisseurs = sortedTiers.filter(t => t.type === 'FOURNISSEUR');

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-700">Tiers</h1>
          <p className="text-muted-foreground">Gestion des clients et fournisseurs</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">TIE01</span>
          {canEdit && (
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />Nouveau
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button variant="outline" onClick={() => setExportOpen(true)}>
          <Download className="w-4 h-4 mr-2" />Export
        </Button>
      </div>

      {/* Clients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" /> Clients ({clients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('raisonSociale')}>
                  Raison sociale <SortIcon field="raisonSociale" />
                </TableHead>
                <TableHead>Ville</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('telephone')}>
                  Téléphone <SortIcon field="telephone" />
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('email')}>
                  Email <SortIcon field="email" />
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.raisonSociale}</TableCell>
                  <TableCell>{t.ville || '-'}</TableCell>
                  <TableCell>{t.telephone || '-'}</TableCell>
                  <TableCell>{t.email || '-'}</TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(t)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Fournisseurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" /> Fournisseurs ({fournisseurs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('raisonSociale')}>
                  Raison sociale <SortIcon field="raisonSociale" />
                </TableHead>
                <TableHead>Ville</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('telephone')}>
                  Téléphone <SortIcon field="telephone" />
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('email')}>
                  Email <SortIcon field="email" />
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fournisseurs.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.raisonSociale}</TableCell>
                  <TableCell>{t.ville || '-'}</TableCell>
                  <TableCell>{t.telephone || '-'}</TableCell>
                  <TableCell>{t.email || '-'}</TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(t)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTiers ? 'Modifier' : 'Nouveau'} Tiers</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Code</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required /></div>
              <div><Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENT">Client</SelectItem>
                    <SelectItem value="FOURNISSEUR">Fournisseur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Raison sociale</Label><Input value={formData.raisonSociale} onChange={(e) => setFormData({ ...formData, raisonSociale: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Adresse</Label><Input value={formData.adresse} onChange={(e) => setFormData({ ...formData, adresse: e.target.value })} /></div>
              <div><Label>Adresse 2</Label><Input value={formData.adresse2} onChange={(e) => setFormData({ ...formData, adresse2: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Code postal</Label><Input value={formData.codePostal} onChange={(e) => setFormData({ ...formData, codePostal: e.target.value })} /></div>
              <div><Label>Ville</Label><Input value={formData.ville} onChange={(e) => setFormData({ ...formData, ville: e.target.value })} /></div>
              <div><Label>Pays</Label><Input value={formData.pays} onChange={(e) => setFormData({ ...formData, pays: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Téléphone</Label><Input value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>ICE</Label><Input value={formData.ice} onChange={(e) => setFormData({ ...formData, ice: e.target.value })} /></div>
              <div><Label>RC</Label><Input value={formData.rc} onChange={(e) => setFormData({ ...formData, rc: e.target.value })} /></div>
              <div><Label>RC Lieu</Label><Input value={formData.rcLieu} onChange={(e) => setFormData({ ...formData, rcLieu: e.target.value })} /></div>
            </div>
            <div><Label>CNSS</Label><Input value={formData.cnss} onChange={(e) => setFormData({ ...formData, cnss: e.target.value })} /></div>
            <div><Label>Info libre</Label><Input value={formData.infoLibre} onChange={(e) => setFormData({ ...formData, infoLibre: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} type="tiers" data={sortedTiers} />
    </div>
  );
}
