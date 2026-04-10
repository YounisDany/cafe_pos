import { NextRequest, NextResponse } from 'next/server';
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
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: null,
      branchId: user.branchId,
      companyId: user.companyId,
      company,
      branch,
    });
  } catch (error) {
    console.error('Get me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
