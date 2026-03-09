'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, Package, Download, Upload } from 'lucide-react';
import { ImportDialog } from '@/components/import-export/import-dialog';
import { ExportDialog } from '@/components/import-export/export-dialog';

interface Article {
  id: string; code: string; designation: string; prixUnitaire: number;
  unite: string; tauxTVA: number; infoLibre: string | null; actif: boolean;
}

const parseNumber = (v: string) => { if (!v) return 0; return parseFloat(v.replace(',', '.').replace(/\s/g, '')) || 0; };
const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2 })}\tDH`;

export function ArticlesView() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [formData, setFormData] = useState({
    code: '', designation: '', prixUnitaire: '', unite: 'pièce', tauxTVA: '20', infoLibre: '', actif: true
  });

  useEffect(() => { fetchArticles(); }, []);

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/articles');
      const data = await res.json();
      setArticles(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingArticle ? `/api/articles?id=${editingArticle.id}` : '/api/articles';
      const method = editingArticle ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, prixUnitaire: parseNumber(formData.prixUnitaire), tauxTVA: parseNumber(formData.tauxTVA) })
      });
      if (res.ok) { setDialogOpen(false); resetForm(); fetchArticles(); }
      else { const err = await res.json(); alert(err.error || 'Erreur'); }
    } catch (e) { alert('Erreur serveur'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet article ?')) return;
    await fetch(`/api/articles?id=${id}`, { method: 'DELETE' });
    fetchArticles();
  };

  const resetForm = () => {
    setFormData({ code: '', designation: '', prixUnitaire: '', unite: 'pièce', tauxTVA: '20', infoLibre: '', actif: true });
    setEditingArticle(null);
  };

  const openEditDialog = (a: Article) => {
    setEditingArticle(a);
    setFormData({
      code: a.code, designation: a.designation, prixUnitaire: a.prixUnitaire.toString(),
      unite: a.unite, tauxTVA: a.tauxTVA.toString(), infoLibre: a.infoLibre || '', actif: a.actif
    });
    setDialogOpen(true);
  };

  const generateCode = () => setFormData({ ...formData, code: `ART${(articles.length + 1).toString().padStart(4, '0')}` });
  const filteredArticles = articles.filter(a => a.designation?.toLowerCase().includes(search.toLowerCase()) || a.code?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-green-700">Articles</h1><p className="text-muted-foreground">Gérez votre catalogue</p></div>
        <div className="flex items-center gap-2">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-mono font-bold">ART01</span>
          <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" />Import</Button>
          <Button variant="outline" onClick={() => setExportOpen(true)}><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => { resetForm(); generateCode(); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nouveau</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle><Package className="w-4 h-4" /></CardHeader><CardContent><div className="text-2xl font-bold">{articles.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Actifs</CardTitle><Package className="w-4 h-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{articles.filter(a => a.actif).length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Inactifs</CardTitle><Package className="w-4 h-4 text-gray-400" /></CardHeader><CardContent><div className="text-2xl font-bold">{articles.filter(a => !a.actif).length}</div></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Liste des Articles</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div></div>
          {filteredArticles.length === 0 ? <div className="text-center text-muted-foreground py-8">Aucun article</div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Désignation</TableHead><TableHead>P.U. HT</TableHead><TableHead>Unité</TableHead><TableHead>TVA</TableHead><TableHead>Statut</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filteredArticles.map((a) => (<TableRow key={a.id}>
                <TableCell className="font-medium">{a.code}</TableCell>
                <TableCell>{a.designation}</TableCell>
                <TableCell>{formatCurrency(a.prixUnitaire)}</TableCell>
                <TableCell>{a.unite}</TableCell>
                <TableCell>{a.tauxTVA}%</TableCell>
                <TableCell><span className={`px-2 py-1 rounded text-xs ${a.actif ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{a.actif ? 'Actif' : 'Inactif'}</span></TableCell>
                <TableCell><div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(a)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(a.id)}><Trash2 className="h-4 w-4" /></Button>
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
              <DialogTitle>{editingArticle ? 'Modifier' : 'Nouveau'} Article</DialogTitle>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-mono font-bold">ART01-DLG</span>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Code */}
            <div className="grid grid-cols-4 gap-4">
              <div><Label>Code</Label><Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required /></div>
              <div><Label>Prix Unitaire HT</Label><Input type="text" value={formData.prixUnitaire} onChange={(e) => setFormData({ ...formData, prixUnitaire: e.target.value })} required /></div>
              <div></div>
              <div></div>
            </div>

            {/* Row 2: Désignation (sur 3 lignes, ~30 caractères de largeur) */}
            <div>
              <Label>Désignation</Label>
              <Textarea
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                required
                rows={3}
                className="w-[50ch] font-mono resize-none"
                placeholder="Désignation..."
              />
            </div>

            {/* Row 3: Unité | TVA % */}
            <div className="grid grid-cols-4 gap-4">
              <div><Label>Unité</Label><Input value={formData.unite} onChange={(e) => setFormData({ ...formData, unite: e.target.value })} /></div>
              <div><Label>TVA %</Label><Input type="text" value={formData.tauxTVA} onChange={(e) => setFormData({ ...formData, tauxTVA: e.target.value })} /></div>
              <div></div>
              <div></div>
            </div>

            {/* Row 4: Info Libres */}
            <div><Label>Info Libres</Label><Textarea value={formData.infoLibre} onChange={(e) => setFormData({ ...formData, infoLibre: e.target.value })} /></div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="actif" checked={formData.actif} onChange={(e) => setFormData({ ...formData, actif: e.target.checked })} className="w-4 h-4" />
              <Label htmlFor="actif">Article actif</Label>
            </div>

            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button type="submit" className="bg-green-600 hover:bg-green-700">{editingArticle ? 'Modifier' : 'Créer'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} type="articles" code="ART01" onSuccess={fetchArticles} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} type="articles" code="ART01" />
    </div>
  );
}
