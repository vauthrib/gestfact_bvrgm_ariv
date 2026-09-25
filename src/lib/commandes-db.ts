import { prisma } from '@/lib/prisma';

// V3.33 - Bons de commande
// Les migrations Prisma ne sont pas utilisées en prod (voir V3.31), comme pour
// DocumentScan on crée les tables au premier appel, en SQL brut et idempotent.
let ready = false;

export async function ensureCommandesTables(): Promise<void> {
  if (ready) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BonCommande" (
      "id" TEXT NOT NULL,
      "numero" TEXT NOT NULL,
      "dateCommande" TIMESTAMP(3) NOT NULL,
      "dateReception" TIMESTAMP(3),
      "clientId" TEXT NOT NULL,
      "referenceClient" TEXT,
      "statut" TEXT NOT NULL DEFAULT 'EN_COURS',
      "infoLibre" TEXT,
      "notes" TEXT,
      "totalHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "BonCommande_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "BonCommande_numero_key" ON "BonCommande"("numero");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BonCommande_clientId_idx" ON "BonCommande"("clientId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BonCommande_statut_idx" ON "BonCommande"("statut");`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LigneBonCommande" (
      "id" TEXT NOT NULL,
      "commandeId" TEXT NOT NULL,
      "articleId" TEXT,
      "designation" TEXT NOT NULL,
      "quantite" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "prixUnitaire" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "totalHT" DOUBLE PRECISION NOT NULL DEFAULT 0,
      CONSTRAINT "LigneBonCommande_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LigneBonCommande_commandeId_idx" ON "LigneBonCommande"("commandeId");`);
  try {
    // PostgreSQL ne supporte pas "ADD CONSTRAINT IF NOT EXISTS" : on ignore l'erreur si elle existe déjà.
    await prisma.$executeRawUnsafe(`ALTER TABLE "LigneBonCommande" ADD CONSTRAINT "LigneBonCommande_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "BonCommande"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  } catch {}

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CommandeBonLivraison" (
      "id" TEXT NOT NULL,
      "commandeId" TEXT NOT NULL,
      "blId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CommandeBonLivraison_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "CommandeBonLivraison_commandeId_blId_key" ON "CommandeBonLivraison"("commandeId", "blId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CommandeBonLivraison_blId_idx" ON "CommandeBonLivraison"("blId");`);
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "CommandeBonLivraison" ADD CONSTRAINT "CommandeBonLivraison_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "BonCommande"("id") ON DELETE CASCADE ON UPDATE CASCADE;`);
  } catch {}

  // V3.36 - Modèles d'ordre de fabrication
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OfTemplate" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "width" DOUBLE PRECISION NOT NULL DEFAULT 210,
      "height" DOUBLE PRECISION NOT NULL DEFAULT 148.5,
      "backgroundImage" TEXT,
      "fields" TEXT NOT NULL DEFAULT '[]',
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "OfTemplate_pkey" PRIMARY KEY ("id")
    );
  `);

  ready = true;
}
