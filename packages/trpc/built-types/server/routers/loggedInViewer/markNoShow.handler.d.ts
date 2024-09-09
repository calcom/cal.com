import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TNoShowInputSchema } from "./markNoShow.schema";
type NoShowOptions = {
    input: TNoShowInputSchema;
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const markNoShow: ({ ctx, input }: NoShowOptions) => Promise<{
    attendees: {
        email: string;
        noShow: boolean;
    }[];
    noShowHost: boolean;
    message: string;
}>;
export {};
