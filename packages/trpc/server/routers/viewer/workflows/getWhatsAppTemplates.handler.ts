import { PrismaClient } from "@prisma/client";
import { z } from "zod";

export const getWhatsAppTemplatesHandler = async ({
  ctx,
  input,
}: {
  ctx: { prisma: PrismaClient; user: { id: string } };
  input: { phoneNumberId: string; calIdTeamId?: number };
}) => {
  const whereClause = input.calIdTeamId
    ? {
        phoneNumberId: input.phoneNumberId,
        credential: { calIdTeamId: input.calIdTeamId },
      }
    : {
        phoneNumberId: input.phoneNumberId,
        userId: ctx.user.id,
      };

  const phone = await ctx.prisma.whatsAppBusinessPhone.findFirst({
    where: whereClause,
    select: {
      templates: true,
    },
  });

  if (!phone || !phone.templates) {
    return [];
  }

  const templates = phone.templates as any[];

  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    category: template.category,
    language: template.language,
    components: template.components,
    status: template.status,
    parameter_format: template.parameter_format,
  }));
};
