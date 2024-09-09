import type { TrpcSessionUser } from "../../../trpc";
import type { ZAssignUserToAttribute } from "./assignUserToAttribute.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: ZAssignUserToAttribute;
};
declare const assignUserToAttributeHandler: ({ input, ctx }: GetOptions) => Promise<{
    success: boolean;
    message: string;
}>;
export default assignUserToAttributeHandler;
