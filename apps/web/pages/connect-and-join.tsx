import { useSession } from "next-auth/react";
import { Trans } from "next-i18next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getQueryParam } from "@calcom/features/bookings/Booker/utils/query-param";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { TRPCClientError } from "@calcom/trpc/react";
import { showToast, Button, EmptyScreen } from "@calcom/ui";
import { Zap } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

function ConnectAndJoin() {
  const { t } = useLocale();
  const router = useRouter();
  const token = getQueryParam("token");
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);

  const session = useSession();
  const isUserPartOfOrg = session.status === "authenticated" && !!session.data.user?.org;

  const mutation = trpc.viewer.connectAndJoin.useMutation({
    onSuccess: (res) => {
      if (res.meetingUrl && !res.isBookingAlreadyAcceptedBySomeoneElse) {
        router.push(res.meetingUrl);
      } else if (res.isBookingAlreadyAcceptedBySomeoneElse && res.meetingUrl) {
        setMeetingUrl(res.meetingUrl);
      }
    },
    onError: (err) => {
      if (err instanceof TRPCClientError) {
        showToast(t(err.message), "error");
      } else {
        showToast(t("something_went_wrong"), "error");
      }
    },
  });

  if (session.status === "loading") return <p>{t("loading")}</p>;

  if (!token) return <p>Token Not Present</p>;

  return (
    <div className="mx-8 mt-12 block items-start sm:flex">
      {session ? (
        <EmptyScreen
          headline={t("instant_tab_title")}
          Icon={Zap}
          description={t("uprade_to_create_instant_bookings")}
          buttonRaw={
            <div className="flex flex-col items-center justify-center	gap-4">
              <Button
                loading={mutation.isLoading}
                tooltip={t("not_part_of_org")}
                // disabled={!isUserPartOfOrg}
                onClick={() => {
                  mutation.mutate({ token });
                }}>
                {t("join_meeting")}
              </Button>
              {meetingUrl && (
                <Trans
                  i18nKey="some_other_host_already_accepted_the_meeting"
                  className="text-center font-semibold">
                  Some other host already accepted the meeting. Do you still want to join?
                  <Link className="cursor-pointer underline" href={meetingUrl}>
                    Continue to Meeting Url
                  </Link>
                </Trans>
              )}
            </div>
          }
        />
      ) : (
        <div>{t("you_must_be_logged_in_to", { url: WEBAPP_URL })}</div>
      )}
    </div>
  );
}

ConnectAndJoin.requiresLicense = false;
ConnectAndJoin.PageWrapper = PageWrapper;

export default ConnectAndJoin;
