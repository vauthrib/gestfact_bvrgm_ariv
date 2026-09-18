import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ArticleQrPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const rows = await prisma.$queryRaw<Array<{ code: string; designation: string; unite: string }>>`SELECT code, designation, unite FROM "Article" WHERE code = ${decodeURIComponent(code)} LIMIT 1`;
  const article = rows[0];

  if (!article) return <main style={{ fontFamily: 'Arial, sans-serif', padding: 32 }}><h1>Article introuvable</h1><p>La référence scannée n’existe pas.</p></main>;

  return <main style={{ fontFamily: 'Arial, sans-serif', maxWidth: 640, margin: '40px auto', padding: 24 }}><h1>Fiche article</h1><dl><dt>Référence</dt><dd>{article.code}</dd><dt>Désignation</dt><dd>{article.designation}</dd><dt>Unité</dt><dd>{article.unite}</dd></dl></main>;
}
