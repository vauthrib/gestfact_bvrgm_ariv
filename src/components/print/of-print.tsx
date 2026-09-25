'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

// V3.33 - Ordre de fabrication (OF) : 2 exemplaires A5 paysage par feuille A4.

interface OfLigne {
  articleId?: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  totalHT: number;
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
  totalHT: number;
  lignes?: OfLigne[];
}

export interface OfEntreprise {
  nomEntreprise?: string;
  adresseEntreprise?: string;
  villeEntreprise?: string;
  telephoneEntreprise?: string;
  emailEntreprise?: string;
  ice?: string;
  rc?: string;
}

type Accent = 'green' | 'pink' | 'blue';

const OF_STYLE = `
.of-card { font-family: Arial, Helvetica, sans-serif; color: #111; width: 210mm; height: 148.5mm; box-sizing: border-box; padding: 6mm 8mm; position: relative; overflow: hidden; background: #fff; }
.of-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 2.5mm; }
.of-title { font-size: 15pt; font-weight: bold; letter-spacing: 1px; line-height: 1.1; }
.of-sub { font-size: 8.5pt; }
.of-grid { display: flex; gap: 5mm; font-size: 8.5pt; margin-top: 2.5mm; }
.of-grid > div { flex: 1; border: 1px solid #bbb; padding: 1.5mm 2mm; }
.of-table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-top: 2.5mm; }
.of-table th, .of-table td { border: 1px solid #999; padding: 1mm 1.8mm; text-align: left; }
.of-table th { background: #f0f0f0; font-size: 7.5pt; text-transform: uppercase; }
.of-table td.n { text-align: right; }
.of-note { font-size: 7.5pt; margin-top: 2mm; max-height: 12mm; overflow: hidden; }
.of-foot { position: absolute; left: 8mm; right: 8mm; bottom: 5mm; display: flex; justify-content: space-between; align-items: center; font-size: 8pt; border-top: 1px solid #bbb; padding-top: 1.5mm; }
.of-copies { display: flex; gap: 3mm; font-size: 7.5pt; }
.of-copies span { border: 1px solid #111; padding: 0.5mm 2mm; }
`;

const esc = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmt = (n: number) => `${(n || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateFr = (d?: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '-');

function ofCardHtml(c: OfCommande, client: string, ent: OfEntreprise, copie: string): string {
  const lignes = (c.lignes || [])
    .map(
      (l, i) =>
        `<tr><td class="n">${i + 1}</td><td>${esc(l.designation)}</td><td class="n">${l.quantite}</td><td class="n">${fmt(l.prixUnitaire)}</td><td class="n">${fmt(l.totalHT)}</td></tr>`
    )
    .join('');
  const societe = [ent?.nomEntreprise, ent?.adresseEntreprise, ent?.villeEntreprise].filter(Boolean).join(' — ');
  const mentions = [
    ent?.ice ? `ICE ${ent.ice}` : '',
    ent?.rc ? `RC ${ent.rc}` : '',
    ent?.telephoneEntreprise || '',
  ]
    .filter(Boolean)
    .join(' · ');

  return `
  <div class="of-card">
    <div class="of-head">
      <div>
        <div style="font-size: 11pt; font-weight: bold;">${esc(societe)}</div>
        <div class="of-sub">${esc(mentions)}</div>
      </div>
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
      <thead><tr><th style="width: 8mm">#</th><th>Désignation</th><th style="width: 16mm">Qté</th><th style="width: 22mm">P.U. HT</th><th style="width: 26mm">Total HT</th></tr></thead>
      <tbody>${lignes || '<tr><td colspan="5">Aucune ligne</td></tr>'}</tbody>
      <tfoot><tr><td colspan="4" style="text-align: right; font-weight: bold;">Total HT</td><td class="n" style="font-weight: bold;">${fmt(c.totalHT)}</td></tr></tfoot>
    </table>
    <div class="of-note">${esc(c.notes || c.infoLibre || '')}</div>
    <div class="of-foot">
      <span>Visa atelier : ______________________</span>
      <span>Date : ____ / ____ / ________</span>
      <span class="of-copies"><span>${esc(copie)}</span></span>
    </div>
  </div>`;
}

export function OfPrint({
  open,
  onOpenChange,
  commande,
  client,
  entreprise,
  accent = 'green',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commande: OfCommande | null;
  client: string;
  entreprise?: OfEntreprise | null;
  accent?: Accent;
}) {
  const colors = {
    green: 'bg-green-600 hover:bg-green-700',
    pink: 'bg-pink-600 hover:bg-pink-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
  }[accent];

  if (!commande) return null;

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charSet="utf-8" /><title>OF ${esc(commande.numero)}</title><style>
      @page { size: A4 portrait; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #fff; }
      ${OF_STYLE}
      .of-page { width: 210mm; }
    </style></head><body><div class="of-page">
      ${ofCardHtml(commande, client, entreprise || {}, 'EXEMPLAIRE ATELIER')}
      ${ofCardHtml(commande, client, entreprise || {}, 'EXEMPLAIRE SUIVI')}
    </div></body></html>`);
    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[calc(100vh-3rem)] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Ordre de fabrication — {commande.numero}</DialogTitle>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-mono font-bold">NCB01-OF</span>
          </div>
        </DialogHeader>
        <div className="border rounded-lg bg-gray-100 p-4 overflow-auto">
          <style>{OF_STYLE}</style>
          <div
            className="mx-auto bg-white shadow-md"
            style={{ width: '210mm' }}
            dangerouslySetInnerHTML={{ __html: ofCardHtml(commande, client, entreprise || {}, 'EXEMPLAIRE ATELIER') }}
          />
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Aperçu A5 paysage — l&apos;impression place 2 exemplaires (Atelier + Suivi) sur une feuille A4.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button className={colors} onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />Imprimer 2× A5 (A4)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
