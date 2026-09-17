import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseTemplateFields(template: any) {
  return {
    ...template,
    fields: typeof template.fields === 'string' ? JSON.parse(template.fields || '[]') : (template.fields || []),
  };
}

// GET: Lister tous les templates d'étiquettes
export async function GET() {
  try {
    const templates = await prisma.labelTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(templates.map(parseTemplateFields));
  } catch (error: any) {
    // Si la table n'existe pas encore, retourner un tableau vide
    if (error.message?.includes('does not exist') || error.code === 'P2021') {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Créer un template
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.name) {
      return NextResponse.json({ error: 'Le nom du template est requis' }, { status: 400 });
    }

    // Si isDefault est true, désactiver les autres defaults
    if (data.isDefault) {
      await prisma.labelTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const template = await prisma.labelTemplate.create({
      data: {
        name: data.name,
        width: data.width || 100,
        height: data.height || 60,
        backgroundImage: data.backgroundImage || null,
        fields: JSON.stringify(data.fields || []),
        isDefault: data.isDefault || false,
      }
    });

    return NextResponse.json(parseTemplateFields(template));
  } catch (error: any) {
    console.error('Erreur création template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Mettre à jour un template
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    // Si isDefault est true, désactiver les autres defaults
    if (updateData.isDefault) {
      await prisma.labelTemplate.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false }
      });
    }

    const template = await prisma.labelTemplate.update({
      where: { id },
      data: {
        name: updateData.name,
        width: updateData.width,
        height: updateData.height,
        backgroundImage: updateData.backgroundImage,
        fields: updateData.fields ? JSON.stringify(updateData.fields) : undefined,
        isDefault: updateData.isDefault,
      }
    });

    return NextResponse.json(parseTemplateFields(template));
  } catch (error: any) {
    console.error('Erreur update template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Supprimer un template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    
    await prisma.labelTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
