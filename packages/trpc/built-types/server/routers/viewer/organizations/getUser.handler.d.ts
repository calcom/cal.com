import type { TrpcSessionUser } from "../../../trpc";
import type { TGetUserInput } from "./getUser.schema";
type AdminVerifyOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGetUserInput;
};
export declare function getUserHandler({ input, ctx }: AdminVerifyOptions): Promise<{
    teams: {
        accepted: boolean;
        id: number;
        name: string;
    }[];
    role: import(".prisma/client").$Enums.MembershipRole;
    id: number;
    timeZone: string;
    name: string | null;
    email: string;
    username: string | null;
    bio: string | null;
    avatarUrl: string | null;
    schedules: {
        id: number;
        name: string;
    }[];
}>;
export default getUserHandler;
