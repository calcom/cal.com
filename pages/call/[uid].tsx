import DailyIframe from "@daily-co/daily-js";
import { getSession } from "next-auth/client";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect } from "react";

import prisma from "../../lib/prisma";

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

  return (
    <div style={{ zIndex: 2, position: "relative" }}>
      <Link href="/">
        <img
          className="hidden sm:inline-block z-10 fixed w-auto h-5"
          src="https://cal.com/logo-white.svg"
          alt="Cal.com Logo"
          style={{
            top: 46,
            left: 24,
          }}
        />
      </Link>
      {JoinCall}
    </div>
  );
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

  const session = await getSession();

  return {
    props: {
      booking: booking,
      session: session,
    },
  };
}
