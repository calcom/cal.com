import classNames from "classnames";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";

type PillColor = "blue" | "green" | "red" | "orange";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  text: string;
  color?: PillColor;
}

export default function TeamPill(props: Props) {
  const { color, text, ...rest } = props;
  return (
    <div
      className={classNames("text-medium self-center rounded-md px-1.5 py-1 text-xs ltr:mr-1 rtl:ml-1", {
        " bg-subtle text-emphasis": !color,
        " bg-cal-info text-info": color === "blue",
        " bg-error text-error ": color === "red",
        " bg-attention text-attention": color === "orange",
      })}
      {...rest}>
      {text}
    </div>
  );
}

interface TeamRoleProps extends Omit<React.ComponentProps<typeof TeamPill>, "text"> {
  role: MembershipRole;
}

export function TeamRole(props: TeamRoleProps) {
  const { t } = useLocale();
  const { role, ...rest } = props;
  const keys: Record<MembershipRole, PillColor | undefined> = {
    [MembershipRole.OWNER]: "blue",
    [MembershipRole.ADMIN]: "red",
    [MembershipRole.MEMBER]: undefined,
  };
  return <TeamPill text={t(role.toLowerCase())} color={keys[role]} {...rest} />;
}
