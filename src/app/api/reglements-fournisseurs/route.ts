import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const reglements = await prisma.reglementFournisseur.findMany({
      include: { facture: { include: { fournisseur: true } } },
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
    if (!data.montant || isNaN(parseFloat(data.montant)) || parseFloat(data.montant) <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    }
    
    // Vérifier que la facture existe
    const facture = await prisma.factureFournisseur.findUnique({
      where: { id: data.factureId }
    });
    if (!facture) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 400 });
    }
    
    const count = await prisma.reglementFournisseur.count();
    const reglement = await prisma.reglementFournisseur.create({
      data: {
        factureId: data.factureId,
        dateReglement: new Date(data.dateReglement),
        montant: parseFloat(data.montant),
        modePaiement: data.modePaiement || 'VIREMENT',
        reference: data.reference || null,
        infoLibre: data.infoLibre || null,
        notes: data.notes || null,
        statut: data.statut || 'ENREGISTRE',
      },
      include: { facture: { include: { fournisseur: true } } }
    });
    return NextResponse.json(reglement);
  } catch (error: any) {
    console.error('Erreur POST reglements-fournisseurs:', error);
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
    const existing = await prisma.reglementFournisseur.findUnique({
      where: { id },
      select: { statut: true }
    });
    
    if (existing?.statut === 'VALIDE') {
      return NextResponse.json({ error: 'Ce règlement est déjà validé et ne peut plus être modifié' }, { status: 400 });
    }
    
    const reglement = await prisma.reglementFournisseur.update({
      where: { id },
      data: {
        ...updateData,
        dateReglement: updateData.dateReglement ? new Date(updateData.dateReglement) : undefined
      },
      include: { facture: { include: { fournisseur: true } } }
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
    const existing = await prisma.reglementFournisseur.findUnique({
      where: { id },
      select: { statut: true }
    });
    
    if (existing?.statut === 'VALIDE') {
      return NextResponse.json({ error: 'Ce règlement est déjà validé et ne peut plus être supprimé' }, { status: 400 });
    }
    
    await prisma.reglementFournisseur.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
