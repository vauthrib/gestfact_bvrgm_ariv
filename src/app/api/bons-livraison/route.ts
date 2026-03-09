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
    const bl = await prisma.bonLivraison.create({
      data: {
        ...blData,
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
