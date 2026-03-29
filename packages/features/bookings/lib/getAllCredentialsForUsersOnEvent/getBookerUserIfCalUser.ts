import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import prisma from "@calcom/prisma";

/**
 * Checks if a booker's email belongs to a Cal.com user and returns the user if found
 * @param bookerEmail - Email of the booker to check
 * @returns Promise resolving to the user object if Cal.com user, null otherwise
 */
export const getBookerUserIfCalUser = async (bookerEmail: string) => {
  if (!bookerEmail) return null;

  const user = await new UserRepository(prisma).findByEmail({
    email: bookerEmail,
  });

  return user || null;
};