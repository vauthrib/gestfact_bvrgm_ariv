import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const reglements = await prisma.reglementFournisseur.findMany({
      include: { facture: { include: { fournisseur: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(reglements);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const reglement = await prisma.reglementFournisseur.create({
      data: {
        ...data,
        dateReglement: new Date(data.dateReglement)
      },
      include: { facture: { include: { fournisseur: true } } }
    });
    return NextResponse.json(reglement);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    await prisma.reglementFournisseur.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
