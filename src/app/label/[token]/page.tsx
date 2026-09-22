export const dynamic = 'force-dynamic';

export default async function LabelImagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main style={{ margin: 0, padding: 16, textAlign: 'center', background: '#f5f5f5' }}>
      <iframe src={`/api/label-images/${encodeURIComponent(token)}?format=html`} title="Étiquette" style={{ width: '100%', minHeight: '360px', height: '70vh', border: 0, background: 'white' }} />
    </main>
  );
}
