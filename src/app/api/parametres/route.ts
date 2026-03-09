import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    let parametres = await prisma.parametres.findFirst();
    if (!parametres) {
      parametres = await prisma.parametres.create({
        data: { nomEntreprise: '' }
      });
    }
    return NextResponse.json(parametres);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    let parametres = await prisma.parametres.findFirst();
    if (parametres) {
      parametres = await prisma.parametres.update({
        where: { id: parametres.id },
        data
      });
    } else {
      parametres = await prisma.parametres.create({ data });
    }
    return NextResponse.json(parametres);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
