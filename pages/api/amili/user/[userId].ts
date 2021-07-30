import { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../../lib/prisma";
import { User } from ".prisma/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const updateHealthCoach = async (req: NextApiRequest, res: NextApiResponse): Promise<User | any> => {
  const { userId } = req.query;
  const data = req.body;
  const { name, description, timezone } = data;

  const updateData = {};
  if (name) updateData["name"] = name;
  if (description) updateData["bio"] = description;
  if (timezone) updateData["timeZone"] = timezone;

  // Check valid method
  if (req.method !== "PATCH") return;

  // Check valid email
  const existingUser = await prisma.user.findFirst({
    where: {
      id: userId as any,
    },
  });

  if (!existingUser) return res.status(404).json({ message: "UserId is not found" });

  // Update user
  const user = await prisma.user.update({
    data: updateData,
    where: {
      id: userId as any,
    },
  });

  return user;
};

export default updateHealthCoach;
