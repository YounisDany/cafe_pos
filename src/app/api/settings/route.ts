import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, createAuditLog } from '@/lib/auth';
import { Prisma } from '@prisma/client';

async function getCompanyTableColumns() {
  const rows = await db.$queryRaw<Array<{ column_name: string }>>(Prisma.sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Company'
  `);
  return new Set(rows.map((r) => r.column_name));
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const company = await db.company.findUnique({
      where: { id: auth.user.companyId },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.user.role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can update settings' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name, phone, email, address, taxRate, currency, logo,
      primaryColor, secondaryColor, accentColor,
      receiptHeader, receiptFooter, receiptShowLogo,
      taxNumber, currencySymbol, receiptWidth,
      showTaxOnReceipt, showDiscountOnReceipt,
      showQrOnReceipt, receiptFontSize, receiptAlign, receiptPaper,
      receiptTemplate, receiptTemplates,
    } = body;

    // Validate colors
    const isValidHex = (c: string) => /^#([0-9A-Fa-f]{3}){1,2}$/.test(c);
    if (primaryColor && !isValidHex(primaryColor)) {
      return NextResponse.json({ error: 'Invalid primary color format' }, { status: 400 });
    }
    if (secondaryColor && !isValidHex(secondaryColor)) {
      return NextResponse.json({ error: 'Invalid secondary color format' }, { status: 400 });
    }
    if (accentColor && !isValidHex(accentColor)) {
      return NextResponse.json({ error: 'Invalid accent color format' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (logo !== undefined) updateData.logo = logo;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (taxRate !== undefined) updateData.taxRate = parseFloat(String(taxRate));
    if (currency !== undefined) updateData.currency = currency;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (accentColor !== undefined) updateData.accentColor = accentColor;
    if (receiptHeader !== undefined) updateData.receiptHeader = receiptHeader;
    if (receiptFooter !== undefined) updateData.receiptFooter = receiptFooter;
    if (receiptShowLogo !== undefined) updateData.receiptShowLogo = receiptShowLogo;
    if (taxNumber !== undefined) updateData.taxNumber = taxNumber;
    if (currencySymbol !== undefined) updateData.currencySymbol = currencySymbol;
    if (receiptWidth !== undefined) updateData.receiptWidth = receiptWidth;
    if (showTaxOnReceipt !== undefined) updateData.showTaxOnReceipt = showTaxOnReceipt;
    if (showDiscountOnReceipt !== undefined) updateData.showDiscountOnReceipt = showDiscountOnReceipt;
    if (showQrOnReceipt !== undefined) updateData.showQrOnReceipt = showQrOnReceipt;
    if (receiptFontSize !== undefined) updateData.receiptFontSize = parseInt(String(receiptFontSize), 10);
    if (receiptAlign !== undefined) updateData.receiptAlign = receiptAlign;
    if (receiptPaper !== undefined) updateData.receiptPaper = receiptPaper;
    if (receiptTemplate !== undefined) updateData.receiptTemplate = receiptTemplate;
    if (receiptTemplates !== undefined) updateData.receiptTemplates = receiptTemplates;

    const updateDataDb = { ...updateData };
    const dynamicReceiptFields = ['showQrOnReceipt', 'receiptFontSize', 'receiptAlign', 'receiptPaper', 'receiptTemplate', 'receiptTemplates'];
    const tableColumns = await getCompanyTableColumns();
    for (const field of dynamicReceiptFields) {
      if (!tableColumns.has(field) && field in updateDataDb) {
        delete updateDataDb[field];
      }
    }

    const company = await db.company.update({
      where: { id: auth.user.companyId },
      data: updateDataDb,
    });

    await createAuditLog({
      action: 'update',
      entity: 'settings',
      entityId: auth.user.companyId,
      userId: auth.user.id,
      companyId: auth.user.companyId,
      details: JSON.stringify({ updatedFields: Object.keys(updateDataDb) }),
    });

    return NextResponse.json(company);
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
