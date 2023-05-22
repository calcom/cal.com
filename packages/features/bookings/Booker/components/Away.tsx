import { useLocale } from "@calcom/lib/hooks/useLocale";

export const Away = () => {
  const { t } = useLocale();

  return (
    <div className="h-screen">
      <main className="mx-auto max-w-3xl px-4 py-24">
        <div className="space-y-6" data-testid="event-types">
          <div className="border-brand overflow-hidden rounded-sm border">
            <div className="text-subtle p-8 text-center">
              <h2 className="font-cal text-subtle mb-2 text-3xl">😴{" " + t("user_away")}</h2>
              <p className="mx-auto max-w-md">{t("user_away_description")}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
