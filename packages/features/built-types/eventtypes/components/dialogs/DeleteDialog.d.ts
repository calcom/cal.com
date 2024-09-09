/// <reference types="react" />
import type { DialogProps } from "@calcom/ui";
export declare function DeleteDialog({ isManagedEvent, eventTypeId, open, onOpenChange, onDelete, }: {
    isManagedEvent: string;
    eventTypeId: number;
    onDelete: () => void;
} & Pick<DialogProps, "open" | "onOpenChange">): JSX.Element;
//# sourceMappingURL=DeleteDialog.d.ts.map