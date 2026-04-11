import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL;

  // Production: connect to Turso via libsql adapter
  if (dbUrl?.startsWith('libsql://')) {
    if (!process.env.DATABASE_AUTH_TOKEN) {
      throw new Error('DATABASE_AUTH_TOKEN is not set in environment variables.');
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require('@prisma/adapter-libsql');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client');

    const libsql = createClient({
      url: dbUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });

    const adapter = new PrismaLibSQL(libsql);
    // datasourceUrl overrides schema URL validation (sqlite provider rejects libsql://)
    return new PrismaClient({
      adapter,
      datasourceUrl: 'file:./dummy.db',
    } as any);
  }

  // Local development: use SQLite file
  if (!dbUrl && process.env.NODE_ENV === 'production') {
    throw new Error(
      'DATABASE_URL is not set. Add it in Vercel → Settings → Environment Variables.\n' +
      'Example: libsql://your-db.turso.io'
    );
  }

  return new PrismaClient();
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
