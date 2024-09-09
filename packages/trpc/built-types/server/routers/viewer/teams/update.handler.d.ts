import type { TrpcSessionUser } from "../../../trpc";
import type { TUpdateInputSchema } from "./update.schema";
type UpdateOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TUpdateInputSchema;
};
export declare const updateHandler: ({ ctx, input }: UpdateOptions) => Promise<{
    logoUrl: string | null;
    name: string;
    bio: string | null;
    slug: string | null;
    theme: string | null;
    brandColor: string | null;
    darkBrandColor: string | null;
} | undefined>;
export default updateHandler;
