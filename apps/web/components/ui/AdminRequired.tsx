import { useSession } from "next-auth/react";
import type { FC } from "react";
import { Fragment } from "react";

type AdminRequiredProps = {
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
};

/** @deprecated use PermssionContainer instead. Will delete once V2 goes live */
export const AdminRequired: FC<AdminRequiredProps> = ({ children, as, ...rest }) => {
  const session = useSession();

  if (session.data?.user.role !== "ADMIN") return null;
  const Component = as ?? Fragment;
  return <Component {...rest}>{children}</Component>;
};
