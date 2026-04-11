import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL;

  // Production must have DATABASE_URL set
  if (!dbUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'DATABASE_URL is not set. Please add it in Vercel → Settings → Environment Variables.\n' +
        'Value: libsql://cafe-younisdany.aws-ap-northeast-1.turso.io'
      );
    }
    // Local development fallback
    return new PrismaClient();
  }

  // For Turso/libsql URLs, use the driver adapter
  if (dbUrl.startsWith('libsql://')) {
    if (!process.env.DATABASE_AUTH_TOKEN) {
      throw new Error(
        'DATABASE_AUTH_TOKEN is not set. Please add it in Vercel → Settings → Environment Variables.'
      );
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
    return new PrismaClient({ adapter } as any);
  }

  return new PrismaClient();
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
