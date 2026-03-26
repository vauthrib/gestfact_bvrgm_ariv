import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Fonction pour générer un numéro unique d'avoir
async function genererNumeroUnique(): Promise<string> {
  const parametres = await prisma.parametres.findFirst();
  const prefixe = parametres?.prefixeAvoir || 'AV';
  const numeroDepart = parametres?.numeroAvoirDepart || 1;

  // Compter les avoirs existants
  const count = await prisma.avoirClient.count();
  let prochainNumero = numeroDepart + count;
  let numero = `${prefixe}${prochainNumero.toString().padStart(5, '0')}`;

  // Vérifier si le numéro existe déjà et incrémenter si nécessaire
  let existe = await prisma.avoirClient.findUnique({ where: { numero } });
  while (existe) {
    prochainNumero++;
    numero = `${prefixe}${prochainNumero.toString().padStart(5, '0')}`;
    existe = await prisma.avoirClient.findUnique({ where: { numero } });
  }

  return numero;
}

export async function GET() {
  try {
    const avoirs = await prisma.avoirClient.findMany({
      include: { 
        client: true, 
        lignes: true,
        facture: true 
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(avoirs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { lignes, numero: _numeroFourni, ...avoirData } = data;

    // Générer un numéro unique (ignorer le numéro fourni par le frontend)
    const numero = await genererNumeroUnique();

    // Calculer les totaux depuis les lignes
    let totalHT = 0;
    let totalTVA = 0;
    
    const lignesCalculees = (lignes || []).map((l: any) => {
      const ligneHT = l.quantite * l.prixUnitaire;
      const ligneTVA = ligneHT * (l.tauxTVA || 20) / 100;
      totalHT += ligneHT;
      totalTVA += ligneTVA;
      return {
        ...l,
        totalHT: ligneHT
      };
    });

    const totalTTC = totalHT + totalTVA;

    const avoir = await prisma.avoirClient.create({
      data: {
        numero,
        dateAvoir: new Date(avoirData.dateAvoir || new Date()),
        clientId: avoirData.clientId,
        factureId: avoirData.factureId || null,
        motif: avoirData.motif || null,
        notes: avoirData.notes || null,
        infoLibre: avoirData.infoLibre || null,
        totalHT,
        totalTVA,
        totalTTC,
        statut: avoirData.statut || 'BROUILLON',
        lignes: { create: lignesCalculees }
      },
      include: { lignes: true, client: true, facture: true }
    });
    return NextResponse.json(avoir);
  } catch (error: any) {
    console.error('Erreur création avoir:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, lignes, ...avoirData } = data;

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    // Calculer les totaux depuis les lignes
    let totalHT = 0;
    let totalTVA = 0;
    
    const lignesCalculees = (lignes || []).map((l: any) => {
      const ligneHT = l.quantite * l.prixUnitaire;
      const ligneTVA = ligneHT * (l.tauxTVA || 20) / 100;
      totalHT += ligneHT;
      totalTVA += ligneTVA;
      return {
        ...l,
        totalHT: ligneHT
      };
    });

    const totalTTC = totalHT + totalTVA;

    // Supprimer les anciennes lignes et créer les nouvelles
    await prisma.ligneAvoirClient.deleteMany({ where: { avoirId: id } });

    const avoir = await prisma.avoirClient.update({
      where: { id },
      data: {
        dateAvoir: avoirData.dateAvoir ? new Date(avoirData.dateAvoir) : undefined,
        motif: avoirData.motif || null,
        notes: avoirData.notes || null,
        infoLibre: avoirData.infoLibre || null,
        totalHT,
        totalTVA,
        totalTTC,
        statut: avoirData.statut,
        lignes: { create: lignesCalculees }
      },
      include: { lignes: true, client: true, facture: true }
    });
    return NextResponse.json(avoir);
  } catch (error: any) {
    console.error('Erreur modification avoir:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    await prisma.ligneAvoirClient.deleteMany({ where: { avoirId: id } });
    await prisma.avoirClient.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
