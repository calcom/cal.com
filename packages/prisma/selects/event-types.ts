import { Prisma } from "@prisma/client";

export const baseEventTypeSelect = Prisma.validator<Prisma.EventTypeSelect>()({
  id: true,
  title: true,
  description: true,
  length: true,
  schedulingType: true,
  recurringEvent: true,
  slug: true,
  hidden: true,
  price: true,
  currency: true,
  requiresConfirmation: true,
});
