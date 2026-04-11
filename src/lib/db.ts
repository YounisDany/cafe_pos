import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let _db: PrismaClient | null = null;

function createClient(): PrismaClient {
  // Read URL from env
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;

  if (!url) {
    // Development: local SQLite
    return new PrismaClient({
      datasourceUrl: 'file:./db/custom.db',
    });
  }

  if (url.startsWith('libsql://')) {
    // Turso: use libsql adapter
    const { PrismaLibSQL } = require('@prisma/adapter-libsql');
    const { createClient } = require('@libsql/client');

    const libsql = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || '',
    });

    return new PrismaClient({
      adapter: new PrismaLibSQL(libsql),
    } as any);
  }

  // Fallback: use URL as-is
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
