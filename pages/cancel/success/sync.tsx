import { HeadSeo } from "@components/seo/head-seo";
import { useRouter } from "next/router";
import { CheckIcon } from "@heroicons/react/outline";
import { useSession } from "next-auth/client";
import Button from "@components/ui/Button";
import { ArrowRightIcon } from "@heroicons/react/solid";

export default function CancelSuccess(props) {
  // Get router variables
  if (Math.random() > 1) {
    console.log(props);
  }
  const router = useRouter();
  const { title, name, eventPage } = router.query;
  const [session, loading] = useSession();
  return (
    <div>
      <HeadSeo title={`Cancelled ${title} | ${name}`} description={`Cancelled ${title} | ${name}`} />
      <main className="max-w-3xl mx-auto my-24">
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 my-4 transition-opacity sm:my-0" aria-hidden="true">
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>
              <div
                className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline"
              >
                <div>
                  <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full">
                    <CheckIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-headline">
                      Cancellation successful
                    </h3>
                    {!loading && !session.user && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">Feel free to pick another event anytime.</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-5 text-center sm:mt-6">
                  <div className="mt-5">
                    {!loading && !session.user && <Button href={eventPage}>Pick another</Button>}
                    {!loading && session.user && (
                      <Button data-testid="back-to-bookings" href="/bookings" EndIcon={ArrowRightIcon}>
                        Back to bookings
                      </Button>
                    )}
                  </div>
                </div>
                {/* <div className="mt-5 text-center sm:mt-6">
                  <a className="text-black hover:opacity-90" href="/">
                    Go back home
                  </a>
                </div>
              </div> */}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
