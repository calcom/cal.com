import prisma from "@calcom/prisma";

export async function cleanupUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return;

  await prisma.credential.deleteMany({ where: { userId: user.id } }).catch(() => {});
  await prisma.selectedCalendar.deleteMany({ where: { userId: user.id } }).catch(() => {});
  await prisma.membership.deleteMany({ where: { userId: user.id } }).catch(() => {});
  await prisma.schedule.deleteMany({ where: { userId: user.id } }).catch(() => {});
  await prisma.account.deleteMany({ where: { userId: user.id } }).catch(() => {});
  await prisma.session.deleteMany({ where: { userId: user.id } }).catch(() => {});
  await prisma.apiKey.deleteMany({ where: { userId: user.id } }).catch(() => {});
  await prisma.verificationToken.deleteMany({ where: { identifier: email } }).catch(() => {});
  await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, username: true, name: true, bio: true },
  });
}

export async function findAppleCalendarCredential(userId: number) {
  return prisma.credential.findFirst({
    where: { userId, type: "apple_calendar" },
    select: { id: true, type: true },
  });
}

export async function findAccessCodeByUserId(userId: number) {
  return prisma.accessCode.findFirst({
    where: { userId },
    orderBy: { id: "desc" },
    select: { code: true, codeChallenge: true, codeChallengeMethod: true },
  });
}
