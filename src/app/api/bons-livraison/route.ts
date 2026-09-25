import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureCommandesTables } from '@/lib/commandes-db';

export async function GET() {
  try {
    const bl = await prisma.bonLivraison.findMany({
      include: { client: true, lignes: true, facture: { select: { id: true, numero: true, updatedAt: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(bl);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { lignes, commandeId, ...blData } = data;

    // Récupérer les paramètres pour la numérotation
    const parametres = await prisma.parametres.findFirst();
    const prefixe = parametres?.prefixeBL || 'BL';
    const numeroDepart = parametres?.numeroBLDepart || 1;

    // Compter les BL existants pour obtenir le prochain numéro
    const count = await prisma.bonLivraison.count();
    const prochainNumero = numeroDepart + count;
    const numero = `${prefixe}${prochainNumero.toString().padStart(5, '0')}`;

    const bl = await prisma.bonLivraison.create({
      data: {
        ...blData,
        numero,
        dateBL: new Date(blData.dateBL),
        lignes: { create: lignes }
      },
      include: { lignes: true, client: true }
    });

    // V3.33 - Attacher le BL à sa commande de provenance (table d'attelage, sans toucher à BonLivraison)
    if (commandeId) {
      try {
        await ensureCommandesTables();
        await prisma.commandeBonLivraison.upsert({
          where: { commandeId_blId: { commandeId, blId: bl.id } },
          create: { commandeId, blId: bl.id },
          update: {},
        });
      } catch (e) { console.error('Lien commande/BL impossible:', e); }
    }

    return NextResponse.json(bl);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, lignes, ...blData } = data;

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    // Supprimer les anciennes lignes et créer les nouvelles
    await prisma.ligneBonLivraison.deleteMany({ where: { bonLivraisonId: id } });

    const bl = await prisma.bonLivraison.update({
      where: { id },
      data: {
        ...blData,
        dateBL: blData.dateBL ? new Date(blData.dateBL) : undefined,
        lignes: { create: lignes || [] }
      },
      include: { lignes: true, client: true }
    });
    return NextResponse.json(bl);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    await prisma.ligneBonLivraison.deleteMany({ where: { bonLivraisonId: id } });
    await prisma.bonLivraison.delete({ where: { id } });
    try { await ensureCommandesTables(); await prisma.commandeBonLivraison.deleteMany({ where: { blId: id } }); } catch (e) { console.error(e); }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
