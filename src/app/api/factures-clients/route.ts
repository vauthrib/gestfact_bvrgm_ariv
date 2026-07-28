import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Fonction pour générer un numéro unique
async function genererNumeroUnique(): Promise<string> {
  const parametres = await prisma.parametres.findFirst();
  const prefixe = parametres?.prefixeFacture || 'FC';
  const numeroDepart = parametres?.numeroFactureDepart || 1;

  // Compter les factures existantes
  const count = await prisma.factureClient.count();
  let prochainNumero = numeroDepart + count;
  let numero = `${prefixe}${prochainNumero.toString().padStart(5, '0')}`;

  // Vérifier si le numéro existe déjà et incrémenter si nécessaire
  let existe = await prisma.factureClient.findUnique({ where: { numero } });
  while (existe) {
    prochainNumero++;
    numero = `${prefixe}${prochainNumero.toString().padStart(5, '0')}`;
    existe = await prisma.factureClient.findUnique({ where: { numero } });
  }

  return numero;
}

export async function GET() {
  try {
    const factures = await prisma.factureClient.findMany({
      include: { client: true, lignes: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(factures);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { lignes, numero: _numeroFourni, ...factureData } = data;

    // Générer un numéro unique (ignorer le numéro fourni par le frontend)
    const numero = await genererNumeroUnique();

    const facture = await prisma.factureClient.create({
      data: {
        numero,
        dateFacture: new Date(factureData.dateFacture),
        dateEcheance: new Date(factureData.dateEcheance || factureData.dateFacture),
        clientId: factureData.clientId,
        bonCommande: factureData.bonCommande || null,
        numeroBL: factureData.numeroBL || null,
        infoLibre: factureData.infoLibre || null,
        notes: factureData.notes || null,
        totalHT: factureData.totalHT || 0,
        totalTVA: factureData.totalTVA || 0,
        totalTTC: factureData.totalTTC || 0,
        lignes: { create: lignes }
      },
      include: { lignes: true, client: true }
    });
    return NextResponse.json(facture);
  } catch (error: any) {
    console.error('Erreur création facture:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, lignes, ...factureData } = data;

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    // Supprimer les anciennes lignes et créer les nouvelles
    await prisma.ligneFactureClient.deleteMany({ where: { factureId: id } });

    // Si changement de client, vérifier que le nouveau client existe
    if (factureData.clientId) {
      const newClient = await prisma.tiers.findUnique({ where: { id: factureData.clientId } });
      if (!newClient) {
        return NextResponse.json({ error: 'Client introuvable' }, { status: 400 });
      }
    }

    const facture = await prisma.factureClient.update({
      where: { id },
      data: {
        clientId: factureData.clientId || undefined,
        dateFacture: factureData.dateFacture ? new Date(factureData.dateFacture) : undefined,
        dateEcheance: factureData.dateEcheance ? new Date(factureData.dateEcheance) : undefined,
        bonCommande: factureData.bonCommande || null,
        numeroBL: factureData.numeroBL || null,
        infoLibre: factureData.infoLibre || null,
        notes: factureData.notes || null,
        totalHT: factureData.totalHT,
        totalTVA: factureData.totalTVA,
        totalTTC: factureData.totalTTC,
        lignes: { create: lignes || [] }
      },
      include: { lignes: true, client: true }
    });
    return NextResponse.json(facture);
  } catch (error: any) {
    console.error('Erreur modification facture:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    await prisma.ligneFactureClient.deleteMany({ where: { factureId: id } });
    await prisma.factureClient.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
