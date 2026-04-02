'use client';

import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Settings, EyeOff, Eye, FileText, Copy } from 'lucide-react';

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
  documentType: 'BL' | 'FC' | 'FF' | 'RC' | 'RF' | 'AV';
  documentData: any;
  entreprise: any;
  code: string;
  printLayout?: PrintLayout | null;
  letterheadImage?: string | null;
}

const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;

const formatDate = (d: string | Date) => {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR');
};

// Convert number to French words for currency
const numberToWords = (num: number): string => {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
  
  const convertHundreds = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return units[n];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const u = n % 10;
      if (t === 7 || t === 9) {
        return tens[t] + (u === 1 && t !== 9 ? '-et-' : '-') + units[10 + u];
      }
      if (u === 0) return tens[t] + (t === 8 ? 's' : '');
      if (u === 1 && t !== 8) return tens[t] + '-et-un';
      return tens[t] + '-' + units[u];
    }
    const h = Math.floor(n / 100);
    const r = n % 100;
    let result = h === 1 ? 'cent' : units[h] + ' cent';
    if (r === 0 && h > 1) result += 's';
    return result + (r ? ' ' + convertHundreds(r) : '');
  };
  
  if (num === 0) return 'zéro';
  
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);
  
  let result = '';
  
  const millions = Math.floor(intPart / 1000000);
  const thousands = Math.floor((intPart % 1000000) / 1000);
  const remainder = intPart % 1000;
  
  if (millions > 0) {
    result += millions === 1 ? 'un million' : convertHundreds(millions) + ' millions';
    if (thousands > 0 || remainder > 0) result += ' ';
  }
  
  if (thousands > 0) {
    result += thousands === 1 ? 'mille' : convertHundreds(thousands) + ' mille';
    if (remainder > 0) result += ' ';
  }
  
  if (remainder > 0) {
    result += convertHundreds(remainder);
  }
  
  if (intPart > 0) {
    result += ' ' + (intPart === 1 ? 'dirham' : 'dirhams');
  }
  
  if (decPart > 0) {
    result += ' et ' + convertHundreds(decPart) + ' centime' + (decPart > 1 ? 's' : '');
  }
  
  return result.trim();
};

// V2.59 - Couleurs par instance
const PRIMARY_COLOR = '#3b82f6'; // blue-500

