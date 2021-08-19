import Head from "next/head";
import prisma from "../../lib/prisma";
import { useRouter } from "next/router";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { CheckIcon } from "@heroicons/react/outline";

dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.extend(timezone);

export default function Type(props) {
  // Get router variables
  const router = useRouter();

  return (
    <div>
      <Head>
        <title>
          Cancelled {props.title} | {props.user.name || props.user.username} | Calendso
        </title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="mx-auto my-24 max-w-3xl">
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center pb-20 pt-4 px-4 min-h-screen text-center sm:block sm:p-0">
            <div className="fixed inset-0 my-4 transition-opacity sm:my-0" aria-hidden="true">
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>
              <div
                className="inline-block align-bottom pb-4 pt-5 px-4 text-left bg-white rounded-lg shadow-xl overflow-hidden transform transition-all sm:align-middle sm:my-8 sm:p-6 sm:w-full sm:max-w-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                <div>
                  <div className="flex items-center justify-center mx-auto w-12 h-12 bg-green-100 rounded-full">
                    <CheckIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <h3 className="text-gray-900 text-lg font-medium leading-6" id="modal-headline">
                      Cancellation successful
                    </h3>
                    <div className="mt-2">
                      <p className="text-gray-500 text-sm">Feel free to pick another event anytime.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 text-center sm:mt-6">
                  <div className="mt-5">
                    <button
                      onClick={() => router.push("/" + props.user.username)}
                      type="button"
                      className="btn-white inline-flex items-center justify-center mx-2 px-4 py-2 text-gray-700 font-medium bg-gray-100 hover:bg-gray-200 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 sm:text-sm">
                      Pick another
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps(context) {
  const user = await prisma.user.findFirst({
    where: {
      username: context.query.user,
    },
    select: {
      username: true,
      name: true,
      bio: true,
      avatar: true,
      eventTypes: true,
    },
  });

  return {
    props: {
      user,
      title: context.query.title,
    },
  };
}
