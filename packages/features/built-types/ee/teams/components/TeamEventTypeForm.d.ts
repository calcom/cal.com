import type { EventType } from "@prisma/client";
import type { ReactNode } from "react";
type props = {
    isTeamAdminOrOwner: boolean;
    teamId: number;
    SubmitButton: (isPending: boolean) => ReactNode;
    onSuccessMutation: (eventType: EventType) => void;
    onErrorMutation: (message: string) => void;
    isInfiniteScrollEnabled: boolean;
};
export declare const TeamEventTypeForm: ({ isTeamAdminOrOwner, teamId, SubmitButton, onSuccessMutation, onErrorMutation, isInfiniteScrollEnabled, }: props) => JSX.Element;
export {};
//# sourceMappingURL=TeamEventTypeForm.d.ts.map