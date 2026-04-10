import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

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
    });

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    const branchProducts = await db.branchProduct.findMany({
      where: { branchId: id },
      include: {
        product: {
          include: { category: true },
        },
      },
      orderBy: { productId: 'asc' },
    });

    return NextResponse.json(branchProducts);
  } catch (error) {
    console.error('Get branch products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
