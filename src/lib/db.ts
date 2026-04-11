import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let _db: PrismaClient | null = null;

function createClient(): PrismaClient {
  // Read URL from env
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;

  console.log('[DB] Connecting with URL present:', !!url);
  if (url) {
    console.log('[DB] Protocol:', url.split(':')[0]);
  }

  if (!url || (!url.startsWith('libsql://') && !url.startsWith('https://') && !url.startsWith('file:'))) {
    // Development or broken fallback: local SQLite
    console.log('[DB] Using fallback local SQLite');
    return new PrismaClient({
      datasourceUrl: 'file:./db/custom.db',
    });
  }

  if (url.startsWith('libsql://') || url.startsWith('https://')) {
    // Turso: use libsql adapter
    console.log('[DB] Initializing Turso adapter');
    const { PrismaLibSQL } = require('@prisma/adapter-libsql');
    const { createClient: createLibSQLClient } = require('@libsql/client');

    const libsql = createLibSQLClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || '',
    });

    return new PrismaClient({
      adapter: new PrismaLibSQL(libsql),
    } as any);
  }

  // Fallback: use URL as-is (likely a valid file: or other protocol)
  console.log('[DB] Using direct connection URL');
  return new PrismaClient({ datasourceUrl: url });
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_, prop, receiver) {
    if (!_db) {
      _db = createClient();
      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = _db;
      }
    }
    const value = Reflect.get(_db, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(_db);
    }
    return value;
  },
});
