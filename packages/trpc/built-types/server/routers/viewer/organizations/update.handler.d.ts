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
    };
}>;
export default updateHandler;
