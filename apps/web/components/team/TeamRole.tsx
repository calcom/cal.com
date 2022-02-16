import { MembershipRole } from "@prisma/client";
import classNames from "classnames";

import { useLocale } from "@lib/hooks/useLocale";

interface Props {
  role?: MembershipRole;
  invitePending?: boolean;
}

export default function TeamRole(props: Props) {
  const { t } = useLocale();

  return (
    <span
      className={classNames(
        "self-center rounded-md border px-3 py-1 text-xs  capitalize ltr:mr-2  rtl:ml-2",
        {
          "border-blue-200 bg-blue-50 text-blue-700": props.role === "MEMBER",
          "border-gray-200 bg-gray-50 text-gray-700": props.role === "OWNER",
          "border-red-200 bg-red-50 text-red-700": props.role === "ADMIN",
          "border-yellow-200 bg-yellow-50 text-yellow-700": props.invitePending,
        }
      )}>
      {(() => {
        if (props.invitePending) return t("invitee");
        switch (props.role) {
          case "OWNER":
            return t("owner");
          case "ADMIN":
            return t("admin");
          case "MEMBER":
            return t("member");
          default:
            return "";
        }
      })()}
    </span>
  );
}
