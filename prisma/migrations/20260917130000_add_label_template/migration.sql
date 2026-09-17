-- V2.98: Création de la table LabelTemplate pour les templates d'étiquettes configurables
CREATE TABLE "LabelTemplate" (
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
);
