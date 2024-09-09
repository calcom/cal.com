/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
interface Props {
    teams: RouterOutputs["viewer"]["teams"]["list"];
    /**
     * True for teams that are pending invite acceptance
     */
    pending?: boolean;
}
export default function TeamList(props: Props): JSX.Element | null;
export {};
//# sourceMappingURL=TeamList.d.ts.map