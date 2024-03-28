"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, EmptyScreen, HeadSeo, Icon } from "@calcom/ui";

export default function NoMeetingFound() {
  const { t } = useLocale();

  return (
    <>
      <HeadSeo title={t("no_meeting_found")} description={t("no_meeting_found")} />
      <main className="mx-auto my-24 max-w-3xl">
        <EmptyScreen
          Icon={(props) => <Icon {...props} name="x" />}
          headline={t("no_meeting_found")}
          description={t("no_meeting_found_description")}
          buttonRaw={
            <Button
              data-testid="return-home"
              href="/event-types"
              EndIcon={(props) => <Icon {...props} name="arrow-right" />}>
              {t("go_back_home")}
            </Button>
          }
        />
      </main>
    </>
  );
}
