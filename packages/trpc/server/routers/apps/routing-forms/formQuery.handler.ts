import { getSerializableForm } from "@calcom/app-store/routing-forms/lib/getSerializableForm";
import { entityPrismaWhereClause } from "@calcom/features/pbac/lib/entityPermissionUtils.server";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TFormQueryInputSchema } from "./formQuery.schema";
import { checkPermissionOnExistingRoutingForm } from "./permissions";

interface FormsHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
  };
  input: TFormQueryInputSchema;
}

export const formQueryHandler = async ({ ctx, input }: FormsHandlerOptions) => {
  const { prisma, user } = ctx;
  const form = await prisma.app_RoutingForms_Form.findFirst({
    where: {
      AND: [
        entityPrismaWhereClause({ userId: user.id }),
        {
          id: input.id,
        },
      ],
    },
    include: {
      team: { select: { slug: true, name: true } },
      _count: {
        select: {
          responses: true,
        },
      },
    },
  });

  if (!form) {
    return null;
  }

  await checkPermissionOnExistingRoutingForm({
    formId: input.id,
    userId: user.id,
    permission: "routingForm.read",
    fallbackRoles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
  });

  return await getSerializableForm({ form });
};

export default formQueryHandler;
