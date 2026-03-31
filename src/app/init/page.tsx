import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import InitForm from './InitForm';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function InitPage() {
  // First, ensure tables exist by calling setup internally
  try {
    await db.$executeRaw`SELECT 1 FROM "User" LIMIT 1`;
  } catch (e) {
    // Table doesn't exist, create it
    try {
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

      // Try to add foreign keys (may fail if already exist)
      try {
        await db.$executeRaw`ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`;
      } catch {}
      try {
        await db.$executeRaw`ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;`;
      } catch {}
    } catch (createError) {
      console.error('Error creating tables:', createError);
    }
  }

  // Now check if any users exist
  try {
    const userCount = await db.user.count();

    if (userCount > 0) {
      redirect('/login');
    }
  } catch (e) {
    // If still failing, show init form anyway
  }

  return <InitForm />;
}
