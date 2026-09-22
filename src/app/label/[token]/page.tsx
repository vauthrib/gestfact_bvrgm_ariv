import type { CSSProperties } from 'react';

export const dynamic = 'force-dynamic';

export default async function LabelImagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const imageStyle: CSSProperties = { maxWidth: '100%', height: 'auto', background: 'white' };
  return (
    <main style={{ margin: 0, padding: 16, textAlign: 'center', background: '#f5f5f5' }}>
      <img src={`/api/label-images/${encodeURIComponent(token)}`} alt="Étiquette" style={imageStyle} />
    </main>
  );
}
