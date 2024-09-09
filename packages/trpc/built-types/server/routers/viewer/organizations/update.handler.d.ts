import type { Prisma } from "@prisma/client";
import type { TrpcSessionUser } from "../../../trpc";
import type { TUpdateInputSchema } from "./update.schema";
type UpdateOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TUpdateInputSchema;
};
export declare const updateHandler: ({ ctx, input }: UpdateOptions) => Promise<{
    update: boolean;
    userId: number;
    data: {
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
    };
}>;
export default updateHandler;
