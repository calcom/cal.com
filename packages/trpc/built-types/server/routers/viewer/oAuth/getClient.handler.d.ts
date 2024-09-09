import type { TGetClientInputSchema } from "./getClient.schema";
type GetClientOptions = {
    input: TGetClientInputSchema;
};
export declare const getClientHandler: ({ input }: GetClientOptions) => Promise<{
    name: string;
    logo: string | null;
    clientId: string;
    redirectUri: string;
} | null>;
export {};
