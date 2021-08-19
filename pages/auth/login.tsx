import Head from "next/head";
import Link from "next/link";
import { getCsrfToken, getSession } from "next-auth/client";

export default function Login({ csrfToken }) {
  return (
    <div className="flex flex-col justify-center py-12 min-h-screen bg-neutral-50 sm:px-6 lg:px-8">
      <Head>
        <title>Login</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img className="mx-auto h-6" src="/calendso-logo-white-word.svg" alt="Calendso Logo" />
        <h2 className="mt-6 text-center text-neutral-900 text-3xl font-bold">Sign in to your account</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-2 px-4 py-8 bg-white border border-neutral-200 rounded-sm sm:px-10">
          <form className="space-y-6" method="post" action="/api/auth/callback/credentials">
            <input name="csrfToken" type="hidden" defaultValue={csrfToken} hidden />
            <div>
              <label htmlFor="email" className="block text-neutral-700 text-sm font-medium">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="placeholder-gray-400 block px-3 py-2 w-full border border-neutral-300 focus:border-neutral-900 rounded-sm focus:outline-none shadow-sm appearance-none focus:ring-neutral-900 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex">
                <div className="w-1/2">
                  <label htmlFor="password" className="block text-neutral-700 text-sm font-medium">
                    Password
                  </label>
                </div>
                <div className="w-1/2 text-right">
                  <Link href="/auth/forgot-password">
                    <a className="text-primary-600 text-sm font-medium">Forgot?</a>
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
                  className="placeholder-gray-400 block px-3 py-2 w-full border border-neutral-300 focus:border-neutral-900 rounded-sm focus:outline-none shadow-sm appearance-none focus:ring-neutral-900 sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                className="flex justify-center px-4 py-2 w-full text-white text-sm font-medium hover:bg-neutral-700 bg-neutral-900 border border-transparent rounded-sm focus:outline-none shadow-sm focus:ring-2 focus:ring-black focus:ring-offset-2">
                Sign in
              </button>
            </div>
          </form>
        </div>
        <div className="mt-4 text-center text-neutral-600 text-sm">
          Don&apos;t have an account? {/* replace this with your account creation flow */}
          <a href="https://checkout.calendso.com" className="text-neutral-900 font-medium">
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
