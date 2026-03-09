import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const facture = await prisma.factureFournisseur.update({
      where: { id },
      data: { statut: 'VALIDEE' }
    });
    return NextResponse.json(facture);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
