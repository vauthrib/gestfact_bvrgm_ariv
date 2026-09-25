'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, CheckCircle, Download, Printer, ArrowUp, ArrowDown, ArrowUpDown, ListPlus, Eye, EyeOff, Paperclip } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ExportDialog } from '@/components/import-export/export-dialog';
import { PrintDocument } from '@/components/print/print-document';
import { PermissionGate } from '@/components/auth/permission-gate';
import { DocumentScansDialog } from '@/components/documents/document-scans-dialog';
import { montantEnLettres } from '@/lib/number-to-words';

interface LigneFacture { id?: string; articleId?: string; designation: string; quantite: string; prixUnitaire: string; tauxTVA: string; totalHT: number; }
interface FactureClient { id: string; numero: string; dateFacture: string; clientId: string; bonCommande: string | null; numeroBL: string | null; dateEcheance: string; statut: string; infoLibre: string | null; notes: string | null; totalHT: number; totalTVA: number; totalTTC: number; client: { raisonSociale: string; adresse?: string; ville?: string; ice?: string }; lignes?: LigneFacture[]; }
interface Tiers { id: string; code: string; raisonSociale: string; type: string; }
interface Article { id: string; code: string; designation: string; prixUnitaire: number; tauxTVA: number; }
interface Parametres { 
  nomEntreprise: string; adresseEntreprise?: string; villeEntreprise?: string; 
  telephoneEntreprise?: string; emailEntreprise?: string; ice?: string; 
  rc?: string; rcLieu?: string; prefixeFacture?: string; numeroFactureDepart?: number;
  letterheadImage?: string | null; printLayout?: string | null;
}

