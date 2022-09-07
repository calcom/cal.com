import { useSession } from "next-auth/react";
import { FC, Fragment } from "react";

import { UserPermissionRole } from ".prisma/client";

type AdminRequiredProps = {
  as?: keyof JSX.IntrinsicElements;
  /** Use this if you want to skip the admin check - used when wrapping reusable components that might require an admin check  */
  skip?: boolean;
  children?: React.ReactNode;
  /**Not needed right now but will be useful if we ever expand our permission roles */
  roleRequired?: UserPermissionRole;
};

export const PermissionContainer: FC<AdminRequiredProps> = ({
  children,
  as,
  skip,
  roleRequired = "ADMIN",
  ...rest
}) => {
  const session = useSession();
  if (skip) {
    return <>{children}</>;
  }
  // Admin can do everything
  if (session.data?.user.role !== roleRequired || !UserPermissionRole.ADMIN) return null;
  const Component = as ?? Fragment;
  return <Component {...rest}>{children}</Component>;
};
