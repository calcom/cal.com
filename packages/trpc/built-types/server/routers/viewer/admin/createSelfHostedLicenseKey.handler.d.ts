import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateSelfHostedLicenseSchema } from "./createSelfHostedLicenseKey.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TCreateSelfHostedLicenseSchema;
};
declare const createSelfHostedInstance: ({ input, ctx }: GetOptions) => Promise<{
    stripeCheckoutUrl: string;
}>;
export default createSelfHostedInstance;
