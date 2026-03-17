import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const parseNumber = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  const str = String(val).replace(',', '.').replace(/\s/g, '');
  return parseFloat(str) || 0;
};

const parseDate = (val: any): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  const str = String(val);
  // Try YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(str);
  }
  // Try DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return new Date(`${y}-${m}-${d}`);
  }
  return new Date(str);
};

const parseBool = (val: any): boolean => {
  if (typeof val === 'boolean') return val;
  const str = String(val).toLowerCase();
  return str === 'true' || str === '1' || str === 'oui' || str === 'yes';
};

interface ImportResult {
  section: string;
  count: number;
  error?: string;
}

async function parseCSV(text: string): Promise<{ section: string; rows: Record<string, string>[] }[]> {
  const sections: { section: string; rows: Record<string, string>[] }[] = [];
  const lines = text.split(/\r?\n/);
  
  let currentSection: string | null = null;
  let currentHeaders: string[] = [];
  let currentRows: Record<string, string>[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for section marker
    if (line.startsWith('===') && line.endsWith('===')) {
      const sectionName = line.slice(3, -3);
      
      // Save previous section if exists
      if (currentSection && currentRows.length > 0) {
        sections.push({ section: currentSection, rows: currentRows });
      }
      
      // Start new section
      if (sectionName === 'END') {
        currentSection = null;
        currentHeaders = [];
        currentRows = [];
      } else {
        currentSection = sectionName;
        currentHeaders = [];
        currentRows = [];
        
        // Next line should be headers
        if (i + 1 < lines.length) {
          i++;
          const headerLine = lines[i].trim();
          const delimiter = headerLine.includes(';') ? ';' : ',';
          currentHeaders = headerLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        }
      }
      continue;
    }
    
    // Parse data row
    if (currentSection && currentHeaders.length > 0 && line && !line.startsWith('===')) {
      const delimiter = line.includes(';') ? ';' : ',';
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      if (values.length >= currentHeaders.length) {
        const row: Record<string, string> = {};
        currentHeaders.forEach((h, idx) => row[h] = values[idx] || '');
        currentRows.push(row);
      }
    }
  }
  
  // Don't forget the last section
  if (currentSection && currentRows.length > 0) {
    sections.push({ section: currentSection, rows: currentRows });
  }
  
  return sections;
}

async function importTiers(rows: Record<string, string>[]): Promise<number> {
  let count = 0;
  for (const row of rows) {
    if (!row.code || !row.raisonSociale) continue;
    try {
      await prisma.tiers.upsert({
        where: { code: row.code },
        create: {
          code: row.code,
          type: row.type?.toUpperCase() || 'CLIENT',
          raisonSociale: row.raisonSociale,
          adresse: row.adresse || null,
          adresse2: row.adresse2 || null,
          codePostal: row.codePostal || null,
          ville: row.ville || null,
          pays: row.pays || null,
          telephone: row.telephone || null,
          email: row.email || null,
          ice: row.ice || null,
          rc: row.rc || null,
          rcLieu: row.rcLieu || null,
          if: row.if || row['if'] || null,
          tp: row.tp || null,
          cnss: row.cnss || null,
          infoLibre: row.infoLibre || null,
          notes: row.notes || null,
        },
        update: {
          type: row.type?.toUpperCase() || 'CLIENT',
          raisonSociale: row.raisonSociale,
          adresse: row.adresse || null,
          adresse2: row.adresse2 || null,
          codePostal: row.codePostal || null,
          ville: row.ville || null,
          pays: row.pays || null,
          telephone: row.telephone || null,
          email: row.email || null,
          ice: row.ice || null,
          rc: row.rc || null,
          rcLieu: row.rcLieu || null,
          if: row.if || row['if'] || null,
          tp: row.tp || null,
          cnss: row.cnss || null,
          infoLibre: row.infoLibre || null,
          notes: row.notes || null,
        }
      });
      count++;
    } catch (e) { console.error('Error importing tier:', e); }
  }
  return count;
}

