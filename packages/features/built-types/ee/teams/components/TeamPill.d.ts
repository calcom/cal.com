/// <reference types="react" />
import { MembershipRole } from "@calcom/prisma/enums";
type PillColor = "blue" | "green" | "red" | "orange";
interface Props extends React.HTMLAttributes<HTMLDivElement> {
    text: string;
    color?: PillColor;
}
export default function TeamPill(props: Props): JSX.Element;
interface TeamRoleProps extends Omit<React.ComponentProps<typeof TeamPill>, "text"> {
    role: MembershipRole;
}
export declare function TeamRole(props: TeamRoleProps): JSX.Element;
export {};
//# sourceMappingURL=TeamPill.d.ts.map