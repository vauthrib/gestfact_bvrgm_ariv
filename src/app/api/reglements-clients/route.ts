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
    
    // Validation des données requises
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
    const reglement = await prisma.reglementClient.create({
      data: {
        factureId: data.factureId,
        dateReglement: new Date(data.dateReglement),
        montant: montant,
        modePaiement: data.modePaiement || 'VIREMENT',
        reference: data.reference || null,
        infoLibre: data.infoLibre || null,
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
      select: { statut: true }
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
