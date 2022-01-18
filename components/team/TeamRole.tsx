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
      className={classNames("self-center px-3 py-1 mr-2 text-xs  capitalize border  rounded-md", {
        "bg-blue-50 border-blue-200 text-blue-700": props.role === "MEMBER",
        "bg-gray-50 border-gray-200 text-gray-700": props.role === "OWNER",
        "bg-red-50 border-red-200 text-red-700": props.role === "ADMIN",
        "bg-yellow-50 border-yellow-200 text-yellow-700": props.invitePending,
      })}>
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
