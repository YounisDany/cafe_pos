import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, requireRole, createAuditLog } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let branches;

    if (auth.user.role === 'owner') {
      branches = await db.branch.findMany({
        where: { companyId: auth.user.companyId },
        include: {
          _count: {
            select: { users: true, invoices: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Manager/cashier only see their own branch
      branches = await db.branch.findMany({
        where: {
          companyId: auth.user.companyId,
          ...(auth.user.branchId ? { id: auth.user.branchId } : {}),
        },
        include: {
          _count: {
            select: { users: true, invoices: true },
          },
        },
      });
    }

    return NextResponse.json(branches);
  } catch (error) {
    console.error('List branches error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(auth.user, ['owner'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, address, phone } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const branch = await db.branch.create({
      data: {
        name,
        address,
        phone,
        companyId: auth.user.companyId,
      },
    });

    await createAuditLog({
      action: 'create',
      entity: 'branch',
      entityId: branch.id,
      userId: auth.user.id,
      companyId: auth.user.companyId,
      branchId: branch.id,
      details: JSON.stringify({ name: branch.name }),
    });

    return NextResponse.json(branch, { status: 201 });
  } catch (error) {
    console.error('Create branch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
