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
        identifier: string;
        expires: Date;
        expiresInDays: number | null;
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
    name: string;
    id: number;
    slug: string | null;
    parentId: number | null;
    parent: {
        name: string;
        id: number;
        metadata: import(".prisma/client").Prisma.JsonValue;
        slug: string | null;
        logoUrl: string | null;
        isPrivate: boolean;
        isOrganization: boolean;
    } | null;
    children: {
        name: string;
        slug: string | null;
    }[];
    logoUrl: string | null;
    bio: string | null;
    hideBranding: boolean;
    isPrivate: boolean;
    hideBookATeamMember: boolean;
    theme: string | null;
    brandColor: string | null;
    darkBrandColor: string | null;
    isOrganization: boolean;
}>;
export default getMinimal;
