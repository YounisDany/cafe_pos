import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL;

  // Connect to Turso via libsql adapter (production)
  if (dbUrl?.startsWith('libsql://')) {
    const authToken = process.env.DATABASE_AUTH_TOKEN;
    if (!authToken) {
      throw new Error('DATABASE_AUTH_TOKEN is not set in environment variables.');
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require('@prisma/adapter-libsql');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client');

    const libsql = createClient({
      url: dbUrl,
      authToken,
    });

    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({
      adapter,
      datasourceUrl: 'file:./dummy.db',
    } as any);
  }

  // Local development: use SQLite file
  if (!dbUrl && process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is not set. Add it in Vercel → Settings → Environment Variables.');
  }

  return new PrismaClient();
}

// Lazy singleton: only create on first actual database call, not at import time
let _db: PrismaClient | undefined;

export function getDb(): PrismaClient {
  if (!_db) {
    _db = createPrismaClient();
  }
  // Persist in global for hot-reload in dev
  if (process.env.NODE_ENV !== 'production' && !globalForPrisma.prisma) {
    globalForPrisma.prisma = _db;
  }
  return _db;
}

// For backward compatibility
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});
