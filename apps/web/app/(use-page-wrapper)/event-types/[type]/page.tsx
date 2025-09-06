import { createRouterCaller, getTRPCContext } from "app/_trpc/context";
import type { PageProps, ReadonlyHeaders, ReadonlyRequestCookies } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { EventTypeWebWrapper } from "@calcom/atoms/event-types/wrappers/EventTypeWebWrapper";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { eventTypesRouter } from "@calcom/trpc/server/routers/viewer/eventTypes/_router";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

const querySchema = z.object({
  type: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "event-type id must be a string that can be cast to a number",
    })
    .transform((val) => Number(val)),
});

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => `${t("event_type")}`,
    () => "",
    undefined,
    undefined,
    "/event-types"
  );
};

const getCachedEventType = unstable_cache(
  async (eventTypeId: number, headers: ReadonlyHeaders, cookies: ReadonlyRequestCookies) => {
    const caller = await createRouterCaller(eventTypesRouter, await getTRPCContext(headers, cookies));
    return await caller.get({ id: eventTypeId });
  },
  ["viewer.eventTypes.get"],
  { revalidate: 3600 } // Cache for 1 hour
);

const getEventPermissions = async (userId: number, teamId: number | null) => {
  // Personal event - has all perms
  if (!teamId)
    return {
      eventTypes: {
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
      workflows: {
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      },
    };

  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      teamId,
    },
    select: {
      role: true,
    },
  });

  if (!membership) throw new Error("Membership not found");

  const [eventTypePermissions, workflowPermissions] = await Promise.all([
    getResourcePermissions({
      userId,
      teamId,
      resource: Resource.EventType,
      userRole: membership.role,
      fallbackRoles: {
        read: {
          roles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
        },
        update: {
          roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
        delete: {
          roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
        create: {
          roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
      },
    }),
    getResourcePermissions({
      userId,
      teamId,
      resource: Resource.Workflow,
      userRole: membership.role,
      fallbackRoles: {
        read: {
          roles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
        },
        update: {
          roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
        delete: {
          roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
        create: {
          roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
      },
    }),
  ]);

  return {
    eventTypes: {
      canRead: eventTypePermissions.canRead,
      canCreate: eventTypePermissions.canCreate,
      canUpdate: eventTypePermissions.canEdit,
      canDelete: eventTypePermissions.canDelete,
    },
    workflows: {
      canRead: workflowPermissions.canRead,
      canCreate: workflowPermissions.canCreate,
      canUpdate: workflowPermissions.canEdit,
      canDelete: workflowPermissions.canDelete,
    },
  };
};

const ServerPage = async ({ params }: PageProps) => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const parsed = querySchema.safeParse(await params);
  if (!parsed.success) {
    throw new Error("Invalid Event Type id");
  }
  const eventTypeId = parsed.data.type;
  const _headers = await headers();
  const _cookies = await cookies();

  const data = await getCachedEventType(eventTypeId, _headers, _cookies);
  if (!data?.eventType) {
    throw new Error("This event type does not exist");
  }

  // Fetch permissions for the event type's team
  const permissions = await getEventPermissions(session.user.id, data.eventType.teamId);

  return <EventTypeWebWrapper data={data} id={eventTypeId} permissions={permissions} />;
};

export default ServerPage;
