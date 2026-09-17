-- V2.95: Ajout du champ conditionnement aux articles (quantité par emballage)
-- Valeur par défaut 0 = pas d'impression d'étiquettes
ALTER TABLE "Article" ADD COLUMN "conditionnement" DOUBLE PRECISION NOT NULL DEFAULT 0;
