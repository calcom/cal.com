import { prisma } from "@calcom/prisma";

export const getBasecampProjects = async (userId: string) => {
  const credential = await prisma.credential.findUnique({ where: userId });
  console.log("credentialz", credential);
};
