import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const { lignes, ...factureData } = data;

    // Récupérer les paramètres pour la numérotation
    const parametres = await prisma.parametres.findFirst();
    const prefixe = parametres?.prefixeFacture || 'FC';
    const numeroDepart = parametres?.numeroFactureDepart || 1;

    // Compter les factures existantes pour obtenir le prochain numéro
    const count = await prisma.factureClient.count();
    const prochainNumero = numeroDepart + count;
    const numero = `${prefixe}${prochainNumero.toString().padStart(5, '0')}`;

    const facture = await prisma.factureClient.create({
      data: {
        ...factureData,
        numero,
        dateFacture: new Date(factureData.dateFacture),
        dateEcheance: new Date(factureData.dateEcheance),
        lignes: { create: lignes }
      },
      include: { lignes: true, client: true }
    });
    return NextResponse.json(facture);
  } catch (error: any) {
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
