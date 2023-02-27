import { useLocale } from "@calcom/lib/hooks/useLocale";

export const Away = () => {
  const { t } = useLocale();

  return (
    <div className="h-screen dark:bg-gray-900">
      <main className="mx-auto max-w-3xl px-4 py-24">
        <div className="space-y-6" data-testid="event-types">
          <div className="overflow-hidden rounded-sm border dark:border-gray-900">
            <div className="p-8 text-center text-gray-400 dark:text-white">
              <h2 className="font-cal mb-2 text-3xl text-gray-600 dark:text-white">
                😴{" " + t("user_away")}
              </h2>
              <p className="mx-auto max-w-md">{t("user_away_description")}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