async function importArticles(rows: Record<string, string>[]): Promise<number> {
  let count = 0;
  for (const row of rows) {
    if (!row.code || !row.designation) continue;
    try {
      await prisma.article.upsert({
        where: { code: row.code },
        create: {
          code: row.code,
          designation: row.designation,
          prixUnitaire: parseNumber(row.prixUnitaire),
          unite: row.unite || 'pièce',
          tauxTVA: parseNumber(row.tauxTVA) || 20,
          infoLibre: row.infoLibre || null,
          actif: parseBool(row.actif),
        },
        update: {
          designation: row.designation,
          prixUnitaire: parseNumber(row.prixUnitaire),
          unite: row.unite || 'pièce',
          tauxTVA: parseNumber(row.tauxTVA) || 20,
          infoLibre: row.infoLibre || null,
          actif: parseBool(row.actif),
        }
      });
      count++;
    } catch (e) { console.error('Error importing article:', e); }
  }
  return count;
}

async function importFacturesClients(rows: Record<string, string>[]): Promise<number> {
  let count = 0;
  for (const row of rows) {
    if (!row.numero || !row.codeClient) continue;
    try {
      const client = await prisma.tiers.findFirst({
        where: { code: row.codeClient, type: 'CLIENT' }
      });
      if (!client) continue;

      await prisma.factureClient.upsert({
        where: { numero: row.numero },
        create: {
          numero: row.numero,
          dateFacture: parseDate(row.dateFacture),
          clientId: client.id,
          bonCommande: row.bonCommande || null,
          numeroBL: row.numeroBL || null,
          dateEcheance: parseDate(row.dateEcheance || row.dateFacture),
          statut: row.statut || 'BROUILLON',
          totalHT: parseNumber(row.totalHT),
          totalTVA: parseNumber(row.totalTVA),
          totalTTC: parseNumber(row.totalTTC) || parseNumber(row.totalHT) + parseNumber(row.totalTVA),
          notes: row.notes || null,
          notesLivraison: row.notesLivraison || null,
          infoLibre: row.infoLibre || null,
        },
        update: {
          dateFacture: parseDate(row.dateFacture),
          dateEcheance: parseDate(row.dateEcheance || row.dateFacture),
          bonCommande: row.bonCommande || null,
          numeroBL: row.numeroBL || null,
          statut: row.statut || 'BROUILLON',
          totalHT: parseNumber(row.totalHT),
          totalTVA: parseNumber(row.totalTVA),
          totalTTC: parseNumber(row.totalTTC) || parseNumber(row.totalHT) + parseNumber(row.totalTVA),
          notes: row.notes || null,
          notesLivraison: row.notesLivraison || null,
          infoLibre: row.infoLibre || null,
        }
      });
      count++;
    } catch (e) { console.error('Error importing facture client:', e); }
  }
  return count;
}

async function importLignesFacturesClients(rows: Record<string, string>[]): Promise<number> {
  let count = 0;
  for (const row of rows) {
    if (!row.numeroFacture || !row.designation) continue;
    try {
      const facture = await prisma.factureClient.findFirst({
        where: { numero: row.numeroFacture }
      });
      if (!facture) continue;

      const article = row.codeArticle ? await prisma.article.findFirst({
        where: { code: row.codeArticle }
      }) : null;

      await prisma.ligneFactureClient.create({
        data: {
          factureId: facture.id,
          articleId: article?.id || null,
          designation: row.designation,
          quantite: parseNumber(row.quantite),
          prixUnitaire: parseNumber(row.prixUnitaire),
          tauxTVA: parseNumber(row.tauxTVA) || 20,
          totalHT: parseNumber(row.totalHT),
        }
      });
      count++;
    } catch (e) { console.error('Error importing ligne facture client:', e); }
  }
  return count;
}

