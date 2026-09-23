-- CreateTable DocumentScan
CREATE TABLE "DocumentScan" (
    "id" TEXT NOT NULL,
    "typeDoc" TEXT NOT NULL,
    "numeroDoc" TEXT NOT NULL,
    "nature" TEXT NOT NULL DEFAULT 'AR_CLIENT',
    "nomFichier" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "taille" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentScan_typeDoc_numeroDoc_idx" ON "DocumentScan"("typeDoc", "numeroDoc");
CREATE INDEX "DocumentScan_nature_idx" ON "DocumentScan"("nature");
