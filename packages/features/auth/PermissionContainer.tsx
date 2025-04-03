import { useSession } from "next-auth/react";
import type { FC } from "react";
import { Fragment } from "react";

import { UserPermissionRole } from "@calcom/prisma/enums";

type AdminRequiredProps = {
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
  /**Not needed right now but will be useful if we ever expand our permission roles */
  roleRequired?: UserPermissionRole;
};

export const PermissionContainer: FC<AdminRequiredProps> = ({
  children,
  as,
  roleRequired = "ADMIN",
  ...rest
}) => {
  const { data: session } = useSession();

  // Admin can do everything
  if (session?.user.role !== roleRequired && session?.user.role != UserPermissionRole.ADMIN) return null;
  const Component = as ?? Fragment;
  return <Component {...rest}>{children}</Component>;
};
