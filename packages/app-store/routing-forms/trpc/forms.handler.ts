import { hasFilter } from "@calcom/features/filters/lib/hasFilters";
import { hasUserWriteAccessToEntity } from "@calcom/lib/hasUserWriteAccessToEntity";
import logger from "@calcom/lib/logger";
import type { PrismaClient, Prisma } from "@calcom/prisma/client";
import { entries } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { getSerializableForm } from "../lib/getSerializableForm";
import type { TFormSchema } from "./forms.schema";

interface FormsHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  input: TFormSchema;
}
const log = logger.getChildLogger({ prefix: ["[formsHandler]"] });

export const formsHandler = async ({ ctx, input }: FormsHandlerOptions) => {
  const { prisma, user } = ctx;

  const where = getPrismaWhereFromFilters(user, input.filters);
  log.debug("Getting forms where", JSON.stringify(where));

  const forms = await prisma.app_RoutingForms_Form.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      team: {
        include: {
          members: true,
        },
      },
      _count: {
        select: {
          responses: true,
        },
      },
    },
  });

  const totalForms = await prisma.app_RoutingForms_Form.count();

  const serializableForms = [];
  for (let i = 0; i < forms.length; i++) {
    const form = forms[i];
    const hasWriteAccess = hasUserWriteAccessToEntity(form, user.id);
    serializableForms.push({
      form: await getSerializableForm(forms[i]),
      readOnly: !hasWriteAccess,
    });
  }

  return {
    filtered: serializableForms,
    totalCount: totalForms,
  };
};

export default formsHandler;
export function getPrismaWhereFromFilters(
  user: {
    id: number;
  },
  filters: TFormSchema["filters"]
) {
  const where = {
    OR: [] as Prisma.App_RoutingForms_FormWhereInput[],
  };

  const prismaQueries: Record<
    keyof typeof filters,
    (...args: [number[]]) => Prisma.App_RoutingForms_FormWhereInput
  > & {
    all: () => Prisma.App_RoutingForms_FormWhereInput;
  } = {
    userIds: (userIds: number[]) => ({
      userId: {
        in: userIds,
      },
      teamId: null,
    }),
    teamIds: (teamIds: number[]) => ({
      team: {
        id: {
          in: teamIds ?? [],
        },
        members: {
          some: {
            userId: user.id,
            accepted: true,
          },
        },
      },
    }),
    all: () => ({
      OR: [
        {
          userId: user.id,
        },
        {
          team: {
            members: {
              some: {
                userId: user.id,
                accepted: true,
              },
            },
          },
        },
      ],
    }),
  };

  if (!hasFilter(filters)) {
    where.OR.push(prismaQueries.all());
  } else {
    for (const entry of entries(filters)) {
      if (!entry) {
        continue;
      }
      const [filterName, filter] = entry;
      const getPrismaQuery = prismaQueries[filterName];
      // filter might be accidentally set undefined as well
      if (!getPrismaQuery || !filter) {
        continue;
      }
      where.OR.push(getPrismaQuery(filter));
    }
  }

  return where;
}
