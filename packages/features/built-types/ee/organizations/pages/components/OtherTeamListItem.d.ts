/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
interface Props {
    team: RouterOutputs["viewer"]["organizations"]["listOtherTeams"][number];
    key: number;
    onActionSelect: (text: string) => void;
    isPending?: boolean;
    hideDropdown: boolean;
    setHideDropdown: (value: boolean) => void;
}
export default function OtherTeamListItem(props: Props): JSX.Element;
export {};
//# sourceMappingURL=OtherTeamListItem.d.ts.map