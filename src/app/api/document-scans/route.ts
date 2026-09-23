import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'label-images';

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DocumentScan" (
      "id" TEXT NOT NULL,
      "typeDoc" TEXT NOT NULL,
      "numeroDoc" TEXT NOT NULL,
      "nature" TEXT NOT NULL DEFAULT 'AR_CLIENT',
      "nomFichier" TEXT NOT NULL,
      "storagePath" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "taille" INTEGER NOT NULL DEFAULT 0,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DocumentScan_pkey" PRIMARY KEY ("id")
    );
  `);
  try {
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "DocumentScan_typeDoc_numeroDoc_idx" ON "DocumentScan"("typeDoc", "numeroDoc");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "DocumentScan_nature_idx" ON "DocumentScan"("nature");`);
  } catch {}
}

// GET : Liste les scans pour un document donné (typeDoc & numeroDoc)
export async function GET(request: NextRequest) {
  try {
    await ensureTable();

    const { searchParams } = new URL(request.url);
    const typeDoc = searchParams.get('typeDoc');
    const numeroDoc = searchParams.get('numeroDoc');

    if (!typeDoc || !numeroDoc) {
      return NextResponse.json({ error: 'typeDoc et numeroDoc sont requis' }, { status: 400 });
    }

    const scans = await prisma.documentScan.findMany({
      where: { typeDoc, numeroDoc },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(scans);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST : Upload d'un fichier scan pour un document
export async function POST(request: NextRequest) {
  try {
    // Garantir la création de la table avant toute tentative d'écriture
    await ensureTable();

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json({ error: 'Configuration Supabase manquante' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const typeDoc = formData.get('typeDoc') as string | null;
    const numeroDoc = formData.get('numeroDoc') as string | null;
    const nature = (formData.get('nature') as string) || 'AR_CLIENT';
    const notes = (formData.get('notes') as string) || null;

    if (!file || !typeDoc || !numeroDoc) {
      return NextResponse.json({ error: 'Fichier, typeDoc et numeroDoc sont obligatoires' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'bin';
    const cleanNumero = numeroDoc.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanType = typeDoc.toLowerCase().replace(/_/g, '-');
    const storagePath = `scans/${cleanType}/${cleanNumero}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    // Upload vers Supabase Storage
    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(SUPABASE_BUCKET)}/${storagePath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      const errTxt = await uploadRes.text().catch(() => '');
      return NextResponse.json({ error: `Échec stockage Supabase (${uploadRes.status}): ${errTxt}` }, { status: 500 });
    }

    // Enregistrement en base de données
    const record = await prisma.documentScan.create({
      data: {
        typeDoc,
        numeroDoc,
        nature,
        nomFichier: file.name,
        storagePath,
        mimeType: file.type || 'application/octet-stream',
        taille: buffer.length,
        notes,
      }
    });

    return NextResponse.json(record);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE : Supprime un scan par son id
export async function DELETE(request: NextRequest) {
  try {
    await ensureTable();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const scan = await prisma.documentScan.findUnique({ where: { id } });
    if (!scan) {
      return NextResponse.json({ error: 'Scan introuvable' }, { status: 404 });
    }

    if (SUPABASE_URL && SUPABASE_KEY && scan.storagePath) {
      await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(SUPABASE_BUCKET)}/${scan.storagePath}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
        }
      }).catch(() => {});
    }

    await prisma.documentScan.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
