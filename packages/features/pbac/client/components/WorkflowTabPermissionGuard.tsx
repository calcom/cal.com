"use client";

import type { ReactNode } from "react";
import { useWorkflowPermission } from "../hooks/useEventPermission";

interface WorkflowTabPermissionGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const WorkflowTabPermissionGuard = ({
  children,
  fallback = null,
}: WorkflowTabPermissionGuardProps) => {
  const { hasPermission } = useWorkflowPermission("workflow.read");

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
