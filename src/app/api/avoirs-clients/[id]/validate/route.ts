import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const avoir = await prisma.avoirClient.findUnique({
      where: { id },
    });

    if (!avoir) {
      return NextResponse.json({ error: 'Avoir non trouvé' }, { status: 404 });
    }

    if (avoir.statut === 'VALIDEE') {
      return NextResponse.json({ error: 'Avoir déjà validé' }, { status: 400 });
    }

    const updatedAvoir = await prisma.avoirClient.update({
      where: { id },
      data: { statut: 'VALIDEE' },
      include: { client: true, lignes: true, facture: true }
    });

    return NextResponse.json(updatedAvoir);
  } catch (error: any) {
    console.error('Validate error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
