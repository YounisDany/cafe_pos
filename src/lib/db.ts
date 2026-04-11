import { PrismaClient } from '@prisma/client';

// Lazy singleton - only connects to DB on first actual query call
let _db: PrismaClient | undefined;

function initDb(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL;

  // Production: must have DATABASE_URL
  if (!dbUrl) {
    throw new Error(
      'DATABASE_URL is not set! Go to Vercel → Settings → Environment Variables and add:\n' +
      'DATABASE_URL = libsql://cafe-younisdany.aws-ap-northeast-1.turso.io?authToken=YOUR_TOKEN'
    );
  }

  // Turso/libsql connection via driver adapter
  if (dbUrl.startsWith('libsql://')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PrismaLibSQL } = require('@prisma/adapter-libsql');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createClient } = require('@libsql/client');

      const client = createClient({ url: dbUrl });
      const adapter = new PrismaLibSQL(client);
      return new PrismaClient({ adapter } as any);
    } catch (e) {
      console.error('Failed to initialize libsql adapter:', e);
      throw new Error('Failed to connect to Turso database. Check @prisma/adapter-libsql installation.');
    }
  }

  // Local SQLite
  return new PrismaClient({ datasourceUrl: dbUrl });
}

// Proxy: delays initialization until first actual database call
export const db = new Proxy({} as PrismaClient, {
  get(_, prop) {
    if (!_db) _db = initDb();
    return (_db as any)[prop];
  },
});
