import { GiftIcon } from "@heroicons/react/outline";
export default function DonateBanner() {
  if (location.hostname.endsWith(".calendso.com")) {
    return null;
  }

  return (
    <>
      <div className="h-12" />
      <div className="fixed bottom-0 inset-x-0">
        <div className="bg-blue-600">
          <div className="mx-auto px-3 py-3 max-w-7xl sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between">
              <div className="flex flex-1 items-center w-0">
                <span className="flex p-2 bg-blue-600 rounded-lg">
                  <GiftIcon className="w-6 h-6 text-white" aria-hidden="true" />
                </span>
                <p className="ml-3 text-white font-medium truncate">
                  <span className="md:hidden">Support the ongoing development</span>
                  <span className="hidden md:inline">
                    You&apos;re using the free self-hosted version. Support the ongoing development by making
                    a donation.
                  </span>
                </p>
              </div>
              <div className="flex-shrink-0 order-3 mt-2 w-full sm:order-2 sm:mt-0 sm:w-auto">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://calendso.com/donate"
                  className="flex items-center justify-center px-4 py-2 text-blue-600 text-sm font-medium hover:bg-blue-50 bg-white border border-transparent rounded-md shadow-sm">
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
