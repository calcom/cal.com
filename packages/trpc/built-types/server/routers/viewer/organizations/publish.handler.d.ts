import type { TrpcSessionUser } from "../../../trpc";
type PublishOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const publishHandler: ({ ctx }: PublishOptions) => Promise<{
    url: string;
    message: string;
}>;
export default publishHandler;
