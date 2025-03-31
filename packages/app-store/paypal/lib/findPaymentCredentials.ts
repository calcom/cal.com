import { paypalCredentialKeysSchema } from "@calcom/app-store/paypal/lib";
import prisma from "@calcom/prisma";

export const findPaymentCredentials = async (
  bookingId: number
): Promise<{ clientId: string; secretKey: string; webhookId: string }> => {
  try {
    // @TODO: what about team bookings with paypal?
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
        appId: "paypal",
        userId: userFromBooking?.userId,
      },
      select: {
        key: true,
      },
    });
    if (!credentials) {
      throw new Error("No credentials found");
    }
    const parsedCredentials = paypalCredentialKeysSchema.safeParse(credentials?.key);
    if (!parsedCredentials.success) {
      throw new Error("Credentials malformed");
    }

    return {
      clientId: parsedCredentials.data.client_id,
      secretKey: parsedCredentials.data.secret_key,
      webhookId: parsedCredentials.data.webhook_id,
    };
  } catch (err) {
    console.error(err);
    return {
      clientId: "",
      secretKey: "",
      webhookId: "",
    };
  }
};
