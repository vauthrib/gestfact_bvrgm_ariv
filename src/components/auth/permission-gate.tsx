'use client';

import { useSession } from 'next-auth/react';
import { Permission, hasPermission } from '@/lib/permissions';

interface PermissionGateProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ permission, children, fallback }: PermissionGateProps) {
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) return null;

  if (hasPermission(user.role, user.permissions as Permission[], permission)) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
}
