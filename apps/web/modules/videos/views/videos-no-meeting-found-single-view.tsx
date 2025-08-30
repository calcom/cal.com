"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";

export default function NoMeetingFound() {
  const { t } = useLocale();

  return (
    <>
      <main className="mx-auto my-24 max-w-3xl">
        <EmptyScreen
          Icon="x"
          headline={t("no_meeting_found")}
          description={t("no_meeting_found_description")}
          buttonRaw={
            <Button data-testid="return-home" href="/event-types" EndIcon="arrow-right">
              {t("go_back_home")}
            </Button>
          }
        />
      </main>
    </>
  );
}
