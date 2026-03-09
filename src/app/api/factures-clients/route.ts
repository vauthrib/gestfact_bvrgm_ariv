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
    const facture = await prisma.factureClient.create({
      data: {
        ...factureData,
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
