'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Printer, Settings, Trash2, Plus, Check } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { LabelTemplateEditor, LabelTemplateData, LabelField } from './label-template-editor';
import { renderField } from './label-print';
import { PermissionGate } from '@/components/auth/permission-gate';

// V3.36 - Ordre de fabrication : même page que l'étiquetage (modèle + champs
// positionnables + aperçu + impression 2×A5 sur A4).
// Aucun prix / coût / DH et aucune mention juridique : société en forme abrégée.

const SOCIETE = 'ARIV';

export interface OfLigne {
  articleId?: string;
  designation: string;
  quantite: number;
  prixUnitaire?: number;
  totalHT?: number;
}

export interface OfCommande {
  id: string;
  numero: string;
  clientId?: string;
  dateCommande: string;
  dateReception?: string | null;
  referenceClient?: string | null;
  infoLibre?: string | null;
  notes?: string | null;
  totalHT?: number;
  lignes?: OfLigne[];
}

interface OfArticle {
  id: string;
  code: string;
  designation: string;
}

type Accent = 'green' | 'pink' | 'blue';

interface OfPrintProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commande: OfCommande | null;
  client: string;
  articles?: OfArticle[];
  accent?: Accent;
}

const OF_STYLE = `
.of-card { font-family: Arial, Helvetica, sans-serif; color: #111; box-sizing: border-box; position: relative; overflow: hidden; background: #fff; padding: 6mm 8mm; }
.of-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; z-index: 0; }
.of-fixed { position: relative; z-index: 1; }
.of-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 2.5mm; }
.of-societe { font-size: 20pt; font-weight: bold; letter-spacing: 2px; line-height: 1; }
.of-title { font-size: 15pt; font-weight: bold; letter-spacing: 1px; line-height: 1.1; }
.of-sub { font-size: 8.5pt; }
.of-grid { display: flex; gap: 5mm; font-size: 8.5pt; margin-top: 2.5mm; }
.of-grid > div { flex: 1; border: 1px solid #bbb; padding: 1.5mm 2mm; }
.of-table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-top: 2.5mm; }
.of-table th, .of-table td { border: 1px solid #999; padding: 1mm 1.8mm; text-align: left; }
.of-table th { background: #f0f0f0; font-size: 7.5pt; text-transform: uppercase; }
.of-table td.n { text-align: right; }
.of-note { font-size: 7.5pt; margin-top: 2mm; max-height: 12mm; overflow: hidden; }
.of-foot { position: absolute; left: 8mm; right: 8mm; bottom: 5mm; display: flex; justify-content: space-between; align-items: center; font-size: 8pt; border-top: 1px solid #bbb; padding-top: 1.5mm; z-index: 1; }
.of-copy { border: 1px solid #111; padding: 0.5mm 2mm; font-size: 7.5pt; }
.of-fields { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
`;

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const dateFr = (d?: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '-');

// Modèle de départ proposé (éditable comme un modèle d'étiquette)
const OF_PRESETS: LabelTemplateData[] = [
  {
    id: 'preset-of-a5',
    name: 'OF A5 paysage',
    width: 210,
    height: 148.5,
    backgroundImage: null,
    fields: [
      { id: 'of-barcode', type: 'barcode', label: 'Code-barres n° commande', barcodeValue: '$numero', barcodeBarWidth: 1.3, barcodeFontSize: 9, barcodeDisplayValue: true, x: 5, y: 134, width: 75, height: 9, fontSize: 8, bold: false, color: '#000000' },
      { id: 'of-texte', type: 'text', label: 'Texte libre ( $lignes, $notes ... )', value: '', x: 88, y: 134, width: 100, height: 8, fontSize: 8, bold: false, color: '#000000' },
    ] as LabelField[],
    isDefault: false,
  },
];

// Contenu fixe de l'OF : ni prix, ni coût, ni DH, ni mentions juridiques
function ofFixedHtml(c: OfCommande, client: string, articles: OfArticle[]): string {
  const lignes = (c.lignes || [])
    .map((l, i) => {
      const ref = l.articleId ? articles.find((a) => a.id === l.articleId)?.code || '-' : '-';
      return `<tr><td class="n">${i + 1}</td><td>${esc(ref)}</td><td>${esc(l.designation)}</td><td class="n">${l.quantite}</td></tr>`;
    })
    .join('');

  return `
    <div class="of-head">
      <div class="of-societe">${esc(SOCIETE)}</div>
      <div style="text-align: right;">
        <div class="of-title">ORDRE DE FABRICATION</div>
        <div class="of-sub">N° <b>${esc(c.numero)}</b></div>
      </div>
    </div>
    <div class="of-grid">
      <div><b>Client :</b> ${esc(client) || '-'}</div>
      <div><b>N° BC client :</b> ${esc(c.referenceClient) || '-'}</div>
      <div><b>Date commande :</b> ${dateFr(c.dateCommande)}</div>
      <div><b>Réception prévue :</b> ${dateFr(c.dateReception)}</div>
    </div>
    <table class="of-table">
      <thead><tr><th style="width: 8mm">#</th><th style="width: 25mm">Réf</th><th>Désignation</th><th style="width: 20mm">Qté</th></tr></thead>
      <tbody>${lignes || '<tr><td colspan="4">Aucune ligne</td></tr>'}</tbody>
    </table>
    <div class="of-note">${esc(c.notes || c.infoLibre || '')}</div>
    <div class="of-foot">
      <span>Visa atelier : ______________________</span>
      <span>Date : ____ / ____ / ________</span>
      <span class="of-copy">EXEMPLAIRE</span>
    </div>`;
}

