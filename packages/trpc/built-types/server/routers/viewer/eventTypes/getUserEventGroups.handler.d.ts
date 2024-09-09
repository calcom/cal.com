import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "../../../trpc";
import type { TEventTypeInputSchema } from "./getByViewer.schema";
type GetByViewerOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: TEventTypeInputSchema;
};
export declare const getUserEventGroups: ({ ctx, input }: GetByViewerOptions) => Promise<{
    eventTypeGroups: {
        teamId?: number | null | undefined;
        parentId?: number | null | undefined;
        bookerUrl: string;
        membershipRole?: MembershipRole | null | undefined;
        profile: {
            slug: string | null;
            name: string | null;
            image: string;
            eventTypesLockedByOrg?: boolean | undefined;
        };
        metadata: {
            membershipCount: number;
            readOnly: boolean;
        };
    }[];
    profiles: {
        teamId: number | null | undefined;
        membershipRole: MembershipRole | null | undefined;
        membershipCount: number;
        readOnly: boolean;
        slug: string | null;
        name: string | null;
        image: string;
        eventTypesLockedByOrg?: boolean | undefined;
    }[];
}>;
export declare function compareMembership(mship1: MembershipRole, mship2: MembershipRole): boolean;
export {};
