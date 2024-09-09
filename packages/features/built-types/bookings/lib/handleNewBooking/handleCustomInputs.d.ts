import type { EventTypeCustomInput } from "@prisma/client";
type CustomInput = {
    value: string | boolean;
    label: string;
};
export declare function handleCustomInputs(eventTypeCustomInputs: EventTypeCustomInput[], reqCustomInputs: CustomInput[]): void;
export {};
//# sourceMappingURL=handleCustomInputs.d.ts.map