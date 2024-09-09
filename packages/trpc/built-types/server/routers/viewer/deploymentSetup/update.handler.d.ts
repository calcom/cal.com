import type { TUpdateInputSchema } from "./update.schema";
type UpdateOptions = {
    ctx: Record<string, unknown>;
    input: TUpdateInputSchema;
};
export declare const updateHandler: ({ input }: UpdateOptions) => Promise<void>;
export {};
