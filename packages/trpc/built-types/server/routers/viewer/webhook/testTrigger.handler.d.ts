import type { TTestTriggerInputSchema } from "./testTrigger.schema";
type TestTriggerOptions = {
    ctx: Record<string, unknown>;
    input: TTestTriggerInputSchema;
};
export declare const testTriggerHandler: ({ ctx: _ctx, input }: TestTriggerOptions) => Promise<{
    message?: string | undefined;
    ok: boolean;
    status: number;
}>;
export {};
