"use client";

import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import Head from "next/head";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import z from "zod";

import { classNames } from "@calcom/lib";
import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { trpc } from "@calcom/trpc/react";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Button, showToast } from "@calcom/ui";
import { Icon } from "@calcom/ui";

import Loader from "@components/Loader";
import PageWrapper from "@components/PageWrapper";

import { getServerSideProps } from "@server/lib/auth/verify/getServerSideProps";

async function sendVerificationLogin(email: string, username: string) {
  await signIn("email", {
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    redirect: false,
    callbackUrl: WEBAPP_URL || "https://app.cal.com",
  })
    .then(() => {
      showToast("Verification email sent", "success");
    })
    .catch((err) => {
      showToast(err, "error");
    });
}

function useSendFirstVerificationLogin({
  email,
  username,
}: {
  email: string | undefined;
  username: string | undefined;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (!email || !username || sent.current) {
      return;
    }
    (async () => {
      await sendVerificationLogin(email, username);
      sent.current = true;
    })();
  }, [email, username]);
}

const querySchema = z.object({
  stripeCustomerId: z.string().optional(),
  sessionId: z.string().optional(),
  t: z.string().optional(),
});

const PaymentFailedIcon = () => (
  <div className="rounded-full bg-orange-900 p-3">
    <Icon name="triangle-alert" className="h-6 w-6 flex-shrink-0 p-0.5 font-extralight text-orange-100" />
  </div>
);

