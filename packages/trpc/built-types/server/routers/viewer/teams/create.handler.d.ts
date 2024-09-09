import type { TrpcSessionUser } from "../../../trpc";
import type { TCreateInputSchema } from "./create.schema";
type CreateOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TCreateInputSchema;
};
export declare const createHandler: ({ ctx, input }: CreateOptions) => Promise<{
    url: string;
    message: string;
    team: null;
} | {
    url: string;
    message: string;
    team: {
        name: string;
        id: number;
        createdAt: Date;
        metadata: import(".prisma/client").Prisma.JsonValue;
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
export default createHandler;
