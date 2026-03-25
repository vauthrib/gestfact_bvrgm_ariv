// Script to check and BL status before conversion
// Checks BL status - checks if already converted
// Get the total TTC
const totalTTC = documentData.totalTTC || documentData.montantTTC || documentData.montant;
  return totalTTC;
}



// Check if BL already has a factureId in existing one
const existingFacture = await prisma.factureClient.findFirst({
  where: { numeroBL: bl.numero }
  return bl
}
