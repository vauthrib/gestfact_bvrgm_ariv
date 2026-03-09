import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const reglements = await prisma.reglementClient.findMany({
      include: { facture: { include: { client: true } } },
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
    const count = await prisma.reglementClient.count();
    const numero = `RC${(count + 1).toString().padStart(5, '0')}`;
    const reglement = await prisma.reglementClient.create({
      data: {
        ...data,
        numero,
        dateReglement: new Date(data.dateReglement)
      },
      include: { facture: { include: { client: true } } }
    });
    return NextResponse.json(reglement);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    
    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }
    
    const reglement = await prisma.reglementClient.update({
      where: { id },
      data: {
        ...updateData,
        dateReglement: updateData.dateReglement ? new Date(updateData.dateReglement) : undefined
      },
      include: { facture: { include: { client: true } } }
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
    await prisma.reglementClient.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
