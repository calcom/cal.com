import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, HeadSeo } from "@calcom/ui";
import { FiX, FiArrowRight } from "@calcom/ui/components/icon";

export default function NoMeetingFound() {
  const { t } = useLocale();

  return (
    <div>
      <HeadSeo title={t("no_meeting_found")} description={t("no_meeting_found")} />
      <main className="mx-auto my-24 max-w-3xl">
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 my-4 transition-opacity sm:my-0" aria-hidden="true">
              <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
                &#8203;
              </span>
              <div
                className="inline-block transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6 sm:align-middle"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <FiX className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-headline">
                      {t("no_meeting_found")}
                    </h3>
                  </div>
                  <div className="mt-2">
                    <p className="text-center text-sm text-gray-500">{t("no_meeting_found_description")}</p>
                  </div>
                </div>
                <div className="mt-5 text-center sm:mt-6">
                  <div className="mt-5">
                    <Button data-testid="return-home" href="/event-types" EndIcon={FiArrowRight}>
                      {t("go_back_home")}
                    </Button>
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
