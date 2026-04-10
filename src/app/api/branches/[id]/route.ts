import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, requireRole, createAuditLog } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const branch = await db.branch.findFirst({
      where: { id, companyId: auth.user.companyId },
      include: {
        _count: {
          select: { users: true, invoices: true },
        },
      },
    });

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    return NextResponse.json(branch);
  } catch (error) {
    console.error('Get branch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(auth.user, ['owner', 'manager'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.branch.findFirst({
      where: { id, companyId: auth.user.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    // Manager can only update their own branch
    if (auth.user.role === 'manager' && auth.user.branchId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, address, phone, isActive } = body;

    const branch = await db.branch.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    await createAuditLog({
      action: 'update',
      entity: 'branch',
      entityId: id,
      userId: auth.user.id,
      companyId: auth.user.companyId,
      branchId: id,
      details: JSON.stringify(body),
    });

    return NextResponse.json(branch);
  } catch (error) {
    console.error('Update branch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
