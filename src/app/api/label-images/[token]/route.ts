import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rows = await prisma.$queryRaw<Array<{ html: string; width: number; height: number }>>`
    SELECT "html", "width", "height" FROM "LabelImage" WHERE "token" = ${token} LIMIT 1
  `;
  const image = rows[0];
  if (!image) return new NextResponse('Image introuvable', { status: 404 });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="${image.width}mm" height="${image.height}mm" viewBox="0 0 1000 1000"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;overflow:hidden">${image.html}</div></foreignObject></svg>`;
  return new NextResponse(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
