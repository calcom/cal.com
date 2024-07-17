"use client";

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
import { Button, EmptyScreen, Alert } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

function ConnectAndJoin() {
  const { t } = useLocale();
  const router = useRouter();
  const token = getQueryParam("token");
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

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
      console.log("err", err, err instanceof TRPCClientError);
      if (err instanceof TRPCClientError) {
        setErrorMessage(t(err.message));
      } else {
        setErrorMessage(t("something_went_wrong"));
      }
    },
  });

  if (session.status === "loading") return <p>{t("loading")}</p>;

  if (!token) return <p>{t("token_not_found")}</p>;

  return (
    <div className="mx-8 mt-12 block items-start sm:flex">
      {session ? (
        <EmptyScreen
          headline={t("instant_tab_title")}
          Icon="phone-call"
          description={t("uprade_to_create_instant_bookings")}
          buttonRaw={
            <div className="flex flex-col items-center justify-center	gap-4">
              {meetingUrl ? (
                <div className="text-default flex flex-col items-center gap-2 text-center text-sm font-normal">
                  <Trans i18nKey="some_other_host_already_accepted_the_meeting">
                    Some other host already accepted the meeting. Do you still want to join?
                    <Link className="inline-block cursor-pointer underline" href={meetingUrl}>
                      Continue to Meeting
                    </Link>
                  </Trans>
                </div>
              ) : (
                <Button
                  loading={mutation.isPending}
                  tooltip={isUserPartOfOrg ? t("join_meeting") : t("not_part_of_org")}
                  disabled={!isUserPartOfOrg}
                  onClick={() => {
                    mutation.mutate({ token });
                  }}>
                  {t("join_meeting")}
                </Button>
              )}
              {errorMessage && <Alert severity="error" message={errorMessage} />}
            </div>
          }
        />
      ) : (
        <div>{t("you_must_be_logged_in_to", { url: WEBAPP_URL })}</div>
      )}
    </div>
  );
}

ConnectAndJoin.requiresLicense = true;
ConnectAndJoin.PageWrapper = PageWrapper;

export default ConnectAndJoin;
