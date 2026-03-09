import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let data: any[] = [];
    let headers: string[] = [];
    let filename = 'export.csv';

    switch (type) {
      case 'tiers':
        data = await prisma.tiers.findMany();
        headers = ['code', 'type', 'raisonSociale', 'ville', 'telephone', 'email', 'ice', 'rc'];
        filename = 'tiers.csv';
        break;
      case 'articles':
        data = await prisma.article.findMany();
        headers = ['code', 'designation', 'prixUnitaire', 'unite', 'tauxTVA', 'actif'];
        filename = 'articles.csv';
        break;
      case 'factures-clients':
        data = await prisma.factureClient.findMany({ include: { client: true } });
        headers = ['numero', 'dateFacture', 'client', 'totalHT', 'totalTVA', 'totalTTC', 'statut'];
        filename = 'factures_clients.csv';
        break;
      case 'reglements-clients':
        data = await prisma.reglementClient.findMany({ include: { facture: { include: { client: true } } } });
        headers = ['numero', 'dateReglement', 'client', 'facture', 'montant', 'modePaiement'];
        filename = 'reglements_clients.csv';
        break;
      case 'factures-fournisseurs':
        data = await prisma.factureFournisseur.findMany({ include: { fournisseur: true } });
        headers = ['numeroFacture', 'dateFacture', 'fournisseur', 'montantHT', 'montantTVA', 'montantTTC', 'statut'];
        filename = 'factures_fournisseurs.csv';
        break;
      case 'reglements-fournisseurs':
        data = await prisma.reglementFournisseur.findMany({ include: { facture: { include: { fournisseur: true } } } });
        headers = ['dateReglement', 'fournisseur', 'facture', 'montant', 'modePaiement'];
        filename = 'reglements_fournisseurs.csv';
        break;
      case 'bons-livraison':
        data = await prisma.bonLivraison.findMany({ include: { client: true } });
        headers = ['numero', 'dateBL', 'client', 'totalHT', 'statut'];
        filename = 'bons_livraison.csv';
        break;
      default:
        return NextResponse.json({ error: 'Type non supporté' }, { status: 400 });
    }

    const csvRows = [headers.join(';')];
    for (const row of data) {
      const values = headers.map(h => {
        let val: any = row;
        for (const part of h.split('.')) {
          val = val?.[part];
        }
        if (val === null || val === undefined) return '';
        if (typeof val === 'object' && 'raisonSociale' in val) return val.raisonSociale;
        if (typeof val === 'object' && 'numero' in val) return val.numero;
        if (typeof val === 'object' && 'numeroFacture' in val) return val.numeroFacture;
        return String(val).replace(/;/g, ',');
      });
      csvRows.push(values.join(';'));
    }

    const csv = csvRows.join('\n');
    const bom = '\uFEFF';

    return new NextResponse(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
