/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
interface Props {
    team?: RouterOutputs["viewer"]["teams"]["getMinimal"];
    member?: RouterOutputs["viewer"]["teams"]["lazyLoadMembers"]["members"][number];
}
export default function TeamAvailabilityModal(props: Props): JSX.Element;
export {};
//# sourceMappingURL=TeamAvailabilityModal.d.ts.map