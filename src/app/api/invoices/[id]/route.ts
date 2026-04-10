import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, createAuditLog } from '@/lib/auth';

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

    const invoice = await db.invoice.findFirst({
      where: { id, companyId: auth.user.companyId },
      include: {
        items: true,
        payments: true,
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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

    const invoice = await db.invoice.findFirst({
      where: { id, companyId: auth.user.companyId },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status !== 'open') {
      return NextResponse.json({ error: 'Can only update open invoices' }, { status: 400 });
    }

    const { discount, note, items: newItems } = body;
    const company = await db.company.findUnique({ where: { id: auth.user.companyId } });
    const taxRate = company?.taxRate ?? 15;

    let subtotal = 0;

    if (newItems && Array.isArray(newItems)) {
      // Delete existing items and recreate
      await db.invoiceItem.deleteMany({ where: { invoiceId: id } });

      const invoiceItems = [];
      for (const item of newItems) {
        const total = item.price * item.quantity;
        subtotal += total;

        // Fetch product name if productId provided
        let name = item.name || '';
        if (item.productId && !name) {
          const product = await db.product.findUnique({ where: { id: item.productId } });
          if (product) name = product.name;
        }

        invoiceItems.push({
          name,
          price: item.price,
          quantity: item.quantity,
          total: Math.round(total * 100) / 100,
          productId: item.productId,
        });
      }

      await db.invoiceItem.createMany({
        data: invoiceItems.map((item) => ({ ...item, invoiceId: id })),
      });
    } else {
      // Recalculate from existing items
      const existingItems = await db.invoiceItem.findMany({ where: { invoiceId: id } });
      for (const item of existingItems) {
        subtotal += item.total;
      }
    }

    const discountAmount = discount !== undefined ? parseFloat(discount) : invoice.discount;
    const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
    const total = subtotal - discountAmount + taxAmount;

    const updated = await db.invoice.update({
      where: { id },
      data: {
        subtotal: Math.round(subtotal * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        discount: Math.round(discountAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
        ...(note !== undefined && { note }),
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
      details: JSON.stringify({ invoiceNo: invoice.invoiceNo, changes: body }),
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
