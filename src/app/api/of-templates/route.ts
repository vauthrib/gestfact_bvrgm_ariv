import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureCommandesTables } from '@/lib/commandes-db';

export const dynamic = 'force-dynamic';

function parseTemplateFields(template: any) {
  return {
    ...template,
    fields: typeof template.fields === 'string' ? JSON.parse(template.fields || '[]') : (template.fields || []),
  };
}

// GET: Lister tous les modèles d'ordre de fabrication
export async function GET() {
  try {
    await ensureCommandesTables();
    const templates = await prisma.ofTemplate.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(templates.map(parseTemplateFields));
  } catch (error: any) {
    // Table pas encore créée : on renvoie une liste vide plutôt qu'une erreur
    if (error.message?.includes('does not exist') || error.code === 'P2021') {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Créer un modèle
export async function POST(request: NextRequest) {
  try {
    await ensureCommandesTables();
    const data = await request.json();
    if (!data.name) {
      return NextResponse.json({ error: 'Le nom du modèle est requis' }, { status: 400 });
    }
    if (data.isDefault) {
      await prisma.ofTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }
    const template = await prisma.ofTemplate.create({
      data: {
        name: data.name,
        width: data.width || 210,
        height: data.height || 148.5,
        backgroundImage: data.backgroundImage || null,
        fields: JSON.stringify(data.fields || []),
        isDefault: data.isDefault || false,
      },
    });
    return NextResponse.json(parseTemplateFields(template));
  } catch (error: any) {
    console.error('Erreur création modèle OF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Mettre à jour un modèle
export async function PUT(request: NextRequest) {
  try {
    await ensureCommandesTables();
    const data = await request.json();
    const { id, ...updateData } = data;
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    if (updateData.isDefault) {
      await prisma.ofTemplate.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const template = await prisma.ofTemplate.update({
      where: { id },
      data: {
        name: updateData.name,
        width: updateData.width,
        height: updateData.height,
        backgroundImage: updateData.backgroundImage,
        fields: updateData.fields ? JSON.stringify(updateData.fields) : undefined,
        isDefault: updateData.isDefault,
      },
    });
    return NextResponse.json(parseTemplateFields(template));
  } catch (error: any) {
    console.error('Erreur update modèle OF:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Supprimer un modèle
export async function DELETE(request: NextRequest) {
  try {
    await ensureCommandesTables();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    await prisma.ofTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
