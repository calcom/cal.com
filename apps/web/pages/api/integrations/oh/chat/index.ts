import type { IncomingHttpHeaders } from "http";
import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import { createDefaultInstallation } from "@calcom/app-store/_utils/installation";
import { ONEHASH_API_KEY, WEBAPP_URL } from "@calcom/lib/constants";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

const getSchema = z.object({
  account_name: z.string(),
  account_user_id: z.number().or(z.string()), // account_user_id can be a number or a string
  user_id: z.number().or(z.string()),
  user_name: z.string(),
  user_email: z.string(),
});

const postSchema = z.object({
  account_name: z.string(),
  account_user_id: z.number(),
  account_user_email: z.string(),
  cal_user_slug: z.string(),
});
type PostSchemaType = z.infer<typeof postSchema>;
type PostWithoutSlug = Omit<PostSchemaType, "cal_user_slug">;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case "GET":
        return await getHandler(req, res);
      case "POST":
        return await postHandler(req, res);
      case "DELETE":
        return await deleteHandler(req, res);
      default:
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      }));
      return res.status(400).json({ errors });
    } else {
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
}

const getHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (!checkIfTokenIsValid(req.headers)) return res.status(401).json({ message: "Unauthorized" });
    const { account_user_id, account_name, user_id, user_email, user_name } = getSchema.parse(req.query);
    const user = await prisma.user.findUnique({
      where: {
        id: Number(user_id),
      },
      select: {
        id: true,
        username: true,
        metadata: true,
        eventTypes: {
          where: {
            parentId: null,
          },
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        bookings: {
          // where: {
          //   status: {
          //     not: BookingStatus.PENDING,
          //   },
          // },
          where: {
            status: BookingStatus.ACCEPTED,
          },
          select: {
            uid: true,
            // status:true,
            startTime: true,
            endTime: true,
            location: true,
            attendees: {
              select: {
                name: true,
                email: true,
                phoneNumber: true,
              },
            },
            eventType: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });
    if (!user) return res.status(403).json({ message: "User not found" });
    const cal_events = user.eventTypes.map((eventType) => {
      return {
        uid: eventType.id,
        title: eventType.title,
        url: `${WEBAPP_URL}/${user.username}/${eventType.slug}`,
      };
    });

    const bookings = user.bookings.map((booking) => {
      return {
        hostName: user.username,
        bookingLocation: booking.location,
        bookingEventType: booking.eventType?.title,
        bookingStartTime: booking.startTime,
        bookingEndTime: booking.endTime,
        bookerEmail: booking.attendees.length > 0 ? booking.attendees[0].email : "N/A",
        bookerPhone: booking.attendees.length > 0 ? booking.attendees[0].phoneNumber : "N/A",
        bookingUid: booking.uid,
        // bookingStatus:booking.status,
      };
    });

    await createDefaultInstallation({
      appType: "onehash",
      user: user,
      slug: "onehash-chat",
      key: {
        account_user_id: Number(account_user_id),
        account_name,
        user_email,
        user_name,
      },
    });

    await setConnectedChatAccounts(user.id, user.metadata);

    return res.json({ cal_events, bookings, user_id: user.id });
  } catch (err) {
    console.log("in_here_err", err);
    throw err;
  }
};

const deleteHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (!checkIfTokenIsValid(req.headers)) return res.status(401).json({ message: "Unauthorized" });
    const { cal_user_id, account_user_id } = req.query as {
      cal_user_id: string;
      account_user_id: string;
    };

    const userId = Number(cal_user_id);
    await prisma.credential.deleteMany({
      where: {
        type: "onehash",
        userId,
        key: {
          path: ["account_user_id"],
          equals: Number(account_user_id),
        },
      },
    });
    await unsetConnectedChatAccounts(userId);
    return res.json({ message: "Deleted successfully" });
  } catch (error) {
    throw error;
  }
};

const postHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (!checkIfTokenIsValid(req.headers)) return res.status(401).json({ message: "Unauthorized" });

    const { account_user_email, account_user_id, account_name, cal_user_slug } = postSchema.parse(req.body);

    const cal_user = await prisma.user.findFirst({
      where: {
        username: cal_user_slug,
      },
      select: {
        id: true,
        metadata: true,
      },
    });

    if (!cal_user) return res.json({ message: "Integration request raised if user exist" });
    const existingMetadata = isPrismaObjOrUndefined(cal_user?.metadata) ?? {};
    const chat_integration_requests =
      (existingMetadata?.chat_integration_requests as Array<PostWithoutSlug>) ?? [];

    const isExistingRequest = chat_integration_requests.some(
      (request) => request.account_user_id === account_user_id
    );

    if (isExistingRequest) {
      return res.status(400).json({ message: "Request with this account_user_id already exists." });
    }

    chat_integration_requests.push({
      account_user_email,
      account_user_id,
      account_name,
    });

    const updatedMetadata = {
      ...existingMetadata,
      chat_integration_requests,
    };

    await prisma.user.update({
      where: {
        id: cal_user.id,
      },
      data: {
        metadata: updatedMetadata,
      },
    });
    return res.json({ message: "Integration request raised if user exist" });
  } catch (error) {
    throw error;
  }
};

async function setConnectedChatAccounts(user_id: number, metadata: Prisma.JsonValue) {
  const existingMetadata = isPrismaObjOrUndefined(metadata);
  const connectedChatAccounts = (existingMetadata?.connectedChatAccounts as number) ?? 0;

  const updatedMetadata = {
    ...existingMetadata,
    connectedChatAccounts: connectedChatAccounts + 1,
  };

  await prisma.user.update({
    where: {
      id: user_id,
    },
    data: {
      metadata: updatedMetadata,
    },
  });
}
async function unsetConnectedChatAccounts(user_id: number) {
  // Get the current user data with metadata
  const user = await prisma.user.findUnique({
    where: {
      id: user_id,
    },
  });

  // Ensure user exists and metadata contains connectedChatAccounts
  if (!user) {
    throw new Error("User not found ");
  }

  const existingMetadata = isPrismaObjOrUndefined(user.metadata);
  const connectedChatAccounts = (existingMetadata?.connectedChatAccounts as number) ?? 0;

  if (connectedChatAccounts === 0) {
    return Promise.resolve();
    // throw new Error("User already has no connected chat accounts");
  }

  if (connectedChatAccounts === 1) {
    delete existingMetadata?.connectedChatAccounts;
  } else {
    if (existingMetadata) {
      existingMetadata.connectedChatAccounts = connectedChatAccounts - 1;
    }
  }

  await prisma.user.update({
    where: { id: user_id },
    data: { metadata: existingMetadata },
  });
}

const checkIfTokenIsValid = (headers: IncomingHttpHeaders) => {
  const authHeader = headers["authorization"];
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  return token === ONEHASH_API_KEY;
};
