import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { createAuditLog } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { company: true, branch: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    await createAuditLog({
      action: 'login',
      entity: 'user',
      entityId: user.id,
      userId: user.id,
      companyId: user.companyId,
      branchId: user.branchId,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        branchId: user.branchId,
        companyId: user.companyId,
      },
      token,
      company: {
        id: user.company.id,
        name: user.company.name,
        logo: user.company.logo,
        phone: user.company.phone,
        email: user.company.email,
        address: user.company.address,
        taxRate: user.company.taxRate,
        currency: user.company.currency,
        primaryColor: user.company.primaryColor,
        secondaryColor: user.company.secondaryColor,
        accentColor: user.company.accentColor,
        currencySymbol: user.company.currencySymbol,
        taxNumber: user.company.taxNumber,
        receiptHeader: user.company.receiptHeader,
        receiptFooter: user.company.receiptFooter,
        receiptShowLogo: user.company.receiptShowLogo,
        receiptWidth: user.company.receiptWidth,
        showTaxOnReceipt: user.company.showTaxOnReceipt,
        showDiscountOnReceipt: user.company.showDiscountOnReceipt,
      },
      branch: user.branch
        ? {
            id: user.branch.id,
            name: user.branch.name,
            address: user.branch.address,
            phone: user.branch.phone,
          }
        : null,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