const PaymentSuccess = () => (
  <div
    className="rounded-full"
    style={{
      padding: "6px",
      border: "0.6px solid rgba(0, 0, 0, 0.02)",
      background: "rgba(123, 203, 197, 0.10)",
    }}>
    <motion.div
      className="rounded-full"
      style={{
        padding: "6px",
        border: "0.6px solid rgba(0, 0, 0, 0.04)",
        background: "rgba(123, 203, 197, 0.16)",
      }}
      animate={{ scale: [1, 1.1, 1] }} // Define the pulsing animation for the second ring
      transition={{
        duration: 1.5,
        repeat: Infinity,
        repeatType: "reverse",
        delay: 0.2, // Delay the start of animation for the second ring
      }}>
      <motion.div
        className="rounded-full p-3"
        style={{
          border: "1px solid rgba(255, 255, 255, 0.40)",
          background: "linear-gradient(180deg, #66C9CF 0%, #9CCCB2 100%)",
        }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M2.69185 10.6919L2.9297 10.9297L2.69185 10.6919C1.96938 11.4143 1.96938 12.5857 2.69185 13.3081L7.69185 18.3081C8.41432 19.0306 9.58568 19.0306 10.3081 18.3081L21.3081 7.30815C22.0306 6.58568 22.0306 5.41432 21.3081 4.69185C20.5857 3.96938 19.4143 3.96938 18.6919 4.69185L9 14.3837L5.30815 10.6919C4.58568 9.96938 3.41432 9.96938 2.69185 10.6919Z"
            fill="white"
            stroke="#48BAAE"
            strokeWidth="0.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </motion.div>
  </div>
);

const MailOpenIcon = () => (
  <div className="bg-default rounded-full p-3">
    <Icon name="mail-open" className="text-emphasis h-12 w-12 flex-shrink-0 p-0.5 font-extralight" />
  </div>
);

export default function Verify(props: inferSSRProps<typeof getServerSideProps>) {
  const searchParams = useCompatSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const routerQuery = useRouterQuery();
  const { t, sessionId, stripeCustomerId } = querySchema.parse(routerQuery);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const { data } = trpc.viewer.public.stripeCheckoutSession.useQuery(
    {
      stripeCustomerId,
      checkoutSessionId: sessionId,
    },
    {
      enabled: !!stripeCustomerId || !!sessionId,
      staleTime: Infinity,
    }
  );
  useSendFirstVerificationLogin({ email: data?.customer?.email, username: data?.customer?.username });
  // @note: check for t=timestamp and apply disabled state and secondsLeft accordingly
  // to avoid refresh to skip waiting 30 seconds to re-send email
  useEffect(() => {
    const lastSent = new Date(parseInt(`${t}`));
    // @note: This double round() looks ugly but it's the only way I came up to get the time difference in seconds
    const difference = Math.round(Math.round(new Date().getTime() - lastSent.getTime()) / 1000);
    if (difference < 30) {
      // If less than 30 seconds, set the seconds left to 30 - difference
      setSecondsLeft(30 - difference);
    } else {
      // else set the seconds left to 0 and disabled false
      setSecondsLeft(0);
    }
  }, [t]);
  // @note: here we make sure each second is decremented if disabled up to 0.
  useEffect(() => {
    if (secondsLeft > 0) {
      const interval = setInterval(() => {
        if (secondsLeft > 0) {
          setSecondsLeft(secondsLeft - 1);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [secondsLeft]);

  if (!data) {
    // Loading state
    return <Loader />;
  }
  const { valid, hasPaymentFailed, customer } = data;
  if (!valid) {
    throw new Error("Invalid session or customer id");
  }

  if (!stripeCustomerId && !sessionId) {
    return <div>Invalid Link</div>;
  }

  return (
    <div className="text-default bg-muted bg-opacity-90 backdrop-blur-md backdrop-grayscale backdrop-filter">
      <Head>
        <title>
          {/* @note: Ternary can look ugly ant his might be extracted later but I think at 3 it's not yet worth
        it or too hard to read. */}
          {hasPaymentFailed
            ? "Your payment failed"
            : sessionId
            ? "Payment successful!"
            : `Verify your email | ${APP_NAME}`}
        </title>
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="border-subtle bg-default m-10 flex max-w-2xl flex-col items-center rounded-xl border px-8 py-14 text-left">
          {hasPaymentFailed ? <PaymentFailedIcon /> : sessionId ? <PaymentSuccess /> : <MailOpenIcon />}
          <h3 className="font-cal text-emphasis my-6 text-2xl font-normal leading-none">
            {hasPaymentFailed
              ? "Your payment failed"
              : sessionId
              ? "Payment successful!"
              : "Check your Inbox"}
          </h3>
          {hasPaymentFailed && (
            <p className="my-6">Your account has been created, but your premium has not been reserved.</p>
          )}
          <p className="text-muted dark:text-subtle text-base font-normal">
            We have sent an email to <b>{customer?.email} </b>with a link to activate your account.{" "}
            {hasPaymentFailed &&
              "Once you activate your account you will be able to try purchase your premium username again or select a different one."}
          </p>
          <div className="mt-7">
            <Button
              color="secondary"
              href={
                props.EMAIL_FROM
                  ? encodeURIComponent(`https://mail.google.com/mail/u/0/#search/from:${props.EMAIL_FROM}`)
                  : "https://mail.google.com/mail/u/0/"
              }
              target="_blank"
              EndIcon="external-link">
              Open in Gmail
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-subtle text-base font-normal ">Don’t seen an email?</p>
          <button
            className={classNames(
              "font-light",
              secondsLeft > 0 ? "text-muted" : "underline underline-offset-2 hover:font-normal"
            )}
            disabled={secondsLeft > 0}
            onClick={async (e) => {
              if (!customer) {
                return;
              }
              e.preventDefault();
              setSecondsLeft(30);
              // Update query params with t:timestamp, shallow: true doesn't re-render the page
              const _searchParams = new URLSearchParams(searchParams?.toString());
              _searchParams.set("t", `${Date.now()}`);
              router.replace(`${pathname}?${_searchParams.toString()}`);
              return await sendVerificationLogin(customer.email, customer.username);
            }}>
            {secondsLeft > 0 ? `Resend in ${secondsLeft} seconds` : "Resend"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { getServerSideProps };
Verify.PageWrapper = PageWrapper;
