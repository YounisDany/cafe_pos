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

    const product = await db.product.findFirst({
      where: { id, companyId: auth.user.companyId },
      include: {
        category: true,
        branchProducts: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Get product error:', error);
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

    const existing = await db.product.findFirst({
      where: { id, companyId: auth.user.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const { name, nameAr, description, sku, barcode, image, price, cost, categoryId, isAvailable, kitchenPrint } = body;

    const product = await db.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(nameAr !== undefined && { nameAr }),
        ...(description !== undefined && { description }),
        ...(sku !== undefined && { sku }),
        ...(barcode !== undefined && { barcode }),
        ...(image !== undefined && { image }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(cost !== undefined && { cost: cost !== null ? parseFloat(cost) : null }),
        ...(categoryId !== undefined && { categoryId }),
        ...(isAvailable !== undefined && { isAvailable }),
        ...(kitchenPrint !== undefined && { kitchenPrint }),
      },
      include: { category: true },
    });

    await createAuditLog({
      action: 'update',
      entity: 'product',
      entityId: product.id,
      userId: auth.user.id,
      companyId: auth.user.companyId,
      branchId: auth.user.branchId,
      details: JSON.stringify(body),
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    const existing = await db.product.findFirst({
      where: { id, companyId: auth.user.companyId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const product = await db.product.update({
      where: { id },
      data: { isAvailable: false },
    });

    await createAuditLog({
      action: 'delete',
      entity: 'product',
      entityId: product.id,
      userId: auth.user.id,
      companyId: auth.user.companyId,
      branchId: auth.user.branchId,
      details: JSON.stringify({ name: product.name }),
    });

    return NextResponse.json({ message: 'Product deactivated', product });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
