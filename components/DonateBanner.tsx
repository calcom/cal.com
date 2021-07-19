import { GiftIcon } from "@heroicons/react/outline";
export default function DonateBanner() {

if (location.hostname.endsWith(".calendso.com")) {
return null;
}

  return (
    <>
      <div className="h-12" />
      <div className="fixed inset-x-0 bottom-0">
        <div className="bg-blue-600">
          <div className="max-w-7xl mx-auto py-3 px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between flex-wrap">
              <div className="w-0 flex-1 flex items-center">
                <span className="flex p-2 rounded-lg bg-blue-600">
                  <GiftIcon className="h-6 w-6 text-white" aria-hidden="true" />
                </span>
                <p className="ml-3 font-medium text-white truncate">
                  <span className="md:hidden">
                    Support the ongoing development
                  </span>
                  <span className="hidden md:inline">
                    You&apos;re using the free self-hosted version. Support the
                    ongoing development by making a donation.
                  </span>
                </p>
              </div>
              <div className="order-3 mt-2 flex-shrink-0 w-full sm:order-2 sm:mt-0 sm:w-auto">
                <a
                  target="_blank"
                  href="https://calendso.com/donate"
                  className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50"
                >
                  Donate
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
