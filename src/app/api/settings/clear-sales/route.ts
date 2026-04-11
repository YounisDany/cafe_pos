import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog, getSession } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.user.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can clear sales' }, { status: 403 });
    }

    const companyId = auth.user.companyId;

    const result = await db.$transaction(async (tx) => {
      const invoices = await tx.invoice.findMany({
        where: { companyId },
        select: { id: true },
      });

      const invoiceIds = invoices.map((invoice) => invoice.id);

      const [paymentsDelete, itemsDelete, invoicesDelete] = invoiceIds.length
        ? await Promise.all([
            tx.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } }),
            tx.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } }),
            tx.invoice.deleteMany({ where: { id: { in: invoiceIds } } }),
          ])
        : [
            { count: 0 },
            { count: 0 },
            { count: 0 },
          ];

      return {
        payments: paymentsDelete.count,
        items: itemsDelete.count,
        invoices: invoicesDelete.count,
      };
    });

    await createAuditLog({
      action: 'delete',
      entity: 'invoice',
      userId: auth.user.id,
      companyId,
      details: JSON.stringify({
        reason: 'bulk-clear-sales',
        ...result,
      }),
    });

    return NextResponse.json({
      message: 'All sales cleared successfully',
      deleted: result,
    });
  } catch (error) {
    console.error('Clear sales error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
