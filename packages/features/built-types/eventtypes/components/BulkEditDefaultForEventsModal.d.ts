/// <reference types="react" />
import { z } from "zod";
export declare const BulkUpdateEventSchema: z.ZodObject<{
    eventTypeIds: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    eventTypeIds: number[];
}, {
    eventTypeIds: number[];
}>;
export declare function BulkEditDefaultForEventsModal(props: {
    open: boolean;
    setOpen: (open: boolean) => void;
    bulkUpdateFunction: ({ eventTypeIds }: {
        eventTypeIds: number[];
    }) => void;
    isPending: boolean;
    description: string;
}): JSX.Element | null;
//# sourceMappingURL=BulkEditDefaultForEventsModal.d.ts.map