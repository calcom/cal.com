import prisma from "@lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

interface IZoomAndResult {
  event: string;
  event_ts: string;
  payload: {
    account_id: string;
    object: {
      id: string;
      uuid: string;
      host_id: string;
      topic: string;
      type: number;
      start_time: string;
      timezone: string;
      duration: number;
      end_time: string;
    };
  };
}

const subscription = async (req: NextApiRequest, res: NextApiResponse): Promise<any> => {
  // Check valid method
  if (req.method !== "POST") res.status(405).json({ message: "Method not allowed" });

  const { event, payload } = req.body as IZoomAndResult;
  const { object } = payload || {};

  switch (event) {
    case "meeting.ended": {
      const bookingReference = await prisma.bookingReference.findFirst({
        where: {
          uid: object?.id,
        },
      });

      // Call Amili API here
      const { bookingId } = bookingReference;
      const reqPayload = {
        assBookingId: bookingId,
        zoomEndResult: req.body,
      };

      return fetch(`${process.env.AMILI_API_BASE_URL}/coach-booking/session/third-party-completed`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqPayload),
      })
        .then((res) => console.log({ subscriptionSuccess: res.json() }))
        .catch((e) => console.log({ subscriptionError: e }));
    }

    default:
      break;
  }
};

export default subscription;
