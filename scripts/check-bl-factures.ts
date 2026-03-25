// Script to check and update BL factureId links

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking BL records from BL045703 to BL045710 ===\n');
  
  // Find all BLs in the range
  const bls = await prisma.bonLivraison.findMany({
    where: {
      numero: {
        gte: 'BL045703',
        lte: 'BL045710'
      }
    },
    include: { facture: true },
    orderBy: { numero: 'asc' }
  });
  
  console.log(`Found ${bls.length} BLs in range:\n`);
  
  for (const bl of bls) {
    console.log(`${bl.numero}:`);
    console.log(`  - factureId: ${bl.factureId || 'NULL'}`);
    console.log(`  - facture: ${bl.facture?.numero || 'N/A'}`);
    console.log(`  - infoLibre: ${bl.infoLibre || 'N/A'}`);
    
    // Check if there's a facture with this BL number
    const matchingFacture = await prisma.factureClient.findFirst({
      where: { numeroBL: bl.numero }
    });
    
    if (matchingFacture) {
      console.log(`  - Found matching facture: ${matchingFacture.numero}`);
      
      if (!bl.factureId) {
        console.log(`  >>> NEEDS UPDATE: Should link to facture ${matchingFacture.id}`);
      }
    } else {
      console.log(`  - No matching facture found`);
    }
    console.log('');
  }
  
  // Show factures that have these BL numbers
  console.log('\n=== Factures with these BL numbers ===\n');
  const factures = await prisma.factureClient.findMany({
    where: {
      numeroBL: {
        gte: 'BL045703',
        lte: 'BL045710'
      }
    },
    orderBy: { numeroBL: 'asc' }
  });
  
  for (const fc of factures) {
    console.log(`${fc.numero}: numeroBL=${fc.numeroBL}, id=${fc.id}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
