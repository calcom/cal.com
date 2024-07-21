"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, EmptyScreen, HeadSeo } from "@calcom/ui";

export default function NoMeetingFound() {
  const { t } = useLocale();

  return (
    <>
      <HeadSeo title={t("No meeting found")} description={t("No meeting found")} />
      <main className="mx-auto my-24 max-w-3xl">
        <EmptyScreen
          Icon="x"
          headline={t("No meeting found")}
          description={t("No meeting found description")}
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
