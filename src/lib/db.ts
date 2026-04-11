import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient, type Client } from '@libsql/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || 'file:./db/custom.db';

  // If URL starts with "libsql://", use Turso adapter
  if (dbUrl.startsWith('libsql://')) {
    const authToken = process.env.DATABASE_AUTH_TOKEN;

    const libsqlClient: Client = createClient({
      url: dbUrl,
      authToken: authToken,
    });

    const adapter = new PrismaLibSQL(libsqlClient);
    return new PrismaClient({ adapter } as any);
  }

  // Default: local SQLite
  return new PrismaClient();
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
