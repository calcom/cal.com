import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, EmptyScreen, HeadSeo } from "@calcom/ui";
import { FiX, FiArrowRight } from "@calcom/ui/components/icon";

export default function NoMeetingFound() {
  const { t } = useLocale();

  return (
    <>
      <HeadSeo title={t("no_meeting_found")} description={t("no_meeting_found")} />
      <main className="mx-auto my-24 max-w-3xl">
        <EmptyScreen
          Icon={FiX}
          headline={t("no_meeting_found")}
          description={t("no_meeting_found_description")}
          buttonRaw={
            <Button data-testid="return-home" href="/event-types" EndIcon={FiArrowRight}>
              {t("go_back_home")}
            </Button>
          }
        />
      </main>
    </>
  );
}
