import type { UpdateAppCredentialsOptions } from "./updateAppCredentials.handler";
export declare const handleCustomValidations: ({ ctx, input, appId, }: UpdateAppCredentialsOptions & {
    appId: string;
}) => Promise<{} & {
    [k: string]: unknown;
}>;
