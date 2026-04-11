import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    envVars: {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET ✅' : 'NOT SET ❌',
      TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? 'SET ✅' : 'NOT SET ❌',
      DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN ? 'SET ✅' : 'NOT SET ❌',
      TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? 'SET ✅' : 'NOT SET ❌',
      NODE_ENV: process.env.NODE_ENV || 'unknown',
    },
    timestamp: new Date().toISOString(),
  });
}
