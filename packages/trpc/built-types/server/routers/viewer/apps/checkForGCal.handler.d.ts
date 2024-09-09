import type { TrpcSessionUser } from "../../../trpc";
type CheckForGCalOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const checkForGCalHandler: ({ ctx }: CheckForGCalOptions) => Promise<boolean>;
export {};
