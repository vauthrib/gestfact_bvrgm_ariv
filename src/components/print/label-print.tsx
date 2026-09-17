'use client';

import { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Settings } from 'lucide-react';
import JsBarcode from 'jsbarcode';

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
  labelImage?: string | null; // base64 image de fond du label
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
    if (cond <= 0) continue; // Pas d'étiquettes si conditionnement = 0

    const nbEtiquettes = Math.ceil(ligne.quantite / cond);
    result.push({
      designation: ligne.designation,
      code: article?.code || ligne.designation.substring(0, 20),
      qteBL: ligne.quantite,
      conditionnement: cond,
      nbEtiquettes,
      qteParEtiquette: cond,
      reste: ligne.quantite % cond || cond // Reste ou conditionnement complet
    });
  }
  return result;
}

export function LabelPrint({ open, onOpenChange, bl, articles, labelImage }: LabelPrintProps) {
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [compteur, setCompteur] = useState(1);

  const etiquettes = bl ? calculerEtiquettes(bl, articles) : [];
  const totalLabels = etiquettes.reduce((sum, e) => sum + e.nbEtiquettes, 0);

  // Générer les codes-barres après chaque rendu
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      labelRefs.current.forEach((ref) => {
        if (ref) {
          const svg = ref.querySelector('svg');
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
  }, [open, etiquettes.length]);

  const handlePrint = () => {
    const printContent = document.getElementById('label-print-area');
    if (!printContent) return;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
      <head>
        <title>Étiquettes - ${bl?.numero || ''}</title>
        <style>
          @page { margin: 5mm; size: auto; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
          .label-card { 
            border: 1px solid #ccc; 
            padding: 8px; 
            margin: 4px 0; 
            width: 100%; 
            box-sizing: border-box;
            page-break-inside: avoid;
          }
          .label-header { font-size: 10px; color: #666; margin-bottom: 4px; }
          .label-code { font-size: 14px; font-weight: bold; font-family: monospace; }
          .label-designation { font-size: 11px; margin: 4px 0; }
          .label-qty { font-size: 12px; font-weight: bold; color: #166534; }
          .label-barcode { text-align: center; margin: 4px 0; }
          .label-footer { font-size: 9px; color: #888; text-align: right; }
          .label-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0.15; z-index: 0; }
          .label-content { position: relative; z-index: 1; }
          svg { max-width: 100%; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[calc(100vh-4rem)] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Étiquettes - {bl.numero}</DialogTitle>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">ÉTIQ-{totalLabels}</span>
          </div>
        </DialogHeader>
        <div className="py-2">
          <div className="text-sm text-muted-foreground mb-4">
            {etiquettes.length} article(s) avec conditionnement — <strong>{totalLabels} étiquette(s)</strong> à imprimer
          </div>
          {/* Récapitulatif */}
          <table className="w-full text-sm border rounded-lg mb-4">
            <thead className="bg-gray-50"><tr>
              <th className="text-left p-2">Réf</th>
              <th className="text-left p-2">Désignation</th>
              <th className="text-right p-2">Qté BL</th>
              <th className="text-right p-2">Cond.</th>
              <th className="text-right p-2">Étiquettes</th>
            </tr></thead>
            <tbody>
              {etiquettes.map((e, i) => (
                <tr key={i} className="border-t"><td className="p-2 font-mono">{e.code}</td><td className="p-2">{e.designation}</td><td className="p-2 text-right">{e.qteBL}</td><td className="p-2 text-right">{e.qteParEtiquette}</td><td className="p-2 text-right font-bold">{e.nbEtiquettes}</td></tr>
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
                return (
                  <div
                    key={`${idx}-${j}`}
                    ref={(el) => { labelRefs.current[labelNum - 1] = el; }}
                    className="label-card relative"
                    style={{ position: 'relative', height: '120px', overflow: 'hidden' }}
                  >
                    {labelImage && (
                      <img src={labelImage} alt="" className="label-image" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.15, zIndex: 0 }} />
                    )}
                    <div className="label-content" style={{ position: 'relative', zIndex: 1 }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="label-code">{e.code}</div>
                          <div className="label-designation">{e.designation}</div>
                        </div>
                        <div className="text-right">
                          <div className="label-qty">Étiquette {labelNum}/{totalLabels}</div>
                          <div className="label-qty">{qtyLabel}</div>
                        </div>
                      </div>
                      <div className="label-barcode">
                        <svg data-code={e.code}></svg>
                      </div>
                      <div className="label-footer">{bl.client?.raisonSociale || ''} — {bl.numero} — {new Date(bl.dateBL).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" />Imprimer {totalLabels} étiquette(s)</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
