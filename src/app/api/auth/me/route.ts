import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getSession(request.headers);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = auth;

    const [company, branch] = await Promise.all([
      db.company.findUnique({ where: { id: user.companyId } }),
      user.branchId ? db.branch.findUnique({ where: { id: user.branchId } }) : null,
    ]);

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
      company: company ? {
        id: company.id,
        name: company.name,
        logo: company.logo,
        phone: company.phone,
        email: company.email,
        address: company.address,
        taxRate: company.taxRate,
        currency: company.currency,
      } : null,
      branch: branch ? {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
      } : null,
    });
  } catch (error) {
    console.error('Get me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
