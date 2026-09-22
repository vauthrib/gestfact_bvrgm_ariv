CREATE TABLE "ExpeditionArchive" (
    "id" TEXT NOT NULL,
    "blId" TEXT,
    "client" TEXT NOT NULL,
    "blNumero" TEXT NOT NULL,
    "dateExpedition" TIMESTAMP(3) NOT NULL,
    "qteTotalBL" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExpeditionArchive_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExpeditionArchive_blId_key" ON "ExpeditionArchive"("blId");
CREATE INDEX "ExpeditionArchive_blNumero_idx" ON "ExpeditionArchive"("blNumero");
CREATE INDEX "ExpeditionArchive_dateExpedition_idx" ON "ExpeditionArchive"("dateExpedition");
CREATE TABLE "ExpeditionArchiveLigne" (
    "id" TEXT NOT NULL,
    "expeditionId" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "refProduit" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "blNumero" TEXT NOT NULL,
    "dateExpedition" TIMESTAMP(3) NOT NULL,
    "qteEtiquette" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "numeroContenant" TEXT NOT NULL,
    "numeroLot" TEXT,
    "qteTotalBL" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpeditionArchiveLigne_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ExpeditionArchiveLigne_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "ExpeditionArchive"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ExpeditionArchiveLigne_expeditionId_idx" ON "ExpeditionArchiveLigne"("expeditionId");
CREATE INDEX "ExpeditionArchiveLigne_refProduit_idx" ON "ExpeditionArchiveLigne"("refProduit");
CREATE INDEX "ExpeditionArchiveLigne_numeroContenant_idx" ON "ExpeditionArchiveLigne"("numeroContenant");
CREATE INDEX "ExpeditionArchiveLigne_numeroLot_idx" ON "ExpeditionArchiveLigne"("numeroLot");
CREATE TABLE "ExpeditionContenant" (
    "id" TEXT NOT NULL,
    "expeditionId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "qrToken" TEXT NOT NULL,
    "qteEtiquette" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "numeroLot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpeditionContenant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ExpeditionContenant_qrToken_key" UNIQUE ("qrToken"),
    CONSTRAINT "ExpeditionContenant_expeditionId_fkey" FOREIGN KEY ("expeditionId") REFERENCES "ExpeditionArchive"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ExpeditionContenant_reference_numero_key" ON "ExpeditionContenant"("reference", "numero");
CREATE INDEX "ExpeditionContenant_expeditionId_idx" ON "ExpeditionContenant"("expeditionId");
