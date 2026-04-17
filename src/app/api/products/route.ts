import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, requireRole, createAuditLog } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const branchId = searchParams.get('branchId');

    const where: Record<string, unknown> = {
      companyId: auth.user.companyId,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameAr: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
      ];
    }

    const products = await db.product.findMany({
      where,
      include: {
        category: true,
        branchProducts: branchId
          ? {
              where: { branchId },
            }
          : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('List products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(auth.user, ['owner', 'manager'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, nameAr, description, sku, barcode, image, price, cost, categoryId, kitchenPrint } = body;

    if (!name || price === undefined || !categoryId) {
      return NextResponse.json({ error: 'Name, price, and categoryId are required' }, { status: 400 });
    }

    const product = await db.product.create({
      data: {
        name,
        nameAr,
        description,
        sku,
        barcode,
        image,
        price: parseFloat(price),
        cost: cost !== undefined ? parseFloat(cost) : null,
        kitchenPrint: kitchenPrint !== undefined ? kitchenPrint : false,
        categoryId,
        companyId: auth.user.companyId,
      },
      include: { category: true },
    });

    await createAuditLog({
      action: 'create',
      entity: 'product',
      entityId: product.id,
      userId: auth.user.id,
      companyId: auth.user.companyId,
      branchId: auth.user.branchId,
      details: JSON.stringify({ name: product.name, price: product.price }),
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
