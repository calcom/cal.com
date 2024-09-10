import type { Prisma } from "@prisma/client";
import type { TrpcSessionUser } from "../../../trpc";
import type { TAdminUpdate } from "./adminUpdate.schema";
type AdminUpdateOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TAdminUpdate;
};
export declare const adminUpdateHandler: ({ input }: AdminUpdateOptions) => Promise<{
    id: number;
    slug: string | null;
    parentId: number | null;
    timeZone: string;
    metadata: Prisma.JsonValue;
    name: string;
    bio: string | null;
    weekStart: string;
    hideBranding: boolean;
    theme: string | null;
    timeFormat: number | null;
    brandColor: string | null;
    darkBrandColor: string | null;
    smsLockState: import(".prisma/client").$Enums.SMSLockState;
    smsLockReviewedByAdmin: boolean;
    createdAt: Date;
    logoUrl: string | null;
    calVideoLogo: string | null;
    appLogo: string | null;
    appIconLogo: string | null;
    isPrivate: boolean;
    hideBookATeamMember: boolean;
    bannerUrl: string | null;
    isOrganization: boolean;
    pendingPayment: boolean;
    isPlatform: boolean;
    createdByOAuthClientId: string | null;
}>;
export default adminUpdateHandler;
