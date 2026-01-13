"use client";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { detectBrowserTimeFormat } from "@calcom/lib/timeFormat";
import type { inferSSRProps } from "@calcom/types/inferSSRProps";
import { Icon } from "@calcom/ui/components/icon";
import { Button } from "@calcom/ui/components/button";

import type { getServerSideProps } from "@lib/video/meeting-ended/[uid]/getServerSideProps";

export type PageProps = inferSSRProps<typeof getServerSideProps>;
export default function MeetingUnavailable(props: PageProps) {
  const { t } = useLocale();

  return (
    <div>
      <main className="mx-auto my-24 max-w-3xl">
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            <div className="fixed inset-0 my-4 transition-opacity sm:my-0" aria-hidden="true">
              <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
                &#8203;
              </span>
              <div
                className="bg-default inline-block transform overflow-hidden rounded-lg px-4 pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6 sm:align-middle"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline">
                <div>
                  <div className="bg-error mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                    <Icon name="x" className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <h3 className="text-emphasis text-lg font-medium leading-6" id="modal-headline">
                      This meeting is in the past.
                    </h3>
                  </div>
                  <div className="mt-4 border-b border-t py-4">
                    <h2 className="font-cal text-default mb-2 text-center text-lg font-medium">
                      {props.booking.title}
                    </h2>
                    <p className="text-subtle text-center">
                      <Icon name="calendar" className="-mt-1 mr-1 inline-block h-4 w-4" />
                      {dayjs(props.booking.startTime).format(`${detectBrowserTimeFormat}, dddd DD MMMM YYYY`)}
                    </p>
                  </div>
                </div>
                <div className="mt-5 text-center sm:mt-6">
                  <div className="mt-5">
                    <Button data-testid="return-home" href="/event-types" EndIcon="arrow-right">
                      {t("go_back")}
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
