import type { Dispatch, SetStateAction } from "react";
import type z from "zod";
import type { EventTypeSetup } from "@calcom/features/eventtypes/lib/types";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
type RequiresConfirmationControllerProps = {
    metadata: z.infer<typeof EventTypeMetaDataSchema>;
    requiresConfirmation: boolean;
    requiresConfirmationWillBlockSlot: boolean;
    onRequiresConfirmation: Dispatch<SetStateAction<boolean>>;
    seatsEnabled: boolean;
    eventType: EventTypeSetup;
};
export default function RequiresConfirmationController({ metadata, eventType, requiresConfirmation, onRequiresConfirmation, seatsEnabled, }: RequiresConfirmationControllerProps): JSX.Element;
export {};
//# sourceMappingURL=RequiresConfirmationController.d.ts.map