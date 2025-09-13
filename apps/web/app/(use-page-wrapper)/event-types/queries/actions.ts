"use server";

import { bulkEventFetchHandler } from "@calcom/trpc/server/routers/viewer/eventTypes/bulkEventFetch.handler";
import { getHandler } from "@calcom/trpc/server/routers/viewer/eventTypes/get.handler";
import { ZGetInputSchema } from "@calcom/trpc/server/routers/viewer/eventTypes/get.schema";
import { getByViewerHandler } from "@calcom/trpc/server/routers/viewer/eventTypes/getByViewer.handler";
import {
  ZEventTypeInputSchema,
  ZGetEventTypesFromGroupSchema,
} from "@calcom/trpc/server/routers/viewer/eventTypes/getByViewer.schema";
import { getEventTypesFromGroup } from "@calcom/trpc/server/routers/viewer/eventTypes/getEventTypesFromGroup.handler";
import { getHashedLinkHandler } from "@calcom/trpc/server/routers/viewer/eventTypes/getHashedLink.handler";
import { ZGetHashedLinkInputSchema } from "@calcom/trpc/server/routers/viewer/eventTypes/getHashedLink.schema";
import { getHashedLinksHandler } from "@calcom/trpc/server/routers/viewer/eventTypes/getHashedLinks.handler";
import { ZGetHashedLinksInputSchema } from "@calcom/trpc/server/routers/viewer/eventTypes/getHashedLinks.schema";
import { getTeamAndEventTypeOptions } from "@calcom/trpc/server/routers/viewer/eventTypes/getTeamAndEventTypeOptions.handler";
import { ZGetTeamAndEventTypeOptionsSchema } from "@calcom/trpc/server/routers/viewer/eventTypes/getTeamAndEventTypeOptions.schema";
import { getUserEventGroups } from "@calcom/trpc/server/routers/viewer/eventTypes/getUserEventGroups.handler";
import { listHandler } from "@calcom/trpc/server/routers/viewer/eventTypes/list.handler";
import { listWithTeamHandler } from "@calcom/trpc/server/routers/viewer/eventTypes/listWithTeam.handler";

import { authedActionClient } from "../../../../lib/safe-action";

export const getByViewerAction = authedActionClient
  .schema(ZEventTypeInputSchema)
  .action(async ({ parsedInput, ctx }: { parsedInput: unknown; ctx: unknown }) => {
    return getByViewerHandler({
      ctx: { user: ctx.user, prisma: ctx.prisma },
      input: parsedInput,
    });
  });

export const getUserEventGroupsAction = authedActionClient
  .schema(ZEventTypeInputSchema)
  .action(async ({ parsedInput, ctx }: { parsedInput: unknown; ctx: unknown }) => {
    return getUserEventGroups({
      ctx: { user: ctx.user, prisma: ctx.prisma },
      input: parsedInput,
    });
  });

export const getEventTypesFromGroupAction = authedActionClient
  .schema(ZGetEventTypesFromGroupSchema)
  .action(async ({ parsedInput, ctx }: { parsedInput: unknown; ctx: unknown }) => {
    return getEventTypesFromGroup({
      ctx: { user: ctx.user, prisma: ctx.prisma },
      input: parsedInput,
    });
  });

export const getTeamAndEventTypeOptionsAction = authedActionClient
  .schema(ZGetTeamAndEventTypeOptionsSchema)
  .action(async ({ parsedInput, ctx }: { parsedInput: unknown; ctx: unknown }) => {
    return getTeamAndEventTypeOptions({
      ctx: { user: ctx.user, prisma: ctx.prisma },
      input: parsedInput,
    });
  });

export const listAction = authedActionClient.action(async ({ ctx }: { ctx: unknown }) => {
  return listHandler({
    ctx: { user: ctx.user },
  });
});

export const listWithTeamAction = authedActionClient.action(async ({ ctx }: { ctx: unknown }) => {
  return listWithTeamHandler({
    ctx: { user: ctx.user },
  });
});

export const getAction = authedActionClient
  .schema(ZGetInputSchema)
  .action(async ({ parsedInput, ctx }: { parsedInput: unknown; ctx: unknown }) => {
    return getHandler({
      ctx: { user: ctx.user, prisma: ctx.prisma },
      input: parsedInput,
    });
  });

export const bulkEventFetchAction = authedActionClient.action(async ({ ctx }: { ctx: unknown }) => {
  return bulkEventFetchHandler({
    ctx: { user: ctx.user },
  });
});

export const getHashedLinkAction = authedActionClient
  .schema(ZGetHashedLinkInputSchema)
  .action(async ({ parsedInput, ctx }: { parsedInput: unknown; ctx: unknown }) => {
    return getHashedLinkHandler({
      ctx: { user: ctx.user, prisma: ctx.prisma },
      input: parsedInput,
    });
  });

export const getHashedLinksAction = authedActionClient
  .schema(ZGetHashedLinksInputSchema)
  .action(async ({ parsedInput, ctx }: { parsedInput: unknown; ctx: unknown }) => {
    return getHashedLinksHandler({
      ctx: { user: ctx.user, prisma: ctx.prisma },
      input: parsedInput,
    });
  });
