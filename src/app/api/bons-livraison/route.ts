import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const bl = await prisma.bonLivraison.findMany({
      include: { client: true, lignes: true },
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
    const { lignes, ...blData } = data;

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
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
