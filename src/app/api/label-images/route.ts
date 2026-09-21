import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function isOpaqueToken(token: string) {
  return /^[A-Za-z0-9_-]{32,128}$/.test(token);
}

export async function POST(request: NextRequest) {
  try {
    const { token, html, width, height } = await request.json();
    if (typeof token !== 'string' || !isOpaqueToken(token) || typeof html !== 'string' || html.length > 2_000_000) {
      return NextResponse.json({ error: 'Données d’étiquette invalides' }, { status: 400 });
    }
    await prisma.$executeRaw`
      INSERT INTO "LabelImage" ("token", "html", "width", "height", "createdAt")
      VALUES (${token}, ${html}, ${Number(width) || 100}, ${Number(height) || 60}, CURRENT_TIMESTAMP)
      ON CONFLICT ("token") DO UPDATE SET "html" = EXCLUDED."html", "width" = EXCLUDED."width", "height" = EXCLUDED."height"
    `;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erreur enregistrement image étiquette:', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer l’image de l’étiquette' }, { status: 500 });
  }
}
