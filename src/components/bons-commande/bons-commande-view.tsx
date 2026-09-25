'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Search, Printer, Paperclip, ScanText } from 'lucide-react';
import { PermissionGate } from '@/components/auth/permission-gate';
import { DocumentScansDialog } from '@/components/documents/document-scans-dialog';
import { OfPrint, OfCommande } from '@/components/print/of-print';
import { lireTexteOCR, lignesDepuisTexte } from '@/lib/ocr';

// V3.33 - Rubrique « Bon de commande » (NCB01)

const ACCENT: 'green' | 'pink' | 'blue' = 'blue';
const BTN = {
  green: 'bg-green-600 hover:bg-green-700',
  pink: 'bg-pink-600 hover:bg-pink-700',
  blue: 'bg-blue-600 hover:bg-blue-700',
}[ACCENT];
const TEXT = { green: 'text-green-700', pink: 'text-pink-700', blue: 'text-blue-700' }[ACCENT];
const BADGE = {
  green: 'bg-green-100 text-green-700',
  pink: 'bg-pink-100 text-pink-700',
  blue: 'bg-blue-100 text-blue-700',
}[ACCENT];

interface LigneCommande {
  id?: string;
  articleId?: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  totalHT: number;
}
interface BonCommande {
  id: string;
  numero: string;
  dateCommande: string;
  dateReception: string | null;
  clientId: string;
  referenceClient: string | null;
  statut: string;
  infoLibre: string | null;
  notes: string | null;
  totalHT: number;
  lignes: LigneCommande[];
  blIds?: string[];
}
interface Tiers { id: string; code: string; raisonSociale: string; type: string; }
interface Article { id: string; code: string; designation: string; prixUnitaire: number; conditionnement?: number; }
interface LigneBL { articleId?: string; designation: string; quantite: number; }
interface BonLivraisonLight {
  id: string; numero: string; dateBL: string; statut: string;
  lignes?: LigneBL[]; facture?: { id: string; numero: string } | null;
}
interface Parametres {
  nomEntreprise?: string; adresseEntreprise?: string; villeEntreprise?: string;
  telephoneEntreprise?: string; emailEntreprise?: string; ice?: string; rc?: string;
}

const parseNumber = (v: string | number) => {
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(',', '.').replace(/\s/g, '')) || 0;
};
const formatCurrency = (a: number) => `${(a || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH`;
const dateFr = (d?: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '-');

const VIDE = { dateCommande: new Date().toISOString().split('T')[0], dateReception: '', clientId: '', referenceClient: '', statut: 'EN_COURS', infoLibre: '', notes: '' };
const LIGNE_VIDE: LigneCommande = { designation: '', quantite: 1, prixUnitaire: 0, totalHT: 0 };

