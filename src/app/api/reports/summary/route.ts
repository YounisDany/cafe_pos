import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = auth.user.companyId;

    // Today's date range
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // This month's date range
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const whereBase = {
      companyId,
      deletedAt: null,
    };

    const invoiceWhereBase = {
      ...whereBase,
      status: 'paid',
    };

    // Parallel queries for summary data
    const [
      todaySales,
      todayInvoices,
      monthSales,
      monthInvoices,
      topProducts,
      openInvoices,
      cancelledInvoices,
    ] = await Promise.all([
      // Total sales today
      db.invoice.aggregate({
        where: { ...invoiceWhereBase, createdAt: { gte: todayStart, lt: todayEnd } },
        _sum: { total: true },
      }),
      // Number of invoices today
      db.invoice.count({
        where: { ...invoiceWhereBase, createdAt: { gte: todayStart, lt: todayEnd } },
      }),
      // Total sales this month
      db.invoice.aggregate({
        where: { ...invoiceWhereBase, createdAt: { gte: monthStart, lt: monthEnd } },
        _sum: { total: true },
      }),
      // Number of invoices this month
      db.invoice.count({
        where: { ...invoiceWhereBase, createdAt: { gte: monthStart, lt: monthEnd } },
      }),
      // Top selling products this month
      db.invoiceItem.groupBy({
        by: ['productId'],
        where: {
          invoice: {
            ...invoiceWhereBase,
            createdAt: { gte: monthStart, lt: monthEnd },
          },
        },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }),
      // Open invoices count
      db.invoice.count({
        where: { ...whereBase, status: 'open' },
      }),
      // Cancelled invoices count
      db.invoice.count({
        where: { ...whereBase, status: 'cancelled' },
      }),
    ]);

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

    const todayTotal = todaySales._sum.total || 0;
    const todayAvg = todayInvoices > 0 ? todayTotal / todayInvoices : 0;
    const monthTotal = monthSales._sum.total || 0;
    const monthAvg = monthInvoices > 0 ? monthTotal / monthInvoices : 0;

    return NextResponse.json({
      today: {
        totalSales: Math.round(todayTotal * 100) / 100,
        invoiceCount: todayInvoices,
        averageOrderValue: Math.round(todayAvg * 100) / 100,
      },
      thisMonth: {
        totalSales: Math.round(monthTotal * 100) / 100,
        invoiceCount: monthInvoices,
        averageOrderValue: Math.round(monthAvg * 100) / 100,
      },
      openInvoices,
      cancelledInvoices,
      topProducts: topProductsWithNames,
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
