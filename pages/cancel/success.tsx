import { HeadSeo } from "@components/seo/head-seo";
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
      <HeadSeo
        title={`Cancelled ${props.title} | ${props.user.name || props.user.username}`}
        description={`Cancelled ${props.title} | ${props.user.name || props.user.username}`}
      />
      <main className="max-w-3xl mx-auto my-24">
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 my-4 sm:my-0 transition-opacity" aria-hidden="true">
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>
              <div
                className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                <div>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <CheckIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                      Cancellation successful
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">Feel free to pick another event anytime.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 text-center">
                  <div className="mt-5">
                    <button
                      onClick={() => router.push("/" + props.user.username)}
                      type="button"
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:text-sm mx-2 btn-white">
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
