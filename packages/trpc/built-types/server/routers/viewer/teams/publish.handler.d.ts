import type { TrpcSessionUser } from "../../../trpc";
import type { TPublishInputSchema } from "./publish.schema";
type PublishOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TPublishInputSchema;
};
export declare const publishHandler: ({ ctx, input }: PublishOptions) => Promise<{
    url: string;
    message: string;
}>;
export default publishHandler;
