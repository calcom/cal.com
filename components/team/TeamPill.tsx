import { MembershipRole } from "@prisma/client";
import classNames from "classnames";

import { useLocale } from "@lib/hooks/useLocale";

type PillColor = "blue" | "green" | "red" | "yellow";

interface Props {
  text: string;
  color?: PillColor;
}

export default function TeamPill(props: Props) {
  return (
    <div
      className={classNames("self-center px-3 py-1 ltr:mr-2 rtl:ml-2 text-xs capitalize border rounded-md", {
        "bg-gray-50 border-gray-200 text-gray-700": !props.color,
        "bg-blue-50 border-blue-200 text-blue-700": props.color === "blue",
        "bg-red-50 border-red-200 text-red-700": props.color === "red",
        "bg-yellow-50 border-yellow-200 text-yellow-700": props.color === "yellow",
        "bg-green-50 border-green-200 text-green-600": props.color === "green",
      })}>
      {props.text}
    </div>
  );
}

export function TeamRole(props: { role: MembershipRole }) {
  const { t } = useLocale();
  const keys: Record<MembershipRole, PillColor | undefined> = {
    [MembershipRole.OWNER]: undefined,
    [MembershipRole.ADMIN]: "red",
    [MembershipRole.MEMBER]: "blue",
  };
  return <TeamPill text={t(props.role.toLowerCase())} color={keys[props.role]} />;
}
