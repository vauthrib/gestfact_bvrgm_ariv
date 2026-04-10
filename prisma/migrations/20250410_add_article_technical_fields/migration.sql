-- Add technical fields to Article model (V2.63)
-- Diamètre de fil, Poids en grammes, Type d'acier

ALTER TABLE "Article" ADD COLUMN "diametreFil" DOUBLE PRECISION;
ALTER TABLE "Article" ADD COLUMN "poidsGr" DOUBLE PRECISION;
ALTER TABLE "Article" ADD COLUMN "typeAcier" TEXT;
