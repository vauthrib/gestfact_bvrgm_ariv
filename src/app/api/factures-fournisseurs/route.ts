import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const factures = await prisma.factureFournisseur.findMany({
      include: { fournisseur: true },
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
    const facture = await prisma.factureFournisseur.create({
      data: {
        ...data,
        dateFacture: new Date(data.dateFacture),
        dateEcheance: new Date(data.dateEcheance)
      },
      include: { fournisseur: true }
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
    await prisma.reglementFournisseur.deleteMany({ where: { factureId: id } });
    await prisma.factureFournisseur.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
