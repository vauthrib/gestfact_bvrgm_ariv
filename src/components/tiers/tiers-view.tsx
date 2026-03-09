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
import { Plus, Pencil, Trash2, Search, Users, Download } from 'lucide-react';

interface Tiers {
  id: string; code: string; type: string; raisonSociale: string;
  adresse: string | null; codePostal: string | null; ville: string | null;
  telephone: string | null; email: string | null; ice: string | null;
  rc: string | null; infoLibre: string | null; notes: string | null;
}

export function TiersView() {
  const [tiers, setTiers] = useState<Tiers[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTiers, setEditingTiers] = useState<Tiers | null>(null);
  const [formData, setFormData] = useState({
    code: '', type: 'CLIENT', raisonSociale: '', adresse: '', codePostal: '',
    ville: '', telephone: '', email: '', ice: '', rc: '', infoLibre: '', notes: ''
  });

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
      const url = editingTiers ? `/api/tiers?id=${editingTiers.id}` : '/api/tiers';
      const method = editingTiers ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
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
    setFormData({ code: '', type: 'CLIENT', raisonSociale: '', adresse: '', codePostal: '', ville: '', telephone: '', email: '', ice: '', rc: '', infoLibre: '', notes: '' });
    setEditingTiers(null);
  };

  const openEditDialog = (t: Tiers) => {
    setEditingTiers(t);
    setFormData({ code: t.code, type: t.type, raisonSociale: t.raisonSociale, adresse: t.adresse || '', codePostal: t.codePostal || '', ville: t.ville || '', telephone: t.telephone || '', email: t.email || '', ice: t.ice || '', rc: t.rc || '', infoLibre: t.infoLibre || '', notes: t.notes || '' });
    setDialogOpen(true);
  };

  const generateCode = () => setFormData({ ...formData, code: `T${(tiers.length + 1).toString().padStart(4, '0')}` });
  const handleExport = () => window.open('/api/export?type=tiers', '_blank');
  const filteredTiers = tiers.filter(t => t.raisonSociale?.toLowerCase().includes(search.toLowerCase()) || t.code?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-blue-800">Tiers</h1><p className="text-muted-foreground">Gérez vos clients et fournisseurs</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => { resetForm(); generateCode(); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nouveau</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle><Users className="w-4 h-4" /></CardHeader><CardContent><div className="text-2xl font-bold">{tiers.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Clients</CardTitle><Users className="w-4 h-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{tiers.filter(t => t.type === 'CLIENT').length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Fournisseurs</CardTitle><Users className="w-4 h-4 text-sky-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{tiers.filter(t => t.type === 'FOURNISSEUR').length}</div></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Liste des Tiers</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div></div>
          {filteredTiers.length === 0 ? <div className="text-center text-muted-foreground py-8">Aucun tiers</div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Type</TableHead><TableHead>Raison Sociale</TableHead><TableHead>Ville</TableHead><TableHead>Téléphone</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filteredTiers.map((t) => (<TableRow key={t.id}>
                <TableCell className="font-medium">{t.code}</TableCell>
                <TableCell><span className={`px-2 py-1 rounded text-xs ${t.type === 'CLIENT' ? 'bg-blue-100 text-blue-800' : 'bg-sky-100 text-sky-800'}`}>{t.type}</span></TableCell>
                <TableCell>{t.raisonSociale}</TableCell><TableCell>{t.ville}</TableCell><TableCell>{t.telephone}</TableCell>
                <TableCell><div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(t)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4" /></Button>
                </div></TableCell>
              </TableRow>))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingTiers ? 'Modifier' : 'Nouveau'} Tiers</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Code</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required /></div>
              <div><Label>Type</Label><Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CLIENT">Client</SelectItem><SelectItem value="FOURNISSEUR">Fournisseur</SelectItem></SelectContent></Select></div>
              <div><Label>Raison Sociale</Label><Input value={formData.raisonSociale} onChange={(e) => setFormData({ ...formData, raisonSociale: e.target.value })} required /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Ville</Label><Input value={formData.ville} onChange={(e) => setFormData({ ...formData, ville: e.target.value })} /></div>
              <div><Label>Téléphone</Label><Input value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>ICE</Label><Input value={formData.ice} onChange={(e) => setFormData({ ...formData, ice: e.target.value })} /></div>
              <div><Label>RC</Label><Input value={formData.rc} onChange={(e) => setFormData({ ...formData, rc: e.target.value })} /></div>
            </div>
            <div><Label>Info libre</Label><Textarea value={formData.infoLibre} onChange={(e) => setFormData({ ...formData, infoLibre: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button type="submit" className="bg-blue-500 hover:bg-blue-600">{editingTiers ? 'Modifier' : 'Créer'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
