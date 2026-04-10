import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, requireRole, createAuditLog } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(auth.user, ['owner'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isActive } = body;

    if (isActive === undefined) {
      return NextResponse.json({ error: 'isActive is required' }, { status: 400 });
    }

    const existing = await db.user.findFirst({
      where: { id, companyId: auth.user.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Cannot deactivate yourself
    if (id === auth.user.id) {
      return NextResponse.json({ error: 'Cannot change your own status' }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        companyId: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        branch: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      action: 'update',
      entity: 'user',
      entityId: id,
      userId: auth.user.id,
      companyId: auth.user.companyId,
      branchId: auth.user.branchId,
      details: JSON.stringify({ name: user.name, isActive }),
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Update user status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
