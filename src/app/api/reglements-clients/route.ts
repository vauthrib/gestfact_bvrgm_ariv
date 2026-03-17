import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const reglements = await prisma.reglementClient.findMany({
      include: { facture: { include: { client: true } } },
      orderBy: { createdAt: 'desc' }
    });
    // S'assurer que tous les règlements ont un statut
    const reglementsWithStatut = reglements.map(r => ({
      ...r,
      statut: r.statut || 'ENREGISTRE'
    }));
    return NextResponse.json(reglementsWithStatut);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Check if this is a multi-facture payment
    if (data.multiPayments && Array.isArray(data.multiPayments)) {
      // Multi-facture payment: create grouped regulations
      const payments = data.multiPayments.filter((p: any) => parseFloat(p.montant) > 0);
      if (payments.length === 0) {
        return NextResponse.json({ error: 'Aucun paiement à créer' }, { status: 400 });
      }
      
      // Get the next base number
      const count = await prisma.reglementClient.count();
      const baseNumber = `RC${(count + 1).toString().padStart(5, '0')}`;
      
      // Create each regulation with suffix (a, b, c, ...)
      const suffixes = 'abcdefghijklmnopqrstuvwxyz'.split('');
      const createdReglements = [];
      
      for (let i = 0; i < payments.length; i++) {
        const p = payments[i];
        const montant = parseFloat(p.montant);
        
        // Verify facture exists
        const facture = await prisma.factureClient.findUnique({
          where: { id: p.factureId }
        });
        if (!facture) {
          return NextResponse.json({ error: `Facture ${p.factureId} non trouvée` }, { status: 400 });
        }
        
        const numero = `${baseNumber}-${suffixes[i]}`;
        const infoWithEcheance = data.modePaiement === 'EFFET' && data.dateEcheanceEffet
          ? `Échéance: ${data.dateEcheanceEffet}${data.infoLibre ? ' | ' + data.infoLibre : ''}`
          : data.infoLibre || null;
        
        const reglement = await prisma.reglementClient.create({
          data: {
            factureId: p.factureId,
            dateReglement: new Date(data.dateReglement),
            montant: montant,
            modePaiement: data.modePaiement || 'VIREMENT',
            reference: data.reference || null,
            infoLibre: infoWithEcheance,
            notes: data.notes || null,
            statut: 'ENREGISTRE',
            numero,
          },
          include: { facture: { include: { client: true } } }
        });
        createdReglements.push(reglement);
      }
      
      return NextResponse.json({ 
        success: true, 
        count: createdReglements.length,
        baseNumber,
        reglements: createdReglements 
      });
    }
    
    // Single payment
    if (!data.factureId) {
      return NextResponse.json({ error: 'Facture requise' }, { status: 400 });
    }
    
    // Accepter le montant comme nombre ou string
    const montant = typeof data.montant === 'number' ? data.montant : parseFloat(data.montant);
    if (isNaN(montant) || montant <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    }
    
    // Vérifier que la facture existe
    const facture = await prisma.factureClient.findUnique({
      where: { id: data.factureId }
    });
    if (!facture) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 400 });
    }
    
    const count = await prisma.reglementClient.count();
    const numero = `RC${(count + 1).toString().padStart(5, '0')}`;
    const infoWithEcheance = data.modePaiement === 'EFFET' && data.dateEcheanceEffet
      ? `Échéance: ${data.dateEcheanceEffet}${data.infoLibre ? ' | ' + data.infoLibre : ''}`
      : data.infoLibre || null;
    
    const reglement = await prisma.reglementClient.create({
      data: {
        factureId: data.factureId,
        dateReglement: new Date(data.dateReglement),
        montant: montant,
        modePaiement: data.modePaiement || 'VIREMENT',
        reference: data.reference || null,
        infoLibre: infoWithEcheance,
        notes: data.notes || null,
        statut: 'ENREGISTRE',
        numero,
      },
      include: { facture: { include: { client: true } } }
    });
    return NextResponse.json(reglement);
  } catch (error: any) {
    console.error('Erreur POST reglements-clients:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la création' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    
    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }
    
    // Vérifier si le règlement est déjà validé
    const existing = await prisma.reglementClient.findUnique({
      where: { id },
      select: { statut: true }
    });
    
    if (existing?.statut === 'VALIDE') {
      return NextResponse.json({ error: 'Ce règlement est déjà validé et ne peut plus être modifié' }, { status: 400 });
    }
    
    const reglement = await prisma.reglementClient.update({
      where: { id },
      data: {
        ...updateData,
        dateReglement: updateData.dateReglement ? new Date(updateData.dateReglement) : undefined
      },
      include: { facture: { include: { client: true } } }
    });
    return NextResponse.json(reglement);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    
    // Vérifier si le règlement est déjà validé
    const existing = await prisma.reglementClient.findUnique({
      where: { id },
      select: { statut: true, numero: true }
    });
    
    if (existing?.statut === 'VALIDE') {
      return NextResponse.json({ error: 'Ce règlement est déjà validé et ne peut plus être supprimé' }, { status: 400 });
    }
    
    await prisma.reglementClient.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
