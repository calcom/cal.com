import type { TrpcSessionUser } from "../../../trpc";
type CheckForGCalOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const checkForGWorkspace: ({ ctx }: CheckForGCalOptions) => Promise<{
    id: number | undefined;
}>;
export declare const getUsersFromGWorkspace: ({}: CheckForGCalOptions) => Promise<string[]>;
export declare const removeCurrentGoogleWorkspaceConnection: ({ ctx }: CheckForGCalOptions) => Promise<{
    deleted: number;
}>;
export {};
