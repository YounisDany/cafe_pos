import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, createAuditLog } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { method, amount, cashReceived } = body;

    if (!method || !amount) {
      return NextResponse.json({ error: 'Method and amount are required' }, { status: 400 });
    }

    const validMethods = ['cash', 'card', 'split'];
    if (!validMethods.includes(method)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    const invoice = await db.invoice.findFirst({
      where: { id, companyId: auth.user.companyId },
      include: { payments: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status !== 'open') {
      return NextResponse.json({ error: 'Invoice is not open' }, { status: 400 });
    }

    const paymentAmount = parseFloat(amount);
    const totalPaid = invoice.paidAmount + paymentAmount;
    const changeAmount = method === 'cash' && cashReceived
      ? Math.round((parseFloat(cashReceived) - paymentAmount) * 100) / 100
      : 0;

    await db.payment.create({
      data: {
        method,
        amount: paymentAmount,
        invoiceId: id,
      },
    });

    const isFullyPaid = totalPaid >= invoice.total;
    const status = isFullyPaid ? 'paid' : 'open';

    const updated = await db.invoice.update({
      where: { id },
      data: {
        paidAmount: Math.round(totalPaid * 100) / 100,
        changeAmount: Math.max(0, changeAmount),
        status,
        ...(isFullyPaid ? { closedAt: new Date() } : {}),
      },
      include: {
        items: true,
        payments: true,
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      action: 'update',
      entity: 'invoice',
      entityId: id,
      userId: auth.user.id,
      companyId: auth.user.companyId,
      branchId: auth.user.branchId,
      details: JSON.stringify({
        invoiceNo: invoice.invoiceNo,
        payment: { method, amount: paymentAmount },
        status: updated.status,
      }),
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Pay invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
