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
        id: number;
        slug: string | null;
        parentId: number | null;
        timeZone: string;
        metadata: import(".prisma/client").Prisma.JsonValue;
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
export default createHandler;
