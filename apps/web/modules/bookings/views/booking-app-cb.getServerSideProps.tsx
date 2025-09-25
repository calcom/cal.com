import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

import { handleRazorpayPaymentRedirect } from "@calcom/app-store/razorpay/lib";
import prisma from "@calcom/prisma";

import { type inferSSRProps } from "@lib/types/inferSSRProps";

const querySchema = z.object({
  app: z.string(),
  uid: z.string(),
  razorpay_payment_id: z.string().optional(),
  razorpay_payment_link_id: z.string().optional(),
  razorpay_payment_link_reference_id: z.string().optional(),
  razorpay_payment_link_status: z.string().optional(),
  razorpay_signature: z.string().optional(),
});

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const parsedQuery = querySchema.safeParse(context.query);
  if (!parsedQuery.success) return { notFound: true } as const;

  const { app, uid } = parsedQuery.data;

  let paymentStatus = "";

  // Can implement more payment gateways callbacks here in future
  switch (app) {
    case "razorpay":
      paymentStatus = await handleRazorpayPaymentRedirect({
        razorpay_payment_id: parsedQuery.data.razorpay_payment_id,
        razorpay_payment_link_id: parsedQuery.data.razorpay_payment_link_id,
        razorpay_payment_link_reference_id: parsedQuery.data.razorpay_payment_link_reference_id,
        razorpay_payment_link_status: parsedQuery.data.razorpay_payment_link_status,
        razorpay_signature: parsedQuery.data.razorpay_signature,
      });
      break;
    default:
      return {
        notFound: true,
      } as const;
  }

  if (paymentStatus === "success") {
    //Get booking custom redirection url from db

    const data = await prisma.booking.findUnique({
      where: { uid },
      select: {
        eventType: {
          select: { successRedirectUrl: true },
        },
      },
    });

    if (data?.eventType?.successRedirectUrl) {
      return {
        redirect: {
          destination: data.eventType.successRedirectUrl,
          permanent: false,
        },
      };
    }

    return {
      redirect: {
        destination: `/booking/${uid}`,
        permanent: false,
      },
    };
  }
  return {
    props: {
      paymentStatus,
    },
  };
}

export type PageProps = inferSSRProps<typeof getServerSideProps>;
