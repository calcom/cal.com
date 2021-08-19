import { useRouter } from "next/router";
import { XIcon } from "@heroicons/react/outline";
import Head from "next/head";
import Link from "next/link";

export default function Error() {
  const router = useRouter();
  const { error } = router.query;

  return (
    <div
      className="fixed z-50 inset-0 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true">
      <Head>
        <title>{error} - Calendso</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex items-end justify-center pb-20 pt-4 px-4 min-h-screen text-center sm:block sm:p-0">
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>
        <div className="inline-block align-bottom pb-4 pt-5 px-4 text-left bg-white rounded-lg shadow-xl overflow-hidden transform transition-all sm:align-middle sm:my-8 sm:p-6 sm:w-full sm:max-w-sm">
          <div>
            <div className="flex items-center justify-center mx-auto w-12 h-12 bg-red-100 rounded-full">
              <XIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-gray-900 text-lg font-medium leading-6" id="modal-title">
                {error}
              </h3>
              <div className="mt-2">
                <p className="text-gray-500 text-sm">
                  An error occurred when logging you in. Head back to the login screen and try again.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 sm:mt-6">
            <Link href="/auth/login">
              <a className="inline-flex justify-center px-4 py-2 w-full text-white text-base font-medium hover:bg-neutral-800 bg-neutral-900 border border-transparent rounded-sm focus:outline-none shadow-sm focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 sm:text-sm">
                Go back to the login page
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
