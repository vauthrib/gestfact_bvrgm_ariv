import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureCommandesTables } from '@/lib/commandes-db';

export const dynamic = 'force-dynamic';

// V3.33 - Bons de commande : liste, création, modification, suppression
export async function GET() {
  try {
    await ensureCommandesTables();
    const commandes = await prisma.bonCommande.findMany({
      include: { lignes: true, liens: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(
      commandes.map(({ liens, ...c }) => ({ ...c, blIds: liens.map((l) => l.blId) }))
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function prochainNumero(): Promise<string> {
  const existantes = await prisma.bonCommande.findMany({ select: { numero: true } });
  let max = 0;
  existantes.forEach(({ numero }) => {
    const m = numero.match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `BC${(max + 1).toString().padStart(5, '0')}`;
}

// Les saisies de formulaire arrivent parfois en chaîne : on force les types avant Prisma
const normaliseLignes = (lignes: any[] = []) =>
  (Array.isArray(lignes) ? lignes : []).map((l) => ({
    articleId: l.articleId || null,
    designation: String(l.designation ?? ''),
    quantite: Number(l.quantite) || 0,
    prixUnitaire: Number(l.prixUnitaire) || 0,
    totalHT: Number(l.totalHT) || 0,
  }));

export async function POST(request: NextRequest) {
  try {
    await ensureCommandesTables();
    const { lignes = [], ...data } = await request.json();
    const numero = await prochainNumero();
    const ls = normaliseLignes(lignes);

    const commande = await prisma.bonCommande.create({
      data: {
        ...data,
        numero,
        dateCommande: new Date(data.dateCommande),
        dateReception: data.dateReception ? new Date(data.dateReception) : null,
        totalHT: ls.reduce((s, l) => s + l.totalHT, 0),
        lignes: { create: ls },
      },
      include: { lignes: true },
    });
    return NextResponse.json(commande);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await ensureCommandesTables();
    const { id, lignes, ...data } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    // Mise à jour partielle autorisée (ex: date de réception seule) :
    // les lignes ne sont remplacées que si elles sont fournies.
    const avecLignes = Array.isArray(lignes);
    const ls = avecLignes ? normaliseLignes(lignes) : [];
    const commande = await prisma.bonCommande.update({
      where: { id },
      data: {
        ...data,
        dateCommande: data.dateCommande ? new Date(data.dateCommande) : undefined,
        ...(data.dateReception !== undefined
          ? { dateReception: data.dateReception ? new Date(data.dateReception) : null }
          : {}),
        ...(avecLignes
          ? {
              totalHT: ls.reduce((s, l) => s + l.totalHT, 0),
              lignes: { deleteMany: {}, create: ls },
            }
          : {}),
      },
      include: { lignes: true },
    });
    return NextResponse.json(commande);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureCommandesTables();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    const liens = await prisma.commandeBonLivraison.count({ where: { commandeId: id } });
    if (liens > 0) {
      return NextResponse.json(
        { error: `Impossible : ${liens} bon(s) de livraison rattaché(s) à cette commande.` },
        { status: 409 }
      );
    }
    await prisma.ligneBonCommande.deleteMany({ where: { commandeId: id } });
    await prisma.bonCommande.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
