import type { TrpcSessionUser } from "../../../trpc";
import type { TGetMinimalInputSchema } from "./getMinimal.schema";
type GetMinimalDataOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGetMinimalInputSchema;
};
export declare const getMinimal: ({ ctx, input }: GetMinimalDataOptions) => Promise<{
    membership: {
        role: import(".prisma/client").$Enums.MembershipRole;
        accepted: boolean;
    };
    inviteToken: {
        token: string;
        expires: Date;
        expiresInDays: number | null;
        identifier: string;
    } | undefined;
    metadata: {
        requestedSlug?: string | null | undefined;
        orgSeats?: number | null | undefined;
        orgPricePerSeat?: number | null | undefined;
        migratedToOrgFrom?: {
            teamSlug?: string | null | undefined;
            lastMigrationTime?: string | undefined;
            reverted?: boolean | undefined;
            lastRevertTime?: string | undefined;
        } | undefined;
        billingPeriod?: import("@calcom/prisma/zod-utils").BillingPeriod | undefined;
    };
    logo?: string | undefined;
    id: number;
    slug: string | null;
    parentId: number | null;
    parent: {
        id: number;
        slug: string | null;
        metadata: import(".prisma/client").Prisma.JsonValue;
        name: string;
        logoUrl: string | null;
        isPrivate: boolean;
        isOrganization: boolean;
    } | null;
    children: {
        slug: string | null;
        name: string;
    }[];
    name: string;
    bio: string | null;
    hideBranding: boolean;
    theme: string | null;
    brandColor: string | null;
    darkBrandColor: string | null;
    logoUrl: string | null;
    isPrivate: boolean;
    hideBookATeamMember: boolean;
    isOrganization: boolean;
}>;
export default getMinimal;
