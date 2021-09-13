import { useEffect } from "react";
import DailyIframe from '@daily-co/daily-js';
import { useRouter } from "next/router";
import prisma from "../../lib/prisma";
import { dailyUpdateMeeting } from "@lib/dailyVideoClient";


export default function joinCall(props) {
   // Get router variables
   const router = useRouter();
   const { uid } = router.query;
   const callid = props.booking.references.filter((ref) => ref.type === "daily")[0]?.uid;
   

  useEffect(() => {
  const dailydomain = process.env.DAILY_DOMAIN; 
  const url =  dailydomain + callid;
  const callFrame = DailyIframe.createFrame({
    showLeaveButton: true,
    iframeStyle: {
      position: 'fixed',
      width: '100%',
     height: '100%'
    }
  });
      callFrame.join({
        url: 'https://lunchpaillabs.daily.co/b8HV47X6XlCXjU8T9EJs',
        showLeaveButton: true,
    })
}, [])

return joinCall;

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
      references: {
        select: {
          uid: true,
          type: true,
        },
      },
    },
  });

  // Workaround since Next.js has problems serializing date objects (see https://github.com/vercel/next.js/issues/11993)
  const bookingObj = Object.assign({}, booking, {
  });

  return {
    props: {
      booking: booking
    },

  };
}


