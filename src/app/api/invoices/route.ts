import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, createAuditLog } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const branchId = searchParams.get('branchId');
    const userId = searchParams.get('userId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {
      companyId: auth.user.companyId,
      deletedAt: null,
    };

    if (auth.user.role === 'cashier') {
      where.userId = auth.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where,
        include: {
          items: true,
          user: { select: { id: true, name: true, email: true } },
          branch: { select: { id: true, name: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.invoice.count({ where }),
    ]);

    return NextResponse.json({
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List invoices error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { branchId, items, discount = 0, note } = body;

    if (!branchId || !items || !items.length) {
      return NextResponse.json({ error: 'BranchId and items are required' }, { status: 400 });
    }

    const company = await db.company.findUnique({
      where: { id: auth.user.companyId },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const taxRate = company.taxRate;

    // Calculate invoice number: INV-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');

    const prefix = `INV-${dateStr}-`;
    const lastInvoice = await db.invoice.findFirst({
      where: {
        invoiceNo: { startsWith: prefix },
        companyId: auth.user.companyId,
      },
      orderBy: { invoiceNo: 'desc' },
    });

    let seq = 1;
    if (lastInvoice) {
      const lastSeq = parseInt(lastInvoice.invoiceNo.slice(prefix.length));
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    const invoiceNo = `${prefix}${String(seq).padStart(4, '0')}`;

    // Calculate totals
    let subtotal = 0;
    const invoiceItems = items.map((item: { productId: string; quantity: number; price: number }) => {
      const total = item.price * item.quantity;
      subtotal += total;
      return {
        name: '',
        price: item.price,
        quantity: item.quantity,
        total,
        productId: item.productId,
      };
    });

    // Fetch product names
    for (const item of invoiceItems) {
      if (item.productId) {
        const product = await db.product.findUnique({ where: { id: item.productId } });
        if (product) {
          item.name = product.name;
        }
      }
    }

    const taxAmount = (subtotal - discount) * (taxRate / 100);
    const total = subtotal - discount + taxAmount;

    const invoice = await db.invoice.create({
      data: {
        invoiceNo,
        status: 'open',
        subtotal: Math.round(subtotal * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        discount: Math.round(discount * 100) / 100,
        total: Math.round(total * 100) / 100,
        note,
        branchId,
        userId: auth.user.id,
        companyId: auth.user.companyId,
        items: {
          create: invoiceItems.map((item: { name: string; price: number; quantity: number; total: number; productId?: string }) => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: Math.round(item.total * 100) / 100,
            productId: item.productId,
          })),
        },
      },
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      action: 'create',
      entity: 'invoice',
      entityId: invoice.id,
      userId: auth.user.id,
      companyId: auth.user.companyId,
      branchId: branchId,
      details: JSON.stringify({ invoiceNo, total: invoice.total }),
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
