export declare const forms: import("@trpc/server/unstable-core-do-not-import").QueryProcedure<{
    input: {
        filters?: {
            teamIds?: number[] | undefined;
            userIds?: number[] | undefined;
            upIds?: string[] | undefined;
        } | undefined;
    } | null | undefined;
    output: {
        filtered: {
            form: import("../../types/types").SerializableForm<{
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
                    metadata: import(".prisma/client").Prisma.JsonValue;
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
                routes: import(".prisma/client").Prisma.JsonValue;
                fields: import(".prisma/client").Prisma.JsonValue;
                position: number;
                disabled: boolean;
                userId: number;
                createdAt: Date;
                updatedAt: Date;
                teamId: number | null;
                settings: import(".prisma/client").Prisma.JsonValue;
            }>;
            readOnly: boolean;
        }[];
        totalCount: number;
    };
}>;
//# sourceMappingURL=forms.d.ts.map