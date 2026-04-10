import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, requireRole, createAuditLog } from '@/lib/auth';
import bcrypt from 'bcryptjs';

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

    const user = await db.user.findFirst({
      where: { id, companyId: auth.user.companyId },
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Get user error:', error);
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
    const body = await request.json();

    const existing = await db.user.findFirst({
      where: { id, companyId: auth.user.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Manager can only update users in their own branch
    if (auth.user.role === 'manager' && auth.user.branchId !== existing.branchId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Manager cannot change roles
    if (auth.user.role === 'manager' && body.role) {
      delete body.role;
    }

    const { name, email, password, phone, role, branchId } = body;

    // Check email uniqueness if changing
    if (email && email !== existing.email) {
      const emailExists = await db.user.findUnique({ where: { email } });
      if (emailExists) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (branchId !== undefined) updateData.branchId = branchId;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
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
      details: JSON.stringify({ name: user.name, role: user.role }),
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
