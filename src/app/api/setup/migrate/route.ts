import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // V2.98: Migration conditionnement + LabelTemplate
    await prisma.$executeRaw`ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "conditionnement" DOUBLE PRECISION NOT NULL DEFAULT 0`;
    
    // Créer la table LabelTemplate si elle n'existe pas
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "LabelTemplate" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "width" DOUBLE PRECISION NOT NULL DEFAULT 100,
        "height" DOUBLE PRECISION NOT NULL DEFAULT 60,
        "backgroundImage" TEXT,
        "fields" TEXT NOT NULL DEFAULT '[]',
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "LabelTemplate_pkey" PRIMARY KEY ("id")
      )
    `;
    
    const count = await prisma.article.count();
    return NextResponse.json({ 
      success: true, 
      message: `Migration V2.98 appliquée. ${count} article(s). Table LabelTemplate créée.`,
      articleCount: count
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
