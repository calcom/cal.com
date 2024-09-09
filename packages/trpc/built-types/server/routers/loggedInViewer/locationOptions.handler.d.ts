import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TLocationOptionsInputSchema } from "./locationOptions.schema";
type LocationOptionsOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TLocationOptionsInputSchema;
};
export declare const locationOptionsHandler: ({ ctx, input }: LocationOptionsOptions) => Promise<{
    label: string;
    options: {
        label: string;
        value: string;
        disabled?: boolean | undefined;
        icon?: string | undefined;
        slug?: string | undefined;
        credentialId?: number | undefined;
    }[];
}[]>;
export {};
