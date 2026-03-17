import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Format number with comma as decimal separator
const formatNumber = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') {
    return val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(val);
};

const formatDate = (val: any): string => {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().split('T')[0];
  return String(val);
};

interface ExportConfig {
  name: string;
  headers: string[];
  numericFields: string[];
  getData: () => Promise<any[]>;
  transformRow: (row: any, headers: string[]) => Record<string, string>;
}

const exportConfigs: ExportConfig[] = [
  {
    name: 'tiers',
    headers: ['code', 'type', 'raisonSociale', 'adresse', 'adresse2', 'codePostal', 'ville', 'pays', 'telephone', 'email', 'ice', 'rc', 'rcLieu', 'if', 'tp', 'cnss', 'infoLibre', 'notes'],
    numericFields: [],
    getData: () => prisma.tiers.findMany(),
    transformRow: (row, headers) => {
      const values: Record<string, string> = {};
      for (const h of headers) {
        const val = row[h];
        if (val === null || val === undefined) values[h] = '';
        else if (typeof val === 'boolean') values[h] = val ? 'true' : 'false';
        else if (val instanceof Date) values[h] = formatDate(val);
        else values[h] = String(val);
      }
      return values;
    }
  },
  {
    name: 'articles',
    headers: ['code', 'designation', 'prixUnitaire', 'unite', 'tauxTVA', 'infoLibre', 'actif'],
    numericFields: ['prixUnitaire', 'tauxTVA'],
    getData: () => prisma.article.findMany(),
    transformRow: (row, headers) => {
      const values: Record<string, string> = {};
      for (const h of headers) {
        const val = row[h];
        if (val === null || val === undefined) values[h] = '';
        else if (typeof val === 'boolean') values[h] = val ? 'true' : 'false';
        else if (typeof val === 'number') values[h] = formatNumber(val);
        else values[h] = String(val);
      }
      return values;
    }
  },
  {
    name: 'factures_clients',
    headers: ['numero', 'dateFacture', 'codeClient', 'raisonSocialeClient', 'bonCommande', 'numeroBL', 'dateEcheance', 'totalHT', 'totalTVA', 'totalTTC', 'statut', 'notes', 'notesLivraison', 'infoLibre'],
    numericFields: ['totalHT', 'totalTVA', 'totalTTC'],
    getData: () => prisma.factureClient.findMany({ include: { client: true }, orderBy: { dateFacture: 'desc' } }),
    transformRow: (row, headers) => {
      const values: Record<string, string> = {};
      for (const h of headers) {
        if (h === 'codeClient') values[h] = row.client?.code || '';
        else if (h === 'raisonSocialeClient') values[h] = row.client?.raisonSociale || '';
        else if (row[h] === null || row[h] === undefined) values[h] = '';
        else if (typeof row[h] === 'number') values[h] = formatNumber(row[h]);
        else if (row[h] instanceof Date) values[h] = formatDate(row[h]);
        else values[h] = String(row[h]);
      }
      return values;
    }
  },
  {
    name: 'lignes_factures_clients',
    headers: ['numeroFacture', 'codeArticle', 'designation', 'quantite', 'prixUnitaire', 'tauxTVA', 'totalHT'],
    numericFields: ['quantite', 'prixUnitaire', 'tauxTVA', 'totalHT'],
    getData: async () => {
      const lignes = await prisma.ligneFactureClient.findMany({
        include: { facture: true, article: true },
        orderBy: { facture: { dateFacture: 'desc' } }
      });
      return lignes;
    },
    transformRow: (row, headers) => {
      const values: Record<string, string> = {};
      for (const h of headers) {
        if (h === 'numeroFacture') values[h] = row.facture?.numero || '';
        else if (h === 'codeArticle') values[h] = row.article?.code || '';
        else if (row[h] === null || row[h] === undefined) values[h] = '';
        else if (typeof row[h] === 'number') values[h] = formatNumber(row[h]);
        else values[h] = String(row[h]);
      }
      return values;
    }
  },
  {
    name: 'reglements_clients',
    headers: ['numero', 'dateReglement', 'numeroFacture', 'codeClient', 'raisonSocialeClient', 'montant', 'modePaiement', 'reference', 'infoLibre', 'notes', 'statut'],
    numericFields: ['montant'],
    getData: () => prisma.reglementClient.findMany({
      include: { facture: { include: { client: true } } },
      orderBy: { dateReglement: 'desc' }
    }),
    transformRow: (row, headers) => {
      const values: Record<string, string> = {};
      for (const h of headers) {
        if (h === 'numeroFacture') values[h] = row.facture?.numero || '';
        else if (h === 'codeClient') values[h] = row.facture?.client?.code || '';
        else if (h === 'raisonSocialeClient') values[h] = row.facture?.client?.raisonSociale || '';
        else if (row[h] === null || row[h] === undefined) values[h] = '';
        else if (typeof row[h] === 'number') values[h] = formatNumber(row[h]);
        else if (row[h] instanceof Date) values[h] = formatDate(row[h]);
        else values[h] = String(row[h]);
      }
      return values;
    }
  },
  {
    name: 'bons_livraison',
    headers: ['numero', 'dateBL', 'codeClient', 'raisonSocialeClient', 'bonCommande', 'statut', 'infoLibre', 'notesLivraison', 'totalHT'],
    numericFields: ['totalHT'],
    getData: () => prisma.bonLivraison.findMany({
      include: { client: true },
      orderBy: { dateBL: 'desc' }
    }),
    transformRow: (row, headers) => {
      const values: Record<string, string> = {};
      for (const h of headers) {
        if (h === 'codeClient') values[h] = row.client?.code || '';
        else if (h === 'raisonSocialeClient') values[h] = row.client?.raisonSociale || '';
        else if (row[h] === null || row[h] === undefined) values[h] = '';
        else if (typeof row[h] === 'number') values[h] = formatNumber(row[h]);
        else if (row[h] instanceof Date) values[h] = formatDate(row[h]);
        else values[h] = String(row[h]);
      }
      return values;
    }
  },
  {
    name: 'lignes_bons_livraison',
    headers: ['numeroBL', 'codeArticle', 'designation', 'quantite', 'prixUnitaire', 'totalHT'],
    numericFields: ['quantite', 'prixUnitaire', 'totalHT'],
    getData: async () => {
      const lignes = await prisma.ligneBonLivraison.findMany({
        include: { bonLivraison: true, article: true },
        orderBy: { bonLivraison: { dateBL: 'desc' } }
      });
      return lignes;
    },
    transformRow: (row, headers) => {
      const values: Record<string, string> = {};
      for (const h of headers) {
        if (h === 'numeroBL') values[h] = row.bonLivraison?.numero || '';
        else if (h === 'codeArticle') values[h] = row.article?.code || '';
        else if (row[h] === null || row[h] === undefined) values[h] = '';
        else if (typeof row[h] === 'number') values[h] = formatNumber(row[h]);
        else values[h] = String(row[h]);
      }
      return values;
    }
  },
  {
    name: 'factures_fournisseurs',
    headers: ['numeroFacture', 'dateFacture', 'codeFournisseur', 'raisonSocialeFournisseur', 'dateEcheance', 'montantHT', 'montantTVA', 'montantTTC', 'statut', 'infoLibre', 'notes'],
    numericFields: ['montantHT', 'montantTVA', 'montantTTC'],
    getData: () => prisma.factureFournisseur.findMany({
      include: { fournisseur: true },
      orderBy: { dateFacture: 'desc' }
    }),
    transformRow: (row, headers) => {
      const values: Record<string, string> = {};
      for (const h of headers) {
        if (h === 'codeFournisseur') values[h] = row.fournisseur?.code || '';
        else if (h === 'raisonSocialeFournisseur') values[h] = row.fournisseur?.raisonSociale || '';
        else if (row[h] === null || row[h] === undefined) values[h] = '';
        else if (typeof row[h] === 'number') values[h] = formatNumber(row[h]);
        else if (row[h] instanceof Date) values[h] = formatDate(row[h]);
        else values[h] = String(row[h]);
      }
      return values;
    }
  },
  {
    name: 'reglements_fournisseurs',
    headers: ['dateReglement', 'numeroFacture', 'codeFournisseur', 'raisonSocialeFournisseur', 'montant', 'modePaiement', 'reference', 'infoLibre', 'notes', 'statut'],
    numericFields: ['montant'],
    getData: () => prisma.reglementFournisseur.findMany({
      include: { facture: { include: { fournisseur: true } } },
      orderBy: { dateReglement: 'desc' }
    }),
    transformRow: (row, headers) => {
      const values: Record<string, string> = {};
      for (const h of headers) {
        if (h === 'numeroFacture') values[h] = row.facture?.numeroFacture || '';
        else if (h === 'codeFournisseur') values[h] = row.facture?.fournisseur?.code || '';
        else if (h === 'raisonSocialeFournisseur') values[h] = row.facture?.fournisseur?.raisonSociale || '';
        else if (row[h] === null || row[h] === undefined) values[h] = '';
        else if (typeof row[h] === 'number') values[h] = formatNumber(row[h]);
        else if (row[h] instanceof Date) values[h] = formatDate(row[h]);
        else values[h] = String(row[h]);
      }
      return values;
    }
  },
  {
    name: 'parametres',
    headers: ['nomEntreprise', 'adresseEntreprise', 'villeEntreprise', 'telephoneEntreprise', 'emailEntreprise', 'ice', 'rc', 'rcLieu', 'if', 'tp', 'cnss', 'infoLibre', 'tvaDefaut', 'prefixeFacture', 'numeroFactureDepart', 'prefixeBL', 'numeroBLDepart'],
    numericFields: ['tvaDefaut', 'numeroFactureDepart', 'numeroBLDepart'],
    getData: () => prisma.parametres.findMany(),
    transformRow: (row, headers) => {
      const values: Record<string, string> = {};
      for (const h of headers) {
        if (row[h] === null || row[h] === undefined) values[h] = '';
        else if (typeof row[h] === 'number') values[h] = formatNumber(row[h]);
        else values[h] = String(row[h]);
      }
      return values;
    }
  }
];

export async function GET(request: NextRequest) {
  try {
    // Generate all CSV files content
    const allCsvContent: { name: string; content: string }[] = [];

    for (const config of exportConfigs) {
      const data = await config.getData();
      
      // Generate CSV content
      const csvRows = [config.headers.join(';')];
      
      for (const row of data) {
        const transformed = config.transformRow(row, config.headers);
        const values = config.headers.map(h => String(transformed[h] || '').replace(/;/g, ',').replace(/\n/g, ' '));
        csvRows.push(values.join(';'));
      }

      allCsvContent.push({
        name: config.name,
        content: csvRows.join('\n')
      });
    }

    // Create a combined CSV with multiple sections separated by markers
    // Each section starts with ===FILENAME=== and ends with ===END===
    let combinedContent = '';
    const bom = '\uFEFF'; // UTF-8 BOM for Excel compatibility

    for (const csv of allCsvContent) {
      combinedContent += `===${csv.name}===\n`;
      combinedContent += csv.content;
      combinedContent += `\n===END===\n\n`;
    }

    // Return as single CSV file
    return new NextResponse(bom + combinedContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="gestfact_export_all_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error: any) {
    console.error('Export all error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
