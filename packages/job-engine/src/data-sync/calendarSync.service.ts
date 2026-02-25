import { prisma } from "../prisma";

export const handleGoogleCalendarSync = async (userId: number) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    console.error(`User with id ${userId} not found.`);
    return;
  }
  console.log(`Handling Google Calendar sync for user: ${user.email}`);
};
