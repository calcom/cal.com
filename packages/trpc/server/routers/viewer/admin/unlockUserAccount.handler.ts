import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { unlockUser } from "@calcom/lib/autoLock";
import prisma from "@calcom/prisma";

const unlockUserAccountSchema = z.object({
  userId: z.number(),
  email: z.string().email().optional(),
});

type GetOptions = {
  ctx: {
    user: { id: number };
  };
  input: z.infer<typeof unlockUserAccountSchema>;
};

const unlockUserAccountHandler = async ({ input }: GetOptions) => {
  const { userId, email } = input;

  try {
    // First try to unlock by userId
    if (userId) {
      await unlockUser("userId", userId.toString());
    }

    // If email is provided, also unlock by email
    if (email) {
      await unlockUser("email", email);
    }

    // Verify the user is unlocked
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, locked: true },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return {
      success: true,
      userId,
      email: user.email,
      locked: user.locked,
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to unlock user account",
    });
  }
};

export default unlockUserAccountHandler; 