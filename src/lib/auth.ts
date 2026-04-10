import { db } from './db';
import { headers } from 'next/headers';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  branchId: string | null;
}

export async function getSession(headersList: Headers): Promise<{ user: AuthUser; token: string } | null> {
  const authHeader = headersList.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      companyId: session.user.companyId,
      branchId: session.user.branchId,
    },
    token,
  };
}

export function requireRole(user: AuthUser, roles: string[]): boolean {
  return roles.includes(user.role);
}

export async function createAuditLog(params: {
  action: string;
  entity: string;
  entityId?: string;
  userId?: string;
  companyId: string;
  branchId?: string | null;
  details?: string;
  ipAddress?: string;
}) {
  await db.auditLog.create({
    data: {
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      userId: params.userId,
      companyId: params.companyId,
      branchId: params.branchId,
      details: params.details,
      ipAddress: params.ipAddress,
    },
  });
}
