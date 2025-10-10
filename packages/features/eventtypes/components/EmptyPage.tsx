import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/components/icon";

function EmptyPage({ name }: { name: string }) {
  const { t } = useLocale();
  return (
    <div className="border-subtle flex min-h-[300px] flex-col items-center justify-center rounded-lg border p-10">
      <div className="bg-emphasis mb-2 flex h-16 w-16 items-center justify-center rounded-full">
        <Icon name="calendar" className="h-8 w-8" />
      </div>

      <h3 className="text-emphasis mb-2 text-xl font-semibold">{t("no_event_types")}</h3>

      <p className="text-default max-w-md text-center text-sm leading-relaxed">
        {t("no_event_types_description", { name })}
      </p>
    </div>
  );
}

export default EmptyPage;