const parseNumber = (v: string | number) => { if (!v) return 0; if (typeof v === 'number') return v; return parseFloat(v.replace(',', '.').replace(/\s/g, '')) || 0; };
const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH`;

type SortField = 'numero' | 'dateFacture' | 'client' | 'totalHT' | 'totalTVA' | 'totalTTC' | 'statut';
type SortDirection = 'asc' | 'desc';

export function FacturesClientsView() {
  const [factures, setFactures] = useState<FactureClient[]>([]);
  const [clients, setClients] = useState<Tiers[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [parametres, setParametres] = useState<Parametres | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState<FactureClient | null>(null);
  const [editing, setEditing] = useState<FactureClient | null>(null);
  const [lignes, setLignes] = useState<LigneFacture[]>([{ designation: '', quantite: '1', prixUnitaire: '0', tauxTVA: '20', totalHT: 0 }]);
  const [formData, setFormData] = useState({ numero: '', dateFacture: new Date().toISOString().split('T')[0], clientId: '', bonCommande: '', numeroBL: '', dateEcheance: '', infoLibre: '', notes: '' });
  
  // Sorting and filtering
  const [sortField, setSortField] = useState<SortField>('dateFacture');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Code protection for validated documents
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<FactureClient | null>(null);

  // Scans AR dialog
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [scanDocNumero, setScanDocNumero] = useState<string>('');

  // Multi-article dialog
  const [multiArticleDialogOpen, setMultiArticleDialogOpen] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);

  // V2.93 - Visualisation facture + détaillée (avec BL liés)
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingFacture, setViewingFacture] = useState<FactureClient | null>(null);
  const [viewingBLs, setViewingBLs] = useState<any[]>([]);
  const [viewDetailed, setViewDetailed] = useState(false);

  useEffect(() => { fetchFactures(); fetchClients(); fetchArticles(); fetchParametres(); }, []);
  
  useEffect(() => {
    if (dialogOpen) {
      fetchClients();
      fetchArticles();
      if (editing) {
        setFormData({
          numero: editing.numero,
          dateFacture: new Date(editing.dateFacture).toISOString().split('T')[0],
          clientId: editing.clientId,
          bonCommande: editing.bonCommande || '',
          numeroBL: editing.numeroBL || '',
          dateEcheance: editing.dateEcheance ? new Date(editing.dateEcheance).toISOString().split('T')[0] : '',
          infoLibre: editing.infoLibre || '',
          notes: editing.notes || ''
        });
        if (editing.lignes && editing.lignes.length > 0) {
          setLignes(editing.lignes.map(l => ({
            id: l.id, articleId: l.articleId, designation: l.designation,
            quantite: l.quantite.toString(), prixUnitaire: l.prixUnitaire.toString(),
            tauxTVA: l.tauxTVA.toString(), totalHT: l.totalHT
          })));
        }
      }
    }
  }, [dialogOpen, editing]);
  
  const fetchFactures = async () => { try { const res = await fetch('/api/factures-clients'); const d = await res.json(); setFactures(Array.isArray(d) ? d : []); } catch (e) { console.error(e); } finally { setLoading(false); } };
  const fetchClients = async () => { try { const res = await fetch('/api/tiers'); const d = await res.json(); setClients((Array.isArray(d) ? d : []).filter((t: any) => t.type === 'CLIENT')); } catch (e) { } };
  const fetchArticles = async () => { try { const res = await fetch('/api/articles'); const d = await res.json(); setArticles(Array.isArray(d) ? d : []); } catch (e) { } };
  const fetchParametres = async () => { try { const res = await fetch('/api/parametres'); const d = await res.json(); setParametres(d); } catch (e) { } };

  // Sorted lists for dropdowns
  const sortedClients = [...clients].sort((a, b) => a.raisonSociale.localeCompare(b.raisonSociale));
  const sortedArticles = [...articles].sort((a, b) => a.code.localeCompare(b.code));

  const calcTotalHT = () => lignes.reduce((s, l) => s + (l.totalHT || 0), 0);
  const calcTotalTVA = () => lignes.reduce((s, l) => s + ((l.totalHT || 0) * parseNumber(l.tauxTVA) / 100), 0);
  const calcTotalTTC = () => calcTotalHT() + calcTotalTVA();

  const updateLigne = (idx: number, field: keyof LigneFacture, val: string) => {
    const newLignes = [...lignes];
    if (field === 'articleId') {
      const art = articles.find(a => a.id === val);
      if (art) newLignes[idx] = { ...newLignes[idx], articleId: val, designation: art.designation, prixUnitaire: art.prixUnitaire.toString(), tauxTVA: art.tauxTVA.toString(), totalHT: parseNumber(newLignes[idx].quantite) * art.prixUnitaire };
    } else if (field === 'quantite' || field === 'prixUnitaire') {
      newLignes[idx] = { ...newLignes[idx], [field]: val };
      const q = field === 'quantite' ? parseNumber(val) : parseNumber(newLignes[idx].quantite);
      const p = field === 'prixUnitaire' ? parseNumber(val) : parseNumber(newLignes[idx].prixUnitaire);
      newLignes[idx].totalHT = q * p;
    } else { newLignes[idx] = { ...newLignes[idx], [field]: val }; }
    setLignes(newLignes);
  };

  const addLigne = () => setLignes([...lignes, { designation: '', quantite: '1', prixUnitaire: '0', tauxTVA: '20', totalHT: 0 }]);
  const removeLigne = (i: number) => { if (lignes.length > 1) setLignes(lignes.filter((_, idx) => idx !== i)); };

  // Add multiple articles
  const handleAddMultipleArticles = () => {
    const newLignes = selectedArticles.map((articleId): LigneFacture | null => {
      const art = articles.find(a => a.id === articleId);
      if (art) {
        return {
          articleId: art.id,
          designation: art.designation,
          quantite: '1',
          prixUnitaire: art.prixUnitaire.toString(),
          tauxTVA: art.tauxTVA.toString(),
          totalHT: art.prixUnitaire
        };
      }
      return null;
    }).filter((l): l is LigneFacture => l !== null);
    
    setLignes([...lignes, ...newLignes]);
    setSelectedArticles([]);
    setMultiArticleDialogOpen(false);
  };

  const toggleArticleSelection = (articleId: string) => {
    setSelectedArticles(prev => 
      prev.includes(articleId) 
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) { alert('Sélectionnez un client'); return; }
    const validLignes = lignes.filter(l => l.designation.trim() && parseNumber(l.quantite) > 0);
    if (validLignes.length === 0) { alert('Ajoutez au moins une ligne'); return; }
    try {
      const res = await fetch('/api/factures-clients', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData, id: editing?.id,
          dateEcheance: formData.dateEcheance || formData.dateFacture,
          lignes: validLignes.map(l => ({ ...l, quantite: parseNumber(l.quantite), prixUnitaire: parseNumber(l.prixUnitaire), tauxTVA: parseNumber(l.tauxTVA), totalHT: l.totalHT })),
          totalHT: calcTotalHT(), totalTVA: calcTotalTVA(), totalTTC: calcTotalTTC()
        })
      });
      if (res.ok) { setDialogOpen(false); resetForm(); fetchFactures(); }
      else { const err = await res.json(); alert(err.error || 'Erreur'); }
    } catch (e) { console.error(e); alert('Erreur serveur'); }
  };

  const handleValidate = async (id: string) => { if (!confirm('Valider ?')) return; try { const res = await fetch(`/api/factures-clients/${id}/validate`, { method: 'POST' }); if (res.ok) fetchFactures(); else { const err = await res.json(); alert(err.error || 'Erreur'); } } catch (e) { } };
  const handleDelete = async (id: string) => { if (!confirm('Supprimer ?')) return; try { await fetch(`/api/factures-clients?id=${id}`, { method: 'DELETE' }); fetchFactures(); } catch (e) { } };

  const handlePrint = async (facture: FactureClient) => {
    try {
      const res = await fetch('/api/factures-clients');
      const allFactures = await res.json();
      const fullFacture = allFactures.find((f: any) => f.id === facture.id);
      setSelectedFacture(fullFacture || facture);
      setPrintOpen(true);
    } catch (e) { setSelectedFacture(facture); setPrintOpen(true); }
  };

  // V2.93 - Visualiser les données de la facture (simple)
  const handleView = async (facture: FactureClient) => {
    try {
      const res = await fetch('/api/factures-clients');
      const all = await res.json();
      const full = all.find((f: any) => f.id === facture.id);
      setViewingFacture(full || facture);
      setViewDetailed(false);
      setViewingBLs([]);
      setViewDialogOpen(true);
    } catch (e) {
      setViewingFacture(facture);
      setViewDialogOpen(true);
    }
  };

  // V2.93 - Visualiser détaillé: liste des BL liés + recap par ref
  const handleViewDetailed = async (facture: FactureClient) => {
    try {
      // Charger la facture complète
      const resF = await fetch('/api/factures-clients');
      const allF = await resF.json();
      const full = allF.find((f: any) => f.id === facture.id);
      const f = full || facture;
      setViewingFacture(f);
      // Charger les BL liés
      const resBL = await fetch('/api/bons-livraison');
      const allBL = await resBL.json();
      const linkedBLs = Array.isArray(allBL) ? allBL.filter((b: any) => b.facture?.id === f.id) : [];
      // Charger les articles pour les noms
      const resA = await fetch('/api/articles');
      const allA = await resA.json();
      const articleMap = new Map((Array.isArray(allA) ? allA : []).map((a: any) => [a.id, a]));
      // Enrichir les BL avec les infos articles
      const enrichedBLs = linkedBLs.map((bl: any) => ({
        ...bl,
        lignes: (bl.lignes || []).map((l: any) => ({
          ...l,
          articleCode: articleMap.get(l.articleId)?.code || '-'
        }))
      }));
      setViewingBLs(enrichedBLs);
      setViewDetailed(true);
      setViewDialogOpen(true);
    } catch (e) {
      setViewingFacture(facture);
      setViewingBLs([]);
      setViewDetailed(true);
      setViewDialogOpen(true);
    }
  };

  // V2.93 - Construire le recap: regroupement par ref article × BL
  const buildRecapTable = () => {
    if (!viewingBLs.length) return [];
    const recap: Record<string, any> = {};
    for (const bl of viewingBLs) {
      for (const l of (bl.lignes || [])) {
        const key = l.articleId || l.designation;
        if (!recap[key]) {
          recap[key] = {
            articleId: l.articleId,
            code: l.articleCode || '-',
            designation: l.designation || '-',
            totalQte: 0,
            blDetails: {}
          };
        }
        recap[key].totalQte += l.quantite;
        recap[key].blDetails[bl.numero] = (recap[key].blDetails[bl.numero] || 0) + l.quantite;
      }
    }
    return Object.values(recap);
  };

  // V1.94 - Imprimer le récap par référence
  const printRecap = () => {
    if (!viewingFacture || !viewingBLs.length) return;
    const recap = buildRecapTable();
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<html><head><title>Récap - ${viewingFacture.numero}</title>
    <style>
      @page{margin:15mm;size:landscape}
      body{font-family:Arial,sans-serif;font-size:11px;margin:0;padding:20px}
      h1{font-size:16px;color:#166534;margin:0 0 4px}
      h2{font-size:12px;color:#666;margin:0 0 12px;font-weight:normal}
      .info{display:flex;gap:30px;margin-bottom:12px;font-size:11px}
      .info span{color:#666}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      th{background:#f3f4f6;border:1px solid #d1d5db;padding:6px 8px;text-align:left;font-size:10px;color:#374151}
      th.num,td.num{text-align:right}
      td{border:1px solid #e5e7eb;padding:5px 8px}
      tr:nth-child(even){background:#f9fafb}
      .total{font-weight:bold;background:#ecfdf5}
      .footer{margin-top:16px;font-size:9px;color:#999;text-align:right}
    </style></head><body>
    <h1>Récapitulatif par référence</h1>
    <h2>Facture ${viewingFacture.numero} — ${viewingFacture.client?.raisonSociale || ''}</h2>
    <div class="info">
      <span>Date: ${new Date(viewingFacture.dateFacture).toLocaleDateString('fr-FR')}</span>
      <span>N° BL: ${viewingFacture.numeroBL || '-'}</span>
      <span>TTC: ${formatCurrency(viewingFacture.totalTTC)}</span>
      <span>${viewingBLs.length} BL</span>
    </div>
    <table>
      <thead><tr>
        <th style="width:100px">Réf</th>
        <th>Désignation</th>
        <th class="num" style="width:80px">Qté totale</th>
        ${viewingBLs.map((bl: any) => `<th class="num" style="width:90px">${bl.numero}</th>`).join('')}
      </tr></thead>
      <tbody>
        ${recap.map((r: any) => `<tr>
          <td style="font-family:monospace;font-weight:bold">${r.code}</td>
          <td>${r.designation}</td>
          <td class="num total">${r.totalQte}</td>
          ${viewingBLs.map((bl: any) => `<td class="num">${r.blDetails[bl.numero] || '-'}</td>`).join('')}
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="footer">Imprimé le ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  };

  // V1.94 - Imprimer les détails par BL
  const printDetailed = () => {
    if (!viewingFacture || !viewingBLs.length) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<html><head><title>Détails BL - ${viewingFacture.numero}</title>
    <style>
      @page{margin:15mm}
      body{font-family:Arial,sans-serif;font-size:10px;margin:0;padding:20px}
      h1{font-size:15px;color:#166534;margin:0 0 4px}
      h2{font-size:11px;color:#666;margin:0 0 10px;font-weight:normal}
      .bl-section{margin-bottom:16px;page-break-inside:avoid}
      .bl-header{background:#f3f4f6;padding:6px 10px;border-radius:4px;margin-bottom:6px;display:flex;justify-content:space-between;font-size:11px}
      .bl-header strong{color:#166534}
      table{width:100%;border-collapse:collapse}
      th{background:#f9fafb;border:1px solid #d1d5db;padding:4px 6px;text-align:left;font-size:9px;color:#374151}
      th.num,td.num{text-align:right}
      td{border:1px solid #e5e7eb;padding:4px 6px}
      .total-row{font-weight:bold;background:#ecfdf5}
      .footer{margin-top:12px;font-size:9px;color:#999;text-align:right}
    </style></head><body>
    <h1>Détail des bons de livraison</h1>
    <h2>Facture ${viewingFacture.numero} — ${viewingFacture.client?.raisonSociale || ''} — ${new Date(viewingFacture.dateFacture).toLocaleDateString('fr-FR')}</h2>
    ${viewingBLs.map((bl: any) => {
      const blTotal = (bl.lignes || []).reduce((s: number, l: any) => s + (l.totalHT || 0), 0);
      return `<div class="bl-section">
        <div class="bl-header"><strong>BL ${bl.numero}</strong><span>${new Date(bl.dateBL).toLocaleDateString('fr-FR')} — Total HT: ${formatCurrency(bl.totalHT || blTotal)}</span></div>
        <table>
          <thead><tr><th style="width:80px">Réf</th><th>Désignation</th><th class="num" style="width:50px">Qté</th><th class="num" style="width:70px">P.U.</th><th class="num" style="width:80px">Total HT</th></tr></thead>
          <tbody>
            ${(bl.lignes || []).map((l: any) => `<tr>
              <td style="font-family:monospace">${l.articleCode || '-'}</td>
              <td>${l.designation}</td>
              <td class="num">${l.quantite}</td>
              <td class="num">${formatCurrency(l.prixUnitaire)}</td>
              <td class="num">${formatCurrency(l.totalHT)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    }).join('')}
    <div class="footer">Imprimé le ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  };

  const openEditDialog = async (facture: FactureClient) => {
    // Si la facture est validée, demander le code
    if (facture.statut === 'VALIDEE') {
      setPendingEdit(facture);
      setCodeInput('');
      setCodeError(false);
      setCodeDialogOpen(true);
      return;
    }
    // Sinon, ouvrir directement le dialogue
    try {
      const res = await fetch('/api/factures-clients');
      const allFactures = await res.json();
      const fullFacture = allFactures.find((f: any) => f.id === facture.id);
      setEditing(fullFacture || facture);
    } catch (e) { setEditing(facture); }
    setDialogOpen(true);
  };

  const handleCodeSubmit = async () => {
    if (codeInput === '3333') {
      setCodeDialogOpen(false);
      if (pendingEdit) {
        try {
          const res = await fetch('/api/factures-clients');
          const allFactures = await res.json();
          const fullFacture = allFactures.find((f: any) => f.id === pendingEdit.id);
          setEditing(fullFacture || pendingEdit);
        } catch (e) { setEditing(pendingEdit); }
        setDialogOpen(true);
      }
      setPendingEdit(null);
    } else {
      setCodeError(true);
      setTimeout(() => setCodeError(false), 2000);
    }
  };

  const resetForm = () => { 
    setFormData({ numero: '', dateFacture: new Date().toISOString().split('T')[0], clientId: '', bonCommande: '', numeroBL: '', dateEcheance: '', infoLibre: '', notes: '' }); 
    setLignes([{ designation: '', quantite: '1', prixUnitaire: '0', tauxTVA: '20', totalHT: 0 }]); 
    setEditing(null); 
  };

  const getProchainNumero = () => {
    const prefixe = parametres?.prefixeFacture || 'FC';
    const numeroDepart = parametres?.numeroFactureDepart || 1;
    return `${prefixe}${(numeroDepart + factures.length).toString().padStart(5, '0')}`;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 inline opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4 ml-1 inline" /> : <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  // Filter and sort data
  const filtered = factures
    .filter(f => {
      const matchSearch = f.numero?.toLowerCase().includes(search.toLowerCase()) || f.client?.raisonSociale?.toLowerCase().includes(search.toLowerCase());
      const factureDate = new Date(f.dateFacture);
      const matchDateFrom = !dateFrom || factureDate >= new Date(dateFrom);
      const matchDateTo = !dateTo || factureDate <= new Date(dateTo + 'T23:59:59');
      return matchSearch && matchDateFrom && matchDateTo;
    })
    .sort((a, b) => {
      let valA: any, valB: any;
      switch (sortField) {
        case 'numero': valA = a.numero; valB = b.numero; break;
        case 'dateFacture': valA = new Date(a.dateFacture).getTime(); valB = new Date(b.dateFacture).getTime(); break;
        case 'client': valA = a.client?.raisonSociale || ''; valB = b.client?.raisonSociale || ''; break;
        case 'totalHT': valA = a.totalHT; valB = b.totalHT; break;
        case 'totalTVA': valA = a.totalTVA; valB = b.totalTVA; break;
        case 'totalTTC': valA = a.totalTTC; valB = b.totalTTC; break;
        case 'statut': valA = a.statut; valB = b.statut; break;
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
        <div><h1 className="text-3xl font-bold text-blue-700">Factures Clients</h1><p className="text-muted-foreground">Gérez vos factures</p></div>
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">NFC01</span>
          <PermissionGate permission="factures.create">
            <Button variant="outline" onClick={() => setExportOpen(true)}><Download className="w-4 h-4 mr-2" />Export</Button>
          </PermissionGate>
          <PermissionGate permission="factures.create">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { resetForm(); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nouveau</Button>
          </PermissionGate>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Liste</CardTitle></CardHeader>
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
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>Effacer</Button>
            )}
          </div>
          {filtered.length === 0 ? <div className="text-center text-muted-foreground py-8">Aucune facture</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('numero')}>N° <SortIcon field="numero" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('dateFacture')}>Date <SortIcon field="dateFacture" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('client')}>Client <SortIcon field="client" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('totalHT')}>Total HT <SortIcon field="totalHT" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('totalTVA')}>TVA <SortIcon field="totalTVA" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('totalTTC')}>Total TTC <SortIcon field="totalTTC" /></TableHead>
                  <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort('statut')}>Statut <SortIcon field="statut" /></TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{filtered.map((f) => (<TableRow key={f.id}>
                <TableCell className="font-medium">{f.numero}</TableCell>
                <TableCell>{new Date(f.dateFacture).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell>{f.client?.raisonSociale}</TableCell>
                <TableCell>{formatCurrency(f.totalHT)}</TableCell>
                <TableCell>{formatCurrency(f.totalTVA)}</TableCell>
                <TableCell>{formatCurrency(f.totalTTC)}</TableCell>
                <TableCell><span className={`px-2 py-1 rounded text-xs ${f.statut === 'VALIDEE' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{f.statut === 'VALIDEE' ? 'Validée' : 'Brouillon'}</span></TableCell>
                <TableCell><div className="flex gap-1 flex-wrap">
                  <PermissionGate permission="factures.validate">
                    {f.statut === 'BROUILLON' && <Button size="sm" variant="outline" className="text-blue-600" onClick={() => handleValidate(f.id)} title="Valider"><CheckCircle className="h-4 w-4" /></Button>}
                  </PermissionGate>
                  {/* V2.93 - Visualiser facture si validée */}
                  <PermissionGate permission="factures.view">
                  {f.statut === 'VALIDEE' && (
                    <Button size="sm" variant="outline" className="text-blue-700" onClick={() => handleView(f)} title="Visualiser la facture"><Eye className="h-4 w-4" /></Button>
                  )}
                  {/* V2.93 - Visualiser détaillé (BL liés) si facture groupée */}
                  {f.statut === 'VALIDEE' && f.numeroBL && (
                    <Button size="sm" variant="outline" className="text-blue-600" onClick={() => handleViewDetailed(f)} title="Visualiser détaillé (BL liés)"><EyeOff className="h-4 w-4" /></Button>
                  )}
                  </PermissionGate>
                  <Button size="sm" variant="outline" onClick={() => handlePrint(f)} title="Imprimer"><Printer className="h-4 w-4" /></Button>
                  <PermissionGate permission="scans.view"><Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-800" onClick={() => { setScanDocNumero(f.numero); setScanDialogOpen(true); }} title="Scans & Accusé Réception (AR)"><Paperclip className="h-4 w-4" /></Button></PermissionGate>
                  <PermissionGate permission="factures.edit">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(f)} title="Modifier"><Pencil className="h-4 w-4" /></Button>
                  </PermissionGate>
                  <PermissionGate permission="factures.edit">
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(f.id)} disabled={f.statut === 'VALIDEE'} title="Supprimer"><Trash2 className="h-4 w-4" /></Button>
                  </PermissionGate>
                </div></TableCell>
              </TableRow>))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-6xl max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{editing ? 'Modifier' : 'Nouveau'} Facture</DialogTitle>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">NFC01-DLG</span>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>N° Facture</Label>
                {editing ? (
                  <Input value={formData.numero} disabled className="bg-gray-100" />
                ) : (
                  <div className="space-y-1">
                    <Input value={getProchainNumero()} disabled className="bg-gray-100 font-bold text-blue-700" />
                    <span className="text-xs text-muted-foreground">(Numéro automatique)</span>
                  </div>
                )}
              </div>
              <div><Label>Date</Label><Input type="date" value={formData.dateFacture} onChange={(e) => setFormData({ ...formData, dateFacture: e.target.value })} required /></div>
              <div><Label>Échéance</Label><Input type="date" value={formData.dateEcheance} onChange={(e) => setFormData({ ...formData, dateEcheance: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Client</Label><Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{sortedClients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.raisonSociale}</SelectItem>))}</SelectContent></Select></div>
              <div><Label>Bon de commande</Label><Input placeholder="N° BC client" value={formData.bonCommande} onChange={(e) => setFormData({ ...formData, bonCommande: e.target.value })} /></div>
              <div><Label>N° BL</Label><Input placeholder="N° Bon de livraison" value={formData.numeroBL} onChange={(e) => setFormData({ ...formData, numeroBL: e.target.value })} /></div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <Label>Lignes</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => { setSelectedArticles([]); setMultiArticleDialogOpen(true); }}><ListPlus className="w-4 h-4 mr-1" />Ajouter plusieurs</Button>
                  <Button type="button" size="sm" variant="outline" onClick={addLigne}>+ Ajouter</Button>
                </div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Article</TableHead><TableHead className="w-[400px]">Désignation</TableHead><TableHead>Qté</TableHead><TableHead>P.U.</TableHead><TableHead>TVA%</TableHead><TableHead>Total HT</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>{lignes.map((l, idx) => (<TableRow key={idx}>
                  <TableCell><Select value={l.articleId || ''} onValueChange={(v) => updateLigne(idx, 'articleId', v)}><SelectTrigger className="w-72"><SelectValue placeholder="Sélectionner un article..." /></SelectTrigger><SelectContent className="max-h-[300px]">{sortedArticles.map((a) => (<SelectItem key={a.id} value={a.id} className="whitespace-normal">{a.code} - {a.designation}</SelectItem>))}</SelectContent></Select></TableCell>
                  <TableCell><Textarea value={l.designation} onChange={(e) => updateLigne(idx, 'designation', e.target.value)} className="min-h-[40px] min-w-[300px]" /></TableCell>
                  <TableCell><Input type="text" value={l.quantite} onChange={(e) => updateLigne(idx, 'quantite', e.target.value)} className="w-20" /></TableCell>
                  <TableCell><Input type="text" value={l.prixUnitaire} onChange={(e) => updateLigne(idx, 'prixUnitaire', e.target.value)} className="w-24" /></TableCell>
                  <TableCell><Input type="text" value={l.tauxTVA} onChange={(e) => updateLigne(idx, 'tauxTVA', e.target.value)} className="w-16" /></TableCell>
                  <TableCell>{formatCurrency(l.totalHT)}</TableCell>
                  <TableCell><Button type="button" size="sm" variant="ghost" onClick={() => removeLigne(idx)}>×</Button></TableCell>
                </TableRow>))}</TableBody>
              </Table>
              <div className="flex justify-end gap-8 mt-2 font-bold">
                <span>Total HT: {formatCurrency(calcTotalHT())}</span>
                <span>TVA: {formatCurrency(calcTotalTVA())}</span>
                <span>Total TTC: {formatCurrency(calcTotalTTC())}</span>
              </div>
              {/* V3.31 - Montant total TTC en lettres */}
              <div className="text-right text-xs italic text-gray-600 mt-1">
                Montant total TTC dû est de : <strong className="not-italic">{montantEnLettres(calcTotalTTC())}</strong>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Info libre</Label><Textarea value={formData.infoLibre} onChange={(e) => setFormData({ ...formData, infoLibre: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Annuler</Button><Button type="submit" className="bg-blue-600 hover:bg-blue-700">{editing ? 'Modifier' : 'Créer'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Code dialog for validated documents */}
      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Code requis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Cette facture est validée. Entrez le code pour la modifier.</p>
            <Input
              type="password"
              placeholder="Code à 4 chiffres"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              className={`text-center text-xl ${codeError ? 'border-red-500' : ''}`}
              maxLength={4}
              autoFocus
            />
            {codeError && <p className="text-red-500 text-sm text-center">Code incorrect</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCodeDialogOpen(false)}>Annuler</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCodeSubmit}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Multi-article dialog */}
      <Dialog open={multiArticleDialogOpen} onOpenChange={setMultiArticleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter plusieurs articles</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 text-sm text-muted-foreground">
              Cochez les articles à ajouter ({selectedArticles.length} sélectionné{selectedArticles.length > 1 ? 's' : ''})
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead>P.U.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedArticles.map((a) => (
                    <TableRow key={a.id} className="cursor-pointer hover:bg-gray-50" onClick={() => toggleArticleSelection(a.id)}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedArticles.includes(a.id)}
                          onCheckedChange={() => toggleArticleSelection(a.id)}
                        />
                      </TableCell>
                      <TableCell>{a.code}</TableCell>
                      <TableCell>{a.designation}</TableCell>
                      <TableCell>{formatCurrency(a.prixUnitaire)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMultiArticleDialogOpen(false)}>Annuler</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAddMultipleArticles} disabled={selectedArticles.length === 0}>
              Ajouter {selectedArticles.length} article{selectedArticles.length > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* V2.93 - Dialog visualisation simple de la facture */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[calc(100vh-4rem)] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Facture {viewingFacture?.numero}</DialogTitle>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">NFC01-VISU</span>
            </div>
          </DialogHeader>
          {viewingFacture && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div><Label className="text-muted-foreground">N° Facture</Label><div className="font-bold text-blue-700">{viewingFacture.numero}</div></div>
                <div><Label className="text-muted-foreground">Date</Label><div>{new Date(viewingFacture.dateFacture).toLocaleDateString('fr-FR')}</div></div>
                <div><Label className="text-muted-foreground">Échéance</Label><div>{viewingFacture.dateEcheance ? new Date(viewingFacture.dateEcheance).toLocaleDateString('fr-FR') : '-'}</div></div>
                <div><Label className="text-muted-foreground">Statut</Label><div><span className={`px-2 py-1 rounded text-xs ${viewingFacture.statut === 'VALIDEE' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{viewingFacture.statut === 'VALIDEE' ? 'Validée' : 'Brouillon'}</span></div></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-muted-foreground">Client</Label><div>{viewingFacture.client?.raisonSociale}</div></div>
                <div><Label className="text-muted-foreground">Bon de commande</Label><div>{viewingFacture.bonCommande || '-'}</div></div>
                <div><Label className="text-muted-foreground">N° BL</Label><div>{viewingFacture.numeroBL || '-'}</div></div>
              </div>
              <div className="border rounded-lg p-4">
                <Label className="mb-2 block">Lignes</Label>
                <Table>
                  <TableHeader><TableRow><TableHead>Désignation</TableHead><TableHead>Qté</TableHead><TableHead>P.U.</TableHead><TableHead>TVA%</TableHead><TableHead>Total HT</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(viewingFacture.lignes || []).map((l, idx) => (
                      <TableRow key={l.id || idx}>
                        <TableCell className="whitespace-pre-wrap">{l.designation}</TableCell>
                        <TableCell>{l.quantite}</TableCell>
                        <TableCell>{formatCurrency(parseNumber(l.prixUnitaire))}</TableCell>
                        <TableCell>{l.tauxTVA}%</TableCell>
                        <TableCell>{formatCurrency(l.totalHT)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end gap-8 mt-2 font-bold">
                  <span>HT: {formatCurrency(viewingFacture.totalHT)}</span>
                  <span>TVA: {formatCurrency(viewingFacture.totalTVA)}</span>
                  <span>TTC: {formatCurrency(viewingFacture.totalTTC)}</span>
                </div>
                {/* V3.31 - Montant total TTC en lettres */}
                <div className="text-right text-xs italic text-gray-600 mt-1">
                  Montant total TTC dû est de : <strong className="not-italic">{montantEnLettres(viewingFacture.totalTTC)}</strong>
                </div>
              </div>
              {(viewingFacture.infoLibre || viewingFacture.notes) && (
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Info libre</Label><div className="whitespace-pre-wrap text-sm border rounded p-2 bg-gray-50">{viewingFacture.infoLibre || '-'}</div></div>
                  <div><Label>Notes</Label><div className="whitespace-pre-wrap text-sm border rounded p-2 bg-gray-50">{viewingFacture.notes || '-'}</div></div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setViewDialogOpen(false); if (viewingFacture) handlePrint(viewingFacture); }}><Printer className="h-4 w-4 mr-1" />Imprimer</Button>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* V1.94 - Dialog visualisation détaillée: recap par ref + BL liés, avec impression */}
      <Dialog open={viewDialogOpen && viewDetailed} onOpenChange={(open) => { if (!open) { setViewDialogOpen(false); setViewDetailed(false); } }}>
        <DialogContent className="max-w-6xl max-h-[calc(100vh-4rem)] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Visualisation détaillée — {viewingFacture?.numero}</DialogTitle>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">NFC01-DETAILED</span>
            </div>
          </DialogHeader>
          {viewingFacture && (
            <div className="space-y-5 py-2">
              {/* En-tête facture harmonisé */}
              <div className="bg-gray-50 border rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                  <div><span className="text-muted-foreground text-xs">N° Facture</span><div className="font-bold text-blue-700">{viewingFacture.numero}</div></div>
                  <div><span className="text-muted-foreground text-xs">Client</span><div className="font-medium">{viewingFacture.client?.raisonSociale}</div></div>
                  <div><span className="text-muted-foreground text-xs">Date</span><div className="font-medium">{new Date(viewingFacture.dateFacture).toLocaleDateString('fr-FR')}</div></div>
                  <div><span className="text-muted-foreground text-xs">N° BL</span><div className="font-medium font-mono">{viewingFacture.numeroBL || '-'}</div></div>
                  <div><span className="text-muted-foreground text-xs">Total TTC</span><div className="font-bold text-blue-700">{formatCurrency(viewingFacture.totalTTC)}</div></div>
                </div>
              </div>
              {/* Recap par référence article × BL */}
              {viewingBLs.length > 0 && (
                <div className="border rounded-lg">
                  <div className="bg-blue-50 px-4 py-2 border-b flex items-center justify-between">
                    <Label className="font-semibold text-blue-700">Récapitulatif par référence ({buildRecapTable().length} article{buildRecapTable().length > 1 ? 's' : ''})</Label>
                    <span className="text-xs text-blue-600">{viewingBLs.length} BL</span>
                  </div>
                  <div className={viewingBLs.length > 6 ? 'hidden' : 'hidden md:block overflow-x-auto'}>
                    <Table className="table-fixed">
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold w-[100px]">Réf</TableHead>
                          <TableHead className="font-semibold">Désignation</TableHead>
                          <TableHead className="font-semibold text-right w-[80px]">Qté tot.</TableHead>
                          {viewingBLs.map((bl) => (
                            <TableHead key={bl.id} className="font-semibold text-right w-[72px] whitespace-normal break-words text-xs leading-tight">{bl.numero}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {buildRecapTable().map((r: any, idx: number) => (
                          <TableRow key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <TableCell className="font-mono font-semibold text-sm">{r.code}</TableCell>
                            <TableCell>{r.designation}</TableCell>
                            <TableCell className="text-right font-bold text-blue-700">{r.totalQte}</TableCell>
                            {viewingBLs.map((bl) => (
                              <TableCell key={bl.id} className="text-right font-mono">{r.blDetails[bl.numero] != null ? r.blDetails[bl.numero] : '-'}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className={viewingBLs.length > 6 ? 'divide-y' : 'md:hidden divide-y'}>
                    {buildRecapTable().map((r: any, idx: number) => (
                      <div key={idx} className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0"><div className="font-mono font-semibold text-sm break-words">{r.code}</div><div className="text-sm break-words">{r.designation}</div></div>
                          <div className="shrink-0 text-right"><div className="text-[10px] text-muted-foreground">Qté totale</div><div className="font-bold text-blue-700">{r.totalQte}</div></div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {viewingBLs.map((bl) => (
                            <div key={bl.id} className="rounded border bg-gray-50 px-2 py-1 min-w-0">
                              <div className="text-muted-foreground font-mono break-words leading-tight">BL {bl.numero}</div>
                              <div className="font-mono font-semibold">{r.blDetails[bl.numero] != null ? r.blDetails[bl.numero] : '-'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Détails par BL */}
              {viewingBLs.map((bl, blIdx) => {
                const blTotal = (bl.lignes || []).reduce((s: number, l: any) => s + (l.totalHT || 0), 0);
                return (
                <div key={bl.id} className="border rounded-lg">                    <div className="bg-blue-50 px-4 py-2 border-b border-blue-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-100 text-blue-700 text-xs font-mono font-bold px-2 py-0.5 rounded">BL {blIdx + 1}/{viewingBLs.length}</span>
                      <Label className="font-semibold break-words whitespace-normal">{bl.numero}</Label>
                    </div>
                    <span className="text-sm text-muted-foreground">{new Date(bl.dateBL).toLocaleDateString('fr-FR')} — <span className="font-medium text-blue-700">{formatCurrency(bl.totalHT || blTotal)}</span></span>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-[90px]">Réf</TableHead>
                          <TableHead>Désignation</TableHead>
                          <TableHead className="text-right w-[60px]">Qté</TableHead>
                          <TableHead className="text-right w-[80px]">P.U.</TableHead>
                          <TableHead className="text-right w-[90px]">Total HT</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(bl.lignes || []).map((l: any, idx: number) => (
                          <TableRow key={l.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                            <TableCell className="font-mono text-sm font-medium">{l.articleCode || '-'}</TableCell>
                            <TableCell className="whitespace-pre-wrap text-sm">{l.designation}</TableCell>
                            <TableCell className="text-right font-mono">{l.quantite}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(l.prixUnitaire)}</TableCell>
                            <TableCell className="text-right font-mono font-medium">{formatCurrency(l.totalHT)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                );
              })}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setViewDialogOpen(false); setViewDetailed(false); }}>
              Fermer
            </Button>
            <Button variant="outline" className="text-blue-600" onClick={printRecap}>
              <Printer className="h-4 w-4 mr-1" />Imprimer Récap
            </Button>
            <Button variant="outline" className="text-blue-600" onClick={printDetailed}>
              <Printer className="h-4 w-4 mr-1" />Imprimer Détails BL
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setViewDialogOpen(false); setViewDetailed(false); if (viewingFacture) handlePrint(viewingFacture); }}>
              <Printer className="h-4 w-4 mr-1" />Imprimer Facture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} type="factures-clients" code="NFC01" />
      <DocumentScansDialog
        open={scanDialogOpen}
        onOpenChange={setScanDialogOpen}
        typeDoc="FACTURE_CLIENT"
        numeroDoc={scanDocNumero}
        accent="blue"
      />
      <PrintDocument 
        open={printOpen} 
        onOpenChange={setPrintOpen} 
        documentType="FC" 
        documentData={selectedFacture} 
        entreprise={parametres} 
        code="NFC01"
        printLayout={parametres?.printLayout ? JSON.parse(parametres.printLayout) : null}
        letterheadImage={parametres?.letterheadImage}
      />
    </div>
  );
}
