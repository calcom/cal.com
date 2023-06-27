import { signIn } from "next-auth/react";
import Head from "next/head";
import { useRouter } from "next/router";
import * as React from "react";
import { useEffect, useState, useRef } from "react";
import z from "zod";

import { APP_NAME, WEBAPP_URL } from "@calcom/lib/constants";
import { trpc } from "@calcom/trpc/react";
import { Button, showToast } from "@calcom/ui";
import { Check, MailOpen, AlertTriangle } from "@calcom/ui/components/icon";

import Loader from "@components/Loader";
import PageWrapper from "@components/PageWrapper";

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

export default function Verify() {
  const router = useRouter();
  const { t, sessionId, stripeCustomerId } = querySchema.parse(router.query);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const { data } = trpc.viewer.public.stripeCheckoutSession.useQuery({
    stripeCustomerId,
    checkoutSessionId: sessionId,
  });
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

  if (!router.isReady || !data) {
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
    <div className="text-inverted bg-black bg-opacity-90 backdrop-blur-md backdrop-grayscale backdrop-filter">
      <Head>
        <title>
          {/* @note: Ternary can look ugly ant his might be extracted later but I think at 3 it's not yet worth
          it or too hard to read. */}
          {hasPaymentFailed
            ? "Your payment failed"
            : sessionId
            ? "Payment successful!"
            : "Verify your email" + " | " + APP_NAME}
        </title>
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="m-10 flex max-w-2xl flex-col items-start border border-white p-12 text-left">
          <div className="rounded-full border border-white p-3">
            {hasPaymentFailed ? (
              <AlertTriangle className="text-inverted h-12 w-12 flex-shrink-0 p-0.5 font-extralight" />
            ) : sessionId ? (
              <Check className="text-inverted h-12 w-12 flex-shrink-0 p-0.5 font-extralight" />
            ) : (
              <MailOpen className="text-inverted h-12 w-12 flex-shrink-0 p-0.5 font-extralight" />
            )}
          </div>
          <h3 className="font-cal my-6 text-3xl font-normal">
            {hasPaymentFailed
              ? "Your payment failed"
              : sessionId
              ? "Payment successful!"
              : "Check your Inbox"}
          </h3>
          {hasPaymentFailed && (
            <p className="my-6">Your account has been created, but your premium has not been reserved.</p>
          )}
          <p>
            We have sent an email to <b>{customer?.email} </b>with a link to activate your account.{" "}
            {hasPaymentFailed &&
              "Once you activate your account you will be able to try purchase your premium username again or select a different one."}
          </p>
          <p className="text-muted mt-6">
            Don&apos;t see an email? Click the button below to send another email.
          </p>

          <div className="mt-6 flex space-x-5 text-center">
            <Button
              color="secondary"
              disabled={secondsLeft > 0}
              onClick={async (e) => {
                if (!customer) {
                  return;
                }
                e.preventDefault();
                setSecondsLeft(30);
                // Update query params with t:timestamp, shallow: true doesn't re-render the page
                router.push(
                  router.asPath,
                  {
                    query: {
                      ...router.query,
                      t: Date.now(),
                    },
                  },
                  { shallow: true }
                );
                return await sendVerificationLogin(customer.email, customer.username);
              }}>
              {secondsLeft > 0 ? `Resend in ${secondsLeft} seconds` : "Send another mail"}
            </Button>
            <Button color="primary" href={`${WEBAPP_URL || "https://app.cal.com"}/auth/login`}>
              Login using another method
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

Verify.PageWrapper = PageWrapper;
