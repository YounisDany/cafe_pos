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
    const period = searchParams.get('period') || 'daily';
    const branchId = searchParams.get('branchId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: Record<string, unknown> = {
      companyId: auth.user.companyId,
      status: 'paid',
      deletedAt: null,
    };

    if (branchId) {
      where.branchId = branchId;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    } else {
      // Default: last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.createdAt = { gte: thirtyDaysAgo };
    }

    const invoices = await db.invoice.findMany({
      where,
      select: {
        total: true,
        subtotal: true,
        taxAmount: true,
        discount: true,
        createdAt: true,
        branchId: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by period
    const grouped: Record<string, { total: number; count: number; subtotal: number; tax: number; discount: number }> = {};

    for (const invoice of invoices) {
      let key: string;
      const d = new Date(invoice.createdAt);

      switch (period) {
        case 'weekly': {
          // Group by ISO week
          const weekStart = new Date(d);
          weekStart.setDate(d.getDate() - d.getDay() + 1); // Monday
          key = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate()) / 7)).padStart(2, '0')}`;
          break;
        }
        case 'monthly': {
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          break;
        }
        default: { // daily
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          break;
        }
      }

      if (!grouped[key]) {
        grouped[key] = { total: 0, count: 0, subtotal: 0, tax: 0, discount: 0 };
      }
      grouped[key].total += invoice.total;
      grouped[key].subtotal += invoice.subtotal;
      grouped[key].tax += invoice.taxAmount;
      grouped[key].discount += invoice.discount;
      grouped[key].count += 1;
    }

    const data = Object.entries(grouped).map(([period_key, values]) => ({
      period: period_key,
      totalSales: Math.round(values.total * 100) / 100,
      subtotal: Math.round(values.subtotal * 100) / 100,
      tax: Math.round(values.tax * 100) / 100,
      discount: Math.round(values.discount * 100) / 100,
      invoiceCount: values.count,
      averageOrderValue: values.count > 0 ? Math.round((values.total / values.count) * 100) / 100 : 0,
    }));

    const totalSales = data.reduce((sum, item) => sum + item.totalSales, 0);
    const totalInvoices = data.reduce((sum, item) => sum + item.invoiceCount, 0);

    return NextResponse.json({
      data,
      summary: {
        totalSales: Math.round(totalSales * 100) / 100,
        totalInvoices,
        averageOrderValue: totalInvoices > 0 ? Math.round((totalSales / totalInvoices) * 100) / 100 : 0,
      },
    });
  } catch (error) {
    console.error('Sales report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
