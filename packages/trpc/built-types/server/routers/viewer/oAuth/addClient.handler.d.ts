import type { TAddClientInputSchema } from "./addClient.schema";
type AddClientOptions = {
    input: TAddClientInputSchema;
};
export declare const addClientHandler: ({ input }: AddClientOptions) => Promise<{
    clientSecret: string;
    name: string;
    logo: string | null;
    clientId: string;
    redirectUri: string;
}>;
export declare const generateSecret: (secret?: string) => string[];
export {};
