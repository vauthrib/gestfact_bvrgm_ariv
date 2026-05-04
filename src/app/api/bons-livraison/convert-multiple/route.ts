import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Function to generate a unique invoice number
async function genererNumeroUnique(): Promise<string> {
  const parametres = await prisma.parametres.findFirst();
  const prefixe = parametres?.prefixeFacture || 'FC';
  const numeroDepart = parametres?.numeroFactureDepart || 1;

  // Count existing invoices
  const count = await prisma.factureClient.count();
  let prochainNumero = numeroDepart + count;
  let numero = `${prefixe}${prochainNumero.toString().padStart(5, '0')}`;

  // Check if the number already exists and increment if necessary
  let existe = await prisma.factureClient.findUnique({ where: { numero } });
  while (existe) {
    prochainNumero++;
    numero = `${prefixe}${prochainNumero.toString().padStart(5, '0')}`;
    existe = await prisma.factureClient.findUnique({ where: { numero } });
  }

  return numero;
}

// GET: Analyze BLs for duplicates and price conflicts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const blIds = searchParams.get('blIds')?.split(',') || [];

    if (blIds.length === 0) {
      return NextResponse.json({ error: 'Aucun BL sélectionné' }, { status: 400 });
    }

    // Fetch all selected BLs with details
    const bls = await prisma.bonLivraison.findMany({
      where: { id: { in: blIds } },
      include: { client: true, lignes: true }
    });

    if (bls.length !== blIds.length) {
      return NextResponse.json({ error: 'Certains BL n\'existent pas' }, { status: 404 });
    }

    // Validate all BLs
    for (const bl of bls) {
      if (bl.statut !== 'VALIDEE') {
        return NextResponse.json({ 
          error: `Le BL ${bl.numero} doit être validé avant d'être converti` 
        }, { status: 400 });
      }
      if (bl.factureId) {
        return NextResponse.json({ 
          error: `Le BL ${bl.numero} a déjà été facturé` 
        }, { status: 400 });
      }
    }

    // Check if all BLs have the same client
    const clientIds = [...new Set(bls.map(bl => bl.clientId))];
    if (clientIds.length > 1) {
      return NextResponse.json({ 
        error: 'Tous les BL sélectionnés doivent appartenir au même client' 
      }, { status: 400 });
    }

    // Get all articles for reference prices
    const articles = await prisma.article.findMany();
    const articleMap = new Map(articles.map(a => [a.id, a]));

    // Analyze lines for duplicates and price conflicts
    const lineMap = new Map<string, {
      articleId: string | null;
      designation: string;
      prixUnitaires: number[];
      quantites: number[];
      prixReference: number | null;
      lignes: any[];
    }>();

    for (const bl of bls) {
      for (const l of bl.lignes) {
        const key = l.articleId || `designation:${l.designation}`;
        
        if (lineMap.has(key)) {
          const entry = lineMap.get(key)!;
          entry.prixUnitaires.push(l.prixUnitaire);
          entry.quantites.push(l.quantite);
          entry.lignes.push({ blNumero: bl.numero, ...l });
        } else {
          const article = l.articleId ? articleMap.get(l.articleId) : null;
          lineMap.set(key, {
            articleId: l.articleId,
            designation: l.designation,
            prixUnitaires: [l.prixUnitaire],
            quantites: [l.quantite],
            prixReference: article?.prixUnitaire || null,
            lignes: [{ blNumero: bl.numero, ...l }]
          });
        }
      }
    }

    // Detect price conflicts
    const conflicts: any[] = [];
    const normalLines: any[] = [];

    lineMap.forEach((value, key) => {
      const uniquePrices = [...new Set(value.prixUnitaires)];
      const totalQuantite = value.quantites.reduce((a, b) => a + b, 0);
      
      if (uniquePrices.length > 1) {
        // Price conflict detected
        conflicts.push({
          articleId: value.articleId,
          designation: value.designation,
          prixUnitaires: uniquePrices,
          prixReference: value.prixReference,
          totalQuantite,
          lignes: value.lignes
        });
      } else {
        // Normal line - can be merged
        normalLines.push({
          articleId: value.articleId,
          designation: value.designation,
          quantite: totalQuantite,
          prixUnitaire: uniquePrices[0],
          totalHT: totalQuantite * uniquePrices[0]
        });
      }
    });

    return NextResponse.json({
      bls: bls.map(bl => ({ id: bl.id, numero: bl.numero, totalHT: bl.totalHT })),
      client: bls[0].client,
      hasConflicts: conflicts.length > 0,
      conflicts,
      normalLines,
      totalBLs: bls.length,
      blNumbers: bls.map(bl => bl.numero).sort().join(', ')
    });
  } catch (error: any) {
    console.error('Analyze error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create grouped invoice with merge strategy
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { blIds, mergeStrategy, conflictResolutions } = body;

    if (!blIds || !Array.isArray(blIds) || blIds.length === 0) {
      return NextResponse.json({ error: 'Aucun BL sélectionné' }, { status: 400 });
    }

    // Fetch all selected BLs with details
    const bls = await prisma.bonLivraison.findMany({
      where: { id: { in: blIds } },
      include: { client: true, lignes: true }
    });

    if (bls.length !== blIds.length) {
      return NextResponse.json({ error: 'Certains BL n\'existent pas' }, { status: 404 });
    }

    // Validate all BLs
    for (const bl of bls) {
      if (bl.statut !== 'VALIDEE') {
        return NextResponse.json({ 
          error: `Le BL ${bl.numero} doit être validé avant d'être converti` 
        }, { status: 400 });
      }
      if (bl.factureId) {
        return NextResponse.json({ 
          error: `Le BL ${bl.numero} a déjà été facturé` 
        }, { status: 400 });
      }
    }

    // Check if all BLs have the same client
    const clientIds = [...new Set(bls.map(bl => bl.clientId))];
    if (clientIds.length > 1) {
      return NextResponse.json({ 
        error: 'Tous les BL sélectionnés doivent appartenir au même client' 
      }, { status: 400 });
    }

    // Get all articles for reference prices
    const articles = await prisma.article.findMany();
    const articleMap = new Map(articles.map(a => [a.id, a]));

    // Group lines by article
    const lineMap = new Map<string, {
      articleId: string | null;
      designation: string;
      prixUnitaires: number[];
      quantites: number[];
      prixReference: number | null;
    }>();

    for (const bl of bls) {
      for (const l of bl.lignes) {
        const key = l.articleId || `designation:${l.designation}`;
        
        if (lineMap.has(key)) {
          const entry = lineMap.get(key)!;
          entry.prixUnitaires.push(l.prixUnitaire);
          entry.quantites.push(l.quantite);
        } else {
          const article = l.articleId ? articleMap.get(l.articleId) : null;
          lineMap.set(key, {
            articleId: l.articleId,
            designation: l.designation,
            prixUnitaires: [l.prixUnitaire],
            quantites: [l.quantite],
            prixReference: article?.prixUnitaire || null
          });
        }
      }
    }

    // Build final lines based on merge strategy
    const allLignes: any[] = [];
    let totalHT = 0;
    let totalTVA = 0;

    lineMap.forEach((value, key) => {
      const uniquePrices = [...new Set(value.prixUnitaires)];
      const totalQuantite = value.quantites.reduce((a, b) => a + b, 0);
      
      let finalPrixUnitaire: number;
      
      if (uniquePrices.length > 1) {
        // Price conflict - check resolution
        const conflictKey = value.articleId || `designation:${value.designation}`;
        const resolution = conflictResolutions?.[conflictKey];
        
        if (resolution?.action === 'useReference' && value.prixReference) {
          finalPrixUnitaire = value.prixReference;
        } else if (resolution?.action === 'useCustom') {
          finalPrixUnitaire = resolution.prixUnitaire;
        } else if (resolution?.action === 'keepSeparate') {
          // Keep as separate lines
          for (let i = 0; i < value.quantites.length; i++) {
            const ligneHT = value.quantites[i] * value.prixUnitaires[i];
            const ligneTVA = ligneHT * 0.20;
            totalHT += ligneHT;
            totalTVA += ligneTVA;
            allLignes.push({
              designation: value.designation,
              quantite: value.quantites[i],
              prixUnitaire: value.prixUnitaires[i],
              tauxTVA: 20,
              totalHT: ligneHT,
              articleId: value.articleId
            });
          }
          return; // Skip the rest of this iteration
        } else {
          // Default: use reference price or first price
          finalPrixUnitaire = value.prixReference || uniquePrices[0];
        }
      } else {
        finalPrixUnitaire = uniquePrices[0];
      }
      
      const ligneHT = totalQuantite * finalPrixUnitaire;
      const ligneTVA = ligneHT * 0.20;
      totalHT += ligneHT;
      totalTVA += ligneTVA;
      
      allLignes.push({
        designation: value.designation,
        quantite: totalQuantite,
        prixUnitaire: finalPrixUnitaire,
        tauxTVA: 20,
        totalHT: ligneHT,
        articleId: value.articleId
      });
    });

    // Generate unique invoice number
    const numeroFacture = await genererNumeroUnique();

    // Get first BL for common fields
    const firstBL = bls[0];
    const blNumbers = bls.map(bl => bl.numero).sort().join(', ');

    // Create the grouped invoice
    const facture = await prisma.factureClient.create({
      data: {
        numero: numeroFacture,
        dateFacture: new Date(),
        dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        clientId: firstBL.clientId,
        bonCommande: firstBL.bonCommande,
        numeroBL: blNumbers,
        totalHT,
        totalTVA,
        totalTTC: totalHT + totalTVA,
        statut: 'BROUILLON',
        notes: `Facture groupée créée depuis ${bls.length} BL: ${blNumbers}`,
        lignes: { create: allLignes }
      },
      include: { client: true, lignes: true }
    });

    // Update all BLs to mark as converted
    await prisma.bonLivraison.updateMany({
      where: { id: { in: blIds } },
      data: { 
        factureId: facture.id,
        infoLibre: `Converti en facture ${numeroFacture}`
      }
    });

    return NextResponse.json(facture);
  } catch (error: any) {
    console.error('Convert multiple error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
