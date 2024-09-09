import type { TrpcSessionUser } from "../../../trpc";
import type { TCheckIfMembershipExistsInputSchema } from "./checkIfMembershipExists.schema";
type CheckIfMembershipExistsOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TCheckIfMembershipExistsInputSchema;
};
declare const checkIfMembershipExistsHandler: ({ ctx, input }: CheckIfMembershipExistsOptions) => Promise<boolean>;
export default checkIfMembershipExistsHandler;
