/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
import type { CredentialOwner } from "../types";
export default function AppCard({ app, description, switchOnClick, switchChecked, children, returnTo, teamId, disableSwitch, switchTooltip, hideSettingsIcon, hideAppCardOptions, }: {
    app: RouterOutputs["viewer"]["integrations"]["items"][number] & {
        credentialOwner?: CredentialOwner;
    };
    description?: React.ReactNode;
    switchChecked?: boolean;
    switchOnClick?: (e: boolean) => void;
    children?: React.ReactNode;
    returnTo?: string;
    teamId?: number;
    LockedIcon?: React.ReactNode;
    disableSwitch?: boolean;
    switchTooltip?: string;
    hideSettingsIcon?: boolean;
    hideAppCardOptions?: boolean;
}): JSX.Element;
//# sourceMappingURL=AppCard.d.ts.map