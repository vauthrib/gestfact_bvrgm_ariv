'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, Package, Download, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { ExportDialog } from '@/components/import-export/export-dialog';
import { PermissionGate } from '@/components/auth/permission-gate';

interface Article {
  id: string; code: string; designation: string; prixUnitaire: number;
  unite: string; tauxTVA: number; infoLibre: string | null; actif: boolean;
  // Nouveaux champs V2.63
  diametreFil: number | null;
  poidsGr: number | null;
  typeAcier: string | null;
}

const parseNumber = (v: string) => { if (!v) return 0; return parseFloat(v.replace(',', '.').replace(/\s/g, '')) || 0; };
const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2 })}\tDH`;

type SortField = 'code' | 'designation' | 'prixUnitaire' | 'tauxTVA' | 'statut';
type SortDirection = 'asc' | 'desc';

export function ArticlesView() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [formData, setFormData] = useState({
    code: '', designation: '', prixUnitaire: '', unite: 'pièce', tauxTVA: '20', infoLibre: '', actif: true,
    // Nouveaux champs V2.63
    diametreFil: '', poidsGr: '', typeAcier: ''
  });
  
  // Sorting - default by designation ascending
  const [sortField, setSortField] = useState<SortField>('designation');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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
      const body = { 
        ...formData, 
        id: editingArticle?.id,
        prixUnitaire: parseNumber(formData.prixUnitaire), 
        tauxTVA: parseNumber(formData.tauxTVA),
        // Nouveaux champs V2.63
        diametreFil: formData.diametreFil ? parseNumber(formData.diametreFil) : null,
        poidsGr: formData.poidsGr ? parseNumber(formData.poidsGr) : null,
        typeAcier: formData.typeAcier || null,
      };
      const res = await fetch('/api/articles', {
        method: editingArticle ? 'PUT' : 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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
    setFormData({ code: '', designation: '', prixUnitaire: '', unite: 'pièce', tauxTVA: '20', infoLibre: '', actif: true,
      diametreFil: '', poidsGr: '', typeAcier: ''
    });
    setEditingArticle(null);
  };

  const openEditDialog = (a: Article) => {
    setEditingArticle(a);
    setFormData({
      code: a.code, designation: a.designation, prixUnitaire: a.prixUnitaire.toString(),
      unite: a.unite, tauxTVA: a.tauxTVA.toString(), infoLibre: a.infoLibre || '', actif: a.actif,
      // Nouveaux champs V2.63
      diametreFil: a.diametreFil?.toString() || '',
      poidsGr: a.poidsGr?.toString() || '',
      typeAcier: a.typeAcier || '',
    });
    setDialogOpen(true);
  };

  const generateCode = () => setFormData({ ...formData, code: `ART${(articles.length + 1).toString().padStart(4, '0')}` });

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
  const filteredArticles = articles
    .filter(a => a.designation?.toLowerCase().includes(search.toLowerCase()) || a.code?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case 'code': valA = a.code || ''; valB = b.code || ''; break;
        case 'designation': valA = a.designation || ''; valB = b.designation || ''; break;
        case 'prixUnitaire': valA = a.prixUnitaire; valB = b.prixUnitaire; break;
        case 'tauxTVA': valA = a.tauxTVA; valB = b.tauxTVA; break;
        case 'statut': valA = a.actif ? 1 : 0; valB = b.actif ? 1 : 0; break;
        default: return 0;
      }
      if (typeof valA === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-blue-700">Articles</h1><p className="text-muted-foreground">Gérez votre catalogue</p></div>
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">ART01</span>
          <PermissionGate permission="articles.create">
            <Button variant="outline" onClick={() => setExportOpen(true)}><Download className="w-4 h-4 mr-2" />Export</Button>
          </PermissionGate>
          <PermissionGate permission="articles.create">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { resetForm(); generateCode(); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nouveau</Button>
          </PermissionGate>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Liste des Articles</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div></div>
          {filteredArticles.length === 0 ? <div className="text-center text-muted-foreground py-8">Aucun article</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('code')}>Code <SortIcon field="code" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('designation')}>Désignation <SortIcon field="designation" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('prixUnitaire')}>P.U. HT <SortIcon field="prixUnitaire" /></TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('tauxTVA')}>TVA <SortIcon field="tauxTVA" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('statut')}>Statut <SortIcon field="statut" /></TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{filteredArticles.map((a) => (<TableRow key={a.id}>
                <TableCell className="font-medium">{a.code}</TableCell>
                <TableCell>{a.designation}</TableCell>
                <TableCell>{formatCurrency(a.prixUnitaire)}</TableCell>
                <TableCell>{a.unite}</TableCell>
                <TableCell>{a.tauxTVA}%</TableCell>
                <TableCell><span className={`px-2 py-1 rounded text-xs ${a.actif ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{a.actif ? 'Actif' : 'Inactif'}</span></TableCell>
                <TableCell><div className="flex gap-2">
                  <PermissionGate permission="articles.edit">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(a)}><Pencil className="h-4 w-4" /></Button>
                  </PermissionGate>
                  <PermissionGate permission="articles.edit">
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(a.id)}><Trash2 className="h-4 w-4" /></Button>
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
              <DialogTitle>{editingArticle ? 'Modifier' : 'Nouveau'} Article</DialogTitle>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">ART01-DLG</span>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Code */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Code Article</Label>
                <Input 
                  value={formData.code} 
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })} 
                  placeholder="Ex: REF-001, A 123, etc."
                  required 
                />
                <p className="text-xs text-muted-foreground mt-1">Code libre (espaces et caractères spéciaux autorisés)</p>
              </div>
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

            {/* Row 5: Nouveaux champs V2.63 - Caractéristiques techniques */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold text-blue-700 mb-3">Caractéristiques techniques</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Diamètre de fil (mm)</Label>
                  <Input 
                    type="text" 
                    value={formData.diametreFil} 
                    onChange={(e) => setFormData({ ...formData, diametreFil: e.target.value })} 
                    placeholder="Ex: 2.5"
                  />
                </div>
                <div>
                  <Label>Poids (gr)</Label>
                  <Input 
                    type="text" 
                    value={formData.poidsGr} 
                    onChange={(e) => setFormData({ ...formData, poidsGr: e.target.value })} 
                    placeholder="Ex: 500"
                  />
                </div>
                <div>
                  <Label>Type d'acier</Label>
                  <Input 
                    type="text" 
                    value={formData.typeAcier} 
                    onChange={(e) => setFormData({ ...formData, typeAcier: e.target.value })} 
                    placeholder="Ex: Inox, Galvanisé..."
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="actif" checked={formData.actif} onChange={(e) => setFormData({ ...formData, actif: e.target.checked })} className="w-4 h-4" />
              <Label htmlFor="actif">Article actif</Label>
            </div>

            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button type="submit" className="bg-blue-600 hover:bg-blue-700">{editingArticle ? 'Modifier' : 'Créer'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} type="articles" code="ART01" />
    </div>
  );
}
