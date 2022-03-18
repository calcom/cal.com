import { XIcon } from "@heroicons/react/outline";
import { ArrowRightIcon } from "@heroicons/react/solid";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/Dialog";

import { HeadSeo } from "@components/seo/head-seo";

export default function NoMeetingFound() {
  const { t } = useLocale();

  return (
    <div>
      <HeadSeo title={t("no_meeting_found")} description={t("no_meeting_found")} />
      <main className="mx-auto my-24 max-w-3xl">
        <Dialog defaultOpen={true}>
          <DialogContent
            onInteractOutside={(e) => {
              e.preventDefault();
            }}>
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="mt-5 flex justify-center">
              <DialogHeader title={t("no_meeting_found")} />
            </div>
            <p className="-mt-4 text-center text-sm text-gray-500">{t("no_meeting_found_description")}</p>
            <div className="flex justify-center">
              <DialogFooter>
                <Button data-testid="return-home" href="/event-types" EndIcon={ArrowRightIcon}>
                  {t("go_back_home")}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
