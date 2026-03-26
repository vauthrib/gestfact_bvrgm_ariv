-- Add avoir prefix columns to Parametres table if they don't exist
ALTER TABLE "Parametres" ADD COLUMN IF NOT EXISTS "prefixeAvoir" TEXT;
ALTER TABLE "Parametres" ADD COLUMN IF NOT EXISTS "numeroAvoirDepart" INTEGER;

-- Set default values if null
UPDATE "Parametres" SET "prefixeAvoir" = 'AV' WHERE "prefixeAvoir" IS NULL;
UPDATE "Parametres" SET "numeroAvoirDepart" = 1 WHERE "numeroAvoirDepart" IS NULL;
