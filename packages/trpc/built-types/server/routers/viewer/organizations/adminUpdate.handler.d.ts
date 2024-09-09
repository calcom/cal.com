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
    name: string;
    id: number;
    createdAt: Date;
    metadata: Prisma.JsonValue;
    timeZone: string;
    slug: string | null;
    parentId: number | null;
    logoUrl: string | null;
    calVideoLogo: string | null;
    appLogo: string | null;
    appIconLogo: string | null;
    bio: string | null;
    hideBranding: boolean;
    isPrivate: boolean;
    hideBookATeamMember: boolean;
    theme: string | null;
    brandColor: string | null;
    darkBrandColor: string | null;
    bannerUrl: string | null;
    timeFormat: number | null;
    weekStart: string;
    isOrganization: boolean;
    pendingPayment: boolean;
    isPlatform: boolean;
    createdByOAuthClientId: string | null;
    smsLockState: import(".prisma/client").$Enums.SMSLockState;
    smsLockReviewedByAdmin: boolean;
}>;
export default adminUpdateHandler;
