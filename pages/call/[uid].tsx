import { useEffect } from "react";
import DailyIframe from '@daily-co/daily-js';
import { useRouter } from "next/router";
import prisma from "../../lib/prisma";



export default function joinCall(props) {
   // Get router variables
   const router = useRouter();
   const { uid } = router.query;
   

  const url = props.booking.dailyurl
  useEffect(() => {
  const callFrame = DailyIframe.createFrame({
    showLeaveButton: true,
    iframeStyle: {
      position: 'fixed',
      width: '100%',
     height: '100%'
    }
  });
      callFrame.join({
        url: url,
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
      dailyurl: true,
      attendees: true,
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
      booking: booking
    },

  };
}


