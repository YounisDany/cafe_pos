import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, createAuditLog } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.session.deleteMany({
      where: { token: auth.token },
    });

    await createAuditLog({
      action: 'logout',
      entity: 'user',
      entityId: auth.user.id,
      userId: auth.user.id,
      companyId: auth.user.companyId,
      branchId: auth.user.branchId,
    });

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
