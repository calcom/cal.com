/// <reference types="react" />
import type { ChildrenEventType } from "@calcom/features/eventtypes/components/ChildrenEventTypeSelect";
interface ManagedEventDialogProps {
    slugExistsChildrenDialogOpen: ChildrenEventType[];
    slug: string;
    onOpenChange: () => void;
    isPending: boolean;
    onConfirm: (e: {
        preventDefault: () => void;
    }) => void;
}
export default function ManagedEventDialog(props: ManagedEventDialogProps): JSX.Element;
export {};
//# sourceMappingURL=ManagedEventDialog.d.ts.map