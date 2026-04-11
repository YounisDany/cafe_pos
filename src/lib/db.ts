import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL;

  // Connect to Turso via libsql adapter (production)
  if (dbUrl?.startsWith('libsql://')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require('@prisma/adapter-libsql');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client');

    const libsql = createClient({
      url: dbUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    });

    const adapter = new PrismaLibSQL(libsql);
    // Only pass adapter - do NOT pass datasourceUrl (incompatible with adapters)
    return new PrismaClient({ adapter } as any);
  }

  // Local development: use SQLite file, override the placeholder URL
  return new PrismaClient({
    datasourceUrl: dbUrl || 'file:./db/custom.db',
  });
}

// Lazy singleton: only create on first actual database call
let _db: PrismaClient | undefined;

export function getDb(): PrismaClient {
  if (!_db) {
    _db = createPrismaClient();
  }
  if (process.env.NODE_ENV !== 'production' && !globalForPrisma.prisma) {
    globalForPrisma.prisma = _db;
  }
  return _db;
}

// Backward compatible
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});
