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
        name: string;
        id: number;
    }[];
    role: import(".prisma/client").$Enums.MembershipRole;
    name: string | null;
    id: number;
    email: string;
    timeZone: string;
    bio: string | null;
    schedules: {
        name: string;
        id: number;
    }[];
    username: string | null;
    avatarUrl: string | null;
}>;
export default getUserHandler;
