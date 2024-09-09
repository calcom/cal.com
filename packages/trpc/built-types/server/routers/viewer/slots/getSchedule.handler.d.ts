/// <reference types="node" />
import type { IncomingMessage } from "http";
import type { TGetScheduleInputSchema } from "./getSchedule.schema";
export type GetScheduleOptions = {
    ctx?: ContextForGetSchedule;
    input: TGetScheduleInputSchema;
};
interface ContextForGetSchedule extends Record<string, unknown> {
    req?: (IncomingMessage & {
        cookies: Partial<{
            [key: string]: string;
        }>;
    }) | undefined;
}
export declare const getScheduleHandler: ({ ctx, input }: GetScheduleOptions) => Promise<import("./util").IGetAvailableSlots>;
export {};
