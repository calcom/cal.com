import { useEffect } from "react";
import DailyIframe from "@daily-co/daily-js";
import prisma from "../../lib/prisma";
import { getSession } from "next-auth/client";
import type { NextApiRequest } from "next";
import { useRouter } from "next/router";

export default function JoinCall(props, session) {
  const router = useRouter();

  //if no booking redirectis to the 404 page
  const emptyBooking = props.booking === null;
  useEffect(() => {
    if (emptyBooking) {
      router.push("/call/no-meeting-found");
    }
  });

  useEffect(() => {
    if (!emptyBooking && session.userid !== props.booking.user.id) {
      const callFrame = DailyIframe.createFrame({
        showLeaveButton: true,
        iframeStyle: {
          position: "fixed",
          width: "100%",
          height: "100%",
        },
      });
      callFrame.join({
        url: props.booking.dailyRef.dailyurl,
        showLeaveButton: true,
      });
    }
    if (!emptyBooking && session.userid === props.booking.user.id) {
      const callFrame = DailyIframe.createFrame({
        showLeaveButton: true,
        iframeStyle: {
          position: "fixed",
          width: "100%",
          height: "100%",
        },
      });
      callFrame.join({
        url: props.booking.dailyRef.dailyurl,
        showLeaveButton: true,
        token: props.booking.dailyRef.dailytoken,
      });
    }
  }, []);

  return JoinCall;
}

export async function getServerSideProps(context) {
  const booking = await prisma.booking.findFirst({
    where: {
      uid: context.query.uid,
    },
    select: {
      id: true,
      user: {
        select: {
          credentials: true,
        },
      },
      attendees: true,
      dailyRef: {
        select: {
          dailyurl: true,
          dailytoken: true,
        },
      },
      references: {
        select: {
          uid: true,
          type: true,
        },
      },
    },
  });

  return {
    props: {
      booking: booking,
    },
  };
}

export async function handler(req: NextApiRequest) {
  const session = await getSession({ req: req });

  if (session) {
    return session;
  }
}
