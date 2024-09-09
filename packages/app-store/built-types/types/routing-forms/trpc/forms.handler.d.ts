import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TFormSchema } from "./forms.schema";
interface FormsHandlerOptions {
    ctx: {
        prisma: PrismaClient;
        user: NonNullable<TrpcSessionUser>;
    };
    input: TFormSchema;
}
export declare const formsHandler: ({ ctx, input }: FormsHandlerOptions) => Promise<{
    filtered: {
        form: import("../types/types").SerializableForm<{
            team: ({
                members: {
                    id: number;
                    userId: number;
                    teamId: number;
                    role: import(".prisma/client").$Enums.MembershipRole;
                    disableImpersonation: boolean;
                    accepted: boolean;
                }[];
            } & {
                id: number;
                name: string;
                metadata: Prisma.JsonValue;
                theme: string | null;
                createdAt: Date;
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
            }) | null;
            _count: {
                responses: number;
            };
        } & {
            id: string;
            name: string;
            description: string | null;
            routes: Prisma.JsonValue;
            fields: Prisma.JsonValue;
            position: number;
            disabled: boolean;
            userId: number;
            createdAt: Date;
            updatedAt: Date;
            teamId: number | null;
            settings: Prisma.JsonValue;
        }>;
        readOnly: boolean;
    }[];
    totalCount: number;
}>;
export default formsHandler;
type SupportedFilters = Omit<NonNullable<NonNullable<TFormSchema>["filters"]>, "upIds"> | undefined;
export declare function getPrismaWhereFromFilters(user: {
    id: number;
}, filters: SupportedFilters): {
    OR: Prisma.App_RoutingForms_FormWhereInput[];
};
//# sourceMappingURL=forms.handler.d.ts.map