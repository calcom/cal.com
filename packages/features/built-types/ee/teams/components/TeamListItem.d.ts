/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
interface Props {
    team: RouterOutputs["viewer"]["teams"]["list"][number];
    key: number;
    onActionSelect: (text: string) => void;
    isPending?: boolean;
    hideDropdown: boolean;
    setHideDropdown: (value: boolean) => void;
}
export default function TeamListItem(props: Props): JSX.Element;
export {};
//# sourceMappingURL=TeamListItem.d.ts.map