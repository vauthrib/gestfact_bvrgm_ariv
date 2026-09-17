import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // V2.97: Ajouter la colonne conditionnement à la table Article
    // Cette migration est idempotent (ne plante pas si la colonne existe déjà)
    await prisma.$executeRaw`
      ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "conditionnement" DOUBLE PRECISION NOT NULL DEFAULT 0
    `;
    
    // Vérifier que la colonne existe maintenant
    const result = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'Article' AND column_name = 'conditionnement'
    `;
    
    const columnExists = Array.isArray(result) && result.length > 0;
    
    if (columnExists) {
      // Compter les articles pour confirmation
      const count = await prisma.article.count();
      return NextResponse.json({ 
        success: true, 
        message: `Migration appliquée. Colonne conditionnement ajoutée. ${count} article(s) dans la base.`,
        columnExists: true,
        articleCount: count
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'La colonne conditionnement n\'a pas pu être ajoutée' 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