async function importReglementsClients(rows: Record<string, string>[]): Promise<number> {
  let count = 0;
  for (const row of rows) {
    if (!row.numero || !row.numeroFacture) continue;
    try {
      const facture = await prisma.factureClient.findFirst({
        where: { numero: row.numeroFacture }
      });
      if (!facture) continue;

      await prisma.reglementClient.upsert({
        where: { numero: row.numero },
        create: {
          numero: row.numero,
          factureId: facture.id,
          dateReglement: parseDate(row.dateReglement),
          montant: parseNumber(row.montant),
          modePaiement: row.modePaiement || 'VIREMENT',
          reference: row.reference || null,
          infoLibre: row.infoLibre || null,
          notes: row.notes || null,
          statut: row.statut || 'ENREGISTRE',
        },
        update: {
          dateReglement: parseDate(row.dateReglement),
          montant: parseNumber(row.montant),
          modePaiement: row.modePaiement || 'VIREMENT',
          reference: row.reference || null,
          infoLibre: row.infoLibre || null,
          notes: row.notes || null,
          statut: row.statut || 'ENREGISTRE',
        }
      });
      count++;
    } catch (e) { console.error('Error importing reglement client:', e); }
  }
  return count;
}

async function importBonsLivraison(rows: Record<string, string>[]): Promise<number> {
  let count = 0;
  for (const row of rows) {
    if (!row.numero || !row.codeClient) continue;
    try {
      const client = await prisma.tiers.findFirst({
        where: { code: row.codeClient, type: 'CLIENT' }
      });
      if (!client) continue;

      await prisma.bonLivraison.upsert({
        where: { numero: row.numero },
        create: {
          numero: row.numero,
          dateBL: parseDate(row.dateBL),
          clientId: client.id,
          bonCommande: row.bonCommande || null,
          statut: row.statut || 'BROUILLON',
          infoLibre: row.infoLibre || null,
          notesLivraison: row.notesLivraison || null,
          totalHT: parseNumber(row.totalHT),
        },
        update: {
          dateBL: parseDate(row.dateBL),
          bonCommande: row.bonCommande || null,
          statut: row.statut || 'BROUILLON',
          infoLibre: row.infoLibre || null,
          notesLivraison: row.notesLivraison || null,
          totalHT: parseNumber(row.totalHT),
        }
      });
      count++;
    } catch (e) { console.error('Error importing bon livraison:', e); }
  }
  return count;
}

async function importLignesBonsLivraison(rows: Record<string, string>[]): Promise<number> {
  let count = 0;
  for (const row of rows) {
    if (!row.numeroBL || !row.designation) continue;
    try {
      const bl = await prisma.bonLivraison.findFirst({
        where: { numero: row.numeroBL }
      });
      if (!bl) continue;

      const article = row.codeArticle ? await prisma.article.findFirst({
        where: { code: row.codeArticle }
      }) : null;

      await prisma.ligneBonLivraison.create({
        data: {
          bonLivraisonId: bl.id,
          articleId: article?.id || null,
          designation: row.designation,
          quantite: parseNumber(row.quantite),
          prixUnitaire: parseNumber(row.prixUnitaire),
          totalHT: parseNumber(row.totalHT),
        }
      });
      count++;
    } catch (e) { console.error('Error importing ligne bon livraison:', e); }
  }
  return count;
}

