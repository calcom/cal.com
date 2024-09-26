import { TRPCError } from "@calcom/trpc/server";
import { getSerializableForm } from "../lib/getSerializableForm";
import { findTeamMembersMatchingAttributeLogic } from "./utils";
import type { TFindTeamMembersMatchingAttributeLogicInputSchema } from "./findTeamMembersMatchingAttributeLogic.schema";
import type { PrismaClient } from "@calcom/prisma";
import { UserRepository } from "@calcom/lib/server/repository/user";
interface FindTeamMembersMatchingAttributeLogicHandlerOptions {
  ctx: {
    prisma: PrismaClient;
  };
  input: TFindTeamMembersMatchingAttributeLogicInputSchema;
}

export const findTeamMembersMatchingAttributeLogicHandler = async ({ ctx, input }: FindTeamMembersMatchingAttributeLogicHandlerOptions) => {
  const { prisma } = ctx;
  const { formId, response, routeId } = input;

  const form = await prisma.app_RoutingForms_Form.findFirst({
    where: {
      id: formId,
    },
  });

  if (!form) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Form not found",
    });
  }

  if (!form.teamId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This form is not associated with a team",
    });
  }

  const serializableForm = await getSerializableForm({ form });

  const matchingTeamMembersIds = await findTeamMembersMatchingAttributeLogic({
    response,
    routeId,
    form: serializableForm,
    teamId: form.teamId,
  });
  
  if (!matchingTeamMembersIds) {
    return null;
  }

  const matchingTeamMembers = await UserRepository.findByIds({ ids: matchingTeamMembersIds });
  return matchingTeamMembers.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
  }));
};

export default findTeamMembersMatchingAttributeLogicHandler;