export function CommandesView() {
  const [commandes, setCommandes] = useState<BonCommande[]>([]);
  const [bls, setBls] = useState<BonLivraisonLight[]>([]);
  const [clients, setClients] = useState<Tiers[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [parametres, setParametres] = useState<Parametres | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BonCommande | null>(null);
  const [formData, setFormData] = useState<typeof VIDE>(VIDE);
  const [lignes, setLignes] = useState<LigneCommande[]>([{ ...LIGNE_VIDE }]);
  const [saving, setSaving] = useState(false);

  // Scan
  const [scanOpen, setScanOpen] = useState(false);
  const [scanNumero, setScanNumero] = useState('');
  // OF
  const [ofOpen, setOfOpen] = useState(false);
  const [ofCommande, setOfCommande] = useState<OfCommande | null>(null);
  // OCR
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrMsg, setOcrMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchCommandes(); fetchBls(); fetchClients(); fetchArticles(); fetchParametres(); }, []);

  const fetchCommandes = async () => {
    try {
      const res = await fetch('/api/bons-commande');
      const d = await res.json();
      setCommandes(Array.isArray(d) ? d : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const fetchBls = async () => { try { const res = await fetch('/api/bons-livraison'); const d = await res.json(); setBls(Array.isArray(d) ? d : []); } catch (e) {} };
  const fetchClients = async () => { try { const res = await fetch('/api/tiers'); const d = await res.json(); setClients((Array.isArray(d) ? d : []).filter((t: any) => t.type === 'CLIENT')); } catch (e) {} };
  const fetchArticles = async () => { try { const res = await fetch('/api/articles'); const d = await res.json(); setArticles(Array.isArray(d) ? d : []); } catch (e) {} };
  const fetchParametres = async () => { try { const res = await fetch('/api/parametres'); const d = await res.json(); setParametres(d); } catch (e) {} };

  const sortedClients = [...clients].sort((a, b) => a.raisonSociale.localeCompare(b.raisonSociale));
  const sortedArticles = [...articles].sort((a, b) => a.code.localeCompare(b.code));
  const clientName = (id: string) => clients.find((c) => c.id === id)?.raisonSociale || '';

  // ---- Suivi : avancement, BL et factures liés -------------------------------
  const suivi = (c: BonCommande) => {
    const lies = bls.filter((b) => (c.blIds || []).includes(b.id));
    let commandeTotal = 0;
    let livreTotal = 0;
    (c.lignes || []).forEach((l) => {
      const qte = l.quantite || 0;
      commandeTotal += qte;
      let livre = 0;
      lies.forEach((b) => {
        (b.lignes || []).forEach((bl) => {
          const match = l.articleId
            ? bl.articleId === l.articleId
            : (bl.designation || '').trim().toLowerCase() === (l.designation || '').trim().toLowerCase();
          if (match) livre += bl.quantite || 0;
        });
      });
      livreTotal += Math.min(livre, qte);
    });
    const pct = commandeTotal > 0 ? Math.min(100, Math.round((livreTotal / commandeTotal) * 100)) : 0;
    const factures = Array.from(new Set(lies.map((b) => b.facture?.numero).filter(Boolean) as string[]));
    const dates = lies.map((b) => b.dateBL).sort();
    return { lies, commandeTotal, livreTotal, pct, factures, dateBL: dates[0] || null };
  };

  const statutAffiche = (c: BonCommande) => {
    if (c.statut === 'ANNULEE') return { label: 'Annulée', cls: 'bg-red-100 text-red-800' };
    const s = suivi(c);
    if (s.lies.length === 0) return { label: 'À recevoir', cls: 'bg-yellow-100 text-yellow-800' };
    if (s.factures.length > 0 && s.pct >= 100) return { label: 'Facturée', cls: 'bg-green-100 text-green-800' };
    if (s.pct >= 100) return { label: 'Livrée', cls: 'bg-blue-100 text-blue-800' };
    return { label: 'En cours', cls: 'bg-orange-100 text-orange-800' };
  };

  const filtered = commandes.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.numero.toLowerCase().includes(q) ||
      (c.referenceClient || '').toLowerCase().includes(q) ||
      clientName(c.clientId).toLowerCase().includes(q)
    );
  });

  // ---- Saisie ----------------------------------------------------------------
  const resetForm = () => { setFormData({ ...VIDE, dateCommande: new Date().toISOString().split('T')[0] }); setLignes([{ ...LIGNE_VIDE }]); setEditing(null); setOcrMsg(''); };

  const openCreate = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (c: BonCommande) => {
    setEditing(c);
    setFormData({
      dateCommande: new Date(c.dateCommande).toISOString().split('T')[0],
      dateReception: c.dateReception ? new Date(c.dateReception).toISOString().split('T')[0] : '',
      clientId: c.clientId,
      referenceClient: c.referenceClient || '',
      statut: c.statut || 'EN_COURS',
      infoLibre: c.infoLibre || '',
      notes: c.notes || '',
    });
    setLignes((c.lignes || []).length ? c.lignes.map((l) => ({ ...l })) : [{ ...LIGNE_VIDE }]);
    setOcrMsg('');
    setDialogOpen(true);
  };

  const updateLigne = (idx: number, field: keyof LigneCommande, val: string | number) => {
    setLignes((prev) => prev.map((l, i) => {
      if (i !== idx) return l;
      const next = { ...l, [field]: val } as LigneCommande;
      if (field === 'quantite' || field === 'prixUnitaire') {
        (next as any)[field] = typeof val === 'string' ? parseNumber(val) : val;
      }
      if (field === 'articleId') {
        const a = articles.find((x) => x.id === val);
        if (a) { next.designation = a.designation; if (!next.prixUnitaire) next.prixUnitaire = a.prixUnitaire; }
      }
      next.totalHT = Math.round((parseNumber(next.quantite) * parseNumber(next.prixUnitaire)) * 100) / 100;
      return next;
    }));
  };

  const handleSubmit = async (e: React.FormEvent, openOf = false) => {
    e.preventDefault();
    if (!formData.clientId) { alert('Sélectionnez un client.'); return; }
    const valides = lignes.filter((l) => (l.designation || '').trim() !== '' && parseNumber(l.quantite) > 0);
    if (valides.length === 0) { alert('Ajoutez au moins une ligne.'); return; }

    setSaving(true);
    try {
      const payload = { ...formData, dateReception: formData.dateReception || null, lignes: valides };
      const res = await fetch('/api/bons-commande', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
      });
      const saved = await res.json();
      if (!res.ok) { alert(saved.error || 'Erreur lors l\'enregistrement'); return; }

      setDialogOpen(false);
      const numero = saved.numero;
      await fetchCommandes();
      await fetchBls();

      if (openOf) {
        setOfCommande({ ...saved, blIds: [] } as OfCommande);
        setOfOpen(true);
      } else if (!editing) {
        // Enregistrer puis déposer le scan de la commande
        setScanNumero(numero);
        setScanOpen(true);
      }
      resetForm();
    } catch (err: any) {
      alert('Erreur réseau : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: BonCommande) => {
    if (!confirm(`Supprimer la commande ${c.numero} ?`)) return;
    try {
      const res = await fetch(`/api/bons-commande?id=${encodeURIComponent(c.id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Suppression impossible');
        return;
      }
      fetchCommandes();
    } catch (e: any) { alert('Erreur : ' + e.message); }
  };

  // Mise à jour de la date de réception (ligne de la liste)
  const handleReception = async (c: BonCommande, value: string) => {
    const local = commandes.map((x) => (x.id === c.id ? { ...x, dateReception: value || null } : x));
    setCommandes(local);
    try {
      await fetch('/api/bons-commande', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, dateReception: value || null }),
      });
    } catch (e) { console.error(e); }
  };

  // ---- OCR (pré-remplissage uniquement) -------------------------------------
  const appliquerOCR = (texte: string) => {
    const pre = lignesDepuisTexte(texte, articles);
    if (pre.length === 0) {
      setOcrMsg('Aucune ligne exploitable dans le scan — saisissez manuellement.');
      return;
    }
    setLignes(pre);
    setOcrMsg(`${pre.length} ligne(s) pré-remplies depuis le scan — vérifiez avant d'enregistrer.`);
  };

  const handleOcrFichier = async (file: File) => {
    setOcrRunning(true);
    setOcrMsg('Lecture du scan en cours (OCR)…');
    try {
      const texte = await lireTexteOCR(file);
      appliquerOCR(texte);
    } catch (err: any) {
      setOcrMsg(`OCR indisponible : ${err?.message || 'erreur'} — saisissez manuellement.`);
    } finally { setOcrRunning(false); }
  };

  const handleOcr = async () => {
    setOcrRunning(true);
    setOcrMsg('Recherche du scan…');
    try {
      if (editing?.numero) {
        const res = await fetch(`/api/document-scans?typeDoc=BON_COMMANDE&numeroDoc=${encodeURIComponent(editing.numero)}`);
        const scans = await res.json();
        if (Array.isArray(scans) && scans.length > 0) {
          setOcrMsg('Lecture du scan en cours (OCR)…');
          const texte = await lireTexteOCR(`/api/document-scans/${scans[0].id}/view`);
          appliquerOCR(texte);
          return;
        }
      }
      // Pas de scan enregistré : on propose de choisir l'image du scan
      setOcrMsg('Aucun scan enregistré — sélectionnez l\'image du bon de commande.');
      setOcrRunning(false);
      fileInputRef.current?.click();
    } catch (err: any) {
      setOcrMsg(`OCR indisponible : ${err?.message || 'erreur'} — saisissez manuellement.`);
      setOcrRunning(false);
    }
  };

  if (loading) return <div className="p-8">Chargement...</div>;

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${TEXT}`}>Bons de commande</h1>
          <p className="text-muted-foreground">Enregistrez les commandes clients, suivez leur livraison et éditez les ordres de fabrication</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`${BADGE} px-3 py-1 rounded-full text-sm font-mono font-bold`}>NCB01</span>
          <PermissionGate permission="commandes.create">
            <Button className={BTN} onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Nouvelle commande</Button>
          </PermissionGate>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Liste</CardTitle></CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Rechercher (n°, BC client, client)..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">Aucune commande</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>N° BC client</TableHead>
                  <TableHead>Avancement</TableHead>
                  <TableHead>Réception</TableHead>
                  <TableHead>BL</TableHead>
                  <TableHead>Facture</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const s = suivi(c);
                  const st = statutAffiche(c);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.numero}</TableCell>
                      <TableCell>{dateFr(c.dateCommande)}</TableCell>
                      <TableCell>{clientName(c.clientId)}</TableCell>
                      <TableCell className="font-mono text-xs">{c.referenceClient || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded overflow-hidden">
                            <div className={`h-2 rounded ${s.pct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${s.pct}%` }} />
                          </div>
                          <span className="text-xs whitespace-nowrap">{s.livreTotal}/{s.commandeTotal} ({s.pct}%)</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={c.dateReception ? new Date(c.dateReception).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleReception(c, e.target.value)}
                          className="h-8 w-36 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        {s.lies.length === 0 ? (
                          <span className="text-xs text-muted-foreground">-</span>
                        ) : (
                          <span className="text-xs" title={s.lies.map((b) => `${b.numero} (${dateFr(b.dateBL)})`).join(', ')}>
                            {s.lies.length} BL{s.lies.length > 1 ? 's' : ''} {s.dateBL ? `· ${dateFr(s.dateBL)}` : ''}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.factures.length === 0 ? <span className="text-xs text-muted-foreground">-</span> : (
                          <span className="text-xs font-medium text-green-700">{s.factures.join(', ')}</span>
                        )}
                      </TableCell>
                      <TableCell><span className={`px-2 py-1 rounded text-xs ${st.cls}`}>{st.label}</span></TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <PermissionGate permission="commandes.edit">
                            <Button size="sm" variant="outline" onClick={() => openEdit(c)} title="Modifier"><Pencil className="h-4 w-4" /></Button>
                          </PermissionGate>
                          <PermissionGate permission="commandes.print">
                            <Button size="sm" variant="outline" title="Ordre de fabrication" onClick={() => { setOfCommande(c as OfCommande); setOfOpen(true); }}>
                              <Printer className="h-4 w-4" />
                            </Button>
                          </PermissionGate>
                          <PermissionGate permission="scans.view">
                            <Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-800" title="Scans de la commande"
                              onClick={() => { setScanNumero(c.numero); setScanOpen(true); }}>
                              <Paperclip className="h-4 w-4" />
                            </Button>
                          </PermissionGate>
                          <PermissionGate permission="commandes.edit">
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(c)} title="Supprimer"><Trash2 className="h-4 w-4" /></Button>
                          </PermissionGate>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ===== Dialog de saisie ===== */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-6xl max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{editing ? 'Modifier la commande' : 'Nouvelle commande'}</DialogTitle>
              <span className={`${BADGE} px-3 py-1 rounded-full text-sm font-mono font-bold`}>NCB01-DLG</span>
            </div>
          </DialogHeader>

          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Date de commande</Label>
                <Input type="date" value={formData.dateCommande} onChange={(e) => setFormData({ ...formData, dateCommande: e.target.value })} required />
              </div>
              <div>
                <Label>Date de réception prévue</Label>
                <Input type="date" value={formData.dateReception} onChange={(e) => setFormData({ ...formData, dateReception: e.target.value })} />
              </div>
              <div>
                <Label>Client</Label>
                <Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {sortedClients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.raisonSociale}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>N° BC client</Label>
                <Input placeholder="Référence du client" value={formData.referenceClient} onChange={(e) => setFormData({ ...formData, referenceClient: e.target.value })} />
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
                <Label>Lignes</Label>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleOcrFichier(f); e.target.value = ''; }}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={handleOcr} disabled={ocrRunning}>
                    <ScanText className="w-4 h-4 mr-1" />
                    {ocrRunning ? 'OCR en cours…' : 'Pré-remplir (OCR)'}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setLignes((p) => [...p, { ...LIGNE_VIDE }])}>
                    <Plus className="w-4 h-4 mr-1" />Ajouter
                  </Button>
                </div>
              </div>
              {ocrMsg && <p className="text-xs text-muted-foreground mb-2">{ocrMsg}</p>}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead className="w-[400px]">Désignation</TableHead>
                    <TableHead>Qté</TableHead>
                    <TableHead>P.U.</TableHead>
                    <TableHead>Total HT</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lignes.map((l, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select value={l.articleId || ''} onValueChange={(v) => updateLigne(idx, 'articleId', v)}>
                          <SelectTrigger className="w-72"><SelectValue placeholder="Sélectionner un article..." /></SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {sortedArticles.map((a) => (<SelectItem key={a.id} value={a.id} className="whitespace-normal">{a.code} - {a.designation}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Textarea value={l.designation} onChange={(e) => updateLigne(idx, 'designation', e.target.value)} className="min-h-[40px] min-w-[300px]" /></TableCell>
                      <TableCell><Input type="number" value={l.quantite} onChange={(e) => updateLigne(idx, 'quantite', e.target.value)} className="w-20" /></TableCell>
                      <TableCell><Input type="number" step="0.01" value={l.prixUnitaire} onChange={(e) => updateLigne(idx, 'prixUnitaire', e.target.value)} className="w-24" /></TableCell>
                      <TableCell>{formatCurrency(l.totalHT)}</TableCell>
                      <TableCell><Button type="button" size="sm" variant="ghost" onClick={() => setLignes((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p))}>×</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right font-bold mt-2">
                Total HT: {formatCurrency(lignes.reduce((s, l) => s + (l.totalHT || 0), 0))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Statut</Label>
                <Select value={formData.statut} onValueChange={(v) => setFormData({ ...formData, statut: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EN_COURS">En cours</SelectItem>
                    <SelectItem value="FACTUREE">Facturée</SelectItem>
                    <SelectItem value="ANNULEE">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Info libre</Label>
              <Textarea value={formData.infoLibre} onChange={(e) => setFormData({ ...formData, infoLibre: e.target.value })} />
            </div>

            <DialogFooter className="flex-wrap gap-2">
              <PermissionGate permission="commandes.print">
                <Button type="button" variant="outline" disabled={saving} onClick={(e) => handleSubmit(e as any, true)}>
                  <Printer className="w-4 h-4 mr-1" />Enregistrer &amp; OF
                </Button>
              </PermissionGate>
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Annuler</Button>
              <Button type="submit" className={BTN} disabled={saving}>{saving ? 'Enregistrement…' : editing ? 'Modifier' : 'Enregistrer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Scans de la commande ===== */}
      <DocumentScansDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        typeDoc="BON_COMMANDE"
        numeroDoc={scanNumero}
        accent={ACCENT}
      />

      {/* ===== Ordre de fabrication ===== */}
      <OfPrint
        open={ofOpen}
        onOpenChange={setOfOpen}
        commande={ofCommande}
        client={ofCommande?.clientId ? clientName(ofCommande.clientId) : ''}
        entreprise={parametres}
        accent={ACCENT}
      />
    </div>
  );
}
