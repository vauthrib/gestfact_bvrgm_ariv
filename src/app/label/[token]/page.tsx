import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function LabelImagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rows = await prisma.$queryRaw<Array<{ token: string }>>`
    SELECT "token" FROM "LabelImage" WHERE "token" = ${token} LIMIT 1
  `;
  if (!rows[0]) return <main style={{ fontFamily: 'Arial, sans-serif', padding: 32 }}><h1>Étiquette introuvable</h1></main>;
  return <main style={{ margin: 0, padding: 16, textAlign: 'center', background: '#f5f5f5' }}><img src={`/api/label-images/${encodeURIComponent(token)}`} alt="Étiquette" style={{ maxWidth: '100%', height: 'auto', background: 'white' }} /></main>;
}
