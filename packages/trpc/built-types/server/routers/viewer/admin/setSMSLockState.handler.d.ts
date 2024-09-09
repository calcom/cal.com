import type { TrpcSessionUser } from "../../../trpc";
import type { TSetSMSLockState } from "./setSMSLockState.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TSetSMSLockState;
};
declare const setSMSLockState: ({ input }: GetOptions) => Promise<{
    name: string | null;
    locked: boolean | undefined;
}>;
export default setSMSLockState;
