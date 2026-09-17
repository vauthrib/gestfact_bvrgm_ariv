'use client';

import { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Settings, QrCode } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';
import { LabelTemplateEditor, LabelTemplateData, LabelField } from './label-template-editor';

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

const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH`;

// Calculer les étiquettes à imprimer pour un BL
function calculerEtiquettes(bl: BonLivraison, articles: Article[]): Array<{
  designation: string;
  code: string;
  qteBL: number;
  conditionnement: number;
  nbEtiquettes: number;
  qteParEtiquette: number;
  reste: number;
}> {
  if (!bl.lignes) return [];
  const articleMap = new Map(articles.map(a => [a.id, a]));
  const result: Array<{
    designation: string;
    code: string;
    qteBL: number;
    conditionnement: number;
    nbEtiquettes: number;
    qteParEtiquette: number;
    reste: number;
  }> = [];

  for (const ligne of bl.lignes) {
    const article = ligne.articleId ? articleMap.get(ligne.articleId) : null;
    const cond = article?.conditionnement || 0;
    if (cond <= 0) continue;

    const nbEtiquettes = Math.ceil(ligne.quantite / cond);
    result.push({
      designation: ligne.designation,
      code: article?.code || ligne.designation.substring(0, 20),
      qteBL: ligne.quantite,
      conditionnement: cond,
      nbEtiquettes,
      qteParEtiquette: cond,
      reste: ligne.quantite % cond || cond
    });
  }
  return result;
}

// Générer le nom de fichier codé pour l'étiquette
function generateLabelFileName(blNumero: string, articleCode: string, labelNum: number): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const blHash = blNumero.replace(/[^A-Za-z0-9]/g, '').slice(-4);
  const artHash = articleCode.replace(/[^A-Za-z0-9]/g, '').slice(-4);
  return `LBL-${date}-${blHash}-${artHash}-${String(labelNum).padStart(3, '0')}`;
}

// Rendre un champ dynamique
function renderField(field: LabelField, data: Record<string, string>, scale: number, baseUrl: string) {
  if (field.type === 'qrcode') {
    const qrValue = `${baseUrl}/article/${encodeURIComponent(data.code || '')}`;
    const size = Math.min(field.width, field.height) * scale * 0.8;
    return (
      <div key={field.id} style={{
        position: 'absolute',
        left: field.x * scale,
        top: field.y * scale,
        width: size,
        height: size,
      }}>
        <QRCodeSVG value={qrValue} size={size} level="M" />
      </div>
    );
  }

  if (field.type === 'barcode') {
    return null; // Géré séparément
  }

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
      position: 'absolute',
      left: field.x * scale,
      top: field.y * scale,
      width: field.width * scale,
      height: field.height * scale,
      fontSize: field.fontSize * scale * 0.3,
      fontWeight: field.bold ? 'bold' : 'normal',
      color: field.color || '#000',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      lineHeight: 1.1,
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

  const etiquettes = bl ? calculerEtiquettes(bl, articles) : [];
  const totalLabels = etiquettes.reduce((sum, e) => sum + e.nbEtiquettes, 0);

  // Template sélectionné
  const selectedTemplate: LabelTemplateData | null = 
    selectedTemplateId === 'default' 
      ? (templates.find(t => t.isDefault) || templates[0] || null)
      : templates.find(t => t.id === selectedTemplateId) || null;

  const scale = 3; // 1mm = 3px
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Générer les codes-barres après chaque rendu
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      labelRefs.current.forEach((ref) => {
        if (ref) {
          const svg = ref.querySelector('svg[data-barcode]');
          if (svg) {
            try {
              JsBarcode(svg, svg.getAttribute('data-code') || 'UNKNOWN', {
                format: 'CODE128',
                width: 1.5,
                height: 30,
                displayValue: true,
                fontSize: 12,
                margin: 2
              });
            } catch (e) {
              console.warn('Barcode error:', e);
            }
          }
        }
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [open, etiquettes.length, selectedTemplateId]);

  // Impression A5 sur A4 (2 étiquettes côte à côte)
  const handlePrint = () => {
    const printContent = document.getElementById('label-print-area');
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    
    const lw = selectedTemplate?.width || 100;
    const lh = selectedTemplate?.height || 60;
    
    printWindow.document.write(`
      <html>
      <head>
        <title>Étiquettes - ${bl?.numero || ''}</title>
        <style>
          @page { 
            margin: 10mm; 
            size: A4 landscape; 
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 0; 
          }
          .print-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5mm;
            padding: 5mm;
          }
          .label-card { 
            border: 1px solid #ccc; 
            page-break-inside: avoid;
            position: relative;
            overflow: hidden;
            width: ${lw}mm;
            height: ${lh}mm;
          }
          .label-image { 
            position: absolute; top: 0; left: 0; 
            width: 100%; height: 100%; 
            object-fit: contain; 
            opacity: 0.15; 
            z-index: 0; 
          }
          .label-content { 
            position: relative; 
            z-index: 1; 
            width: 100%; 
            height: 100%; 
          }
          .label-footer {
            position: absolute;
            bottom: 1mm;
            right: 1mm;
            font-size: 6px;
            color: #999;
          }
          svg { max-width: 100%; }
          @media print { 
            .no-print { display: none; } 
            .print-grid { gap: 3mm; padding: 3mm; }
          }
        </style>
      </head>
      <body>
        <div class="print-grid">
          ${printContent.innerHTML}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const handleSaveTemplate = async (template: LabelTemplateData) => {
    try {
      const method = template.id ? 'PUT' : 'POST';
      const body = template.id ? template : { ...template, id: undefined };
      const res = await fetch('/api/label-templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        onRefreshTemplates?.();
        const saved = await res.json();
        setSelectedTemplateId(saved.id);
      }
    } catch (e) {
      alert('Erreur lors de la sauvegarde du template');
    }
  };

  const handleEditTemplate = () => {
    if (selectedTemplate) {
      setEditingTemplate(selectedTemplate);
    } else {
      setEditingTemplate(null);
    }
    setEditorOpen(true);
  };

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  if (!bl || etiquettes.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Imprimer étiquettes</DialogTitle></DialogHeader>
          <div className="py-4 text-center text-muted-foreground">
            <p>Aucun article avec conditionnement défini pour ce BL.</p>
            <p className="text-sm mt-2">Définissez le conditionnement (qté/emballage) dans la fiche article pour activer l'impression d'étiquettes.</p>
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
        <DialogContent className="max-w-5xl max-h-[calc(100vh-4rem)] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Étiquettes — {bl.numero}</DialogTitle>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">ÉTIQ-{totalLabels}</span>
            </div>
          </DialogHeader>
          <div className="py-2 space-y-4">
            {/* Sélection du template */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="mb-1 block">Template d'étiquette</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Par défaut</SelectItem>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id!}>{t.name} ({t.width}×{t.height}mm)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={handleNewTemplate}>+ Nouveau</Button>
              <Button variant="outline" size="sm" onClick={handleEditTemplate}><Settings className="h-4 w-4 mr-1" />Éditer</Button>
            </div>
            {/* Récapitulatif */}
            <div className="text-sm text-muted-foreground">
              {etiquettes.length} article(s) — <strong>{totalLabels} étiquette(s)</strong> — Format A5 (2 par feuille A4)
            </div>
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
                    <td className="p-2 font-mono text-xs text-muted-foreground">
                      {generateLabelFileName(bl.numero, e.code, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Aperçu des étiquettes */}
            <div id="label-print-area">
              {etiquettes.map((e, idx) =>
                Array.from({ length: e.nbEtiquettes }).map((_, j) => {
                  const labelNum = etiquettes.slice(0, idx).reduce((s, x) => s + x.nbEtiquettes, 0) + j + 1;
                  const isLast = j === e.nbEtiquettes - 1;
                  const qtyLabel = isLast && e.reste !== e.qteParEtiquette
                    ? `${e.reste} / ${e.qteBL}`
                    : `${e.qteParEtiquette} / ${e.qteBL}`;
                  
                  const fieldData: Record<string, string> = {
                    code: e.code,
                    designation: e.designation,
                    date: new Date().toLocaleDateString('fr-FR'),
                    numero: bl.numero,
                    quantite: qtyLabel,
                    client: bl.client?.raisonSociale || '',
                  };

                  const labelWidth = selectedTemplate?.width || 100;
                  const labelHeight = selectedTemplate?.height || 60;
                  const fileName = generateLabelFileName(bl.numero, e.code, labelNum);

                  return (
                    <div
                      key={`${idx}-${j}`}
                      ref={(el) => { labelRefs.current[labelNum - 1] = el; }}
                      className="label-card"
                      style={{ width: labelWidth * scale, height: labelHeight * scale, position: 'relative', overflow: 'hidden', border: '1px solid #ddd', margin: '2px' }}
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
                                position: 'absolute',
                                left: field.x * scale,
                                top: field.y * scale,
                                width: field.width * scale,
                                height: field.height * scale,
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
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />Imprimer {totalLabels} étiquette(s) (A5 × 2)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Éditeur de template */}
      <LabelTemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        onSave={handleSaveTemplate}
      />
    </>
  );
}
