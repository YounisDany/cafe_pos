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

    const soldItems = await db.invoiceItem.findMany({
      where,
      select: {
        productId: true,
        quantity: true,
        total: true,
        product: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            image: true,
            sku: true,
            cost: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    const groupedMap = new Map<string, {
      productId: string | null;
      name: string;
      nameAr: string | null;
      image: string | null;
      sku: string | null;
      category: string | null;
      quantitySold: number;
      revenue: number;
      totalCost: number;
      orderCount: number;
    }>();

    for (const item of soldItems) {
      const key = item.productId || 'unknown';
      const existing = groupedMap.get(key) || {
        productId: item.productId,
        name: item.product?.name || 'Unknown',
        nameAr: item.product?.nameAr || null,
        image: item.product?.image || null,
        sku: item.product?.sku || null,
        category: item.product?.category?.name || null,
        quantitySold: 0,
        revenue: 0,
        totalCost: 0,
        orderCount: 0,
      };

      existing.quantitySold += item.quantity;
      existing.revenue += item.total;
      existing.totalCost += (item.product?.cost || 0) * item.quantity;
      existing.orderCount += 1;

      groupedMap.set(key, existing);
    }

    const productsWithDetails = Array.from(groupedMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((item) => ({
        ...item,
        revenue: Math.round(item.revenue * 100) / 100,
        totalCost: Math.round(item.totalCost * 100) / 100,
        profit: Math.round((item.revenue - item.totalCost) * 100) / 100,
      }));

    const totalRevenue = productsWithDetails.reduce((sum, item) => sum + item.revenue, 0);
    const totalQuantity = productsWithDetails.reduce((sum, item) => sum + item.quantitySold, 0);
    const totalCost = productsWithDetails.reduce((sum, item) => sum + item.totalCost, 0);
    const totalProfit = productsWithDetails.reduce((sum, item) => sum + item.profit, 0);

    return NextResponse.json({
      products: productsWithDetails,
      summary: {
        totalProducts: productsWithDetails.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalQuantitySold: totalQuantity,
        totalCost: Math.round(totalCost * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Product sales report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
