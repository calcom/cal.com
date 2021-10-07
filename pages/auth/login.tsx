import { getCsrfToken } from "next-auth/client";
import Head from "next/head";

import { getSession } from "@lib/auth";

import AddToHomescreen from "@components/AddToHomescreen";

// const errorMessages: { [key: string]: string } = {
//   [ErrorCode.SecondFactorRequired]:
//     "Two-factor authentication enabled. Please enter the six-digit code from your authenticator app.",
//   [ErrorCode.IncorrectPassword]: "Password is incorrect. Please try again.",
//   [ErrorCode.UserNotFound]: "No account exists matching that email address.",
//   [ErrorCode.IncorrectTwoFactorCode]: "Two-factor code is incorrect. Please try again.",
//   [ErrorCode.InternalServerError]:
//     "Something went wrong. Please try again and contact us if the issue persists.",
// };

export default function Login({ csrfToken }) {
  // const router = useRouter();
  // const [email] = useState("");
  // const [password] = useState("");
  // const [code] = useState("");
  // const [isSubmitting, setIsSubmitting] = useState(false);
  // const [, setSecondFactorRequired] = useState(false);
  // const [, setErrorMessage] = useState<string | null>(null);

  // const callbackUrl = typeof router.query?.callbackUrl === "string" ? router.query.callbackUrl : "/";

  // async function handleSubmit(e: React.SyntheticEvent) {
  //   e.preventDefault();

  //   if (isSubmitting) {
  //     return;
  //   }

  //   setIsSubmitting(true);
  //   setErrorMessage(null);

  //   try {
  //     const response = await signIn("credentials", { redirect: false, email, password, totpCode: code });
  //     if (!response) {
  //       console.error("Received empty response from next auth");
  //       return;
  //     }

  //     if (!response.error) {
  //       window.location.reload();
  //       return;
  //     }

  //     if (response.error === ErrorCode.SecondFactorRequired) {
  //       setSecondFactorRequired(true);
  //       setErrorMessage(errorMessages[ErrorCode.SecondFactorRequired]);
  //     } else {
  //       setErrorMessage(errorMessages[response.error] || "Something went wrong.");
  //     }
  //   } catch (e) {
  //     setErrorMessage("Something went wrong.");
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // }

  return (
    <div className="flex flex-col justify-center min-h-screen py-12 bg-neutral-50 sm:px-6 lg:px-8">
      <Head>
        <title>Login</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img className="h-6 mx-auto" src="/yac-logo-white-word.svg" alt="Yac Logo" />
        <h2 className="mt-6 text-3xl font-bold text-center text-neutral-900">Sign in to your account</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="px-4 py-8 mx-2 bg-white border rounded-sm sm:px-10 border-neutral-200">
          <form method="POST" action="/api/auth/signin/yac">
            <input name="csrfToken" type="hidden" defaultValue={csrfToken} hidden />
            <button
              type="submit"
              className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white border border-transparent rounded-sm shadow-sm bg-neutral-900 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
              Sign in with Yac
            </button>
          </form>
          {/* <form className="space-y-6" method="post" action="/api/auth/callback/credentials">
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
                  inputMode="email"
                  autoComplete="email"
                  required
                  className="block w-full px-3 py-2 placeholder-gray-400 border rounded-sm shadow-sm appearance-none border-neutral-300 focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
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
                    <a className="text-sm font-medium text-primary-600">Forgot?</a>
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
                  className="block w-full px-3 py-2 placeholder-gray-400 border rounded-sm shadow-sm appearance-none border-neutral-300 focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
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
                    className="block w-full px-3 py-2 placeholder-gray-400 border rounded-sm shadow-sm appearance-none border-neutral-300 focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="submit"
                className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white border border-transparent rounded-sm shadow-sm bg-neutral-900 hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
                Sign in
              </button>
            </div>
          </form> */}
        </div>
        {/* <div className="mt-4 text-sm text-center text-neutral-600">
          Don&apos;t have an account?
          <Link href="/auth/signup">
            <a className="font-medium text-neutral-900">Create an account</a>
          </Link>
        </div> */}
      </div>

      <AddToHomescreen />
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
