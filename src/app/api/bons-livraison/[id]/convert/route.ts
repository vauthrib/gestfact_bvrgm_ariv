import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Get the BL with all details
    const bl = await prisma.bonLivraison.findUnique({
      where: { id },
      include: { client: true, lignes: true }
    });

    if (!bl) {
      return NextResponse.json({ error: 'Bon de livraison non trouvé' }, { status: 404 });
    }

    if (bl.statut !== 'VALIDEE') {
      return NextResponse.json({ error: 'Le BL doit être validé avant d\'être converti' }, { status: 400 });
    }

    // Check if already converted
    const existingFacture = await prisma.factureClient.findFirst({
      where: { numeroBL: bl.numero }
    });

    if (existingFacture) {
      return NextResponse.json({ error: 'Ce BL a déjà été converti en facture', facture: existingFacture }, { status: 400 });
    }

    // Get parameters for prefix and starting number
    const parametres = await prisma.parametres.findFirst();
    const prefixe = parametres?.prefixeFacture || 'FC';
    const numeroDepart = parametres?.numeroFactureDepart || 1;

    // Count existing factures to calculate next number
    const facturesCount = await prisma.factureClient.count();
    const nextNum = numeroDepart + facturesCount;
    const numeroFacture = `${prefixe}${nextNum.toString().padStart(5, '0')}`;

    // Calculate totals with TVA
    let totalHT = 0;
    let totalTVA = 0;
    const lignesFacture = bl.lignes.map(l => {
      const ligneHT = l.totalHT;
      const ligneTVA = ligneHT * 0.20; // Default 20% TVA
      totalHT += ligneHT;
      totalTVA += ligneTVA;
      return {
        designation: l.designation,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        tauxTVA: 20,
        totalHT: ligneHT,
        articleId: l.articleId
      };
    });

    // Create the facture
    const facture = await prisma.factureClient.create({
      data: {
        numero: numeroFacture,
        dateFacture: new Date(),
        dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        clientId: bl.clientId,
        numeroBL: bl.numero,
        totalHT,
        totalTVA,
        totalTTC: totalHT + totalTVA,
        statut: 'BROUILLON',
        notes: `Créé depuis ${bl.numero}`,
        lignes: { create: lignesFacture }
      },
      include: { client: true, lignes: true }
    });

    // Update BL to mark as converted
    await prisma.bonLivraison.update({
      where: { id },
      data: { infoLibre: `Converti en facture ${numeroFacture}` }
    });

    return NextResponse.json(facture);
  } catch (error: any) {
    console.error('Convert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
