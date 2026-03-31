import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Only create client if DATABASE_URL exists
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not set - Prisma client will not be able to connect')
  }

  return new PrismaClient({
    log: [],
  })
}

// Singleton pattern to prevent multiple PrismaClient instances
export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
