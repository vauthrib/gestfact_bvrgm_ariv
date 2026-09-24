'use client';

// V3.25 - Visualisation d'une facture (NFC01-VISU) réutilisable partout :
// NBL01 (colonne Facturé), NAC01 (facture d'origine), NRC01 (facture réglée)...
// Affiche la même vue que la page Factures Clients, avec impression possible.

import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { PrintDocument } from '@/components/print/print-document';
import { montantEnLettres } from '@/lib/number-to-words';

const parseNumber = (v: string | number) => { if (!v) return 0; if (typeof v === 'number') return v; return parseFloat(v.replace(',', '.').replace(/\s/g, '')) || 0; };

interface FactureVisu {
  id: string; numero: string; dateFacture: string; dateEcheance?: string | null;
  statut: string; bonCommande?: string | null; numeroBL?: string | null;
  infoLibre?: string | null; notes?: string | null;
  totalHT: number; totalTVA?: number; totalTTC: number;
  client?: { raisonSociale: string } | null;
  lignes?: { id?: string; designation: string; quantite: number; prixUnitaire: any; tauxTVA?: number; totalHT?: number }[];
}

interface Entreprise {
  nomEntreprise: string; adresseEntreprise?: string; villeEntreprise?: string;
  telephoneEntreprise?: string; emailEntreprise?: string; ice?: string; rc?: string; rcLieu?: string;
  letterheadImage?: string | null; printLayout?: string | null;
}

export function FactureViewDialog({ factureId, onOpenChange, accent = 'blue' }: {
  factureId: string | null;
  onOpenChange: (open: boolean) => void;
  accent?: 'green' | 'pink' | 'blue';
}) {
  const [facture, setFacture] = useState<FactureVisu | null>(null);
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const badge = accent === 'pink'
    ? { text: 'text-pink-700', bg100: 'bg-pink-100 text-pink-700' }
    : accent === 'blue'
      ? { text: 'text-blue-700', bg100: 'bg-blue-100 text-blue-700' }
      : { text: 'text-green-700', bg100: 'bg-green-100 text-green-700' };

  useEffect(() => {
    if (!factureId) { setFacture(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const [resF, resP] = await Promise.all([fetch('/api/factures-clients'), fetch('/api/parametres')]);
        const all = await resF.json();
        const full = Array.isArray(all) ? all.find((f: any) => f.id === factureId) : null;
        if (!cancelled) {
          setFacture(full || null);
          const p = await resP.json().catch(() => null);
          setEntreprise(p && !p.error ? p : null);
        }
      } catch {
        if (!cancelled) setFacture(null);
      }
    })();
    return () => { cancelled = true; };
  }, [factureId]);

  if (!factureId) return null;

  const accentText = { green: 'text-green-700', pink: 'text-pink-700', blue: 'text-blue-700' }[accent];

  return (
    <>
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[calc(100vh-4rem)] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className={accentText}>Facture {facture?.numero || '...'}</DialogTitle>
              <span className={`${badge.bg100} px-3 py-1 rounded-full text-sm font-mono font-bold`}>NFC01-VISU</span>
            </div>
          </DialogHeader>
          {facture && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div><Label className="text-muted-foreground">N° Facture</Label><div className={`font-bold ${accentText}`}>{facture.numero}</div></div>
                <div><Label className="text-muted-foreground">Date</Label><div>{new Date(facture.dateFacture).toLocaleDateString('fr-FR')}</div></div>
                <div><Label className="text-muted-foreground">Échéance</Label><div>{facture.dateEcheance ? new Date(facture.dateEcheance).toLocaleDateString('fr-FR') : '-'}</div></div>
                <div><Label className="text-muted-foreground">Statut</Label><div><span className={`px-2 py-1 rounded text-xs ${facture.statut === 'VALIDEE' ? `${badge.bg100}` : 'bg-yellow-100 text-yellow-800'}`}>{facture.statut === 'VALIDEE' ? 'Validée' : 'Brouillon'}</span></div></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-muted-foreground">Client</Label><div>{facture.client?.raisonSociale}</div></div>
                <div><Label className="text-muted-foreground">Bon de commande</Label><div>{facture.bonCommande || '-'}</div></div>
                <div><Label className="text-muted-foreground">N° BL</Label><div>{facture.numeroBL || '-'}</div></div>
              </div>
              <div className="border rounded-lg p-4">
                <Label className="mb-2 block">Lignes</Label>
                <Table>
                  <TableHeader><TableRow><TableHead>Désignation</TableHead><TableHead>Qté</TableHead><TableHead>P.U.</TableHead><TableHead>TVA%</TableHead><TableHead>Total HT</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(facture.lignes || []).map((l, idx) => (
                      <TableRow key={l.id || idx}>
                        <TableCell className="whitespace-pre-wrap">{l.designation}</TableCell>
                        <TableCell>{l.quantite}</TableCell>
                        <TableCell>{Number(parseNumber(l.prixUnitaire)).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</TableCell>
                        <TableCell>{l.tauxTVA ?? 0}%</TableCell>
                        <TableCell>{Number(l.totalHT ?? parseNumber(l.prixUnitaire) * Number(l.quantite || 0)).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end gap-8 mt-2 font-bold">
                  <span>HT: {Number(facture.totalHT).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</span>
                  <span>TVA: {Number(facture.totalTVA || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</span>
                  <span>TTC: {Number(facture.totalTTC).toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</span>
                </div>
                {/* V3.31 - Montant total TTC en lettres */}
                <div className="text-right text-xs italic text-gray-600 mt-1">
                  Montant total TTC dû est de : <strong className="not-italic">{montantEnLettres(facture.totalTTC)}</strong>
                </div>
              </div>
              {(facture.infoLibre || facture.notes) && (
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Info libre</Label><div className="whitespace-pre-wrap text-sm border rounded p-2 bg-gray-50">{facture.infoLibre || '-'}</div></div>
                  <div><Label>Notes</Label><div className="whitespace-pre-wrap text-sm border rounded p-2 bg-gray-50">{facture.notes || '-'}</div></div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { if (facture) setPrintOpen(true); }} disabled={!facture}><Printer className="h-4 w-4 mr-1" />Imprimer</Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {facture && (
        <PrintDocument
          open={printOpen}
          onOpenChange={setPrintOpen}
          documentType="FC"
          documentData={facture}
          entreprise={entreprise}
          code="NFC01"
          printLayout={entreprise?.printLayout ? (() => { try { return JSON.parse(entreprise.printLayout as string); } catch { return null; } })() : null}
          letterheadImage={entreprise?.letterheadImage ?? null}
        />
      )}
    </>
  );
}
