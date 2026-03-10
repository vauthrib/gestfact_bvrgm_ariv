'use client';

import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';

interface PrintDocumentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: 'BL' | 'FC' | 'FF' | 'RC' | 'RF';
  documentData: any;
  entreprise: any;
  code: string;
}

const formatCurrency = (a: number) => `${a.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH`;

const formatDate = (d: string | Date) => {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR');
};

export function PrintDocument({ open, onOpenChange, documentType, documentData, entreprise, code }: PrintDocumentProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Impression</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: Arial, sans-serif; padding: 20mm; font-size: 12pt; }
              .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
              .company { text-align: left; }
              .company h1 { font-size: 18pt; color: #1e40af; margin-bottom: 5px; }
              .company p { font-size: 10pt; color: #666; }
              .doc-info { text-align: right; }
              .doc-info h2 { font-size: 16pt; color: #333; margin-bottom: 5px; }
              .doc-info p { font-size: 10pt; }
              .parties { display: flex; justify-content: space-between; margin: 20px 0; }
              .party { width: 48%; padding: 10px; background: #f8f9fa; border-radius: 5px; }
              .party h3 { font-size: 10pt; color: #666; margin-bottom: 5px; }
              .party p { font-size: 11pt; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th { background: #1e40af; color: white; padding: 10px; text-align: left; font-size: 10pt; }
              td { padding: 8px 10px; border-bottom: 1px solid #ddd; font-size: 10pt; }
              tr:nth-child(even) { background: #f8f9fa; }
              .totals { text-align: right; margin-top: 20px; }
              .totals p { margin: 5px 0; font-size: 11pt; }
              .totals .total-ttc { font-size: 14pt; font-weight: bold; color: #1e40af; }
              .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 9pt; color: #666; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            ${printRef.current.innerHTML}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Aperçu - {getTitle()}</DialogTitle>
            <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-mono font-bold">{code}-PRT</span>
          </div>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button onClick={handlePrint} className="bg-pink-600 hover:bg-pink-700">
            <Printer className="w-4 h-4 mr-2" /> Imprimer
          </Button>
        </div>

        {/* Preview */}
        <div ref={printRef} className="border rounded-lg p-6 bg-white">
          {/* Header */}
          <div className="flex justify-between border-b-2 border-pink-700 pb-4 mb-6">
            <div>
              <h1 className="text-xl font-bold text-pink-700">{entreprise?.nomEntreprise || 'Votre Entreprise'}</h1>
              <p className="text-sm text-gray-600">
                {entreprise?.adresseEntreprise}<br />
                {entreprise?.villeEntreprise}<br />
                Tél: {entreprise?.telephoneEntreprise || '-'}<br />
                Email: {entreprise?.emailEntreprise || '-'}
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold">{getTitle()}</h2>
              <p className="font-bold text-pink-700">{getNumero()}</p>
              <p className="text-sm">Date: {formatDate(documentData.dateBL || documentData.dateFacture || documentData.dateReglement)}</p>
              {documentData.dateEcheance && (
                <p className="text-sm">Échéance: {formatDate(documentData.dateEcheance)}</p>
              )}
            </div>
          </div>

          {/* Client/Fournisseur */}
          <div className="mb-6 p-4 bg-gray-50 rounded">
            <h3 className="text-xs text-gray-500 mb-1">{documentType === 'FF' || documentType === 'RF' ? 'FOURNISSEUR' : 'CLIENT'}</h3>
            <p className="font-bold">{getTiers()?.raisonSociale}</p>
            {getTiers()?.adresse && <p className="text-sm">{getTiers()?.adresse}</p>}
            {getTiers()?.ville && <p className="text-sm">{getTiers()?.ville}</p>}
            {getTiers()?.ice && <p className="text-sm">ICE: {getTiers()?.ice}</p>}
          </div>

          {/* Lines table */}
          {lignes.length > 0 && (
            <table className="w-full border-collapse mb-6">
              <thead>
                <tr className="bg-pink-700 text-white">
                  <th className="p-2 text-left text-xs">Désignation</th>
                  <th className="p-2 text-right text-xs w-20">Qté</th>
                  <th className="p-2 text-right text-xs w-24">P.U. HT</th>
                  {documentType !== 'BL' && <th className="p-2 text-right text-xs w-16">TVA</th>}
                  <th className="p-2 text-right text-xs w-28">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l: any, i: number) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 text-sm">{l.designation}</td>
                    <td className="p-2 text-right text-sm">{l.quantite}</td>
                    <td className="p-2 text-right text-sm">{formatCurrency(l.prixUnitaire)}</td>
                    {documentType !== 'BL' && <td className="p-2 text-right text-sm">{l.tauxTVA}%</td>}
                    <td className="p-2 text-right text-sm">{formatCurrency(l.totalHT)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Totals */}
          <div className="text-right space-y-1">
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
              <p className="text-lg font-bold text-pink-700">Total TTC: {formatCurrency(documentData.totalTTC)}</p>
            )}
            {documentData.montantTTC !== undefined && (
              <p className="text-lg font-bold text-pink-700">Total TTC: {formatCurrency(documentData.montantTTC)}</p>
            )}
            {documentData.montant !== undefined && (
              <p className="text-lg font-bold text-pink-700">Montant: {formatCurrency(documentData.montant)}</p>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t text-xs text-gray-500">
            <p>{entreprise?.nomEntreprise} - {entreprise?.villeEntreprise || ''}</p>
            {entreprise?.ice && <p>ICE: {entreprise.ice}</p>}
            {entreprise?.rc && <p>RC: {entreprise.rc} {entreprise?.rcLieu || ''}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
