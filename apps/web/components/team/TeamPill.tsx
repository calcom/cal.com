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
      className={classNames("self-center rounded-md border px-3 py-1 text-xs capitalize ltr:mr-2 rtl:ml-2", {
        "border-gray-200 bg-gray-50 text-gray-700": !props.color,
        "border-blue-200 bg-blue-50 text-blue-700": props.color === "blue",
        "border-red-200 bg-red-50 text-red-700": props.color === "red",
        "border-yellow-200 bg-yellow-50 text-yellow-700": props.color === "yellow",
        "border-green-200 bg-green-50 text-green-600": props.color === "green",
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
