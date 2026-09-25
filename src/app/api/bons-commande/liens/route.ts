import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureCommandesTables } from '@/lib/commandes-db';

export const dynamic = 'force-dynamic';

// V3.33 - Liaisons Bon de commande <-> Bon de livraison
export async function GET(request: NextRequest) {
  try {
    await ensureCommandesTables();
    const { searchParams } = new URL(request.url);
    const commandeId = searchParams.get('commandeId');
    const blId = searchParams.get('blId');
    const liens = await prisma.commandeBonLivraison.findMany({
      where: {
        ...(commandeId ? { commandeId } : {}),
        ...(blId ? { blId } : {}),
      },
    });
    return NextResponse.json(liens);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Attacher un BL à une commande (idempotent)
export async function POST(request: NextRequest) {
  try {
    await ensureCommandesTables();
    const { commandeId, blId } = await request.json();
    if (!commandeId || !blId) {
      return NextResponse.json({ error: 'commandeId et blId sont requis' }, { status: 400 });
    }
    const lien = await prisma.commandeBonLivraison.upsert({
      where: { commandeId_blId: { commandeId, blId } },
      create: { commandeId, blId },
      update: {},
    });
    return NextResponse.json(lien);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Détacher les liens d'un BL (délégué ?blId=...), ou d'une commande (?commandeId=...)
export async function DELETE(request: NextRequest) {
  try {
    await ensureCommandesTables();
    const { searchParams } = new URL(request.url);
    const blId = searchParams.get('blId');
    const commandeId = searchParams.get('commandeId');
    if (!blId && !commandeId) {
      return NextResponse.json({ error: 'blId ou commandeId requis' }, { status: 400 });
    }
    await prisma.commandeBonLivraison.deleteMany({
      where: { ...(blId ? { blId } : {}), ...(commandeId ? { commandeId } : {}) },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
