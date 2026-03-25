import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// API endpoint to check and fix BL-facture links
// GET with ?dryrun=true to only check without updating
// POST to actually run the migration

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dryrun = searchParams.get('dryrun') !== 'false'; // Default to dryrun
  const blStart = searchParams.get('start') || 'BL045703';
  const blEnd = searchParams.get('end') || 'BL045710';
  
  try {
    // Find all BLs in the range
    const bls = await prisma.bonLivraison.findMany({
      where: {
        numero: {
          gte: blStart,
          lte: blEnd
        }
      },
      orderBy: { numero: 'asc' }
    });
    
    const results: any[] = [];
    const updatesNeeded: any[] = [];
    
    for (const bl of bls) {
      // Check if there's a facture with this BL number in numeroBL field
      const matchingFacture = await prisma.factureClient.findFirst({
        where: { numeroBL: bl.numero }
      });
      
      const blInfo = {
        numero: bl.numero,
        currentFactureId: bl.factureId,
        matchingFacture: matchingFacture ? {
          id: matchingFacture.id,
          numero: matchingFacture.numero
        } : null,
        needsUpdate: !bl.factureId && matchingFacture !== null
      };
      
      results.push(blInfo);
      
      if (blInfo.needsUpdate && matchingFacture) {
        updatesNeeded.push({
          blId: bl.id,
          blNumero: bl.numero,
          factureId: matchingFacture.id,
          factureNumero: matchingFacture.numero
        });
      }
    }
    
    // Perform updates if not dryrun
    let updated = 0;
    if (!dryrun && updatesNeeded.length > 0) {
      for (const update of updatesNeeded) {
        await prisma.bonLivraison.update({
          where: { id: update.blId },
          data: { factureId: update.factureId }
        });
        updated++;
      }
    }
    
    return NextResponse.json({
      range: { start: blStart, end: blEnd },
      dryrun,
      found: bls.length,
      results,
      updatesNeeded: updatesNeeded.length,
      updates: dryrun ? 0 : updated,
      message: dryrun 
        ? `${updatesNeeded.length} BL(s) need to be linked to factures`
        : `Updated ${updated} BL-facture links`
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST to actually run the migration
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const blStart = body.start || 'BL045703';
  const blEnd = body.end || 'BL045710';
  
  try {
    // Find all BLs in the range that need updating
    const bls = await prisma.bonLivraison.findMany({
      where: {
        numero: {
          gte: blStart,
          lte: blEnd
        },
        factureId: null // Only those not yet linked
      },
      orderBy: { numero: 'asc' }
    });
    
    const updates: any[] = [];
    
    for (const bl of bls) {
      const matchingFacture = await prisma.factureClient.findFirst({
        where: { numeroBL: bl.numero }
      });
      
      if (matchingFacture) {
        await prisma.bonLivraison.update({
          where: { id: bl.id },
          data: { factureId: matchingFacture.id }
        });
        updates.push({
          blNumero: bl.numero,
          factureNumero: matchingFacture.numero
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      range: { start: blStart, end: blEnd },
      checked: bls.length,
      updated: updates.length,
      updates
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
