import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type ShouldVerifyEmailType = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const shouldVerifyEmailHandler: ({ ctx }: ShouldVerifyEmailType) => Promise<{
    id: number;
    email: string;
    isVerified: boolean;
}>;
export {};
