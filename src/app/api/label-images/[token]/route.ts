import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'label-images';
const TOKEN_PATTERN = /^[A-Za-z0-9]{25,128}$/;

type StoredLabel = { html: string; width: number; height: number };

async function getStoredLabel(token: string): Promise<StoredLabel | null> {
  const rows = await prisma.$queryRaw<StoredLabel[]>`
    SELECT "html", "width", "height" FROM "LabelImage" WHERE "token" = ${token} LIMIT 1
  `;
  return rows[0] || null;
}

function htmlDocument(html: string) {
  const safeHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>*{box-sizing:border-box}html,body{margin:0;padding:0;min-height:100%;background:#f5f5f5}body{display:flex;justify-content:center;align-items:flex-start;padding:12px;overflow:auto}.label-card{border:0!important;flex:0 0 auto}img{max-width:none}svg{max-width:100%;height:auto}@media(max-width:480px){body{padding:6px}}</style></head><body>${safeHtml}</body></html>`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN_PATTERN.test(token)) return new NextResponse('Image introuvable', { status: 404 });

  if (request.nextUrl.searchParams.get('format') === 'html') {
    try {
      const image = await getStoredLabel(token);
      if (!image) return new NextResponse('Étiquette introuvable', { status: 404 });
      return new NextResponse(htmlDocument(image.html), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    } catch (error) {
      console.error('Lecture HTML de l’étiquette impossible:', error);
      return new NextResponse('Étiquette temporairement indisponible', { status: 503 });
    }
  }

  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(SUPABASE_BUCKET)}/${encodeURIComponent(`${token}.svg`)}`, { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY }, cache: 'no-store' });
      if (response.ok) return new NextResponse(await response.arrayBuffer(), { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=31536000, immutable' } });
    } catch (error) { console.warn('Lecture Supabase impossible, repli PostgreSQL:', error); }
  }

  const image = await getStoredLabel(token);
  if (!image) return new NextResponse('Image introuvable', { status: 404 });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="${image.width}mm" height="${image.height}mm" viewBox="0 0 1000 1000"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;overflow:hidden">${image.html}</div></foreignObject></svg>`;
  return new NextResponse(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
