'use client';

import { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Settings, Trash2, Plus, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import JsBarcode from 'jsbarcode';
import { LabelTemplateEditor, LabelTemplateData, LabelField } from './label-template-editor';

const QRCodeSVG = dynamic(() => import('qrcode.react').then(mod => mod.QRCodeSVG), { ssr: false });

interface LigneBL {
  id?: string;
  articleId?: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  totalHT: number;
}

interface Article {
  id: string;
  code: string;
  designation: string;
  conditionnement: number;
}

interface BonLivraison {
  id: string;
  numero: string;
  dateBL: string;
  client?: { raisonSociale: string };
  lignes?: LigneBL[];
}

interface LabelPrintProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bl: BonLivraison | null;
  articles: Article[];
  templates?: LabelTemplateData[];
  onRefreshTemplates?: () => void;
}

function calculerEtiquettes(bl: BonLivraison, articles: Article[]) {
  if (!bl.lignes) return [];
  const articleMap = new Map(articles.map(a => [a.id, a]));
  const result: Array<{
    designation: string; code: string; qteBL: number;
    conditionnement: number; nbEtiquettes: number; qteParEtiquette: number; reste: number;
  }> = [];
  for (const ligne of bl.lignes) {
    const article = ligne.articleId ? articleMap.get(ligne.articleId) : null;
    const cond = article?.conditionnement || 0;
    if (cond <= 0) continue;
    const nbEtiquettes = Math.ceil(ligne.quantite / cond);
    result.push({
      designation: ligne.designation,
      code: article?.code || ligne.designation.substring(0, 20),
      qteBL: ligne.quantite, conditionnement: cond, nbEtiquettes,
      qteParEtiquette: cond, reste: ligne.quantite % cond || cond
    });
  }
  return result;
}

function generateLabelFileName(blNumero: string, articleCode: string, labelNum: number): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const blHash = blNumero.replace(/[^A-Za-z0-9]/g, '').slice(-4);
  const artHash = articleCode.replace(/[^A-Za-z0-9]/g, '').slice(-4);
  return `LBL-${date}-${blHash}-${artHash}-${String(labelNum).padStart(3, '0')}`;
}

/** Mini preview d'un template (rendu statique à petite échelle) */
function TemplateMiniPreview({ template }: { template: LabelTemplateData }) {
  const miniScale = 0.8; // 1mm = 0.8px pour la miniature
  const w = template.width * miniScale;
  const h = template.height * miniScale;
  return (
    <div className="relative bg-white border border-gray-200 rounded overflow-hidden" style={{ width: w, height: h, minHeight: 40 }}>
      {template.backgroundImage && (
        <img src={template.backgroundImage} alt="" className="absolute inset-0 w-full h-full object-contain opacity-10" />
      )}
      {(template.fields || []).map((field) => {
        if (field.type === 'barcode' || field.type === 'qrcode') {
          return (
            <div key={field.id} className="absolute bg-gray-200 rounded-sm" style={{
              left: field.x * miniScale, top: field.y * miniScale,
              width: Math.max(field.width * miniScale, 8), height: Math.max(field.height * miniScale, 6),
            }} />
          );
        }
        let content = '';
        switch (field.type) {
          case 'code': content = 'REF'; break;
          case 'designation': content = 'Désignation'; break;
          case 'date': content = '01/01/2026'; break;
          case 'numero': content = 'BL001'; break;
          case 'quantite': content = '84/186'; break;
          case 'client': content = 'Client'; break;
          case 'text': content = field.value || ''; break;
          default: content = `{${field.type}}`;
        }
        return (
          <div key={field.id} className="absolute truncate" style={{
            left: field.x * miniScale, top: field.y * miniScale,
            width: field.width * miniScale, height: field.height * miniScale,
            fontSize: Math.max(field.fontSize * miniScale * 0.25, 4),
            fontWeight: field.bold ? 'bold' : 'normal',
            color: field.color || '#000',
            lineHeight: 1,
          }}>{content}</div>
        );
      })}
    </div>
  );
}

/** Rendu d'un champ pour l'impression réelle */
function renderField(field: LabelField, data: Record<string, string>, scale: number, baseUrl: string) {
  if (field.type === 'qrcode') {
    const qrValue = `${baseUrl}/article/${encodeURIComponent(data.code || '')}`;
    const size = Math.min(field.width, field.height) * scale * 0.8;
    return (
      <div key={field.id} style={{
        position: 'absolute', left: field.x * scale, top: field.y * scale, width: size, height: size,
      }}>
        <QRCodeSVG value={qrValue} size={size} level="M" />
      </div>
    );
  }
  if (field.type === 'barcode') return null;
  let content = '';
  switch (field.type) {
    case 'code': content = data.code || '-'; break;
    case 'designation': content = data.designation || '-'; break;
    case 'date': content = data.date || new Date().toLocaleDateString('fr-FR'); break;
    case 'numero': content = data.numero || '-'; break;
    case 'quantite': content = data.quantite || '-'; break;
    case 'client': content = data.client || '-'; break;
    case 'text': content = field.value || ''; break;
  }
  return (
    <div key={field.id} style={{
      position: 'absolute', left: field.x * scale, top: field.y * scale,
      width: field.width * scale, height: field.height * scale,
      fontSize: field.fontSize * scale * 0.3, fontWeight: field.bold ? 'bold' : 'normal',
      color: field.color || '#000', overflow: 'hidden', display: 'flex', alignItems: 'center', lineHeight: 1.1,
    }}>
      <span className="truncate w-full">{content}</span>
    </div>
  );
}

