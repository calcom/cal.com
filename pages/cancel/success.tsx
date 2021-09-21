import { HeadSeo } from "@components/seo/head-seo";
import { useRouter } from "next/router";
import { CheckIcon } from "@heroicons/react/outline";
import { useSession } from "next-auth/client";
import Button from "@components/ui/Button";
import { ArrowRightIcon } from "@heroicons/react/solid";

export default function CancelSuccess() {
  // Get router variables
  const router = useRouter();
  const { title, name, eventPage } = router.query;
  const [session, loading] = useSession();
  return (
    <div>
      <HeadSeo title={`Cancelled ${title} | ${name}`} description={`Cancelled ${title} | ${name}`} />
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
                    {!loading && !session.user && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">Feel free to pick another event anytime.</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 text-center">
                  <div className="mt-5">
                    {!loading && !session.user && <Button href={eventPage}>Pick another</Button>}
                    {!loading && session.user && (
                      <Button data-testid="back-to-bookings" href="/bookings" EndIcon={ArrowRightIcon}>
                        Back to bookings
                      </Button>
                    )}
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
