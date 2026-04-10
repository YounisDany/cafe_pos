import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, requireRole, createAuditLog } from '@/lib/auth';

export async function POST(
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

    const invoice = await db.invoice.findFirst({
      where: { id, companyId: auth.user.companyId },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.deletedAt) {
      return NextResponse.json({ error: 'Invoice already closed' }, { status: 400 });
    }

    const updated = await db.invoice.update({
      where: { id },
      data: {
        status: 'cancelled',
        deletedAt: new Date(),
      },
    });

    await createAuditLog({
      action: 'delete',
      entity: 'invoice',
      entityId: id,
      userId: auth.user.id,
      companyId: auth.user.companyId,
      branchId: auth.user.branchId,
      details: JSON.stringify({ invoiceNo: invoice.invoiceNo, status: 'cancelled' }),
    });

    return NextResponse.json({ message: 'Invoice closed', invoice: updated });
  } catch (error) {
    console.error('Close invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
