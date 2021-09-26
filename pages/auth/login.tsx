import { getCsrfToken, signIn } from "next-auth/client";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { ErrorCode, getSession } from "@lib/auth";

import { HeadSeo } from "@components/seo/head-seo";

const errorMessages: { [key: string]: string } = {
  [ErrorCode.SecondFactorRequired]:
    "Two-factor authentication enabled. Please enter the six-digit code from your authenticator app.",
  [ErrorCode.IncorrectPassword]: "Password is incorrect. Please try again.",
  [ErrorCode.UserNotFound]: "No account exists matching that email address.",
  [ErrorCode.IncorrectTwoFactorCode]: "Two-factor code is incorrect. Please try again.",
  [ErrorCode.InternalServerError]:
    "Something went wrong. Please try again and contact us if the issue persists.",
};

export default function Login({ csrfToken }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondFactorRequired, setSecondFactorRequired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!router.query?.callbackUrl) {
      window.history.replaceState(null, document.title, "?callbackUrl=/");
    }
  }, [router.query]);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await signIn("credentials", { redirect: false, email, password, totpCode: code });
      if (!response) {
        console.error("Received empty response from next auth");
        return;
      }

      if (!response.error) {
        window.location.reload();
        return;
      }

      if (response.error === ErrorCode.SecondFactorRequired) {
        setSecondFactorRequired(true);
        setErrorMessage(errorMessages[ErrorCode.SecondFactorRequired]);
      } else {
        setErrorMessage(errorMessages[response.error] || "Something went wrong.");
      }
    } catch (e) {
      setErrorMessage("Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <HeadSeo title="Login" description="Login" />
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img className="h-6 mx-auto" src="/calendso-logo-white-word.svg" alt="Cal.com Logo" />
        <h2 className="font-cal mt-6 text-center text-3xl font-bold text-neutral-900">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 mx-2 rounded-sm sm:px-10 border border-neutral-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <input name="csrfToken" type="hidden" defaultValue={csrfToken} hidden />
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                  className="appearance-none block w-full px-3 py-2 border border-neutral-300 rounded-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex">
                <div className="w-1/2">
                  <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                    Password
                  </label>
                </div>
                <div className="w-1/2 text-right">
                  <Link href="/auth/forgot-password">
                    <a className="font-medium text-primary-600 text-sm">Forgot?</a>
                  </Link>
                </div>
              </div>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  className="appearance-none block w-full px-3 py-2 border border-neutral-300 rounded-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                />
              </div>
            </div>

            {secondFactorRequired && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                  Two-Factor Code
                </label>
                <div className="mt-1">
                  <input
                    id="totpCode"
                    name="totpCode"
                    type="text"
                    maxLength={6}
                    minLength={6}
                    inputMode="numeric"
                    value={code}
                    onInput={(e) => setCode(e.currentTarget.value)}
                    className="appearance-none block w-full px-3 py-2 border border-neutral-300 rounded-sm shadow-sm placeholder-gray-400 focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-sm shadow-sm text-sm font-medium text-white bg-neutral-900 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
                Sign in
              </button>
            </div>

            {errorMessage && <p className="mt-1 text-sm text-red-700">{errorMessage}</p>}
          </form>
        </div>
        <div className="mt-4 text-neutral-600 text-center text-sm">
          Don&apos;t have an account? {/* replace this with your account creation flow */}
          <a href="https://cal.com/signup" className="font-medium text-neutral-900">
            Create an account
          </a>
        </div>
      </div>
    </div>
  );
}

Login.getInitialProps = async (context) => {
  const { req, res } = context;
  const session = await getSession({ req });

  if (session) {
    res.writeHead(302, { Location: "/" });
    res.end();
    return;
  }

  return {
    csrfToken: await getCsrfToken(context),
  };
};