export function OfPrint({ open, onOpenChange, commande, client, articles = [], accent = 'green' }: OfPrintProps) {
  const [templates, setTemplates] = useState<LabelTemplateData[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LabelTemplateData | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const colors = {
    green: 'bg-green-600 hover:bg-green-700',
    pink: 'bg-pink-600 hover:bg-pink-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
  }[accent];
  const badge = {
    green: 'bg-green-100 text-green-700',
    pink: 'bg-pink-100 text-pink-700',
    blue: 'bg-blue-100 text-blue-700',
  }[accent];

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/of-templates');
      const d = await res.json();
      setTemplates(Array.isArray(d) ? d : []);
    } catch (e) { setTemplates([]); }
  };

  useEffect(() => { if (open) fetchTemplates(); }, [open]);

  const availableTemplates = [...templates, ...OF_PRESETS.filter((p) => !templates.some((t) => t.name === p.name))];
  const selectedTemplate: LabelTemplateData | null =
    selectedTemplateId === 'default'
      ? availableTemplates.find((t) => t.isDefault) || availableTemplates[0] || null
      : availableTemplates.find((t) => t.id === selectedTemplateId) || availableTemplates[0] || null;

  const scale = 3;

  // Code-barres remplis après rendu (comme sur les étiquettes)
  useEffect(() => {
    if (!open || !commande) return;
    const timer = setTimeout(() => {
      const area = document.getElementById('of-print-area');
      if (!area) return;
      area.querySelectorAll<SVGElement>('svg[data-barcode]').forEach((svg) => {
        try {
          JsBarcode(svg, svg.getAttribute('data-code') || 'UNKNOWN', {
            format: 'CODE128',
            width: Number(svg.getAttribute('data-bar-width') || 1.5),
            height: Number(svg.getAttribute('data-bar-height') || 30),
            displayValue: svg.getAttribute('data-display-value') !== 'false',
            fontSize: Number(svg.getAttribute('data-font-size') || 12),
            margin: 2,
          });
        } catch (e) { console.warn('Barcode error:', e); }
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [open, commande, selectedTemplateId, templates.length]);

  const handleSaveTemplate = async (template: LabelTemplateData) => {
    try {
      const isPreset = template.id?.startsWith('preset-');
      const method = template.id && !isPreset ? 'PUT' : 'POST';
      const body = method === 'PUT' ? template : { ...template, id: undefined };
      const res = await fetch('/api/of-templates', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (res.ok) {
        const saved = await res.json();
        setSelectedTemplateId(saved.id);
        fetchTemplates();
      }
    } catch (e) { alert('Erreur lors de la sauvegarde du modèle'); }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await fetch(`/api/of-templates?id=${id}`, { method: 'DELETE' });
      if (selectedTemplateId === id) setSelectedTemplateId('default');
      fetchTemplates();
      setConfirmDeleteId(null);
    } catch (e) { alert('Erreur suppression'); }
  };

  const handleSetDefault = async (template: LabelTemplateData) => {
    await handleSaveTemplate({ ...template, isDefault: true });
  };

  const performPrint = () => {
    const area = document.getElementById('of-print-area');
    const card = area?.querySelector('.of-card') as HTMLElement | null;
    if (!card || !commande) return;
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) return;

    const make = (label: string) => {
      const clone = card.cloneNode(true) as HTMLElement;
      const copy = clone.querySelector('.of-copy');
      if (copy) copy.textContent = label;
      return clone.outerHTML;
    };

    const w = selectedTemplate?.width || 210;
    const h = selectedTemplate?.height || 148.5;

    win.document.write(`<!doctype html><html><head><meta charSet="utf-8" /><title>OF ${esc(commande.numero)}</title><style>
      @page { size: A4 portrait; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body { font-family: Arial, sans-serif; }
      ${OF_STYLE}
      .of-page { width: 210mm; }
      .of-card { width: ${w}mm !important; height: ${h}mm !important; }
    </style></head><body><div class="of-page">
      ${make('EXEMPLAIRE ATELIER')}
      ${make('EXEMPLAIRE SUIVI')}
    </div></body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  if (!commande) return null;

  const fieldData: Record<string, string> = {
    numero: commande.numero,
    client: client || '',
    date: dateFr(commande.dateCommande),
    bc: commande.referenceClient || '',
    reception: dateFr(commande.dateReception),
    societe: SOCIETE,
    notes: commande.notes || commande.infoLibre || '',
    code: commande.referenceClient || commande.numero,
    designation: client || '',
    quantite: String((commande.lignes || []).reduce((s, l) => s + (l.quantite || 0), 0)),
    lignes: (commande.lignes || [])
      .map((l) => `${l.articleId ? articles.find((a) => a.id === l.articleId)?.code || '' : ''} ${l.designation} × ${l.quantite}`)
      .join('\n'),
  };

  const cardWidth = selectedTemplate?.width || 210;
  const cardHeight = selectedTemplate?.height || 148.5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[calc(100vh-3rem)] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Ordre de fabrication — {commande.numero}</DialogTitle>
            <span className={`${badge} px-3 py-1 rounded-full text-sm font-mono font-bold`}>NCB01-OF</span>
          </div>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* ===== MODÈLE D'OF ===== */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Modèle d&apos;ordre de fabrication</Label>
              <PermissionGate permission="commandes.edit">
                <Button variant="outline" size="sm" onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" />Nouveau modèle
                </Button>
              </PermissionGate>
            </div>
            {availableTemplates.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
                <p className="mb-2">Aucun modèle d&apos;OF enregistré.</p>
                <PermissionGate permission="commandes.edit">
                  <Button variant="outline" size="sm" onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" />Créer le premier modèle
                  </Button>
                </PermissionGate>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {availableTemplates.map((t) => {
                  const isSelected = selectedTemplate?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`relative border-2 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTemplateId(t.id || 'default')}
                    >
                      {t.isDefault && (
                        <span className="absolute top-1 right-1 bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded font-medium">
                          Par défaut
                        </span>
                      )}
                      {isSelected && (
                        <div className="absolute top-1 left-1 bg-blue-500 text-white rounded-full p-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <div className="text-center">
                        <div className="font-medium text-sm truncate">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.width}×{t.height}mm · {t.fields?.length || 0} champ{(t.fields?.length || 0) > 1 ? 's' : ''}</div>
                      </div>
                      {/* Paramétrage des champs */}
                      <PermissionGate permission="commandes.edit">
                        <div className="flex justify-center gap-1 mt-2">
                          <Button
                            variant="ghost" size="sm" className="h-6 px-2 text-xs"
                            onClick={(e) => { e.stopPropagation(); setEditingTemplate(t); setEditorOpen(true); }}
                          >
                            <Settings className="h-3 w-3 mr-1" />Éditer
                          </Button>
                          {!t.isDefault && !t.id?.startsWith('preset-') && (
                            <Button
                              variant="ghost" size="sm" className="h-6 px-2 text-xs"
                              onClick={(e) => { e.stopPropagation(); handleSetDefault(t); }}
                            >
                              Par défaut
                            </Button>
                          )}
                          {confirmDeleteId === t.id ? (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-red-600"
                                onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id!); }}>
                                Confirmer
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs"
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}>
                                Annuler
                              </Button>
                            </div>
                          ) : (
                            !t.id?.startsWith('preset-') && (
                              <Button
                                variant="ghost" size="sm" className="h-6 px-2 text-xs text-red-500"
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(t.id!); }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )
                          )}
                        </div>
                      </PermissionGate>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== RÉCAPITULATIF (sans prix) ===== */}
          <div className="border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Réf</th>
                  <th className="text-left p-2">Désignation</th>
                  <th className="text-right p-2">Qté</th>
                </tr>
              </thead>
              <tbody>
                {(commande.lignes || []).map((l, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 font-mono">{l.articleId ? articles.find((a) => a.id === l.articleId)?.code || '-' : '-'}</td>
                    <td className="p-2">{l.designation}</td>
                    <td className="p-2 text-right font-bold">{l.quantite}</td>
                  </tr>
                ))}
                {(commande.lignes || []).length === 0 && (
                  <tr><td colSpan={3} className="p-3 text-center text-muted-foreground">Aucune ligne</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ===== APERÇU ===== */}
          <div>
            <Label className="text-base font-semibold mb-2 block">Aperçu de l&apos;OF</Label>
            <div className="border rounded-lg bg-gray-100 p-3 overflow-auto">
              <style>{OF_STYLE}</style>
              <div id="of-print-area">
                {selectedTemplate && (
                  <div
                    className="of-card shadow-md"
                    style={{ width: `${cardWidth}mm`, height: `${cardHeight}mm` }}
                  >
                    {selectedTemplate.backgroundImage && (
                      <img src={selectedTemplate.backgroundImage} alt="" className="of-bg" />
                    )}
                    <div className="of-fixed" dangerouslySetInnerHTML={{ __html: ofFixedHtml(commande, client, articles) }} />
                    <div className="of-fields">
                      {(selectedTemplate.fields || []).map((field) =>
                        renderField(field, fieldData, scale, '', commande.numero)
                      )}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                L&apos;impression place 2 exemplaires (Atelier + Suivi) sur une feuille A4 — sans prix ni mention juridique.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <PermissionGate permission="commandes.print">
            <Button className={colors} onClick={performPrint}>
              <Printer className="h-4 w-4 mr-2" />Imprimer 2× A5 (A4)
            </Button>
          </PermissionGate>
        </DialogFooter>

        {/* Éditeur de champs (identique à l'étiquetage) */}
        <LabelTemplateEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          template={editingTemplate}
          onSave={handleSaveTemplate}
        />
      </DialogContent>
    </Dialog>
  );
}
