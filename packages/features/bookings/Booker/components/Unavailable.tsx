import { useLocale } from "@calcom/lib/hooks/useLocale";

const UnAvailableMessage = ({ children, title }: { children: React.ReactNode; title: string }) => (
  <div className="mx-auto w-full max-w-2xl">
    <div className="border-subtle bg-default dark:bg-muted overflow-hidden rounded-lg border p-10">
      <h2 className="font-cal mb-4 text-3xl">{title}</h2>
      {children}
    </div>
  </div>
);

export const Away = () => {
  const { t } = useLocale();

  return (
    <UnAvailableMessage title={`😴 ${t("user_away")}`}>
      <p className="max-w-[50ch]">{t("user_away_description")}</p>
    </UnAvailableMessage>
  );
};

export const NotFound = () => {
  const { t } = useLocale();

  return (
    <UnAvailableMessage title={t("404_page_not_found")}>
      <p className="max-w-[50ch]">{t("booker_event_not_found")}</p>
    </UnAvailableMessage>
  );
};