const DEFAULT_LAYOUT: PrintLayout = {
  docInfo: { x: 120, y: 10, width: 80, height: 45, visible: true },
  clientInfo: { x: 10, y: 60, width: 90, height: 40, visible: true },
  tableStart: { x: 10, y: 120, width: 190, height: 100, visible: true },
  totals: { x: 130, y: 250, width: 70, height: 40, visible: true },
  footer: { x: 10, y: 275, width: 190, height: 20, visible: true },
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
  
  // V2.55: Options d'impression pour BL
  const isBL = documentType === 'BL';
  const [hidePrices, setHidePrices] = useState(isBL);
  const [doubleA5, setDoubleA5] = useState(isBL);
  
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
      case 'AV': return 'Avoir Client';
      default: return 'Document';
    }
  };

  const getNumero = () => documentData.numero || documentData.numeroFacture || '';
  const getTiers = () => documentData.client || documentData.fournisseur || {};
  const lignes = documentData.lignes || [];

  // Generate HTML for print window
  const generatePrintHTML = () => {
    const docDate = formatDate(documentData.dateBL || documentData.dateFacture || documentData.dateReglement || documentData.dateAvoir);
    const isBLDoc = documentType === 'BL';
    const showPrices = !hidePrices;

    // V2.59: Mode A5 double - Valeurs médianes entre V2.57 et V2.58
    if (isBLDoc && doubleA5) {
      // Scale médian pour la largeur (entre 0.707 et 1.0)
      const A5_SCALE = 0.85;

      // Convert mm to px pour A5 (avec échelle médiane)
      const mmToPx5 = (mm: number) => Math.round(mm * 3.779527559 * A5_SCALE);
      const mmToPx5Str = (mm: number) => `${mmToPx5(mm)}px`;

      // Décalage vertical médian (entre 0 et 25mm)
      const Y_OFFSET = 12;

      // Adapter le layout pour A5
      const a5Layout = {
        docInfo: {
          ...layout.docInfo,
          x: layout.docInfo.x * A5_SCALE,
          y: (layout.docInfo.y + Y_OFFSET) * A5_SCALE,
          width: layout.docInfo.width * A5_SCALE,
        },
        clientInfo: {
          ...layout.clientInfo,
          x: layout.clientInfo.x * A5_SCALE,
          y: (layout.clientInfo.y + Y_OFFSET) * A5_SCALE,
          width: layout.clientInfo.width * A5_SCALE,
        },
        tableStart: {
          ...layout.tableStart,
          x: layout.tableStart.x * A5_SCALE,
          y: (layout.tableStart.y + Y_OFFSET) * A5_SCALE,
          width: layout.tableStart.width * A5_SCALE,
        },
        totals: {
          ...layout.totals,
          x: layout.totals.x * A5_SCALE,
          y: (Math.max(layout.totals.y, layout.tableStart.y + 130) + Y_OFFSET) * A5_SCALE,
          width: layout.totals.width * A5_SCALE,
        },
        footer: {
          ...layout.footer,
          x: layout.footer.x * A5_SCALE,
          y: layout.footer.y * A5_SCALE,
          width: layout.footer.width * A5_SCALE,
        },
      };

      // Générer le contenu d'un BL A5 avec layout personnalisé
      const generateA5BLContent = () => `
        ${letterheadImage ? `<img src="${letterheadImage}" class="letterhead-img" alt="" />` : ''}
        <div class="page">
          ${a5Layout.docInfo.visible ? `
            <div class="doc-info">
              <h2>${getTitle()}</h2>
              <p class="numero">${getNumero()}</p>
              <p>Date: ${docDate}</p>
              ${documentData.bonCommande ? `<p>BC: ${documentData.bonCommande}</p>` : ''}
            </div>
          ` : ''}

          ${a5Layout.clientInfo.visible ? `
            <div class="client-info">
              <h3>CLIENT</h3>
              <p class="name">${getTiers()?.raisonSociale || ''}</p>
              ${getTiers()?.adresse ? `<p>${getTiers().adresse}</p>` : ''}
              ${getTiers()?.ville ? `<p>${getTiers().ville}</p>` : ''}
            </div>
          ` : ''}

          ${a5Layout.tableStart.visible && lignes.length > 0 ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th style="width: ${showPrices ? '45%' : '60%'};">Désignation</th>
                    <th style="width: 10%; text-align: right;">Qté</th>
                    ${showPrices ? `
                      <th style="width: 15%; text-align: right;">P.U. HT</th>
                      <th style="width: 20%; text-align: right;">Total HT</th>
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
                        <td style="text-align: right;">${formatCurrency(l.totalHT)}</td>
                      ` : ''}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${a5Layout.totals.visible && showPrices && documentData.totalHT !== undefined ? `
            <div class="totals-section">
              <p>Total HT: <strong>${formatCurrency(documentData.totalHT)}</strong></p>
            </div>
          ` : ''}

          ${a5Layout.footer.visible ? `
            <div class="footer-section">
              <p>${entreprise?.nomEntreprise || ''} ${entreprise?.villeEntreprise ? '- ' + entreprise.villeEntreprise : ''}</p>
              ${entreprise?.ice ? `<p>ICE: ${entreprise.ice}</p>` : ''}
            </div>
          ` : ''}
        </div>
      `;

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${getTitle()} - ${getNumero()}</title>
          <style>
            @page { size: A4 landscape; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              font-size: 8pt;
              width: 297mm;
              height: 210mm;
            }
            .page-container {
              width: 297mm;
              height: 210mm;
              display: flex;
              flex-direction: row;
            }
            .bl-half {
              width: 148.5mm;
              height: 210mm;
              position: relative;
              border-right: 1px dashed #ccc;
              overflow: hidden;
            }
            .bl-half:last-child {
              border-right: none;
            }
            .letterhead-img {
              position: absolute;
              top: 0;
              left: 0;
              width: 148.5mm;
              height: 210mm;
              z-index: 0;
              object-fit: contain;
            }
            .page {
              position: relative;
              width: 148.5mm;
              height: 210mm;
              z-index: 1;
            }
            .doc-info {
              position: absolute;
              left: ${mmToPx5Str(a5Layout.docInfo.x)};
              top: ${mmToPx5Str(a5Layout.docInfo.y)};
              width: ${mmToPx5Str(a5Layout.docInfo.width)};
              text-align: right;
            }
            .doc-info h2 { font-size: 10pt; margin-bottom: 2px; }
            .doc-info .numero { font-size: 9pt; font-weight: bold; color: ${PRIMARY_COLOR}; }
            .doc-info p { font-size: 7pt; margin: 1px 0; }
            .client-info {
              position: absolute;
              left: ${mmToPx5Str(a5Layout.clientInfo.x)};
              top: ${mmToPx5Str(a5Layout.clientInfo.y)};
              width: ${mmToPx5Str(a5Layout.clientInfo.width)};
            }
            .client-info h3 { font-size: 7pt; color: #666; margin-bottom: 1px; }
            .client-info p { font-size: 8pt; margin: 1px 0; }
            .client-info .name { font-weight: bold; font-size: 10pt; }
            .table-container {
              position: absolute;
              left: ${mmToPx5Str(a5Layout.tableStart.x)};
              top: ${mmToPx5Str(a5Layout.tableStart.y)};
              width: ${mmToPx5Str(a5Layout.tableStart.width)};
            }
            table { width: 100%; border-collapse: collapse; }
            th { background: ${PRIMARY_COLOR}; color: white; padding: 3px 4px; text-align: left; font-size: 7pt; }
            th:last-child, td:last-child { text-align: right; }
            td { padding: 2px 4px; border-bottom: 1px solid #ddd; font-size: 7pt; }
            .totals-section {
              position: absolute;
              left: ${mmToPx5Str(a5Layout.totals.x)};
              top: ${mmToPx5Str(a5Layout.totals.y)};
              width: ${mmToPx5Str(a5Layout.totals.width)};
              text-align: right;
            }
            .totals-section p { font-size: 8pt; margin: 2px 0; }
            .footer-section {
              position: absolute;
              left: ${mmToPx5Str(a5Layout.footer.x)};
              top: ${mmToPx5Str(a5Layout.footer.y)};
              width: ${mmToPx5Str(a5Layout.footer.width)};
              font-size: 6pt;
              color: #666;
            }
            .footer-section p { margin: 1px 0; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .bl-half { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="bl-half">
              ${generateA5BLContent()}
            </div>
            <div class="bl-half">
              ${generateA5BLContent()}
            </div>
          </div>
        </body>
        </html>
      `;
    }
    
    if (useCustomLayout && printLayout) {
      // Custom Layout Mode - A4 avec en-tête personnalisé
      const adjustedLayout = {
        ...layout,
        totals: {
          ...layout.totals,
          y: Math.max(layout.totals.y, layout.tableStart.y + 130)
        }
      };
      
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
              min-height: 297mm;
              z-index: 1;
            }
            .doc-info {
              position: absolute;
              left: ${mmToPxStr(adjustedLayout.docInfo.x)};
              top: ${mmToPxStr(adjustedLayout.docInfo.y)};
              width: ${mmToPxStr(adjustedLayout.docInfo.width)};
              text-align: right;
            }
            .doc-info h2 { font-size: 14pt; margin-bottom: 5px; }
            .doc-info .numero { font-size: 12pt; font-weight: bold; color: ${PRIMARY_COLOR}; }
            .doc-info p { font-size: 10pt; margin: 2px 0; }
            .client-info {
              position: absolute;
              left: ${mmToPxStr(adjustedLayout.clientInfo.x)};
              top: ${mmToPxStr(adjustedLayout.clientInfo.y)};
              width: ${mmToPxStr(adjustedLayout.clientInfo.width)};
            }
            .client-info h3 { font-size: 9pt; color: #666; margin-bottom: 3px; }
            .client-info p { font-size: 11pt; margin: 2px 0; }
            .client-info .name { font-weight: bold; font-size: 13pt; }
            .table-container {
              position: absolute;
              left: ${mmToPxStr(adjustedLayout.tableStart.x)};
              top: ${mmToPxStr(adjustedLayout.tableStart.y)};
              width: ${mmToPxStr(adjustedLayout.tableStart.width)};
            }
            table { width: 100%; border-collapse: collapse; }
            th { background: ${PRIMARY_COLOR}; color: white; padding: 8px 6px; text-align: left; font-size: 9pt; }
            th:last-child, td:last-child { text-align: right; }
            td { padding: 6px; border-bottom: 1px solid #ddd; font-size: 9pt; }
            td:first-child { max-width: 80mm; }
            .totals-section {
              position: absolute;
              left: ${mmToPxStr(adjustedLayout.totals.x)};
              top: ${mmToPxStr(adjustedLayout.totals.y)};
              width: ${mmToPxStr(adjustedLayout.totals.width)};
              text-align: right;
            }
            .totals-section p { font-size: 10pt; margin: 3px 0; }
            .totals-section .total-ttc { font-size: 12pt; font-weight: bold; color: ${PRIMARY_COLOR}; }
            .footer-section {
              position: absolute;
              left: ${mmToPxStr(adjustedLayout.footer.x)};
              top: ${mmToPxStr(adjustedLayout.footer.y)};
              width: ${mmToPxStr(adjustedLayout.footer.width)};
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
            ${adjustedLayout.docInfo.visible ? `
              <div class="doc-info">
                <h2>${getTitle()}</h2>
                <p class="numero">${getNumero()}</p>
                <p>Date: ${docDate}</p>
                ${documentData.bonCommande ? `<p>BC: ${documentData.bonCommande}</p>` : ''}
                ${documentData.numeroBL ? `<p>BL: ${documentData.numeroBL}</p>` : ''}
                ${documentData.dateEcheance ? `<p>Échéance: ${formatDate(documentData.dateEcheance)}</p>` : ''}
              </div>
            ` : ''}
            
            ${adjustedLayout.clientInfo.visible ? `
              <div class="client-info">
                <h3>${documentType === 'FF' || documentType === 'RF' ? 'FOURNISSEUR' : 'CLIENT'}</h3>
                <p class="name">${getTiers()?.raisonSociale || ''}</p>
                ${getTiers()?.adresse ? `<p>${getTiers().adresse}</p>` : ''}
                ${getTiers()?.ville ? `<p>${getTiers().ville}</p>` : ''}
                ${getTiers()?.ice ? `<p>ICE: ${getTiers().ice}</p>` : ''}
              </div>
            ` : ''}
            
            ${adjustedLayout.tableStart.visible && lignes.length > 0 ? `
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style="width: ${showPrices ? '45%' : '60%'};">Désignation</th>
                      <th style="width: 10%; text-align: right;">Qté</th>
                      ${showPrices ? `
                        <th style="width: 15%; text-align: right;">P.U. HT</th>
                        ${documentType !== 'BL' ? '<th style="width: 10%; text-align: right;">TVA</th>' : ''}
                        <th style="width: 20%; text-align: right;">Total HT</th>
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
                ${documentData.infoLibre ? `<p style="margin-top: 10px; font-size: 9pt;"><strong>Info:</strong> ${documentData.infoLibre}</p>` : ''}
                ${documentData.notes ? `<p style="margin-top: 5px; font-size: 9pt;"><strong>Notes:</strong> ${documentData.notes}</p>` : ''}
              </div>
            ` : ''}
            
            ${adjustedLayout.totals.visible && showPrices ? `
              <div class="totals-section">
                ${documentData.totalHT !== undefined ? `<p>Total HT: <strong>${formatCurrency(documentData.totalHT)}</strong></p>` : ''}
                ${documentData.totalTVA !== undefined && documentData.totalTVA > 0 ? `<p>TVA: <strong>${formatCurrency(documentData.totalTVA)}</strong></p>` : ''}
                ${documentData.montantTVA !== undefined && documentData.montantTVA > 0 ? `<p>TVA: <strong>${formatCurrency(documentData.montantTVA)}</strong></p>` : ''}
                ${documentData.totalTTC !== undefined ? `<p class="total-ttc">Total TTC: ${formatCurrency(documentData.totalTTC)}</p>` : ''}
                ${documentData.montantTTC !== undefined ? `<p class="total-ttc">Total TTC: ${formatCurrency(documentData.montantTTC)}</p>` : ''}
                ${documentData.montant !== undefined ? `<p class="total-ttc">Montant: ${formatCurrency(documentData.montant)}</p>` : ''}
              </div>
            ` : ''}
            
            ${adjustedLayout.footer.visible ? `
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
      // Standard Layout Mode - A4 sans layout personnalisé
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
            .client-box h3 { font-size: 9pt; color: #666; margin-bottom: 5px; }
            .client-box p { font-size: 11pt; margin: 2px 0; }
            .client-box .name { font-weight: bold; font-size: 13pt; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: ${PRIMARY_COLOR}; color: white; padding: 10px 6px; text-align: left; font-size: 9pt; }
            th:last-child, td:last-child { text-align: right; }
            td { padding: 8px 6px; border-bottom: 1px solid #ddd; font-size: 9pt; }
            tr:nth-child(even) { background: #f8f9fa; }
            .totals { text-align: right; margin-top: 20px; margin-bottom: 30px; }
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
              ${documentData.bonCommande ? `<p>BC: ${documentData.bonCommande}</p>` : ''}
              ${documentData.numeroBL ? `<p>BL: ${documentData.numeroBL}</p>` : ''}
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
                  <th style="width: ${showPrices ? '45%' : '70%'};">Désignation</th>
                  <th style="width: 10%; text-align: right;">Qté</th>
                  ${showPrices ? `
                    <th style="width: 15%; text-align: right;">P.U. HT</th>
                    ${documentType !== 'BL' ? '<th style="width: 10%; text-align: right;">TVA</th>' : ''}
                    <th style="width: 20%; text-align: right;">Total HT</th>
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
            ${documentData.infoLibre ? `<p style="margin-top: 10px; font-size: 9pt;"><strong>Info:</strong> ${documentData.infoLibre}</p>` : ''}
            ${documentData.notes ? `<p style="margin-top: 5px; font-size: 9pt;"><strong>Notes:</strong> ${documentData.notes}</p>` : ''}
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

  const showPrices = !hidePrices;

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
          {/* V2.55: Options d'impression pour BL */}
          {isBL && (
            <>
              {/* Format A5 double / A4 */}
              <Button
                variant={doubleA5 ? "default" : "outline"}
                onClick={() => setDoubleA5(!doubleA5)}
                className={doubleA5 ? "bg-green-600 hover:bg-green-700" : ""}
              >
                <Copy className="w-4 h-4 mr-2" />
                {doubleA5 ? 'A5 Double (2x)' : 'Format A4'}
              </Button>
              
              {/* Avec/Sans prix */}
              <Button
                variant={hidePrices ? "default" : "outline"}
                onClick={() => setHidePrices(!hidePrices)}
                className={hidePrices ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {hidePrices ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {hidePrices ? 'Sans prix' : 'Avec prix'}
              </Button>
            </>
          )}
          
          {printLayout && !isBL && (
            <Button
              variant={useCustomLayout ? "default" : "outline"}
              onClick={() => setUseCustomLayout(!useCustomLayout)}
              className={useCustomLayout ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <Settings className="w-4 h-4 mr-2" />
              {useCustomLayout ? 'Mise en page personnalisée' : 'Mise en page standard'}
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
            width: doubleA5 ? '297mm' : '210mm',
            height: doubleA5 ? '210mm' : '297mm',
            transform: 'scale(0.5)',
            transformOrigin: 'top left',
            marginBottom: doubleA5 ? '-105mm' : '-148.5mm',
            marginRight: doubleA5 ? '-148.5mm' : '-105mm'
          }}
        >
          {/* Background image if letterhead */}
          {letterheadImage && ((useCustomLayout && !doubleA5) || (isBL && doubleA5)) && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url(${letterheadImage})`,
                backgroundSize: doubleA5 ? '148.5mm 210mm' : '210mm 297mm',
                backgroundPosition: 'top left',
                backgroundRepeat: 'no-repeat',
                opacity: 0.3
              }}
            />
          )}

          {/* V2.55: A5 Double Preview - Layout centré comme A4 */}
          {isBL && doubleA5 ? (
            <div className="flex flex-row h-full">
              {/* First A5 */}
              <div className="relative p-3 border-r border-dashed border-gray-300" style={{ width: '148.5mm' }}>
                {letterheadImage && (
                  <div className="absolute inset-0 pointer-events-none opacity-30" style={{
                    backgroundImage: `url(${letterheadImage})`,
                    backgroundSize: '148.5mm 210mm',
                    backgroundPosition: 'top left',
                    backgroundRepeat: 'no-repeat'
                  }} />
                )}
                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex justify-between border-b-2 border-green-600 pb-1 mb-2">
                    <div>
                      <h1 className="text-[10px] font-bold text-green-700">{entreprise?.nomEntreprise}</h1>
                      <p className="text-[7px] text-gray-600">{entreprise?.adresseEntreprise} {entreprise?.villeEntreprise}</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-[9px] font-bold">Bon de Livraison</h2>
                      <p className="font-bold text-green-700 text-[8px]">{getNumero()}</p>
                      <p className="text-[6px]">Date: {formatDate(documentData.dateBL)}</p>
                    </div>
                  </div>
                  
                  <div className="mb-2 p-1 bg-gray-50 rounded">
                    <span className="text-[6px] text-gray-500">CLIENT: </span>
                    <span className="font-bold text-[8px]">{getTiers()?.raisonSociale}</span>
                    {getTiers()?.adresse && <span className="text-[7px]"> - {getTiers()?.adresse}</span>}
                  </div>
                  
                  <table className="w-full border-collapse text-[6px] flex-1">
                    <thead>
                      <tr className="bg-green-600 text-white">
                        <th className="p-0.5 text-left" style={{width: showPrices ? '50%' : '70%'}}>Désignation</th>
                        <th className="p-0.5 text-right" style={{width: '15%'}}>Qté</th>
                        {showPrices && (
                          <>
                            <th className="p-0.5 text-right" style={{width: '17%'}}>P.U.</th>
                            <th className="p-0.5 text-right" style={{width: '18%'}}>Total</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {lignes.map((l: any, i: number) => (
                        <tr key={i} className="border-b">
                          <td className="p-0.5">{l.designation}</td>
                          <td className="p-0.5 text-right">{l.quantite}</td>
                          {showPrices && (
                            <>
                              <td className="p-0.5 text-right">{formatCurrency(l.prixUnitaire)}</td>
                              <td className="p-0.5 text-right">{formatCurrency(l.totalHT)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {showPrices && documentData.totalHT !== undefined && (
                    <div className="text-right text-[7px] mt-1">
                      <p>Total HT: <strong>{formatCurrency(documentData.totalHT)}</strong></p>
                    </div>
                  )}
                  
                  <div className="mt-auto pt-1 border-t border-gray-200 text-[5px] text-gray-500">
                    <p>{entreprise?.nomEntreprise} {entreprise?.ice && `- ICE: ${entreprise.ice}`}</p>
                  </div>
                </div>
              </div>
              
              {/* Second A5 */}
              <div className="relative p-3" style={{ width: '148.5mm' }}>
                {letterheadImage && (
                  <div className="absolute inset-0 pointer-events-none opacity-30" style={{
                    backgroundImage: `url(${letterheadImage})`,
                    backgroundSize: '148.5mm 210mm',
                    backgroundPosition: 'top left',
                    backgroundRepeat: 'no-repeat'
                  }} />
                )}
                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex justify-between border-b-2 border-green-600 pb-1 mb-2">
                    <div>
                      <h1 className="text-[10px] font-bold text-green-700">{entreprise?.nomEntreprise}</h1>
                      <p className="text-[7px] text-gray-600">{entreprise?.adresseEntreprise} {entreprise?.villeEntreprise}</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-[9px] font-bold">Bon de Livraison</h2>
                      <p className="font-bold text-green-700 text-[8px]">{getNumero()}</p>
                      <p className="text-[6px]">Date: {formatDate(documentData.dateBL)}</p>
                    </div>
                  </div>
                  
                  <div className="mb-2 p-1 bg-gray-50 rounded">
                    <span className="text-[6px] text-gray-500">CLIENT: </span>
                    <span className="font-bold text-[8px]">{getTiers()?.raisonSociale}</span>
                    {getTiers()?.adresse && <span className="text-[7px]"> - {getTiers()?.adresse}</span>}
                  </div>
                  
                  <table className="w-full border-collapse text-[6px] flex-1">
                    <thead>
                      <tr className="bg-green-600 text-white">
                        <th className="p-0.5 text-left" style={{width: showPrices ? '50%' : '70%'}}>Désignation</th>
                        <th className="p-0.5 text-right" style={{width: '15%'}}>Qté</th>
                        {showPrices && (
                          <>
                            <th className="p-0.5 text-right" style={{width: '17%'}}>P.U.</th>
                            <th className="p-0.5 text-right" style={{width: '18%'}}>Total</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {lignes.map((l: any, i: number) => (
                        <tr key={i} className="border-b">
                          <td className="p-0.5">{l.designation}</td>
                          <td className="p-0.5 text-right">{l.quantite}</td>
                          {showPrices && (
                            <>
                              <td className="p-0.5 text-right">{formatCurrency(l.prixUnitaire)}</td>
                              <td className="p-0.5 text-right">{formatCurrency(l.totalHT)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {showPrices && documentData.totalHT !== undefined && (
                    <div className="text-right text-[7px] mt-1">
                      <p>Total HT: <strong>{formatCurrency(documentData.totalHT)}</strong></p>
                    </div>
                  )}
                  
                  <div className="mt-auto pt-1 border-t border-gray-200 text-[5px] text-gray-500">
                    <p>{entreprise?.nomEntreprise} {entreprise?.ice && `- ICE: ${entreprise.ice}`}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : useCustomLayout && printLayout ? (
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
                </div>
              )}

              {layout.clientInfo.visible && (
                <div className="absolute" style={{
                  left: mmToPxStr(layout.clientInfo.x),
                  top: mmToPxStr(layout.clientInfo.y),
                  width: mmToPxStr(layout.clientInfo.width)
                }}>
                  <h3 className="text-xs text-gray-500 mb-1">{documentType === 'FF' || documentType === 'RF' ? 'FOURNISSEUR' : 'CLIENT'}</h3>
                  <p className="font-bold text-base">{getTiers()?.raisonSociale}</p>
                  {getTiers()?.adresse && <p className="text-sm">{getTiers()?.adresse}</p>}
                  {getTiers()?.ville && <p className="text-sm">{getTiers()?.ville}</p>}
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
                      <tr className="bg-green-600 text-white">
                        <th className="p-2 text-left text-xs" style={{width: showPrices ? '45%' : '60%'}}>Désignation</th>
                        <th className="p-2 text-right text-xs" style={{width: '10%'}}>Qté</th>
                        {showPrices && (
                          <>
                            <th className="p-2 text-right text-xs" style={{width: '15%'}}>P.U. HT</th>
                            {documentType !== 'BL' && <th className="p-2 text-right text-xs" style={{width: '10%'}}>TVA</th>}
                            <th className="p-2 text-right text-xs" style={{width: '20%'}}>Total HT</th>
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
                  top: mmToPxStr(Math.max(layout.totals.y, layout.tableStart.y + 130)),
                  width: mmToPxStr(layout.totals.width)
                }}>
                  {documentData.totalHT !== undefined && (
                    <p className="text-sm">Total HT: <strong>{formatCurrency(documentData.totalHT)}</strong></p>
                  )}
                </div>
              )}

              {layout.footer.visible && (
                <div className="absolute text-xs text-gray-500" style={{
                  left: mmToPxStr(layout.footer.x),
                  top: mmToPxStr(layout.footer.y),
                  width: mmToPxStr(layout.footer.width)
                }}>
                  <p>{entreprise?.nomEntreprise}</p>
                  {entreprise?.ice && <p>ICE: {entreprise.ice}</p>}
                </div>
              )}
            </>
          ) : (
            /* Standard Layout Preview */
            <div className="p-4">
              <div className="flex justify-between border-b-2 border-green-600 pb-4 mb-4">
                <div>
                  <h1 className="text-xl font-bold text-green-700">{entreprise?.nomEntreprise}</h1>
                  <p className="text-sm text-gray-600">{entreprise?.adresseEntreprise} {entreprise?.villeEntreprise}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-bold">{getTitle()}</h2>
                  <p className="font-bold text-green-700">{getNumero()}</p>
                  <p className="text-sm">Date: {formatDate(documentData.dateBL || documentData.dateFacture)}</p>
                </div>
              </div>
              
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <span className="text-xs text-gray-500">{documentType === 'FF' || documentType === 'RF' ? 'FOURNISSEUR' : 'CLIENT'}: </span>
                <span className="font-bold text-base">{getTiers()?.raisonSociale}</span>
                {getTiers()?.adresse && <span className="text-sm"> - {getTiers()?.adresse}</span>}
              </div>
              
              <table className="w-full border-collapse mb-4">
                <thead>
                  <tr className="bg-green-600 text-white">
                    <th className="p-2 text-left text-xs" style={{width: showPrices ? '45%' : '70%'}}>Désignation</th>
                    <th className="p-2 text-right text-xs" style={{width: '10%'}}>Qté</th>
                    {showPrices && (
                      <>
                        <th className="p-2 text-right text-xs" style={{width: '15%'}}>P.U. HT</th>
                        <th className="p-2 text-right text-xs" style={{width: '20%'}}>Total HT</th>
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
                          <td className="p-2 text-right text-sm">{formatCurrency(l.totalHT)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {showPrices && documentData.totalHT !== undefined && (
                <div className="text-right mb-4">
                  <p>Total HT: <strong>{formatCurrency(documentData.totalHT)}</strong></p>
                </div>
              )}
              
              <div className="border-t pt-3 text-xs text-gray-500">
                <p>{entreprise?.nomEntreprise} {entreprise?.villeEntreprise ? '- ' + entreprise.villeEntreprise : ''}</p>
                {entreprise?.ice && <p>ICE: {entreprise.ice}</p>}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
