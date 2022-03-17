import prisma from "@lib/prisma";

export const deleteAllBookingsByEmail = async (email: string) =>
  prisma.booking.deleteMany({
    where: {
      user: {
        email,
      },
    },
  });

export const deleteEventTypeByTitle = async (title: string) => {
  const event = (await prisma.eventType.findFirst({
    select: { id: true },
    where: { title: title },
  }))!;
  await prisma.eventType.delete({ where: { id: event.id } });
};

export const deleteAllWebhooksByEmail = async (email: string) => {
  await prisma.webhook.deleteMany({
    where: {
      user: {
        email,
      },
    },
  });
};

export const deleteAllPaymentsByEmail = async (email: string) => {
  await prisma.payment.deleteMany({
    where: {
      booking: {
        user: {
          email,
        },
      },
    },
  });
};
