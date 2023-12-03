import { PrismaClient } from "@prisma/client";
import type { NextApiRequest } from "next";

const prisma = new PrismaClient();

interface WaitlistRequest extends NextApiRequest {
  body: {
    userId: number;
    timeSlotId: number;
  };
}

export async function addToWaitlist(req: NextApiRequest) {
  const { userId, timeSlotId } = req.body;

  // Assuming you have a 'waitlist' model in your Prisma schema
  const entry = await prisma.waitlist.create({
    data: {
      userId,
      timeSlotId,
      // Add other fields if necessary
    },
  });

  return entry ? { message: "Added to waitlist successfully" } : { error: "Failed to add to waitlist" };
}

export async function removeFromWaitlist(req: WaitlistRequest): Promise<{ message: string }> {
  const { userId, timeSlotId } = req.body;

  const deleteResult = await prisma.waitlist.deleteMany({
    where: {
      userId,
      timeSlotId,
      // Include other conditions if necessary
    },
  });

  return deleteResult.count > 0
    ? { message: "Removed from waitlist successfully" }
    : { error: "Failed to remove from waitlist" };
}
