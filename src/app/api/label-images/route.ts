import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const APP_PREFIX = 'ARI';
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'label-images';

function isNewOpaqueToken(token: string) {
  return token.startsWith(APP_PREFIX) && /^[A-Za-z0-9]{25,128}$/.test(token);
}

function dimension(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(500, Math.max(1, parsed)) : fallback;
}

function sanitizeLabelHtml(html: string) {
  return html.replace(/<\/?(?:script|iframe|object|embed|link|meta)[^>]*>/gi, '').replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/javascript\s*:/gi, '');
}

function toSvg(html: string, width: number, height: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="${width}mm" height="${height}mm" viewBox="0 0 1000 1000"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;overflow:hidden">${sanitizeLabelHtml(html)}</div></foreignObject></svg>`;
}

async function uploadToSupabase(token: string, svg: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL et une clé de service Supabase sont nécessaires');
  }
  const path = `${token}.svg`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(SUPABASE_BUCKET)}/${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
      'Content-Type': 'image/svg+xml',
      'x-upsert': 'true',
      'cache-control': 'public, max-age=31536000, immutable',
    },
    body: svg,
    cache: 'no-store',
  });
  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Supabase Storage ${response.status}: ${details.slice(0, 300)}`);
  }
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const { token, html, width, height } = await request.json();
    if (typeof token !== 'string' || !isNewOpaqueToken(token) || typeof html !== 'string' || html.length > 2_000_000) return NextResponse.json({ error: 'Données d’étiquette invalides' }, { status: 400 });
    const labelWidth = dimension(width, 100);
    const labelHeight = dimension(height, 60);
    const svg = toSvg(html, labelWidth, labelHeight);
    let storage = 'postgresql';
    try {
      await uploadToSupabase(token, svg);
      storage = 'supabase';
    } catch (error) {
      console.error('Échec upload Supabase Storage:', error);
      return NextResponse.json({ error: 'Impossible d’enregistrer le fichier dans Supabase Storage' }, { status: 502 });
    }
    await prisma.$executeRaw`
      INSERT INTO "LabelImage" ("token", "html", "width", "height", "createdAt")
      VALUES (${token}, ${html}, ${labelWidth}, ${labelHeight}, CURRENT_TIMESTAMP)
      ON CONFLICT ("token") DO UPDATE SET "html" = EXCLUDED."html", "width" = EXCLUDED."width", "height" = EXCLUDED."height"
    `;
    return NextResponse.json({ success: true, storage });
  } catch (error: any) {
    console.error('Erreur enregistrement image étiquette:', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer l’image de l’étiquette' }, { status: 500 });
  }
}
