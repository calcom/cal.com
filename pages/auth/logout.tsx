import Head from "next/head";
import Link from "next/link";
import { CheckIcon } from "@heroicons/react/outline";
import { getSession, signOut } from "next-auth/client";

export default function Logout() {
  return (
    <div
      className="fixed z-50 inset-0 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true">
      <Head>
        <title>Logged out - Calendso</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex items-end justify-center pb-20 pt-4 px-4 min-h-screen text-center sm:block sm:p-0">
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>
        <div className="inline-block align-bottom pb-4 pt-5 px-4 text-left bg-white rounded-lg shadow-xl overflow-hidden transform transition-all sm:align-middle sm:my-8 sm:p-6 sm:w-full sm:max-w-sm">
          <div>
            <div className="flex items-center justify-center mx-auto w-12 h-12 bg-green-100 rounded-full">
              <CheckIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-gray-900 text-lg font-medium leading-6" id="modal-title">
                You&apos;ve been logged out
              </h3>
              <div className="mt-2">
                <p className="text-gray-500 text-sm">We hope to see you again soon!</p>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-6">
            <Link href="/auth/login">
              <a className="inline-flex justify-center px-4 py-2 w-full text-white text-base font-medium bg-black border border-transparent rounded-md focus:outline-none shadow-sm focus:ring-2 focus:ring-black focus:ring-offset-2 sm:text-sm">
                Go back to the login page
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

Logout.getInitialProps = async (context) => {
  const { req } = context;
  const session = await getSession({ req });

  if (session) {
    signOut({ redirect: false });
  }

  return { session: undefined };
};
