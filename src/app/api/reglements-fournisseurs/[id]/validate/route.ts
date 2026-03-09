import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const reglement = await prisma.reglementFournisseur.update({
      where: { id },
      data: { statut: 'VALIDE' },
      include: { facture: { include: { fournisseur: true } } }
    });
    
    return NextResponse.json(reglement);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
