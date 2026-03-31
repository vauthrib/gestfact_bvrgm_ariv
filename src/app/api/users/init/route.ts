import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Helper to ensure auth tables exist
async function ensureAuthTables() {
  try {
    // Check if User table exists
    await db.$executeRaw`SELECT 1 FROM "User" LIMIT 1`;
  } catch (e) {
    // Table doesn't exist, create all auth tables
    console.log('Creating auth tables...');

    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL,
        "name" TEXT,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'USER',
        "permissions" TEXT,
        "actif" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      );
    `;
    await db.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`;

    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Account" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        "refresh_token" TEXT,
        "access_token" TEXT,
        "expires_at" INTEGER,
        "token_type" TEXT,
        "scope" TEXT,
        "id_token" TEXT,
        "session_state" TEXT,
        CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
      );
    `;
    await db.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");`;
    await db.$executeRaw`CREATE INDEX IF NOT EXISTS "Account_userId_idx" ON "Account"("userId");`;

    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL,
        "sessionToken" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "expires" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
      );
    `;
    await db.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionToken_key" ON "Session"("sessionToken");`;
    await db.$executeRaw`CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");`;

    await db.$executeRaw`
      CREATE TABLE IF NOT EXISTS "VerificationToken" (
        "identifier" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "expires" TIMESTAMP(3) NOT NULL
      );
    `;
    await db.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_token_key" ON "VerificationToken"("token");`;
    await db.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");`;

    // Add foreign key constraints
    try {
      await db.$executeRaw`ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`;
    } catch {}
    try {
      await db.$executeRaw`ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`;
    } catch {}

    console.log('Auth tables created successfully');
  }
}

// POST - Initialize first admin user (only if no users exist)
export async function POST(request: NextRequest) {
  try {
    // Ensure tables exist first
    await ensureAuthTables();

    // Check if any users exist
    const existingUsers = await db.user.count();

    if (existingUsers > 0) {
      return NextResponse.json({
        error: 'Des utilisateurs existent déjà. Initialisation impossible.'
      }, { status: 400 });
    }

    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({
        error: 'Email et mot de passe requis'
      }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create first admin user with all permissions
    const allPermissions = {
      dashboard: { view: true, edit: true },
      tiers: { view: true, edit: true, create: true },
      articles: { view: true, edit: true, create: true },
      bonsLivraison: { view: true, edit: true, create: true },
      facturesClients: { view: true, edit: true, create: true },
      avoirsClients: { view: true, edit: true, create: true },
      reglementsClients: { view: true, edit: true, create: true },
      facturesFournisseurs: { view: true, edit: true, create: true },
      reglementsFournisseurs: { view: true, edit: true, create: true }
    };

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || 'Administrateur',
        role: 'ADMIN',
        permissions: JSON.stringify(allPermissions),
        actif: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      message: 'Administrateur créé avec succès',
      user
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error initializing admin:', error);
    return NextResponse.json({
      error: error.message || 'Erreur serveur'
    }, { status: 500 });
  }
}

// GET - Check if initialization is needed
export async function GET() {
  try {
    // Ensure tables exist first
    await ensureAuthTables();

    const userCount = await db.user.count();

    return NextResponse.json({
      needsInit: userCount === 0,
      userCount
    });
  } catch (error: any) {
    console.error('Error checking initialization:', error);
    return NextResponse.json({
      error: error.message || 'Erreur serveur',
      needsInit: true
    }, { status: 200 });
  }
}
