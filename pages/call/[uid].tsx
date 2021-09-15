import { useEffect } from "react";
import DailyIframe from "@daily-co/daily-js";
import { useRouter } from "next/router";
import prisma from "../../lib/prisma";
import { getSession } from "next-auth/client";
import type { NextApiRequest, NextApiResponse } from "next";

export default function JoinCall(props, session) {
  // Get router variables
  const router = useRouter();
  const { uid } = router.query;
  const owner = session.userid === props.booking.user.id;

  const url = props.booking.dailyRef.dailyurl;
  const token = props.booking.dailyRef.dailytoken;
  useEffect(() => {
    if (!owner) {
      const callFrame = DailyIframe.createFrame({
        showLeaveButton: true,
        iframeStyle: {
          position: "fixed",
          width: "100%",
          height: "100%",
        },
      });
      callFrame.join({
        url: url,
        showLeaveButton: true,
      });
    }
    if (owner) {
      const callFrame = DailyIframe.createFrame({
        showLeaveButton: true,
        iframeStyle: {
          position: "fixed",
          width: "100%",
          height: "100%",
        },
      });
      callFrame.join({
        url: url,
        showLeaveButton: true,
        token: token,
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

export async function handler(req: NextApiRequest, res: NextApiResponse, props) {
  const session = await getSession({ req: req });

  if (session) {
    return session;
  }
}
