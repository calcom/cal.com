import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui";

export default function BookingConfirmationError() {
  const { t } = useLocale();

  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="bg-default flex max-w-lg flex-col items-center rounded-xl border px-8 py-14 text-center shadow-md">
        <div className="mb-5 rounded-full bg-gray-100 p-3  dark:bg-[#292929] ">
          <Icon name="circle-alert" className="h-9 w-9 p-0.5" strokeWidth={1.5} />
        </div>
        <h3 className="font-cal mb-2 text-2xl font-semibold">{t("booking_not_found")}</h3>
        <p className="text-subtle px-1 leading-normal">{t("booking_not_found_description")}</p>
      </div>
    </div>
  );
}
