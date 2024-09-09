/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
interface Props {
    teams: RouterOutputs["viewer"]["organizations"]["listOtherTeams"];
    pending?: boolean;
}
export default function OtherTeamList(props: Props): JSX.Element;
export {};
//# sourceMappingURL=OtherTeamList.d.ts.map