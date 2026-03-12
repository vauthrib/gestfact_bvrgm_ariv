'use client';

import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Settings, EyeOff } from 'lucide-react';

interface LayoutElement {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

interface PrintLayout {
  docInfo: LayoutElement;
  clientInfo: LayoutElement;
  tableStart: LayoutElement;
  totals: LayoutElement;
  footer: LayoutElement;
  margins: { top: number; right: number; bottom: number; left: number };
}

interface PrintDocumentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: 'BL' | 'FC' | 'FF' | 'RC' | 'RF';
  documentData: any;
  entreprise: any;
  code: string;
  printLayout?: PrintLayout | null;
  letterheadImage?: string | null;
}

const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH`;

const formatDate = (d: string | Date) => {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR');
};

// Couleur verte pâle pour V1.75
const PRIMARY_COLOR = '#16a34a'; // green-600
const PRIMARY_LIGHT = '#dcfce7'; // green-100
const PRIMARY_TEXT = '#15803d'; // green-700

const DEFAULT_LAYOUT: PrintLayout = {
  docInfo: { x: 120, y: 10, width: 80, height: 30, visible: true },
  clientInfo: { x: 10, y: 60, width: 90, height: 40, visible: true },
  tableStart: { x: 10, y: 110, width: 190, height: 100, visible: true },
  totals: { x: 130, y: 220, width: 70, height: 40, visible: true },
  footer: { x: 10, y: 270, width: 190, height: 20, visible: true },
  margins: { top: 10, right: 10, bottom: 10, left: 10 }
};

export function PrintDocument({
  open,
  onOpenChange,
  documentType,
  documentData,
  entreprise,
  code,
  printLayout,
  letterheadImage
}: PrintDocumentProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [useCustomLayout, setUseCustomLayout] = useState(true);
  const [hidePrices, setHidePrices] = useState(false); // Option pour masquer les prix (BL)
  const layout = printLayout || DEFAULT_LAYOUT;

  // Convert mm to px (96 DPI)
  const mmToPx = (mm: number) => Math.round(mm * 3.779527559);
  const mmToPxStr = (mm: number) => `${mmToPx(mm)}px`;

  if (!documentData) return null;

  const getTitle = () => {
    switch (documentType) {
      case 'BL': return 'Bon de Livraison';
      case 'FC': return 'Facture Client';
      case 'FF': return 'Facture Fournisseur';
      case 'RC': return 'Règlement Client';
      case 'RF': return 'Règlement Fournisseur';
      default: return 'Document';
    }
  };

  const getNumero = () => documentData.numero || documentData.numeroFacture || '';
  const getTiers = () => documentData.client || documentData.fournisseur || {};
  const lignes = documentData.lignes || [];

  // Generate HTML for print window
  const generatePrintHTML = () => {
    const docDate = formatDate(documentData.dateBL || documentData.dateFacture || documentData.dateReglement);
    const isBL = documentType === 'BL';
    const showPrices = !hidePrices || !isBL;
    
    if (useCustomLayout && printLayout) {
      // Custom Layout Mode
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${getTitle()} - ${getNumero()}</title>
          <style>
            @page { size: A4; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              font-size: 10pt;
              width: 210mm;
              height: 297mm;
              position: relative;
            }
            .letterhead-img {
              position: absolute;
              top: 0;
              left: 0;
              width: 210mm;
              height: 297mm;
              z-index: 0;
            }
            .page {
              position: relative;
              width: 210mm;
              height: 297mm;
              z-index: 1;
            }
            .doc-info {
              position: absolute;
              left: ${mmToPxStr(layout.docInfo.x)};
              top: ${mmToPxStr(layout.docInfo.y)};
              width: ${mmToPxStr(layout.docInfo.width)};
              text-align: right;
            }
            .doc-info h2 { font-size: 14pt; margin-bottom: 5px; }
            .doc-info .numero { font-size: 12pt; font-weight: bold; color: ${PRIMARY_COLOR}; }
            .doc-info p { font-size: 10pt; margin: 2px 0; }
            .client-info {
              position: absolute;
              left: ${mmToPxStr(layout.clientInfo.x)};
              top: ${mmToPxStr(layout.clientInfo.y)};
              width: ${mmToPxStr(layout.clientInfo.width)};
            }
            .client-info h3 { font-size: 8pt; color: #666; margin-bottom: 3px; }
            .client-info p { font-size: 10pt; margin: 1px 0; }
            .client-info .name { font-weight: bold; font-size: 11pt; }
            .table-container {
              position: absolute;
              left: ${mmToPxStr(layout.tableStart.x)};
              top: ${mmToPxStr(layout.tableStart.y)};
              width: ${mmToPxStr(layout.tableStart.width)};
            }
            table { width: 100%; border-collapse: collapse; }
            th { background: ${PRIMARY_COLOR}; color: white; padding: 8px; text-align: left; font-size: 9pt; }
            th:last-child, td:last-child { text-align: right; }
            td { padding: 6px 8px; border-bottom: 1px solid #ddd; font-size: 9pt; }
            .totals-section {
              position: absolute;
              left: ${mmToPxStr(layout.totals.x)};
              top: ${mmToPxStr(layout.totals.y)};
              width: ${mmToPxStr(layout.totals.width)};
              text-align: right;
            }
            .totals-section p { font-size: 10pt; margin: 3px 0; }
            .totals-section .total-ttc { font-size: 12pt; font-weight: bold; color: ${PRIMARY_COLOR}; }
            .footer-section {
              position: absolute;
              left: ${mmToPxStr(layout.footer.x)};
              top: ${mmToPxStr(layout.footer.y)};
              width: ${mmToPxStr(layout.footer.width)};
              font-size: 8pt;
              color: #666;
            }
            .footer-section p { margin: 1px 0; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${letterheadImage ? `<img src="${letterheadImage}" class="letterhead-img" alt="" />` : ''}
          <div class="page">
            ${layout.docInfo.visible ? `
              <div class="doc-info">
                <h2>${getTitle()}</h2>
                <p class="numero">${getNumero()}</p>
                <p>Date: ${docDate}</p>
                ${documentData.dateEcheance ? `<p>Échéance: ${formatDate(documentData.dateEcheance)}</p>` : ''}
              </div>
            ` : ''}
            
            ${layout.clientInfo.visible ? `
              <div class="client-info">
                <h3>${documentType === 'FF' || documentType === 'RF' ? 'FOURNISSEUR' : 'CLIENT'}</h3>
                <p class="name">${getTiers()?.raisonSociale || ''}</p>
                ${getTiers()?.adresse ? `<p>${getTiers().adresse}</p>` : ''}
                ${getTiers()?.ville ? `<p>${getTiers().ville}</p>` : ''}
                ${getTiers()?.ice ? `<p>ICE: ${getTiers().ice}</p>` : ''}
              </div>
            ` : ''}
            
            ${layout.tableStart.visible && lignes.length > 0 ? `
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Désignation</th>
                      <th style="width: 60px; text-align: right;">Qté</th>
                      ${showPrices ? `
                        <th style="width: 80px; text-align: right;">P.U. HT</th>
                        ${documentType !== 'BL' ? '<th style="width: 50px; text-align: right;">TVA</th>' : ''}
                        <th style="width: 90px; text-align: right;">Total HT</th>
                      ` : ''}
                    </tr>
                  </thead>
                  <tbody>
                    ${lignes.map((l: any) => `
                      <tr>
                        <td>${l.designation}</td>
                        <td style="text-align: right;">${l.quantite}</td>
                        ${showPrices ? `
                          <td style="text-align: right;">${formatCurrency(l.prixUnitaire)}</td>
                          ${documentType !== 'BL' ? `<td style="text-align: right;">${l.tauxTVA}%</td>` : ''}
                          <td style="text-align: right;">${formatCurrency(l.totalHT)}</td>
                        ` : ''}
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
            
            ${layout.totals.visible && showPrices ? `
              <div class="totals-section">
                ${documentData.totalHT !== undefined ? `<p>Total HT: <strong>${formatCurrency(documentData.totalHT)}</strong></p>` : ''}
                ${documentData.totalTVA !== undefined && documentData.totalTVA > 0 ? `<p>TVA: <strong>${formatCurrency(documentData.totalTVA)}</strong></p>` : ''}
                ${documentData.montantTVA !== undefined && documentData.montantTVA > 0 ? `<p>TVA: <strong>${formatCurrency(documentData.montantTVA)}</strong></p>` : ''}
                ${documentData.totalTTC !== undefined ? `<p class="total-ttc">Total TTC: ${formatCurrency(documentData.totalTTC)}</p>` : ''}
                ${documentData.montantTTC !== undefined ? `<p class="total-ttc">Total TTC: ${formatCurrency(documentData.montantTTC)}</p>` : ''}
                ${documentData.montant !== undefined ? `<p class="total-ttc">Montant: ${formatCurrency(documentData.montant)}</p>` : ''}
              </div>
            ` : ''}
            
            ${layout.footer.visible ? `
              <div class="footer-section">
                <p>${entreprise?.nomEntreprise || ''} ${entreprise?.villeEntreprise ? '- ' + entreprise.villeEntreprise : ''}</p>
                ${entreprise?.ice ? `<p>ICE: ${entreprise.ice}</p>` : ''}
                ${entreprise?.rc ? `<p>RC: ${entreprise.rc} ${entreprise?.rcLieu || ''}</p>` : ''}
              </div>
            ` : ''}
          </div>
        </body>
        </html>
      `;
    } else {
      // Standard Layout Mode
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${getTitle()} - ${getNumero()}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              font-size: 10pt;
            }
            .header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid ${PRIMARY_COLOR};
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .company h1 { font-size: 18pt; color: ${PRIMARY_COLOR}; margin-bottom: 5px; }
            .company p { font-size: 9pt; color: #666; margin: 2px 0; }
            .doc-info { text-align: right; }
            .doc-info h2 { font-size: 14pt; margin-bottom: 5px; }
            .doc-info .numero { font-size: 12pt; font-weight: bold; color: ${PRIMARY_COLOR}; }
            .doc-info p { font-size: 10pt; margin: 2px 0; }
            .client-box {
              background: #f8f9fa;
              padding: 10px 15px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .client-box h3 { font-size: 8pt; color: #666; margin-bottom: 5px; }
            .client-box p { font-size: 10pt; margin: 1px 0; }
            .client-box .name { font-weight: bold; font-size: 11pt; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: ${PRIMARY_COLOR}; color: white; padding: 10px; text-align: left; font-size: 9pt; }
            th:last-child, td:last-child { text-align: right; }
            td { padding: 8px 10px; border-bottom: 1px solid #ddd; font-size: 9pt; }
            tr:nth-child(even) { background: #f8f9fa; }
            .totals { text-align: right; margin-bottom: 30px; }
            .totals p { font-size: 10pt; margin: 5px 0; }
            .totals .total-ttc { font-size: 14pt; font-weight: bold; color: ${PRIMARY_COLOR}; }
            .footer { border-top: 1px solid #ddd; padding-top: 15px; font-size: 8pt; color: #666; }
            .footer p { margin: 2px 0; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">
              <h1>${entreprise?.nomEntreprise || 'Votre Entreprise'}</h1>
              ${entreprise?.adresseEntreprise ? `<p>${entreprise.adresseEntreprise}</p>` : ''}
              ${entreprise?.villeEntreprise ? `<p>${entreprise.villeEntreprise}</p>` : ''}
              ${entreprise?.telephoneEntreprise ? `<p>Tél: ${entreprise.telephoneEntreprise}</p>` : ''}
              ${entreprise?.emailEntreprise ? `<p>Email: ${entreprise.emailEntreprise}</p>` : ''}
            </div>
            <div class="doc-info">
              <h2>${getTitle()}</h2>
              <p class="numero">${getNumero()}</p>
              <p>Date: ${docDate}</p>
              ${documentData.dateEcheance ? `<p>Échéance: ${formatDate(documentData.dateEcheance)}</p>` : ''}
            </div>
          </div>
          
          <div class="client-box">
            <h3>${documentType === 'FF' || documentType === 'RF' ? 'FOURNISSEUR' : 'CLIENT'}</h3>
            <p class="name">${getTiers()?.raisonSociale || ''}</p>
            ${getTiers()?.adresse ? `<p>${getTiers().adresse}</p>` : ''}
            ${getTiers()?.ville ? `<p>${getTiers().ville}</p>` : ''}
            ${getTiers()?.ice ? `<p>ICE: ${getTiers().ice}</p>` : ''}
          </div>
          
          ${lignes.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Désignation</th>
                  <th style="width: 60px; text-align: right;">Qté</th>
                  ${showPrices ? `
                    <th style="width: 80px; text-align: right;">P.U. HT</th>
                    ${documentType !== 'BL' ? '<th style="width: 50px; text-align: right;">TVA</th>' : ''}
                    <th style="width: 90px; text-align: right;">Total HT</th>
                  ` : ''}
                </tr>
              </thead>
              <tbody>
                ${lignes.map((l: any) => `
                  <tr>
                    <td>${l.designation}</td>
                    <td style="text-align: right;">${l.quantite}</td>
                    ${showPrices ? `
                      <td style="text-align: right;">${formatCurrency(l.prixUnitaire)}</td>
                      ${documentType !== 'BL' ? `<td style="text-align: right;">${l.tauxTVA}%</td>` : ''}
                      <td style="text-align: right;">${formatCurrency(l.totalHT)}</td>
                    ` : ''}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          
          ${showPrices ? `
            <div class="totals">
              ${documentData.totalHT !== undefined ? `<p>Total HT: <strong>${formatCurrency(documentData.totalHT)}</strong></p>` : ''}
              ${documentData.totalTVA !== undefined && documentData.totalTVA > 0 ? `<p>TVA: <strong>${formatCurrency(documentData.totalTVA)}</strong></p>` : ''}
              ${documentData.montantTVA !== undefined && documentData.montantTVA > 0 ? `<p>TVA: <strong>${formatCurrency(documentData.montantTVA)}</strong></p>` : ''}
              ${documentData.totalTTC !== undefined ? `<p class="total-ttc">Total TTC: ${formatCurrency(documentData.totalTTC)}</p>` : ''}
              ${documentData.montantTTC !== undefined ? `<p class="total-ttc">Total TTC: ${formatCurrency(documentData.montantTTC)}</p>` : ''}
              ${documentData.montant !== undefined ? `<p class="total-ttc">Montant: ${formatCurrency(documentData.montant)}</p>` : ''}
            </div>
          ` : ''}
          
          <div class="footer">
            <p>${entreprise?.nomEntreprise || ''} ${entreprise?.villeEntreprise ? '- ' + entreprise.villeEntreprise : ''}</p>
            ${entreprise?.ice ? `<p>ICE: ${entreprise.ice}</p>` : ''}
            ${entreprise?.rc ? `<p>RC: ${entreprise.rc} ${entreprise?.rcLieu || ''}</p>` : ''}
          </div>
        </body>
        </html>
      `;
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintHTML());
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 300);
    }
  };

  const isBL = documentType === 'BL';
  const showPrices = !hidePrices || !isBL;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Aperçu - {getTitle()}</DialogTitle>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-mono font-bold">{code}-PRT</span>
          </div>
        </DialogHeader>

        <div className="flex gap-2 mb-4 flex-wrap">
          {printLayout && (
            <Button
              variant={useCustomLayout ? "default" : "outline"}
              onClick={() => setUseCustomLayout(!useCustomLayout)}
              className={useCustomLayout ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <Settings className="w-4 h-4 mr-2" />
              {useCustomLayout ? 'Mise en page personnalisée' : 'Mise en page standard'}
            </Button>
          )}
          
          {/* Option pour masquer les prix (uniquement pour les BL) */}
          {isBL && (
            <Button
              variant={hidePrices ? "default" : "outline"}
              onClick={() => setHidePrices(!hidePrices)}
              className={hidePrices ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <EyeOff className="w-4 h-4 mr-2" />
              {hidePrices ? 'Sans prix' : 'Avec prix'}
            </Button>
          )}
          
          <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700">
            <Printer className="w-4 h-4 mr-2" /> Imprimer
          </Button>
        </div>

        {/* Preview */}
        <div
          ref={previewRef}
          className="border rounded-lg bg-white relative overflow-hidden"
          style={{
            width: '210mm',
            height: '297mm',
            transform: 'scale(0.5)',
            transformOrigin: 'top left',
            marginBottom: '-148.5mm',
            marginRight: '-105mm'
          }}
        >
          {/* Background image if letterhead */}
          {letterheadImage && useCustomLayout && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url(${letterheadImage})`,
                backgroundSize: '210mm 297mm',
                backgroundPosition: 'top left',
                backgroundRepeat: 'no-repeat',
                opacity: 0.3
              }}
            />
          )}

          {useCustomLayout && printLayout ? (
            /* Custom Layout Mode Preview */
            <>
              {layout.docInfo.visible && (
                <div className="absolute text-right" style={{
                  left: mmToPxStr(layout.docInfo.x),
                  top: mmToPxStr(layout.docInfo.y),
                  width: mmToPxStr(layout.docInfo.width)
                }}>
                  <h2 className="text-lg font-bold">{getTitle()}</h2>
                  <p className="font-bold text-green-700">{getNumero()}</p>
                  <p className="text-sm">Date: {formatDate(documentData.dateBL || documentData.dateFacture || documentData.dateReglement)}</p>
                  {documentData.dateEcheance && (
                    <p className="text-sm">Échéance: {formatDate(documentData.dateEcheance)}</p>
                  )}
                </div>
              )}

              {layout.clientInfo.visible && (
                <div className="absolute" style={{
                  left: mmToPxStr(layout.clientInfo.x),
                  top: mmToPxStr(layout.clientInfo.y),
                  width: mmToPxStr(layout.clientInfo.width)
                }}>
                  <h3 className="text-xs text-gray-500 mb-1">{documentType === 'FF' || documentType === 'RF' ? 'FOURNISSEUR' : 'CLIENT'}</h3>
                  <p className="font-bold">{getTiers()?.raisonSociale}</p>
                  {getTiers()?.adresse && <p className="text-sm">{getTiers()?.adresse}</p>}
                  {getTiers()?.ville && <p className="text-sm">{getTiers()?.ville}</p>}
                  {getTiers()?.ice && <p className="text-sm">ICE: {getTiers()?.ice}</p>}
                </div>
              )}

              {layout.tableStart.visible && lignes.length > 0 && (
                <div className="absolute" style={{
                  left: mmToPxStr(layout.tableStart.x),
                  top: mmToPxStr(layout.tableStart.y),
                  width: mmToPxStr(layout.tableStart.width)
                }}>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-green-700 text-white">
                        <th className="p-2 text-left text-xs">Désignation</th>
                        <th className="p-2 text-right text-xs w-16">Qté</th>
                        {showPrices && (
                          <>
                            <th className="p-2 text-right text-xs w-20">P.U. HT</th>
                            {documentType !== 'BL' && <th className="p-2 text-right text-xs w-12">TVA</th>}
                            <th className="p-2 text-right text-xs w-24">Total HT</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {lignes.map((l: any, i: number) => (
                        <tr key={i} className="border-b">
                          <td className="p-2 text-sm">{l.designation}</td>
                          <td className="p-2 text-right text-sm">{l.quantite}</td>
                          {showPrices && (
                            <>
                              <td className="p-2 text-right text-sm">{formatCurrency(l.prixUnitaire)}</td>
                              {documentType !== 'BL' && <td className="p-2 text-right text-sm">{l.tauxTVA}%</td>}
                              <td className="p-2 text-right text-sm">{formatCurrency(l.totalHT)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {layout.totals.visible && showPrices && (
                <div className="absolute text-right" style={{
                  left: mmToPxStr(layout.totals.x),
                  top: mmToPxStr(layout.totals.y),
                  width: mmToPxStr(layout.totals.width)
                }}>
                  {documentData.totalHT !== undefined && (
                    <p>Total HT: <span className="font-bold">{formatCurrency(documentData.totalHT)}</span></p>
                  )}
                  {documentData.totalTVA !== undefined && documentData.totalTVA > 0 && (
                    <p>TVA: <span className="font-bold">{formatCurrency(documentData.totalTVA)}</span></p>
                  )}
                  {documentData.montantTVA !== undefined && documentData.montantTVA > 0 && (
                    <p>TVA: <span className="font-bold">{formatCurrency(documentData.montantTVA)}</span></p>
                  )}
                  {documentData.totalTTC !== undefined && (
                    <p className="text-lg font-bold text-green-700">Total TTC: {formatCurrency(documentData.totalTTC)}</p>
                  )}
                  {documentData.montantTTC !== undefined && (
                    <p className="text-lg font-bold text-green-700">Total TTC: {formatCurrency(documentData.montantTTC)}</p>
                  )}
                  {documentData.montant !== undefined && (
                    <p className="text-lg font-bold text-green-700">Montant: {formatCurrency(documentData.montant)}</p>
                  )}
                </div>
              )}

              {layout.footer.visible && (
                <div className="absolute text-xs text-gray-500" style={{
                  left: mmToPxStr(layout.footer.x),
                  top: mmToPxStr(layout.footer.y),
                  width: mmToPxStr(layout.footer.width)
                }}>
                  <p>{entreprise?.nomEntreprise} - {entreprise?.villeEntreprise || ''}</p>
                  {entreprise?.ice && <p>ICE: {entreprise.ice}</p>}
                  {entreprise?.rc && <p>RC: {entreprise.rc} {entreprise?.rcLieu || ''}</p>}
                </div>
              )}
            </>
          ) : (
            /* Standard Layout Mode Preview */
            <>
              <div className="flex justify-between border-b-2 border-green-700 pb-4 mb-6 p-6">
                <div>
                  <h1 className="text-xl font-bold text-green-700">{entreprise?.nomEntreprise || 'Votre Entreprise'}</h1>
                  <p className="text-sm text-gray-600">
                    {entreprise?.adresseEntreprise}<br />
                    {entreprise?.villeEntreprise}<br />
                    Tél: {entreprise?.telephoneEntreprise || '-'}<br />
                    Email: {entreprise?.emailEntreprise || '-'}
                  </p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-bold">{getTitle()}</h2>
                  <p className="font-bold text-green-700">{getNumero()}</p>
                  <p className="text-sm">Date: {formatDate(documentData.dateBL || documentData.dateFacture || documentData.dateReglement)}</p>
                  {documentData.dateEcheance && (
                    <p className="text-sm">Échéance: {formatDate(documentData.dateEcheance)}</p>
                  )}
                </div>
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded mx-6">
                <h3 className="text-xs text-gray-500 mb-1">{documentType === 'FF' || documentType === 'RF' ? 'FOURNISSEUR' : 'CLIENT'}</h3>
                <p className="font-bold">{getTiers()?.raisonSociale}</p>
                {getTiers()?.adresse && <p className="text-sm">{getTiers()?.adresse}</p>}
                {getTiers()?.ville && <p className="text-sm">{getTiers()?.ville}</p>}
                {getTiers()?.ice && <p className="text-sm">ICE: {getTiers()?.ice}</p>}
              </div>

              {lignes.length > 0 && (
                <table className="w-full border-collapse mb-6 mx-6">
                  <thead>
                    <tr className="bg-green-700 text-white">
                      <th className="p-2 text-left text-xs">Désignation</th>
                      <th className="p-2 text-right text-xs w-20">Qté</th>
                      {showPrices && (
                        <>
                          <th className="p-2 text-right text-xs w-24">P.U. HT</th>
                          {documentType !== 'BL' && <th className="p-2 text-right text-xs w-16">TVA</th>}
                          <th className="p-2 text-right text-xs w-28">Total HT</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((l: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 text-sm">{l.designation}</td>
                        <td className="p-2 text-right text-sm">{l.quantite}</td>
                        {showPrices && (
                          <>
                            <td className="p-2 text-right text-sm">{formatCurrency(l.prixUnitaire)}</td>
                            {documentType !== 'BL' && <td className="p-2 text-right text-sm">{l.tauxTVA}%</td>}
                            <td className="p-2 text-right text-sm">{formatCurrency(l.totalHT)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {showPrices && (
                <div className="text-right space-y-1 mx-6">
                  {documentData.totalHT !== undefined && (
                    <p>Total HT: <span className="font-bold">{formatCurrency(documentData.totalHT)}</span></p>
                  )}
                  {documentData.totalTVA !== undefined && documentData.totalTVA > 0 && (
                    <p>TVA: <span className="font-bold">{formatCurrency(documentData.totalTVA)}</span></p>
                  )}
                  {documentData.montantTVA !== undefined && documentData.montantTVA > 0 && (
                    <p>TVA: <span className="font-bold">{formatCurrency(documentData.montantTVA)}</span></p>
                  )}
                  {documentData.totalTTC !== undefined && (
                    <p className="text-lg font-bold text-green-700">Total TTC: {formatCurrency(documentData.totalTTC)}</p>
                  )}
                  {documentData.montantTTC !== undefined && (
                    <p className="text-lg font-bold text-green-700">Total TTC: {formatCurrency(documentData.montantTTC)}</p>
                  )}
                  {documentData.montant !== undefined && (
                    <p className="text-lg font-bold text-green-700">Montant: {formatCurrency(documentData.montant)}</p>
                  )}
                </div>
              )}

              <div className="mt-8 pt-4 border-t text-xs text-gray-500 mx-6">
                <p>{entreprise?.nomEntreprise} - {entreprise?.villeEntreprise || ''}</p>
                {entreprise?.ice && <p>ICE: {entreprise.ice}</p>}
                {entreprise?.rc && <p>RC: {entreprise.rc} {entreprise?.rcLieu || ''}</p>}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