async function importFacturesFournisseurs(rows: Record<string, string>[]): Promise<number> {
  let count = 0;
  for (const row of rows) {
    if (!row.numeroFacture || !row.codeFournisseur) continue;
    try {
      const fournisseur = await prisma.tiers.findFirst({
        where: { code: row.codeFournisseur, type: 'FOURNISSEUR' }
      });
      if (!fournisseur) continue;

      const montantHT = parseNumber(row.montantHT);
      const montantTVA = parseNumber(row.montantTVA);
      const montantTTC = parseNumber(row.montantTTC) || montantHT + montantTVA;

      // Check if exists (composite key: numeroFacture + fournisseurId)
      const existing = await prisma.factureFournisseur.findFirst({
        where: { numeroFacture: row.numeroFacture, fournisseurId: fournisseur.id }
      });

      if (existing) {
        await prisma.factureFournisseur.update({
          where: { id: existing.id },
          data: {
            dateFacture: parseDate(row.dateFacture),
            dateEcheance: parseDate(row.dateEcheance || row.dateFacture),
            montantHT,
            montantTVA,
            montantTTC,
            statut: row.statut || 'ENREGISTREE',
            infoLibre: row.infoLibre || null,
            notes: row.notes || null,
          }
        });
      } else {
        await prisma.factureFournisseur.create({
          data: {
            numeroFacture: row.numeroFacture,
            fournisseurId: fournisseur.id,
            dateFacture: parseDate(row.dateFacture),
            dateEcheance: parseDate(row.dateEcheance || row.dateFacture),
            montantHT,
            montantTVA,
            montantTTC,
            statut: row.statut || 'ENREGISTREE',
            infoLibre: row.infoLibre || null,
            notes: row.notes || null,
          }
        });
      }
      count++;
    } catch (e) { console.error('Error importing facture fournisseur:', e); }
  }
  return count;
}

async function importReglementsFournisseurs(rows: Record<string, string>[]): Promise<number> {
  let count = 0;
  for (const row of rows) {
    if (!row.numeroFacture) continue;
    try {
      const facture = await prisma.factureFournisseur.findFirst({
        where: { numeroFacture: row.numeroFacture }
      });
      if (!facture) continue;

      await prisma.reglementFournisseur.create({
        data: {
          factureId: facture.id,
          dateReglement: parseDate(row.dateReglement),
          montant: parseNumber(row.montant),
          modePaiement: row.modePaiement || 'VIREMENT',
          reference: row.reference || null,
          infoLibre: row.infoLibre || null,
          notes: row.notes || null,
          statut: row.statut || 'ENREGISTRE',
        }
      });
      count++;
    } catch (e) { console.error('Error importing reglement fournisseur:', e); }
  }
  return count;
}

