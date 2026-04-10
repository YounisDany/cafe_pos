import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {
      invoice: {
        companyId: auth.user.companyId,
        status: 'paid',
        deletedAt: null,
      },
    };

    if (branchId) {
      (where.invoice as Record<string, unknown>).branchId = branchId;
    }

    if (from || to) {
      (where.invoice as Record<string, unknown>).createdAt = {};
      if (from) ((where.invoice as Record<string, unknown>).createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) ((where.invoice as Record<string, unknown>).createdAt as Record<string, unknown>).lte = new Date(to);
    }

    const grouped = await db.invoiceItem.groupBy({
      by: ['productId'],
      where,
      _sum: { quantity: true, total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
      take: limit,
    });

    const productsWithDetails = await Promise.all(
      grouped.map(async (item) => {
        const product = item.productId
          ? await db.product.findUnique({
              where: { id: item.productId },
              select: { id: true, name: true, nameAr: true, image: true, sku: true, category: { select: { name: true } } },
            })
          : null;

        return {
          productId: item.productId,
          name: product?.name || 'Unknown',
          nameAr: product?.nameAr || null,
          image: product?.image || null,
          sku: product?.sku || null,
          category: product?.category?.name || null,
          quantitySold: item._sum.quantity || 0,
          revenue: Math.round((item._sum.total || 0) * 100) / 100,
          orderCount: item._count,
        };
      })
    );

    const totalRevenue = productsWithDetails.reduce((sum, item) => sum + item.revenue, 0);
    const totalQuantity = productsWithDetails.reduce((sum, item) => sum + item.quantitySold, 0);

    return NextResponse.json({
      products: productsWithDetails,
      summary: {
        totalProducts: productsWithDetails.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalQuantitySold: totalQuantity,
      },
    });
  } catch (error) {
    console.error('Product sales report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
