import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    // Créer la table AvoirClient si elle n'existe pas
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AvoirClient" (
        "id" TEXT NOT NULL,
        "numero" TEXT NOT NULL,
        "dateAvoir" TIMESTAMP(3) NOT NULL,
        "clientId" TEXT NOT NULL,
        "factureId" TEXT,
        "motif" TEXT,
        "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
        "notes" TEXT,
        "infoLibre" TEXT,
        "totalHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalTVA" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalTTC" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "AvoirClient_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "AvoirClient_numero_key" UNIQUE ("numero")
      );
    `);

    // Créer la table LigneAvoirClient si elle n'existe pas
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LigneAvoirClient" (
        "id" TEXT NOT NULL,
        "avoirId" TEXT NOT NULL,
        "articleId" TEXT,
        "designation" TEXT NOT NULL,
        "quantite" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "prixUnitaire" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "tauxTVA" DOUBLE PRECISION NOT NULL DEFAULT 20,
        "totalHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
        CONSTRAINT "LigneAvoirClient_pkey" PRIMARY KEY ("id")
      );
    `);

    // Créer les index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AvoirClient_clientId_idx" ON "AvoirClient"("clientId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AvoirClient_statut_idx" ON "AvoirClient"("statut");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AvoirClient_factureId_idx" ON "AvoirClient"("factureId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "LigneAvoirClient_avoirId_idx" ON "LigneAvoirClient"("avoirId");
    `);

    // Ajouter les clés étrangères
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'AvoirClient_clientId_fkey' 
          AND table_name = 'AvoirClient'
        ) THEN
          ALTER TABLE "AvoirClient" 
          ADD CONSTRAINT "AvoirClient_clientId_fkey" 
          FOREIGN KEY ("clientId") REFERENCES "Tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'AvoirClient_factureId_fkey' 
          AND table_name = 'AvoirClient'
        ) THEN
          ALTER TABLE "AvoirClient" 
          ADD CONSTRAINT "AvoirClient_factureId_fkey" 
          FOREIGN KEY ("factureId") REFERENCES "FactureClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'LigneAvoirClient_avoirId_fkey' 
          AND table_name = 'LigneAvoirClient'
        ) THEN
          ALTER TABLE "LigneAvoirClient" 
          ADD CONSTRAINT "LigneAvoirClient_avoirId_fkey" 
          FOREIGN KEY ("avoirId") REFERENCES "AvoirClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'LigneAvoirClient_articleId_fkey' 
          AND table_name = 'LigneAvoirClient'
        ) THEN
          ALTER TABLE "LigneAvoirClient" 
          ADD CONSTRAINT "LigneAvoirClient_articleId_fkey" 
          FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // Ajouter les colonnes prefixeAvoir et numeroAvoirDepart à Parametres si elles n'existent pas
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE column_name = 'prefixeAvoir' 
          AND table_name = 'Parametres'
        ) THEN
          ALTER TABLE "Parametres" ADD COLUMN "prefixeAvoir" TEXT;
        END IF;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE column_name = 'numeroAvoirDepart' 
          AND table_name = 'Parametres'
        ) THEN
          ALTER TABLE "Parametres" ADD COLUMN "numeroAvoirDepart" INTEGER;
        END IF;
      END $$;
    `);

    // Ajouter la relation avoirsClients à Tiers si elle n'existe pas
    // Note: Prisma gère cela automatiquement via le schéma

    return NextResponse.json({ 
      success: true, 
      message: 'Tables AvoirClient et LigneAvoirClient créées avec succès' 
    });
  } catch (error: any) {
    console.error('Erreur migration:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
