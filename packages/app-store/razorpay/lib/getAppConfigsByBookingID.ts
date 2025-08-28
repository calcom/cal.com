import { z } from "zod";

import prisma from "@calcom/prisma";

export const razorpayCredentialKeysSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  public_token: z.string(),
  account_id: z.string(),
});

export const findPaymentCredentials = async (
  bookingId: number
): Promise<z.infer<typeof razorpayCredentialKeysSchema>> => {
  try {
    const userFromBooking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!userFromBooking) throw new Error("No user found");

    const credentials = await prisma.credential.findFirst({
      where: {
        appId: "razorpay",
        userId: userFromBooking?.userId,
      },
      select: {
        key: true,
      },
    });
    if (!credentials) {
      throw new Error("No credentials found");
    }
    const parsedCredentials = razorpayCredentialKeysSchema.safeParse(credentials?.key);
    if (!parsedCredentials.success) {
      throw new Error("Credentials malformed");
    }

    return {
      access_token: parsedCredentials.data.access_token,
      refresh_token: parsedCredentials.data.refresh_token,
      public_token: parsedCredentials.data.public_token,
      account_id: parsedCredentials.data.account_id,
    };
  } catch (err) {
    console.error(err);
    throw new Error("No credentials found");
  }
};
