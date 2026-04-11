import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

function getDateRange(period: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  switch (period) {
    case 'week': {
      const dayOfWeek = now.getDay() || 7; // Sunday = 7 in ISO
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
      return { start: weekStart, end: now };
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: monthStart, end: now };
    }
    default: {
      return { start: todayStart, end: todayEnd };
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = auth.user.companyId;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';
    const branchId = searchParams.get('branchId');

    const { start, end } = getDateRange(period);

    const whereBase: Record<string, unknown> = {
      companyId,
      deletedAt: null,
    };

    if (branchId) {
      whereBase.branchId = branchId;
    }

    const invoiceWhereBase = {
      ...whereBase,
      status: 'paid',
      createdAt: { gte: start, lt: end },
    };

    // Parallel queries
    const [salesResult, invoiceCount, topProducts, soldItems, openInvoices, cancelledInvoices] = await Promise.all([
      db.invoice.aggregate({
        where: invoiceWhereBase,
        _sum: { total: true, subtotal: true, taxAmount: true, discount: true },
      }),
      db.invoice.count({
        where: invoiceWhereBase,
      }),
      db.invoiceItem.groupBy({
        by: ['productId'],
        where: {
          invoice: invoiceWhereBase,
        },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }),
      db.invoiceItem.findMany({
        where: {
          invoice: invoiceWhereBase,
        },
        select: {
          quantity: true,
          product: {
            select: {
              cost: true,
            },
          },
        },
      }),
      db.invoice.count({
        where: { ...whereBase, status: 'open' },
      }),
      db.invoice.count({
        where: { ...whereBase, status: 'cancelled' },
      }),
    ]);

    const totalSales = Math.round((salesResult._sum.total || 0) * 100) / 100;
    const subtotalSales = Math.round((salesResult._sum.subtotal || 0) * 100) / 100;
    const totalTax = Math.round((salesResult._sum.taxAmount || 0) * 100) / 100;
    const totalDiscount = Math.round((salesResult._sum.discount || 0) * 100) / 100;
    const avgOrder = invoiceCount > 0 ? Math.round((totalSales / invoiceCount) * 100) / 100 : 0;
    const totalCost = soldItems.reduce((sum, item) => sum + ((item.product?.cost || 0) * item.quantity), 0);
    const netProfit = Math.round((totalSales - totalCost) * 100) / 100;

    // Fetch product names for top products
    const topProductsWithNames = await Promise.all(
      topProducts.map(async (item) => {
        if (item.productId) {
          const product = await db.product.findUnique({
            where: { id: item.productId },
            select: { id: true, name: true, image: true },
          });
          return {
            productId: item.productId,
            name: product?.name || 'Unknown',
            image: product?.image || null,
            quantitySold: item._sum.quantity || 0,
            revenue: item._sum.total || 0,
          };
        }
        return {
          productId: item.productId,
          name: 'Unknown',
          image: null,
          quantitySold: item._sum.quantity || 0,
          revenue: item._sum.total || 0,
        };
      })
    );

    return NextResponse.json({
      totalSales,
      subtotalSales,
      totalTax,
      totalDiscount,
      invoiceCount,
      avgOrder,
      netProfit,
      topProduct: topProductsWithNames[0]?.name || '—',
      topProducts: topProductsWithNames,
      openInvoices,
      cancelledInvoices,
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