async function importParametres(rows: Record<string, string>[]): Promise<number> {
  let count = 0;
  for (const row of rows) {
    if (!row.nomEntreprise) continue;
    try {
      // Get existing parametres (should be only one)
      const existing = await prisma.parametres.findFirst();
      
      if (existing) {
        await prisma.parametres.update({
          where: { id: existing.id },
          data: {
            nomEntreprise: row.nomEntreprise,
            adresseEntreprise: row.adresseEntreprise || null,
            villeEntreprise: row.villeEntreprise || null,
            telephoneEntreprise: row.telephoneEntreprise || null,
            emailEntreprise: row.emailEntreprise || null,
            ice: row.ice || null,
            rc: row.rc || null,
            rcLieu: row.rcLieu || null,
            if: row.if || row['if'] || null,
            tp: row.tp || null,
            cnss: row.cnss || null,
            infoLibre: row.infoLibre || null,
            tvaDefaut: parseNumber(row.tvaDefaut) || 20,
            prefixeFacture: row.prefixeFacture || null,
            numeroFactureDepart: parseNumber(row.numeroFactureDepart) || null,
            prefixeBL: row.prefixeBL || null,
            numeroBLDepart: parseNumber(row.numeroBLDepart) || null,
          }
        });
      } else {
        await prisma.parametres.create({
          data: {
            nomEntreprise: row.nomEntreprise,
            adresseEntreprise: row.adresseEntreprise || null,
            villeEntreprise: row.villeEntreprise || null,
            telephoneEntreprise: row.telephoneEntreprise || null,
            emailEntreprise: row.emailEntreprise || null,
            ice: row.ice || null,
            rc: row.rc || null,
            rcLieu: row.rcLieu || null,
            if: row.if || row['if'] || null,
            tp: row.tp || null,
            cnss: row.cnss || null,
            infoLibre: row.infoLibre || null,
            tvaDefaut: parseNumber(row.tvaDefaut) || 20,
            prefixeFacture: row.prefixeFacture || null,
            numeroFactureDepart: parseNumber(row.numeroFactureDepart) || null,
            prefixeBL: row.prefixeBL || null,
            numeroBLDepart: parseNumber(row.numeroBLDepart) || null,
          }
        });
      }
      count++;
    } catch (e) { console.error('Error importing parametres:', e); }
  }
  return count;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = buffer.toString('utf-8');
    
    // Parse the combined CSV
    const sections = await parseCSV(text);
    
    if (sections.length === 0) {
      return NextResponse.json({ error: 'Aucune section trouvée dans le fichier' }, { status: 400 });
    }

    const results: ImportResult[] = [];

    // Import in correct order (dependencies)
    // 1. Tiers first (needed by everything)
    const tiersSection = sections.find(s => s.section === 'tiers');
    if (tiersSection) {
      const count = await importTiers(tiersSection.rows);
      results.push({ section: 'tiers', count });
    }

    // 2. Articles
    const articlesSection = sections.find(s => s.section === 'articles');
    if (articlesSection) {
      const count = await importArticles(articlesSection.rows);
      results.push({ section: 'articles', count });
    }

    // 3. Parametres
    const parametresSection = sections.find(s => s.section === 'parametres');
    if (parametresSection) {
      const count = await importParametres(parametresSection.rows);
      results.push({ section: 'parametres', count });
    }

    // 4. Factures Clients
    const facturesClientsSection = sections.find(s => s.section === 'factures_clients');
    if (facturesClientsSection) {
      const count = await importFacturesClients(facturesClientsSection.rows);
      results.push({ section: 'factures_clients', count });
    }

    // 5. Lignes Factures Clients (after factures)
    const lignesFacturesClientsSection = sections.find(s => s.section === 'lignes_factures_clients');
    if (lignesFacturesClientsSection) {
      const count = await importLignesFacturesClients(lignesFacturesClientsSection.rows);
      results.push({ section: 'lignes_factures_clients', count });
    }

    // 6. Bons Livraison
    const bonsLivraisonSection = sections.find(s => s.section === 'bons_livraison');
    if (bonsLivraisonSection) {
      const count = await importBonsLivraison(bonsLivraisonSection.rows);
      results.push({ section: 'bons_livraison', count });
    }

    // 7. Lignes Bons Livraison
    const lignesBonsLivraisonSection = sections.find(s => s.section === 'lignes_bons_livraison');
    if (lignesBonsLivraisonSection) {
      const count = await importLignesBonsLivraison(lignesBonsLivraisonSection.rows);
      results.push({ section: 'lignes_bons_livraison', count });
    }

    // 8. Règlements Clients (after factures)
    const reglementsClientsSection = sections.find(s => s.section === 'reglements_clients');
    if (reglementsClientsSection) {
      const count = await importReglementsClients(reglementsClientsSection.rows);
      results.push({ section: 'reglements_clients', count });
    }

    // 9. Factures Fournisseurs
    const facturesFournisseursSection = sections.find(s => s.section === 'factures_fournisseurs');
    if (facturesFournisseursSection) {
      const count = await importFacturesFournisseurs(facturesFournisseursSection.rows);
      results.push({ section: 'factures_fournisseurs', count });
    }

    // 10. Règlements Fournisseurs
    const reglementsFournisseursSection = sections.find(s => s.section === 'reglements_fournisseurs');
    if (reglementsFournisseursSection) {
      const count = await importReglementsFournisseurs(reglementsFournisseursSection.rows);
      results.push({ section: 'reglements_fournisseurs', count });
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('Import all error:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de l\'import' }, { status: 500 });
  }
}
