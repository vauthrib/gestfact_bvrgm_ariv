import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handleMigration();
}

export async function POST() {
  return handleMigration();
}

async function handleMigration() {
  const results: string[] = [];
  
  try {
    // 1. Ajouter la colonne conditionnement à Article si elle manque
    try {
      await prisma.$executeRaw`ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "conditionnement" DOUBLE PRECISION NOT NULL DEFAULT 0`;
      results.push('✅ Colonne conditionnement ajoutée/verify sur Article');
    } catch (e: any) {
      results.push(`⚠️ conditionnement: ${e.message}`);
    }

    // 2. Créer la table LabelTemplate si elle n'existe pas
    try {
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
      results.push('✅ Table LabelTemplate créée/vérifiée');
    } catch (e: any) {
      results.push(`⚠️ LabelTemplate: ${e.message}`);
    }

    // 3. Vérifier les colonnes manquantes sur Article (diametreFil, poidsGr, typeAcier)
    const articleCols = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'Article' AND column_name IN ('diametreFil', 'poidsGr', 'typeAcier')
    ` as any[];
    const existingCols = new Set(articleCols.map((c: any) => c.column_name));
    
    for (const col of ['diametreFil', 'poidsGr', 'typeAcier']) {
      if (!existingCols.has(col)) {
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE "Article" ADD COLUMN "${col}" DOUBLE PRECISION`);
          results.push(`✅ Colonne ${col} ajoutée à Article`);
        } catch (e: any) {
          results.push(`⚠️ ${col}: ${e.message}`);
        }
      }
    }

    // 4. Compter les articles
    const count = await prisma.article.count();
    results.push(`📊 ${count} article(s) dans la base`);
    
    // 5. Vérifier la table LabelTemplate
    try {
      const tplCount = await prisma.labelTemplate.count();
      results.push(`🏷 ${tplCount} template(s) d'étiquette(s)`);
    } catch (e: any) {
      results.push(`⚠️ Impossible de compter les templates: ${e.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: results.join('\n'),
      results,
      articleCount: count
    });
  } catch (error: any) {
    results.push(`❌ Erreur globale: ${error.message}`);
    return NextResponse.json({ success: false, error: error.message, results }, { status: 500 });
  }
}
