/// <reference types="react" />
import type { UseFormReturn } from "react-hook-form";
import type { FormValues, AvailabilityOption } from "@calcom/features/eventtypes/lib/types";
import type { EventTypeSetupProps } from "@calcom/features/eventtypes/lib/types";
type Props = {
    children: React.ReactNode;
    eventType: EventTypeSetupProps["eventType"];
    currentUserMembership: EventTypeSetupProps["currentUserMembership"];
    team: EventTypeSetupProps["team"];
    disableBorder?: boolean;
    enabledAppsNumber: number;
    installedAppsNumber: number;
    enabledWorkflowsNumber: number;
    formMethods: UseFormReturn<FormValues>;
    isUpdateMutationLoading?: boolean;
    availability?: AvailabilityOption;
    isUserOrganizationAdmin: boolean;
    bookerUrl: string;
    activeWebhooksNumber: number;
    onDelete: () => void;
};
declare function EventTypeSingleLayout({ children, eventType, currentUserMembership, team, disableBorder, enabledAppsNumber, installedAppsNumber, enabledWorkflowsNumber, isUpdateMutationLoading, formMethods, availability, isUserOrganizationAdmin, bookerUrl, activeWebhooksNumber, onDelete, }: Props): JSX.Element;
export { EventTypeSingleLayout };
//# sourceMappingURL=EventTypeLayout.d.ts.map