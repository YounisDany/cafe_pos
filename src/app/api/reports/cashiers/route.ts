import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, requireRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!requireRole(auth.user, ['owner', 'manager'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: Record<string, unknown> = {
      companyId: auth.user.companyId,
      status: 'paid',
      deletedAt: null,
    };

    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }

    const invoices = await db.invoice.findMany({
      where,
      select: {
        id: true,
        total: true,
        createdAt: true,
        userId: true,
        branchId: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        branch: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by cashier
    const cashierMap: Record<string, {
      userId: string;
      name: string;
      email: string;
      totalSales: number;
      transactionCount: number;
      averageOrderValue: number;
      branchName: string | null;
    }> = {};

    for (const invoice of invoices) {
      const userId = invoice.userId;
      if (!cashierMap[userId]) {
        cashierMap[userId] = {
          userId,
          name: invoice.user?.name || 'Unknown',
          email: invoice.user?.email || '',
          totalSales: 0,
          transactionCount: 0,
          averageOrderValue: 0,
          branchName: invoice.branch?.name || null,
        };
      }
      cashierMap[userId].totalSales += invoice.total;
      cashierMap[userId].transactionCount += 1;
    }

    const cashiers = Object.values(cashierMap).map((c) => ({
      ...c,
      totalSales: Math.round(c.totalSales * 100) / 100,
      averageOrderValue: c.transactionCount > 0
        ? Math.round((c.totalSales / c.transactionCount) * 100) / 100
        : 0,
    }));

    cashiers.sort((a, b) => b.totalSales - a.totalSales);

    const totalSales = cashiers.reduce((sum, c) => sum + c.totalSales, 0);
    const totalTransactions = cashiers.reduce((sum, c) => sum + c.transactionCount, 0);

    return NextResponse.json({
      cashiers,
      summary: {
        totalCashiers: cashiers.length,
        totalSales: Math.round(totalSales * 100) / 100,
        totalTransactions,
      },
    });
  } catch (error) {
    console.error('Cashier performance report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