export function LabelPrint({ open, onOpenChange, bl, articles, templates = [], onRefreshTemplates }: LabelPrintProps) {
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LabelTemplateData | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const etiquettes = bl ? calculerEtiquettes(bl, articles) : [];
  const totalLabels = etiquettes.reduce((sum, e) => sum + e.nbEtiquettes, 0);

  const selectedTemplate: LabelTemplateData | null =
    selectedTemplateId === 'default'
      ? (templates.find(t => t.isDefault) || templates[0] || null)
      : templates.find(t => t.id === selectedTemplateId) || null;

  const scale = 3;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      labelRefs.current.forEach((ref) => {
        if (ref) {
          const svg = ref.querySelector('svg[data-barcode]');
          if (svg) {
            try {
              JsBarcode(svg, svg.getAttribute('data-code') || 'UNKNOWN', {
                format: 'CODE128', width: 1.5, height: 30, displayValue: true, fontSize: 12, margin: 2
              });
            } catch (e) { console.warn('Barcode error:', e); }
          }
        }
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [open, etiquettes.length, selectedTemplateId]);

  const handlePrint = () => {
    const printContent = document.getElementById('label-print-area');
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    const lw = selectedTemplate?.width || 100;
    const lh = selectedTemplate?.height || 60;
    printWindow.document.write(`
      <html><head><title>Étiquettes - ${bl?.numero || ''}</title>
      <style>
        @page { margin: 10mm; size: A4 landscape; }
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
        .print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; padding: 5mm; }
        .label-card { border: 1px solid #ccc; page-break-inside: avoid; position: relative; overflow: hidden; width: ${lw}mm; height: ${lh}mm; }
        .label-content { position: relative; z-index: 1; width: 100%; height: 100%; }
        .label-footer { position: absolute; bottom: 1mm; right: 1mm; font-size: 6px; color: #999; }
        svg { max-width: 100%; }
        @media print { .no-print { display: none; } .print-grid { gap: 3mm; padding: 3mm; } }
      </style></head><body>
      <div class="print-grid">${printContent.innerHTML}</div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const handleSaveTemplate = async (template: LabelTemplateData) => {
    try {
      const method = template.id ? 'PUT' : 'POST';
      const body = template.id ? template : { ...template, id: undefined };
      const res = await fetch('/api/label-templates', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      if (res.ok) {
        onRefreshTemplates?.();
        const saved = await res.json();
        setSelectedTemplateId(saved.id);
      }
    } catch (e) { alert('Erreur lors de la sauvegarde du template'); }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await fetch(`/api/label-templates?id=${id}`, { method: 'DELETE' });
      if (selectedTemplateId === id) setSelectedTemplateId('default');
      onRefreshTemplates?.();
      setConfirmDeleteId(null);
    } catch (e) { alert('Erreur suppression'); }
  };

  const handleSetDefault = async (template: LabelTemplateData) => {
    await handleSaveTemplate({ ...template, isDefault: true });
  };

  // --- Empty state ---
  if (!bl || etiquettes.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Imprimer étiquettes</DialogTitle></DialogHeader>
          <div className="py-4 text-center text-muted-foreground">
            <p>Aucun article avec conditionnement défini pour ce BL.</p>
            <p className="text-sm mt-2">Définissez le conditionnement (qté/emballage) dans la fiche article (ART01) pour activer l'impression d'étiquettes.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[calc(100vh-4rem)] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Étiquettes — {bl.numero}</DialogTitle>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">ÉTIQ-{totalLabels}</span>
            </div>
          </DialogHeader>
          <div className="py-2 space-y-4">

            {/* ===== LISTE DES TEMPLATES ===== */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Modèle d'étiquette</Label>
                <Button variant="outline" size="sm" onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" />Nouveau modèle
                </Button>
              </div>
              {templates.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
                  <p className="mb-2">Aucun modèle d'étiquette enregistré.</p>
                  <Button variant="outline" size="sm" onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" />Créer le premier modèle
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {templates.map((t) => {
                    const isSelected = selectedTemplateId === t.id;
                    return (
                      <div
                        key={t.id}
                        className={`relative border-2 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedTemplateId(t.id!)}
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
                        {/* Mini preview centrée */}
                        <div className="flex justify-center mb-2 mt-1">
                          <TemplateMiniPreview template={t} />
                        </div>
                        {/* Infos */}
                        <div className="text-center">
                          <div className="font-medium text-sm truncate">{t.name}</div>
                          <div className="text-xs text-muted-foreground">{t.width}×{t.height}mm · {t.fields.length} champ{(t.fields.length) > 1 ? 's' : ''}</div>
                        </div>
                        {/* Actions */}
                        <div className="flex justify-center gap-1 mt-2">
                          <Button
                            variant="ghost" size="sm" className="h-6 px-2 text-xs"
                            onClick={(e) => { e.stopPropagation(); setEditingTemplate(t); setEditorOpen(true); }}
                          >
                            <Settings className="h-3 w-3 mr-1" />Éditer
                          </Button>
                          {!t.isDefault && (
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
                            <Button
                              variant="ghost" size="sm" className="h-6 px-2 text-xs text-red-500"
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(t.id!); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ===== RÉCAPITULATIF ===== */}
            <div className="text-sm text-muted-foreground border-t pt-3">
              {etiquettes.length} article(s) avec conditionnement — <strong>{totalLabels} étiquette(s)</strong> — Format A5 (2 par feuille A4)
            </div>

            {/* ===== TABLEAU RÉCAP ===== */}
            <table className="w-full text-sm border rounded-lg">
              <thead className="bg-gray-50"><tr>
                <th className="text-left p-2">Réf</th>
                <th className="text-left p-2">Désignation</th>
                <th className="text-right p-2">Qté BL</th>
                <th className="text-right p-2">Cond.</th>
                <th className="text-right p-2">Étiquettes</th>
                <th className="text-left p-2">Fichier</th>
              </tr></thead>
              <tbody>
                {etiquettes.map((e, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 font-mono">{e.code}</td>
                    <td className="p-2">{e.designation}</td>
                    <td className="p-2 text-right">{e.qteBL}</td>
                    <td className="p-2 text-right">{e.qteParEtiquette}</td>
                    <td className="p-2 text-right font-bold">{e.nbEtiquettes}</td>
                    <td className="p-2 font-mono text-xs text-muted-foreground">{generateLabelFileName(bl.numero, e.code, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ===== PRÉVISUALISATION DES ÉTIQUETTES ===== */}
            <div>
              <Label className="text-base font-semibold mb-2 block">Aperçu des étiquettes</Label>
              <div id="label-print-area" className="flex flex-wrap gap-2 border rounded-lg p-3 bg-gray-50">
                {etiquettes.map((e, idx) =>
                  Array.from({ length: e.nbEtiquettes }).map((_, j) => {
                    const labelNum = etiquettes.slice(0, idx).reduce((s, x) => s + x.nbEtiquettes, 0) + j + 1;
                    const isLast = j === e.nbEtiquettes - 1;
                    const qtyLabel = isLast && e.reste !== e.qteParEtiquette
                      ? `${e.reste} / ${e.qteBL}`
                      : `${e.qteParEtiquette} / ${e.qteBL}`;
                    const fieldData: Record<string, string> = {
                      code: e.code, designation: e.designation,
                      date: new Date().toLocaleDateString('fr-FR'),
                      numero: bl.numero, quantite: qtyLabel,
                      client: bl.client?.raisonSociale || '',
                    };
                    const labelWidth = selectedTemplate?.width || 100;
                    const labelHeight = selectedTemplate?.height || 60;
                    const fileName = generateLabelFileName(bl.numero, e.code, labelNum);
                    return (
                      <div
                        key={`${idx}-${j}`}
                        ref={(el) => { labelRefs.current[labelNum - 1] = el; }}
                        className="label-card bg-white"
                        style={{ width: labelWidth * scale, height: labelHeight * scale, position: 'relative', overflow: 'hidden', border: '1px solid #ddd' }}
                        data-filename={fileName}
                      >
                        {selectedTemplate?.backgroundImage && (
                          <img src={selectedTemplate.backgroundImage} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.15, zIndex: 0 }} />
                        )}
                        <div className="label-content" style={{ position: 'relative', zIndex: 1 }}>
                          {(selectedTemplate?.fields || []).map((field) => {
                            if (field.type === 'barcode') {
                              return (
                                <div key={field.id} style={{
                                  position: 'absolute', left: field.x * scale, top: field.y * scale,
                                  width: field.width * scale, height: field.height * scale,
                                }}>
                                  <svg data-barcode data-code={e.code}></svg>
                                </div>
                              );
                            }
                            if (field.type === 'qrcode') {
                              return <div key={field.id}>{renderField(field, fieldData, scale, baseUrl)}</div>;
                            }
                            return <div key={field.id}>{renderField(field, fieldData, scale, baseUrl)}</div>;
                          })}
                        </div>
                        <div className="label-footer">{fileName}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handlePrint} disabled={!selectedTemplate}>
              <Printer className="h-4 w-4 mr-2" />Imprimer {totalLabels} étiquette(s) (A5 × 2)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <LabelTemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        onSave={handleSaveTemplate}
      />
    </>
  );
}
