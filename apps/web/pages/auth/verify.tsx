import { CheckIcon, ExclamationIcon, MailOpenIcon } from "@heroicons/react/outline";
import { getSession, signIn } from "next-auth/react";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import showToast from "@calcom/lib/notification";
import Button from "@calcom/ui/Button";

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

function useSendFirstVerificationLogin() {
  const router = useRouter();
  const { email, username } = router.query;
  const sent = useRef(false);
  useEffect(() => {
    if (router.isReady && !sent.current) {
      (async () => {
        await sendVerificationLogin(`${email}`, `${username}`);
        sent.current = true;
      })();
    }
  }, [email, router.isReady, username]);
}

export default function Verify() {
  const router = useRouter();
  const { email, username, t, session_id, cancel } = router.query;
  const [secondsLeft, setSecondsLeft] = useState(30);

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

  // @note: check for session, redirect to webapp if session found
  useEffect(() => {
    let intervalId: NodeJS.Timer, redirecting: boolean;
    // eslint-disable-next-line prefer-const
    intervalId = setInterval(async () => {
      const session = await getSession();
      if (session && !redirecting) {
        // User connected using the magic link -> redirect him/her
        redirecting = true;
        // @note: redirect to webapp /getting-started, user will end up with two tabs open with the onboarding 'getting-started' wizard.
        router.push(WEBAPP_URL + "/getting-started");
      }
    }, 1000);
    return () => {
      intervalId && clearInterval(intervalId);
    };
  }, [router]);

  useSendFirstVerificationLogin();

  return (
    <div className=" bg-black bg-opacity-90 text-white backdrop-blur-md backdrop-grayscale backdrop-filter">
      <Head>
        <title>
          {/* @note: Ternary can look ugly ant his might be extracted later but I think at 3 it's not yet worth
          it or too hard to read. */}
          {cancel
            ? "Your payment failed"
            : session_id
            ? "Payment successful!"
            : "Verify your email" + " | Cal.com"}
        </title>
      </Head>
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="m-10 flex max-w-2xl flex-col items-start border border-white p-12 text-left">
          <div className="rounded-full border border-white p-3">
            {cancel ? (
              <ExclamationIcon className="h-12 w-12 flex-shrink-0 p-0.5 font-extralight text-white" />
            ) : session_id ? (
              <CheckIcon className="h-12 w-12 flex-shrink-0 p-0.5 font-extralight text-white" />
            ) : (
              <MailOpenIcon className="h-12 w-12 flex-shrink-0 p-0.5 font-extralight text-white" />
            )}
          </div>
          <h3 className="font-cal my-6 text-3xl font-normal">
            {cancel ? "Your payment failed" : session_id ? "Payment successful!" : "Check your Inbox"}
          </h3>
          {cancel && (
            <p className="my-6">Your account has been created, but your premium has not been reserved.</p>
          )}
          <p>
            We have sent an email to <b>{email} </b>with a link to activate your account.{" "}
            {cancel &&
              "Once you activate your account you will be able to try purchase your premium username again or select a different one."}
          </p>
          <p className="mt-6 text-gray-400">
            Don&apos;t see an email? Click the button below to send another email.
          </p>

          <div className="mt-6 space-x-5  text-center">
            <Button
              color="secondary"
              disabled={secondsLeft > 0}
              onClick={async (e) => {
                e.preventDefault();
                setSecondsLeft(30);
                // Update query params with t:timestamp, shallow: true doesn't re-render the page
                router.push(
                  router.asPath,
                  {
                    query: {
                      email: router.query.email,
                      username: router.query.username,
                      t: Date.now(),
                    },
                  },
                  { shallow: true }
                );
                return await sendVerificationLogin(`${email}`, `${username}`);
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
