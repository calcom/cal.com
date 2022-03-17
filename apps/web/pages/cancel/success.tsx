import { CheckIcon } from "@heroicons/react/outline";
import { ArrowRightIcon } from "@heroicons/react/solid";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/Dialog";

import { HeadSeo } from "@components/seo/head-seo";

export default function CancelSuccess() {
  const { t } = useLocale();
  // Get router variables
  const router = useRouter();
  const { title, name, eventPage } = router.query;
  const { data: session, status } = useSession();
  const loading = status === "loading";
  return (
    <div>
      <HeadSeo
        title={`${t("cancelled")} ${title} | ${name}`}
        description={`${t("cancelled")} ${title} | ${name}`}
      />
      <main className="mx-auto my-24 max-w-3xl">
        <Dialog defaultOpen={true}>
          <DialogContent
            onInteractOutside={(e) => {
              e.preventDefault();
            }}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="mt-5 flex justify-center">
              <DialogHeader title={t("cancellation_successful")} />
            </div>
            {!loading && !session?.user && (
              <div className="-mt-6 flex justify-center">
                <p className="text-center text-sm text-gray-500">{t("free_to_pick_another_event_type")}</p>
              </div>
            )}
            <div className="flex justify-center">
              <DialogFooter>
                {!loading && !session?.user && <Button href={eventPage as string}>Pick another</Button>}
                {!loading && session?.user && (
                  <Button data-testid="back-to-bookings" href="/bookings" EndIcon={ArrowRightIcon}>
                    {t("back_to_bookings")}
                  </Button>
                )}
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
