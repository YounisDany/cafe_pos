import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// GET: Check if setup is needed (no companies exist)
export async function GET() {
  try {
    const companyCount = await db.company.count();
    return NextResponse.json({ needsSetup: companyCount === 0 });
  } catch (error) {
    console.error('Setup check error:', error);
    return NextResponse.json({ needsSetup: true });
  }
}

// POST: Create first company + owner + branch
export async function POST(req: Request) {
  try {
    // Block if already set up
    const companyCount = await db.company.count();
    if (companyCount > 0) {
      return NextResponse.json(
        { error: 'النظام مُعد بالفعل. يرجى تسجيل الدخول.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      companyName,
      ownerName,
      ownerEmail,
      ownerPassword,
      branchName,
      branchPhone,
      branchAddress,
    } = body;

    // Validation
    if (!companyName?.trim()) {
      return NextResponse.json({ error: 'يرجى إدخال اسم النشاط' }, { status: 400 });
    }
    if (!ownerName?.trim()) {
      return NextResponse.json({ error: 'يرجى إدخال اسم المالك' }, { status: 400 });
    }
    if (!ownerEmail?.trim()) {
      return NextResponse.json({ error: 'يرجى إدخال البريد الإلكتروني' }, { status: 400 });
    }
    if (!ownerPassword || ownerPassword.length < 6) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, { status: 400 });
    }

    const email = ownerEmail.toLowerCase().trim();

    // Hash password
    const hashedPassword = await bcrypt.hash(ownerPassword, 10);

    // Create company
    const company = await db.company.create({
      data: {
        name: companyName.trim(),
        email,
        phone: branchPhone?.trim() || null,
        address: branchAddress?.trim() || null,
        taxRate: 15.0,
        currency: 'SAR',
        primaryColor: '#d97706',
        secondaryColor: '#78350f',
        accentColor: '#fbbf24',
        currencySymbol: 'ر.س',
        receiptWidth: '80',
        showTaxOnReceipt: true,
        showDiscountOnReceipt: true,
        receiptShowLogo: true,
        isActive: true,
      },
    });

    // Create default branch
    const branch = await db.branch.create({
      data: {
        name: branchName?.trim() || 'الفرع الرئيسي',
        address: branchAddress?.trim() || null,
        phone: branchPhone?.trim() || null,
        companyId: company.id,
        isActive: true,
      },
    });

    // Create owner user
    const user = await db.user.create({
      data: {
        name: ownerName.trim(),
        email,
        password: hashedPassword,
        role: 'owner',
        companyId: company.id,
        branchId: branch.id,
        isActive: true,
      },
    });

    // Create default categories
    const defaultCategories = [
      { name: 'قهوة', icon: 'coffee', sortOrder: 1 },
      { name: 'شاي', icon: 'tea', sortOrder: 2 },
      { name: 'عصائر', icon: 'juice', sortOrder: 3 },
      { name: 'حلويات', icon: 'dessert', sortOrder: 4 },
      { name: 'سندويشات', icon: 'sandwich', sortOrder: 5 },
      { name: 'معجنات', icon: 'pastry', sortOrder: 6 },
    ];

    for (const cat of defaultCategories) {
      await db.category.create({
        data: {
          name: cat.name,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
          isActive: true,
          companyId: company.id,
        },
      });
    }

    // Create session and return auth
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await db.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        action: 'setup',
        entity: 'system',
        companyId: company.id,
        userId: user.id,
        details: JSON.stringify({ type: 'initial_setup' }),
      },
    });

    // Return auth response (same format as login)
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        branchId: user.branchId,
      },
      token,
      company: {
        id: company.id,
        name: company.name,
        logo: company.logo,
        phone: company.phone,
        email: company.email,
        address: company.address,
        taxRate: company.taxRate,
        currency: company.currency,
        primaryColor: company.primaryColor,
        secondaryColor: company.secondaryColor,
        accentColor: company.accentColor,
        currencySymbol: company.currencySymbol,
        receiptHeader: company.receiptHeader,
        receiptFooter: company.receiptFooter,
        taxNumber: company.taxNumber,
        receiptShowLogo: company.receiptShowLogo,
        receiptWidth: company.receiptWidth,
        showTaxOnReceipt: company.showTaxOnReceipt,
        showDiscountOnReceipt: company.showDiscountOnReceipt,
      },
      branch: {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
      },
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مستخدم بالفعل' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'حدث خطأ أثناء الإعداد. يرجى المحاولة مرة أخرى.' },
      { status: 500 }
    );
  }
}
